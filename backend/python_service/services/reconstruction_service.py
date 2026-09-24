"""Experimental two-view SfM from decoded video; no procedural geometry fallback.

The mesh interpolates sparse, measured feature tracks in one camera's image plane.
It is a partial visualization, not a dense dental surface or a validated measurement.
"""
import json
import os
import resource
import platform
import hashlib
from pathlib import Path
import time
from datetime import datetime, timezone

from typing import TypedDict, Any

import cv2
import numpy as np


class ReconstructionBest(TypedDict):
    points: np.ndarray
    pixels: np.ndarray
    rotation: np.ndarray
    translation: np.ndarray
    errors: np.ndarray
    parallax: np.ndarray
    first: int
    second: int

from .dental_filter_service import export_binary_stl
from .lidra_service import analyze_video_acquisition, file_sha256

ENGINE = "opencv_sparse_sfm"
VERSION = "2.1.0"
DEFAULT_CONFIG = {"maxViews": 8, "maxImageDimension": 1600, "maxFeatures": 6000,
                  "ratioThreshold": 0.72, "ransacThresholdPx": 1.0,
                  "maxReprojectionErrorPx": 2.0, "minPoints": 20,
                  "minParallaxDegrees": 0.5, "maxTriangleEdgePixels": 120.0,
                  "maxTriangleDepthRatio": 1.25, "seed": 0}


class ReconstructionUnavailable(ValueError):
    """The real input cannot support the requested reconstruction."""


def triangulate_verified(first, second, intrinsic, rotation, translation, max_error=2.0, min_parallax=0.5):
    """Positive-depth, reprojection, finite-value and parallax checked triangulation."""
    p1 = intrinsic @ np.column_stack((np.eye(3), np.zeros(3)))
    p2 = intrinsic @ np.column_stack((rotation, translation.reshape(3)))
    homogeneous = cv2.triangulatePoints(p1, p2, first.T, second.T).T
    with np.errstate(divide="ignore", invalid="ignore"):
        points = homogeneous[:, :3] / homogeneous[:, 3:4]
        camera2 = points @ rotation.T + translation.reshape(1, 3)
        reproject1 = points @ intrinsic.T
        reproject2 = camera2 @ intrinsic.T
        errors = np.maximum(np.linalg.norm(reproject1[:, :2] / reproject1[:, 2:3] - first, axis=1),
                            np.linalg.norm(reproject2[:, :2] / reproject2[:, 2:3] - second, axis=1))
        center2 = -rotation.T @ translation.reshape(3)
        rays2 = points - center2
        cos_angle = np.sum(points * rays2, axis=1) / (np.linalg.norm(points, axis=1) * np.linalg.norm(rays2, axis=1))
        parallax = np.degrees(np.arccos(np.clip(cos_angle, -1, 1)))
    valid = (np.isfinite(points).all(axis=1) & (points[:, 2] > 0) & (camera2[:, 2] > 0)
             & (errors <= max_error) & (parallax >= min_parallax))
    return points[valid], valid, errors[valid], parallax[valid]


def image_topology_mesh(points, pixels, width, height, max_edge=120.0, depth_ratio=1.25):
    """Delaunay in observed image coordinates, rejecting long/depth-discontinuous edges."""
    subdiv = cv2.Subdiv2D((0, 0, width, height))
    unique, indices = np.unique(np.round(pixels, 3), axis=0, return_index=True)
    for pixel in unique:
        if 0 <= pixel[0] < width and 0 <= pixel[1] < height:
            subdiv.insert(tuple(float(x) for x in pixel))
    faces = []
    for triangle in subdiv.getTriangleList():
        vertices = np.asarray(triangle).reshape(3, 2)
        distances = np.linalg.norm(vertices[:, None, :] - unique[None, :, :], axis=2)
        nearest = distances.argmin(axis=1)
        if (distances[np.arange(3), nearest] > 0.1).any() or len(set(nearest)) != 3:
            continue
        ids = indices[nearest]
        edges = np.linalg.norm(vertices - np.roll(vertices, 1, axis=0), axis=1)
        depths = points[ids, 2]
        area = np.linalg.norm(np.cross(points[ids[1]] - points[ids[0]], points[ids[2]] - points[ids[0]]))
        if edges.max() <= max_edge and depths.max() / depths.min() <= depth_ratio and area > 1e-10:
            faces.append(ids.tolist())
    return np.asarray(faces, dtype=int).reshape(-1, 3)


