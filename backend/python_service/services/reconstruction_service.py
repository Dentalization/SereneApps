"""Experimental ROI-limited SfM and CPU dense stereo, with sparse diagnostics.

Only a dense result supported by multiple registered views can replace the
best-pair diagnostic mesh. Neither output establishes dental accuracy or scale.
"""
import json
import os
import re
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
    query_indices: np.ndarray

from .dental_filter_service import export_binary_stl
from .lidra_service import DEFAULT_CONFIG as LIDRA_DEFAULT_CONFIG, VERSION as LIDRA_VERSION, analyze_video_acquisition, file_sha256
from .multiview_tracks import build_multiview_tracks, bundle_adjust_tracks
from .dense_multiview_stereo import dense_multiview_surface
from .per_tooth_support import summarize_tooth_support
from .mesh_surface_audit import self_intersection_report

ENGINE = "opencv_sparse_sfm"
VERSION = "2.5.0"
DEFAULT_CONFIG = {"maxViews": 8, "maxImageDimension": 1600, "maxFeatures": 6000,
                  "ratioThreshold": 0.72, "ransacThresholdPx": 1.0,
                  "maxReprojectionErrorPx": 2.0, "minPoints": 20,
                  "minParallaxDegrees": 0.5, "maxTriangleEdgePixels": 120.0,
                  "maxTriangleDepthRatio": 1.25, "seed": 0}


class ReconstructionUnavailable(ValueError):
    """The real input cannot support the requested reconstruction."""


def select_reconstruction_views(selected, maximum):
    """Keep coverage labels and viewpoint proxies when a frame budget is required.

    These are acquisition proxies, not solved camera baselines or tooth identity.
    """
    if len(selected) <= maximum:
        return selected, {"method": "all_accepted_frames", "discardedFrameIndices": []}
    chosen = {0, len(selected) - 1}
    all_span = max(1, selected[-1]["frameIndex"] - selected[0]["frameIndex"])
    while len(chosen) < maximum:
        covered = {label for index in chosen for label in selected[index].get("visibleRegions", [])}
        def gain(index):
            frame = selected[index]
            new_labels = len(set(frame.get("visibleRegions", [])) - covered)
            separation = min(abs(frame["frameIndex"] - selected[other]["frameIndex"])
                             for other in chosen) / all_span
            displacement = min(float(frame.get("medianDentalDisplacementPx") or 0), 40) / 40
            features = min(float(frame.get("dentalFeatureCount") or 0), 500) / 500
            return (new_labels * 3 + separation * 2 + displacement + features * 0.25,
                    -frame["frameIndex"])
        chosen.add(max((index for index in range(len(selected)) if index not in chosen), key=gain))
    kept = [selected[index] for index in sorted(chosen)]
    return kept, {"method": "greedy_declared_coverage_temporal_diversity_and_image_displacement_proxy_v1",
                  "selectedFrameIndices": [item["frameIndex"] for item in kept],
                  "discardedFrameIndices": [item["frameIndex"] for index, item in enumerate(selected) if index not in chosen],
                  "translationStatus": "physical_camera_translation_not_measured"}


def _verified_acquisition(study_dir, video_path, scan_scope, frame_sampling):
    """Reuse this attempt's measured frames only when report and bytes still agree."""
    report_path = Path(study_dir, "lidra_analysis.json")
    if not report_path.exists():
        return None
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError) as error:
        raise ReconstructionUnavailable("Acquisition report cannot be read") from error
    expected_config = {**LIDRA_DEFAULT_CONFIG, **(frame_sampling or {})}
    if (not isinstance(report, dict) or report.get("version") != LIDRA_VERSION
            or report.get("status") not in ("ready", "rejected") or report.get("scanScope") != scan_scope
            or report.get("configuration") != expected_config):
        raise ReconstructionUnavailable("Acquisition report does not match this scan configuration")
    media = report.get("videoMetadata") or {}
    if (not isinstance(media, dict) or not video_path or not Path(video_path).is_file()
            or media.get("sha256") != file_sha256(video_path)
            or media.get("sizeInBytes") != Path(video_path).stat().st_size):
        raise ReconstructionUnavailable("Acquisition report does not match the input video")
    selected = report.get("selectedFrames")
    frames_dir = Path(study_dir, "frames")
    if not isinstance(selected, list) or len(selected) < 2 or frames_dir.is_symlink():
        raise ReconstructionUnavailable("Acquisition report has no verified frame selection")
    seen = set()
    for item in selected:
        if not isinstance(item, dict) or not isinstance(item.get("frameIndex"), int):
            raise ReconstructionUnavailable("Acquisition frame record is invalid")
        index = item["frameIndex"]
        filename = f"frame_{index:08d}.jpg"
        if index < 0 or item.get("fileName") != filename or not re.fullmatch(r"[a-f0-9]{64}", str(item.get("sha256", ""))) or index in seen:
            raise ReconstructionUnavailable("Acquisition frame identity is invalid")
        seen.add(index)
        frame = frames_dir / filename
        if frame.is_symlink() or not frame.is_file() or file_sha256(frame) != item["sha256"]:
            raise ReconstructionUnavailable("Acquisition frame checksum mismatch")
    return report


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


def mesh_topology_diagnostics(vertex_count, faces):
    """Report observed connectivity, without inferring dental completeness."""
    if vertex_count < 0 or faces.ndim != 2 or faces.shape[1] != 3:
        raise ValueError("Mesh topology is invalid")
    parent = list(range(vertex_count))

    def root(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    for triangle in faces:
        a, b, c = (int(i) for i in triangle)
        if min(a, b, c) < 0 or max(a, b, c) >= vertex_count:
            raise ValueError("Mesh face references an invalid vertex")
        anchor = root(a)
        parent[root(b)] = anchor
        parent[root(c)] = anchor
    components = {}
    for triangle in faces:
        component = root(int(triangle[0]))
        components[component] = components.get(component, 0) + 1
    largest_faces = max(components.values(), default=0)
    used_vertices = len(set(int(i) for i in faces.flat))
    edge_incidence = {}
    unique_faces = set()
    for triangle in faces:
        ids = tuple(int(i) for i in triangle)
        unique_faces.add(tuple(sorted(ids)))
        for a, b in zip(ids, ids[1:] + ids[:1]):
            key = (min(a, b), max(a, b))
            edge_incidence.setdefault(key, []).append((a, b))
    boundary_edges = sum(len(entries) == 1 for entries in edge_incidence.values())
    non_manifold_edges = sum(len(entries) > 2 for entries in edge_incidence.values())
    winding_conflicts = sum(len(entries) == 2 and entries[0] == entries[1]
                            for entries in edge_incidence.values())
    return {"connectedComponents": len(components), "largestComponentFaces": largest_faces,
            "largestComponentFaceFraction": largest_faces / len(faces) if len(faces) else 0.0,
            "usedVertices": used_vertices, "isolatedVertices": vertex_count - used_vertices,
            "boundaryEdges": boundary_edges, "nonManifoldEdges": non_manifold_edges,
            "inconsistentWindingEdges": winding_conflicts,
            "duplicateFaces": len(faces) - len(unique_faces),
            "watertight": bool(faces.size) and boundary_edges == 0 and non_manifold_edges == 0,
            "selfIntersections": {"status": "not_evaluated"}}


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
    acquisition = _verified_acquisition(study_dir, video_path, scan_scope, configuration.get("frameSampling"))
    acquisition_source = "verified_persisted_report" if acquisition is not None else "fresh_analysis"
    if acquisition is None:
        acquisition = analyze_video_acquisition(video_path, study_dir, scan_scope, configuration.get("frameSampling"))
    diagnostic_only = (acquisition["status"] == "rejected"
                       and acquisition.get("configuration", {}).get("strategy", "uniform") == "uniform"
                       and len(acquisition.get("selectedFrames", [])) >= 2)
    if acquisition["status"] != "ready" and not diagnostic_only:
        raise ReconstructionUnavailable(acquisition.get("reason", "Insufficient distinct usable video frames"))
    extraction_ms = acquisition["durationMs"]
    selected = acquisition["selectedFrames"]
    views, view_selection = select_reconstruction_views(selected, int(config["maxViews"]))
    detector = cv2.SIFT.create(nfeatures=int(config["maxFeatures"]))
    features, images, dental_masks = [], [], []
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
        from .dental_region_evidence import region_mask
        polygon = view.get("polygon")
        if diagnostic_only:
            mask = np.full(frame.shape[:2], 255, np.uint8)
        else:
            if view.get("regionSource") != "operator_annotated_unverified" or polygon is None:
                raise ReconstructionUnavailable("Selected frame has no reviewed dental-region evidence")
            mask = region_mask(frame.shape, np.asarray(polygon, dtype=float))
        dental_masks.append(mask)
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
    distortion = None
    if intrinsics_config is not None and "distortion" in intrinsics_config:
        values = intrinsics_config["distortion"]
        if not isinstance(values, list) or len(values) not in (4, 5):
            raise ValueError("Lens distortion requires [k1,k2,p1,p2,(k3)]")
        distortion = np.asarray(values, dtype=float)
        if not np.isfinite(distortion).all():
            raise ValueError("Lens distortion coefficients must be finite")
    for index, frame in enumerate(images):
        if distortion is not None:
            images[index] = cv2.undistort(frame, intrinsic, distortion)
            dental_masks[index] = cv2.undistort(dental_masks[index], intrinsic, distortion)
        features.append(detector.detectAndCompute(cv2.cvtColor(images[index], cv2.COLOR_BGR2GRAY), dental_masks[index]))
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
            query_indices = np.asarray([m.queryIdx for m in matches], dtype=int)[good][valid]
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
                    "query_indices": query_indices,
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
    topology = mesh_topology_diagnostics(len(points), faces)
    # Register additional views against the same measured 3D points. This verifies
    # support across time; it does not turn a sparse pair mesh into a dense surface.
    registered_views = []
    reference_descriptors = features[best["first"]][1]
    point_by_feature = {int(index): point for index, point in zip(best["query_indices"], points)}
    for view_index, (_, descriptors) in enumerate(features):
        if view_index in (best["first"], best["second"]) or descriptors is None:
            continue
        candidates = matcher.knnMatch(reference_descriptors, descriptors, k=2)
        matches = [a for pair in candidates if len(pair) == 2 for a, b in [pair]
                   if a.distance < config["ratioThreshold"] * b.distance and a.queryIdx in point_by_feature]
        matches = list({m.trainIdx: m for m in sorted(matches, key=lambda m: -m.distance)}.values())
        if len(matches) < 8:
            continue
        object_points = np.asarray([point_by_feature[m.queryIdx] for m in matches], dtype=np.float64)
        image_points = np.asarray([features[view_index][0][m.trainIdx].pt for m in matches], dtype=np.float64)
        cv2.setRNGSeed(int(config["seed"]))
        try:
            solved, rvec, tvec, inliers = cv2.solvePnPRansac(object_points, image_points, intrinsic, None,
                iterationsCount=100, reprojectionError=max(2.0, float(config["maxReprojectionErrorPx"])),
                confidence=0.999, flags=cv2.SOLVEPNP_EPNP)
        except cv2.error:
            continue
        if not solved or inliers is None or len(inliers) < 8:
            continue
        projected, _ = cv2.projectPoints(object_points[inliers[:, 0]], rvec, tvec, intrinsic, None)
        errors = np.linalg.norm(projected[:, 0, :] - image_points[inliers[:, 0]], axis=1)
        if not np.isfinite(errors).all() or float(np.median(errors)) > float(config["maxReprojectionErrorPx"]):
            continue
        registered_views.append((view_index, cv2.Rodrigues(rvec)[0], tvec.reshape(3), len(inliers), float(np.median(errors))))
    registered_poses = {best["first"]: (np.eye(3), np.zeros(3)),
                        best["second"]: (best["rotation"], best["translation"].reshape(3))}
    registered_poses.update({index: (rotation, translation) for index, rotation, translation, _, _ in registered_views})
    multiview_points, multiview_tracks, multiview_pairs = build_multiview_tracks(
        features, registered_poses, intrinsic, ratio=float(config["ratioThreshold"]),
        max_error=float(config["maxReprojectionErrorPx"]),
        min_parallax=float(config["minParallaxDegrees"]), seed=int(config["seed"]))
    multiview_points, registered_poses, bundle_adjustment = bundle_adjust_tracks(
        multiview_points, multiview_tracks, registered_poses, intrinsic,
        best["first"], best["second"])
    dense_result, dense_diagnostics = (None, {"status": "disabled_global_diagnostic", "pairsExecuted": 0}) if diagnostic_only else \
        dense_multiview_surface(images, dental_masks, intrinsic, registered_poses)
    if dense_result is not None:
        points, faces, vertex_view_bits, vertex_pair_counts, face_pair_ids = dense_result
        topology = mesh_topology_diagnostics(len(points), faces)
        topology["selfIntersections"] = self_intersection_report(points, faces)
        mesh_method = "opencv_rectified_sgbm_multiview_supported_patch_union_no_hole_fill"
    else:
        mesh_method = "image_plane_delaunay_sparse_diagnostic_only"
    per_tooth = summarize_tooth_support(points, faces, views, registered_poses,
        intrinsic, acquisition["configuration"].get("dentalRegions"), images[0].shape,
        vertex_view_bits=vertex_view_bits if dense_result is not None else None)
    if dense_result is not None:
        support_path = os.path.join(study_dir, "vertex_support.npz")
        np.savez_compressed(support_path, view_bits=vertex_view_bits, pair_counts=vertex_pair_counts,
                            face_source_pair=face_pair_ids)
        dense_diagnostics["supportArtifact"] = {"fileName": "vertex_support.npz",
            "sha256": file_sha256(support_path), "sizeInBytes": os.path.getsize(support_path),
            "viewSlots": {str(index): views[index]["frameIndex"] for index in range(len(views))},
            "encoding": "uint16_bit_per_view_slot_uint8_pair_count_int16_face_source_pair"}
    obj_lines = [f"# Experimental {mesh_method}; units arbitrary; visualization only"]
    obj_lines += ["v " + " ".join(f"{x:.12g}" for x in point) for point in points]
    obj_lines += ["f " + " ".join(str(int(x) + 1) for x in face) for face in faces]
    with open(os.path.join(study_dir, "mesh.obj"), "w") as stream:
        stream.write("\n".join(obj_lines) + "\n")
    point_cloud = points if dense_result is not None else (multiview_points if len(multiview_points) else points)
    point_cloud_source = ("three_view_consensus_dense_vertices" if dense_result is not None else
                          "verified_three_plus_view_tracks" if len(multiview_points) else "best_pair_sparse_diagnostic")
    colors = np.full((len(point_cloud), 3), 220, dtype=np.uint8)
    ply = ["ply", "format ascii 1.0", f"comment {point_cloud_source}; arbitrary scale",
           f"element vertex {len(point_cloud)}", "property float x", "property float y", "property float z",
           "property uchar red", "property uchar green", "property uchar blue", "end_header"]
    ply += [" ".join([*(f"{x:.12g}" for x in point), *(str(int(c)) for c in color)]) for point, color in zip(point_cloud, colors)]
    with open(os.path.join(study_dir, "points.ply"), "w") as stream:
        stream.write("\n".join(ply) + "\n")
    with open(os.path.join(study_dir, "mesh.stl"), "wb") as stream:
        stream.write(export_binary_stl(points.tolist(), faces.tolist(), header_text="Experimental observed geometry; arbitrary units"))
    if not cv2.imwrite(os.path.join(study_dir, "preview.png"), images[best["first"]]):
        raise OSError("Could not write reconstruction preview")
    mesh_ms = (time.perf_counter() - mesh_started) * 1000
    bounds = {"min": points.min(axis=0).tolist(), "max": points.max(axis=0).tolist()}
    trajectory = []
    base_views = [(best["first"], *registered_poses[best["first"]], "reference_camera"),
                  (best["second"], *registered_poses[best["second"]], "essential_matrix_recoverPose")]
    verified_views = [(idx, *registered_poses[idx], "pnp_ransac")
                      for idx, _, _, _, _ in registered_views]
    for idx, rotation, translation, provenance in base_views + verified_views:
        trajectory.append({"frameIndex": views[idx]["frameIndex"], "fileName": views[idx]["fileName"],
            "timestampMs": views[idx]["timestampMs"], "pose": {"worldToCameraRotation": rotation.tolist(),
                "worldToCameraTranslation": translation.tolist(), "position": (-rotation.T @ translation).tolist()},
            "provenance": provenance, "units": "arbitrary"})
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
        "implementationStatus": "experimental_diagnostic" if diagnostic_only else "experimental",
        "diagnosticOnly": diagnostic_only, "synthetic": False, "geometrySource": "image_derived", "validated": False,
        "clinicalStatus": "experimental", "measurementCapability": "visualization_only", "units": "arbitrary",
        "coordinateSystem": "first_camera_right_down_forward", "scale": {"status": "uncalibrated", "baseline": 1.0},
        "input": {"sha256": acquisition["videoMetadata"]["sha256"], "media": acquisition["videoMetadata"]},
        "configuration": {**configuration, "frameSampling": acquisition['configuration'],
                          "reconstruction": {"engine": ENGINE, "parameters": config}},
        "selectedFrames": selected,
        "reconstructionViewSelection": view_selection,
        "reproducibility": {"python": platform.python_version(), "platform": platform.platform(),
            "numpy": np.__version__, "opencv": cv2.__version__, "opencvThreads": cv2.getNumThreads(),
            "opencvBuildSha256": hashlib.sha256(cv2.getBuildInformation().encode()).hexdigest(),
            "sourceSha256": {name: file_sha256(str(Path(__file__).with_name(name))) for name in
                             ('reconstruction_service.py', 'lidra_service.py', 'dental_filter_service.py',
                              'dental_region_evidence.py', 'multiview_tracks.py', 'dense_multiview_stereo.py',
                              'per_tooth_support.py', 'mesh_surface_audit.py')},
            "determinismScope": "Same input/configuration/runtime; cross-platform bitwise identity not guaranteed"}, "cameraIntrinsics": intrinsic.tolist(),
        "intrinsicsSource": intrinsics_source,
        "lensDistortion": {"status": "corrected_with_supplied_coefficients" if distortion is not None else "not_corrected",
                           "coefficients": distortion.tolist() if distortion is not None else None},
        "frameExtractionVersion": acquisition["version"], "acquisitionSource": acquisition_source, "scanScope": scan_scope,
        "sampledFrames": len(selected), "registeredFrames": len(trajectory), "vertexCount": len(points), "faceCount": len(faces),
        "meshTopology": topology,
        "denseMultiView": {**dense_diagnostics,
            "attemptedPairFrameIndices": [[views[i]["frameIndex"], views[j]["frameIndex"]]
                                           for i, j in dense_diagnostics.get("attemptedPairFrames", [])],
            "pairFrameIndices": [[views[i]["frameIndex"], views[j]["frameIndex"]]
                                 for i, j in dense_diagnostics.get("pairFrames", [])],
            "surfacePatchFrameIndices": [[views[patch["firstView"]]["frameIndex"],
                                          views[patch["secondView"]]["frameIndex"]]
                                         for patch in dense_diagnostics.get("surfacePatches", [])]},
        "perToothSupport": per_tooth,
        "additionalViewEvidence": [{"frameIndex": views[idx]["frameIndex"], "matchedPoints": count,
                                    "medianReprojectionErrorPx": error} for idx, _, _, count, error in registered_views],
        "multiViewSparse": {"status": "measured" if len(multiview_points) else "insufficient",
            "pointCloudSource": point_cloud_source, "pointCount": len(multiview_points),
            "contributingFrames": sorted({views[i]["frameIndex"] for track in multiview_tracks for i in track["views"]}),
            "trackLengthHistogram": {str(length): sum(track["length"] == length for track in multiview_tracks)
                                     for length in sorted({track["length"] for track in multiview_tracks})},
            "medianReprojectionErrorPx": float(np.median([track["maxReprojectionErrorPx"] for track in multiview_tracks])) if multiview_tracks else None,
            "medianParallaxDegrees": float(np.median([track["parallaxDegrees"] for track in multiview_tracks])) if multiview_tracks else None,
            "pairEvidence": [{**item, "firstFrame": views[item["firstView"]]["frameIndex"],
                              "secondFrame": views[item["secondView"]]["frameIndex"]} for item in multiview_pairs],
            "bundleAdjustment": bundle_adjustment, "denseMvs": dense_diagnostics["status"]},
        "featureSupport": {"normalizedBounds": [float(best["pixels"][:, 0].min() / width),
                                                  float(best["pixels"][:, 1].min() / height),
                                                  float(best["pixels"][:, 0].max() / width),
                                                  float(best["pixels"][:, 1].max() / height)]},
        "bestPair": {"firstFrame": views[best["first"]]["frameIndex"],
                     "secondFrame": views[best["second"]]["frameIndex"],
                     "acceptedPoints": len(best["points"])},
        "bounds": bounds, "cameraTrajectory": trajectory, "pairDiagnostics": pair_diagnostics,
        "meanReprojectionErrorPx": float(best["errors"].mean()), "medianParallaxDegrees": float(np.median(best["parallax"])),
        "dentalFiltering": {"enabled": False, "reason": "No anatomical transformations applied"},
        "meshMethod": mesh_method,
        "dentalEvidence": acquisition.get("dentalEvidence"),
        "geometryEvidence": {"pointSource": "dense_multiview_stereo" if dense_result is not None else "best_pair_sparse_triangulation",
            "contributingViews": len({view for view in range(len(views))
                                      if any(int(bits) & (1 << view) for bits in vertex_view_bits)}) if dense_result is not None else 2,
            "denseStatus": dense_diagnostics["status"], "denseSupportedPoints": dense_diagnostics.get("supportedVertices", 0),
            "meshFromDense": dense_result is not None,
            "perToothCoverageStatus": per_tooth["status"], "inferredGeometry": False},
        "limitations": ["Global image features can describe chin, skin, clothing or background; never dental evidence" if diagnostic_only else
                        "Operator-annotated dental ROI is not independently verified anatomy",
            "Sparse initialization uses a best pair; joint bundle adjustment is local to registered views and may be rejected", "Physical scale remains unvalidated",
            "Reflective enamel, deforming tissues, lighting and pure rotation can defeat SfM",
            "Dental identity is operator-declared and unverified; anatomical surface completeness and watertightness are not established"],
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