def process_3d_scan_reconstruction(study_dir, scan_scope="full", video_path=None, configuration=None):
    started, cpu_started = time.perf_counter(), time.process_time()
    if configuration is None:
        configuration = {}
    if not isinstance(configuration, dict):
        raise ValueError("Reconstruction configuration must be an object")
    reconstruction = configuration.get("reconstruction", {})
    if not isinstance(reconstruction, dict):
        raise ValueError("Reconstruction settings must be an object")
    parameters = reconstruction.get("parameters", {})
    if not isinstance(parameters, dict) or set(parameters) - set(DEFAULT_CONFIG):
        raise ValueError("Unsupported reconstruction parameters")
    config = {**DEFAULT_CONFIG, **parameters}
    if not 2 <= int(config["maxViews"]) <= 12 or not 320 <= int(config["maxImageDimension"]) <= 2048:
        raise ValueError("Unsupported view count or image dimension")
    if not 100 <= int(config["maxFeatures"]) <= 10000 or not 8 <= int(config["minPoints"]) <= 1000:
        raise ValueError("Unsupported feature or minimum-point count")
    for name in ("ratioThreshold", "ransacThresholdPx", "maxReprojectionErrorPx", "minParallaxDegrees", "maxTriangleEdgePixels", "maxTriangleDepthRatio"):
        if not np.isfinite(float(config[name])) or float(config[name]) <= 0:
            raise ValueError(f"{name} must be positive and finite")
    os.makedirs(study_dir, exist_ok=True)
    if any(Path(study_dir, name).exists() for name in ('mesh.obj', 'points.ply', 'mesh.stl', 'reconstruction_report.json')):
        raise ValueError('Reconstruction output already exists; use a new attempt directory')
    acquisition = analyze_video_acquisition(video_path, study_dir, scan_scope, configuration.get("frameSampling"))
    if acquisition["status"] != "ready":
        raise ReconstructionUnavailable(acquisition.get("reason", "Insufficient distinct usable video frames"))
    extraction_ms = acquisition["durationMs"]
    selected = acquisition["selectedFrames"]
    views = [selected[int(i)] for i in np.linspace(0, len(selected) - 1, min(len(selected), int(config["maxViews"])), dtype=int)]
    detector = cv2.SIFT.create(nfeatures=int(config["maxFeatures"]))
    features, images = [], []
    original_width = acquisition["videoMetadata"]["width"]
    original_height = acquisition["videoMetadata"]["height"]
    scale = min(1.0, float(config["maxImageDimension"]) / max(original_width, original_height))
    for view in views:
        frame_path = os.path.join(study_dir, "frames", view["fileName"])
        if file_sha256(frame_path) != view['sha256']:
            raise ReconstructionUnavailable('Selected frame checksum mismatch')
        frame = cv2.imread(frame_path)
        if frame is None:
            raise ReconstructionUnavailable('Selected frame cannot be decoded')
        frame = cv2.resize(frame, (round(original_width * scale), round(original_height * scale)))
        images.append(frame)
        features.append(detector.detectAndCompute(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), None))
    height, width = images[0].shape[:2]
    intrinsics_config = configuration.get("cameraIntrinsics")
    if intrinsics_config is not None:
        if not isinstance(intrinsics_config, dict) or not all(key in intrinsics_config for key in ("fx", "fy", "cx", "cy")):
            raise ValueError("Camera intrinsics must contain fx, fy, cx, and cy")
        try:
            intrinsic = np.array([[intrinsics_config["fx"], 0, intrinsics_config["cx"]],
                                  [0, intrinsics_config["fy"], intrinsics_config["cy"]], [0, 0, 1]], dtype=float)
        except (TypeError, ValueError) as error:
            raise ValueError("Camera intrinsics must be numeric") from error
        intrinsic[0] *= width / original_width
        intrinsic[1] *= height / original_height
        if not np.isfinite(intrinsic).all() or intrinsic[0, 0] <= 0 or intrinsic[1, 1] <= 0:
            raise ValueError("Camera intrinsics must be finite with positive focal lengths")
        intrinsics_source = "provided_uncertified_calibration"
    else:
        intrinsic = np.array([[max(width, height), 0, width / 2], [0, max(width, height), height / 2], [0, 0, 1]], dtype=float)
        intrinsics_source = "estimated_focal_equals_max_image_dimension"
    pose_started = time.perf_counter()
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    best: ReconstructionBest | None = None
    pair_diagnostics: list[dict[str, Any]] = []
    for i in range(len(views) - 1):
        for j in range(i + 1, len(views)):
            key1, desc1 = features[i]
            key2, desc2 = features[j]
            if desc1 is None or desc2 is None or min(len(desc1), len(desc2)) < int(config["minPoints"]):
                continue
            candidates = matcher.knnMatch(desc1, desc2, k=2)
            matches = [a for pair in candidates if len(pair) == 2 for a, b in [pair] if a.distance < config["ratioThreshold"] * b.distance]
            # A repeated descriptor cannot count as independent geometric evidence.
            matches = list({m.trainIdx: m for m in sorted(matches, key=lambda m: -m.distance)}.values())
            if len(matches) < int(config["minPoints"]):
                continue
            first = np.asarray([key1[m.queryIdx].pt for m in matches], dtype=float)
            second = np.asarray([key2[m.trainIdx].pt for m in matches], dtype=float)
            cv2.setRNGSeed(int(config["seed"]))
            essential, mask = cv2.findEssentialMat(first, second, intrinsic, method=cv2.RANSAC,
                prob=0.999, threshold=float(config["ransacThresholdPx"]))
            if essential is None or essential.shape != (3, 3):
                continue
            _, rotation, translation, pose_mask = cv2.recoverPose(essential, first, second, intrinsic, mask=mask)
            good = pose_mask.ravel() != 0
            if good.sum() < int(config["minPoints"]):
                continue
            points, valid, errors, parallax = triangulate_verified(first[good], second[good], intrinsic, rotation, translation,
                config["maxReprojectionErrorPx"], config["minParallaxDegrees"])
            pixels = first[good][valid]
            pair_diagnostics.append({"firstFrame": views[i]["frameIndex"], "secondFrame": views[j]["frameIndex"],
                                     "matches": len(matches), "acceptedPoints": len(points)})
            if len(points) >= int(config["minPoints"]) and (best is None or len(points) > len(best["points"])):
                best = {
                    "points": points,
                    "pixels": pixels,
                    "rotation": rotation,
                    "translation": translation,
                    "errors": errors,
                    "parallax": parallax,
                    "first": i,
                    "second": j,
                }
    pose_ms = (time.perf_counter() - pose_started) * 1000
    if best is None:
        raise ReconstructionUnavailable("Insufficient verified feature tracks or camera baseline; no reconstruction produced")
    if file_sha256(video_path) != acquisition['videoMetadata']['sha256']:
        raise ReconstructionUnavailable('Input video changed during reconstruction')
    mesh_started = time.perf_counter()
    points = best["points"]
    faces = image_topology_mesh(points, best["pixels"], width, height,
                                config["maxTriangleEdgePixels"], config["maxTriangleDepthRatio"])
    if len(faces) < 1:
        raise ReconstructionUnavailable("Verified point cloud does not support a mesh under configured edge limits")
    obj_lines = ["# Experimental sparse two-view reconstruction; units arbitrary; visualization only"]
    obj_lines += ["v " + " ".join(f"{x:.12g}" for x in point) for point in points]
    obj_lines += ["f " + " ".join(str(int(x) + 1) for x in face) for face in faces]
    with open(os.path.join(study_dir, "mesh.obj"), "w") as stream:
        stream.write("\n".join(obj_lines) + "\n")
    colors = images[best["first"]][np.clip(best["pixels"][:, 1].astype(int), 0, height - 1),
                                  np.clip(best["pixels"][:, 0].astype(int), 0, width - 1)][:, ::-1]
    ply = ["ply", "format ascii 1.0", "comment real feature triangulation; arbitrary scale",
           f"element vertex {len(points)}", "property float x", "property float y", "property float z",
           "property uchar red", "property uchar green", "property uchar blue", "end_header"]
    ply += [" ".join([*(f"{x:.12g}" for x in point), *(str(int(c)) for c in color)]) for point, color in zip(points, colors)]
    with open(os.path.join(study_dir, "points.ply"), "w") as stream:
        stream.write("\n".join(ply) + "\n")
    with open(os.path.join(study_dir, "mesh.stl"), "wb") as stream:
        stream.write(export_binary_stl(points.tolist(), faces.tolist(), header_text="Experimental sparse SfM; arbitrary units"))
    if not cv2.imwrite(os.path.join(study_dir, "preview.png"), images[best["first"]]):
        raise OSError("Could not write reconstruction preview")
    mesh_ms = (time.perf_counter() - mesh_started) * 1000
    bounds = {"min": points.min(axis=0).tolist(), "max": points.max(axis=0).tolist()}
    trajectory = []
    for idx, rotation, translation in [(best["first"], np.eye(3), np.zeros(3)),
                                     (best["second"], best["rotation"], best["translation"].reshape(3))]:
        trajectory.append({"frameIndex": views[idx]["frameIndex"], "fileName": views[idx]["fileName"],
            "timestampMs": views[idx]["timestampMs"], "pose": {"worldToCameraRotation": rotation.tolist(),
                "worldToCameraTranslation": translation.tolist(), "position": (-rotation.T @ translation).tolist()},
            "provenance": "essential_matrix_recoverPose", "units": "arbitrary"})
    timings: dict[str, float] = {
        "acquisitionMs": extraction_ms,
        "poseAndTriangulationMs": pose_ms,
        "meshExportMs": mesh_ms,
        "totalMs": (time.perf_counter() - started) * 1000,
        "cpuTimeMs": (time.process_time() - cpu_started) * 1000,
    }
    memory: dict[str, Any] = {
        "processPeakRssBytes": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * (1 if os.uname().sysname == "Darwin" else 1024),
        "scope": "process_lifetime_high_water_mark_not_job_delta",
        "gpuMemoryBytes": None,
    }
    metadata: dict[str, Any] = {"engine": ENGINE, "engineVersion": VERSION, "version": VERSION, "opencvVersion": cv2.__version__,
        "implementationStatus": "experimental", "synthetic": False, "geometrySource": "image_derived", "validated": False,
        "clinicalStatus": "experimental", "measurementCapability": "visualization_only", "units": "arbitrary",
        "coordinateSystem": "first_camera_right_down_forward", "scale": {"status": "uncalibrated", "baseline": 1.0},
        "input": {"sha256": acquisition["videoMetadata"]["sha256"], "media": acquisition["videoMetadata"]},
        "configuration": {**configuration, "frameSampling": acquisition['configuration'],
                          "reconstruction": {"engine": ENGINE, "parameters": config}},
        "selectedFrames": selected,
        "reproducibility": {"python": platform.python_version(), "platform": platform.platform(),
            "numpy": np.__version__, "opencv": cv2.__version__, "opencvThreads": cv2.getNumThreads(),
            "opencvBuildSha256": hashlib.sha256(cv2.getBuildInformation().encode()).hexdigest(),
            "sourceSha256": {name: file_sha256(str(Path(__file__).with_name(name))) for name in
                             ('reconstruction_service.py', 'lidra_service.py', 'dental_filter_service.py')},
            "determinismScope": "Same input/configuration/runtime; cross-platform bitwise identity not guaranteed"}, "cameraIntrinsics": intrinsic.tolist(),
        "intrinsicsSource": intrinsics_source, "lensDistortion": "not_corrected",
        "frameExtractionVersion": acquisition["version"], "scanScope": scan_scope,
        "sampledFrames": len(selected), "registeredFrames": 2, "vertexCount": len(points), "faceCount": len(faces),
        "bounds": bounds, "cameraTrajectory": trajectory, "pairDiagnostics": pair_diagnostics,
        "meanReprojectionErrorPx": float(best["errors"].mean()), "medianParallaxDegrees": float(np.median(best["parallax"])),
        "dentalFiltering": {"enabled": False, "reason": "No anatomical transformations applied"},
        "meshMethod": "image_plane_delaunay_of_verified_sparse_points_with_edge_and_depth_limits",
        "limitations": ["Two views only; partial sparse scene, not full arch", "Uncalibrated intrinsics and unknown scale",
            "Reflective enamel, deforming tissues, lighting and pure rotation can defeat SfM",
            "Triangle interpolation can cross unobserved anatomy; no watertightness or dental segmentation guaranteed"],
        "timings": timings,
        "memory": memory,
        "completedAt": datetime.now(timezone.utc).isoformat()}
    assets = {}
    for name, filename, fmt in [("mesh", "mesh.obj", "obj"), ("ply", "points.ply", "ply"),
                                ("stl", "mesh.stl", "stl"), ("preview", "preview.png", "png")]:
        asset_path = os.path.join(study_dir, filename)
        assets[name] = {"fileName": filename, "format": fmt, "sizeInBytes": os.path.getsize(asset_path),
                        "sha256": file_sha256(asset_path), "measurementCapability": "visualization_only", "units": "arbitrary"}
    assets["mesh"].update(vertexCount=len(points), faceCount=len(faces), bounds=bounds)
    metadata["assets"] = assets
    with open(os.path.join(study_dir, "reconstruction_report.json"), "w") as stream:
        json.dump(metadata, stream, indent=2, allow_nan=False)
    return {"success": True, "assets": assets, "cameraTrajectory": trajectory, "confidence": None,
            "metadata": metadata, "metrics": {"durationMs": timings["totalMs"],
            "sampledFrames": len(selected), "vertexCount": len(points), "faceCount": len(faces),
            "timings": timings, "memory": memory}, "logs": []}
