"""Measured acquisition diagnostics. No anatomical coverage or calibrated score is inferred."""
import hashlib
import json
import os
import time
from datetime import datetime, timezone

import cv2
import numpy as np
from .dental_region_evidence import normalize_regions, region_mask, region_digest

VERSION = "lidra_dental_evidence_v4"
DEFAULT_CONFIG = {"maxFrames": 48, "minSharpness": 30.0, "minLuminance": 20.0,
                  "maxLuminance": 235.0, "minPixelDifference": 3.0}


def file_sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def display_border_evidence(frame):
    """Flag a persistent display bezel pattern; never infer anatomy from it.

    This intentionally conservative cue needs broad, dark horizontal bands both
    above and below the image content. It is a review trigger, not a screen
    classifier or proof that every unflagged capture is physical dentition.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
    height, width = gray.shape
    center = gray[:, max(0, int(width * .03)):max(1, int(width * .97))]
    dark_rows = np.mean(center < 40, axis=1) >= .92

    def band(start_fraction, end_fraction, minimum_height):
        start, end = int(height * start_fraction), int(height * end_fraction)
        edges = np.diff(np.r_[False, dark_rows[start:end], False].astype(np.int8))
        beginnings, endings = np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)
        spans = [(start + int(a), start + int(b)) for a, b in zip(beginnings, endings)
                 if b - a >= height * minimum_height]
        return max(spans, key=lambda span: span[1] - span[0], default=None)

    upper = band(.12, .45, .025)
    lower = band(.87, 1.0, .01)
    return {"suspectedDisplayBorder": upper is not None and lower is not None,
            "upperBandFraction": [round(value / height, 4) for value in upper] if upper else None,
            "lowerBandFraction": [round(value / height, 4) for value in lower] if lower else None}


def analyze_video_acquisition(video_path=None, study_dir="", scan_scope="full", configuration=None):
    started = time.perf_counter()
    requested = configuration or {}
    if not isinstance(requested, dict) or set(requested) - (set(DEFAULT_CONFIG) | {"strategy", "dentalRegions"}):
        raise ValueError("Unsupported frame sampling parameters")
    strategy = requested.get("strategy", "uniform")
    if strategy not in ("uniform", "geometry_aware"):
        raise ValueError("Unsupported frame sampling strategy")
    config = {**DEFAULT_CONFIG, **requested}
    for key in ("minSharpness", "minLuminance", "maxLuminance", "minPixelDifference"):
        if not np.isfinite(float(config[key])) or float(config[key]) < 0:
            raise ValueError("Frame selection thresholds must be finite and non-negative")
    if not 0 <= float(config["minLuminance"]) < float(config["maxLuminance"]) <= 255:
        raise ValueError("Invalid luminance thresholds")
    if not 2 <= int(config["maxFrames"]) <= 120:
        raise ValueError("maxFrames must be between 2 and 120")
    os.makedirs(study_dir, exist_ok=True)
    report = {
        "version": VERSION, "status": "unavailable", "synthetic": False,
        "analyzedAt": datetime.now(timezone.utc).isoformat(), "scanScope": scan_scope,
        "configuration": config, "qualityScore": None,
        "frameQuality": {"status": "unavailable", "calibrated": False},
        "blur": {"status": "unavailable"}, "motionBlur": {"status": "unavailable"},
        "exposure": {"status": "unavailable"}, "motion": {"status": "unavailable",
            "reason": "Pixel differences do not separate camera motion, object motion and lighting"},
        "redundancy": {"status": "unavailable"},
        "coverage": {"status": "unavailable", "coverageScore": None, "completeness": None,
            "coveredSegments": [], "reason": "Anatomical coverage requires spatially registered anatomy"},
        "selectedFrames": [], "frameSelection": {"selectedFramesCount": 0},
        "qualityDecision": {"status": "unavailable", "calibrated": False},
        "dentalEvidence": {"status": "unavailable", "toothIdentity": "unavailable",
                           "perToothCoverage": "unavailable", "physicalTranslation": "unavailable"},
        "captureTarget": {"status": "not_determined", "method": "persistent_dark_display_border_heuristic_v1",
                          "confirmed": False, "reason": "Physical dental target has not been independently verified"},
    }

    def finish(reason=None):
        if reason:
            report["reason"] = reason
        report["durationMs"] = round((time.perf_counter() - started) * 1000, 3)
        with open(os.path.join(study_dir, "lidra_analysis.json"), "w") as stream:
            json.dump(report, stream, indent=2, allow_nan=False)
        return report

    if not video_path or not os.path.isfile(video_path):
        return finish("Video is missing")
    cap = cv2.VideoCapture(str(video_path))
    try:
        if not cap.isOpened():
            return finish("Video could not be decoded")
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        if frame_count < 2 or not np.isfinite(fps) or fps <= 0:
            return finish("Video frame count or frame rate is unavailable")
        width, height = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if width < 16 or height < 16 or width * height > 40_000_000:
            return finish("Unsupported decoded video dimensions")
        fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
        report["videoMetadata"] = {
            "provenance": "opencv_decoder", "totalFrames": frame_count, "fps": fps,
            "width": width, "height": height, "durationSec": frame_count / fps,
            "codec": "".join(chr((fourcc >> (8 * i)) & 0xff) for i in range(4)),
            "container": {"status": "unavailable", "reason": "OpenCV does not verify container name"},
            "sizeInBytes": os.path.getsize(video_path), "sha256": file_sha256(video_path),
            "durationMethod": "decoder_frame_count_divided_by_reported_fps",
            "variableFrameRateVerified": False,
        }
        regions = None
        if strategy == "geometry_aware":
            regions = normalize_regions(config.get("dentalRegions"), report["videoMetadata"]["sha256"], frame_count)
            indices = sorted(regions)
            report["dentalEvidence"] = {"status": "operator_annotated_unverified", "source": "operator_annotated_unverified",
                "annotationSha256": region_digest(config["dentalRegions"]), "reviewer": config["dentalRegions"]["reviewer"],
                "toothIdentity": "unavailable", "perToothCoverage": "unavailable",
                "physicalTranslation": "unavailable"}
        else:
            indices = np.linspace(0, frame_count - 1, min(frame_count, int(config["maxFrames"])), dtype=int)
        frames_dir = os.path.join(study_dir, "frames")
        os.makedirs(frames_dir, exist_ok=True)
        observations, differences = [], []
        previous = None
        dropped = {"blur": 0, "exposure": 0, "redundancy": 0, "decode": 0,
                   "glare": 0, "mouth_motion": 0, "overlap": 0, "parallax": 0,
                   "dental_features": 0, "frame_limit": 0}
        roi_features = None
        detector = cv2.ORB.create(nfeatures=1500)
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
        annotation_by_index = {item["frameIndex"]: item for item in config.get("dentalRegions", {}).get("frames", [])} if regions else {}
        minimum_spacing = max(1, (indices[-1] - indices[0]) // int(config["maxFrames"])) if regions else 1
        for index in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(index))
            ok, frame = cap.read()
            if not ok or frame is None:
                dropped["decode"] += 1
                continue
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            mask = region_mask(frame.shape, regions[index]) if regions else None
            target_pixels = gray[mask > 0] if mask is not None else gray.ravel()
            sharpness = float(cv2.Laplacian(gray, cv2.CV_64F)[mask > 0].var()) if mask is not None else float(cv2.Laplacian(gray, cv2.CV_64F).var())
            luminance = float(target_pixels.mean())
            glare = float((target_pixels > 245).mean())
            item = {"frameIndex": int(index), "timestampMs": float(index / fps * 1000),
                    "timestampMethod": "frame_index_divided_by_reported_fps", "sharpness": sharpness,
                    "luminance": luminance, "underexposedFraction": float((target_pixels < 20).mean()),
                    "overexposedFraction": float((target_pixels > 235).mean()), "glareFraction": glare,
                    "dentalRegionFraction": float((mask > 0).mean()) if mask is not None else None,
                    "regionSource": "operator_annotated_unverified" if mask is not None else "unavailable",
                    "provenance": "measured",
                    "qualityScore": None}
            item["displayBorderEvidence"] = display_border_evidence(frame)
            if regions:
                item["visibleRegions"] = annotation_by_index[index].get("visibleRegions", [])
                item["mouthStableReview"] = annotation_by_index[index].get("mouthStable") is True
                item["polygon"] = regions[index].tolist()
            if regions and report["selectedFrames"] and index - report["selectedFrames"][-1]["frameIndex"] < minimum_spacing:
                dropped["redundancy"] += 1
                item.update(status="rejected", rejectionReasons=["temporal_spacing_before_geometry_check"])
                observations.append(item)
                continue
            small = cv2.resize(gray, (160, 90))
            difference = float(cv2.absdiff(small, previous).mean()) if previous is not None else None
            if difference is not None:
                differences.append(difference)
            if sharpness < float(config["minSharpness"]):
                dropped["blur"] += 1
                item.update(status="rejected", rejectionReasons=["dental_roi_blur"] if regions else ["global_blur"])
                observations.append(item)
                continue
            if not float(config["minLuminance"]) <= luminance <= float(config["maxLuminance"]):
                dropped["exposure"] += 1
                item.update(status="rejected", rejectionReasons=["dental_roi_exposure"] if regions else ["global_exposure"])
                observations.append(item)
                continue
            if regions and glare > 0.15:
                dropped["glare"] += 1
                item.update(status="rejected", rejectionReasons=["dental_roi_glare"])
                observations.append(item)
                continue
            if regions and not item["mouthStableReview"]:
                dropped["mouth_motion"] += 1
                item.update(status="rejected", rejectionReasons=["mouth_stability_not_reviewed"])
                observations.append(item)
                continue
            if not regions and difference is not None and difference < float(config["minPixelDifference"]):
                dropped["redundancy"] += 1
                item.update(status="rejected", rejectionReasons=["global_redundancy"])
                observations.append(item)
                continue
            features = detector.detectAndCompute(gray, mask) if regions else None
            if regions:
                keypoints, descriptors = features
                item["dentalFeatureCount"] = len(keypoints)
                if descriptors is None or len(keypoints) < 24:
                    dropped["dental_features"] += 1
                    item.update(status="rejected", rejectionReasons=["too_few_dental_features"])
                    observations.append(item)
                    continue
                if roi_features is not None:
                    prior_keypoints, prior_descriptors = roi_features
                    pairs = matcher.knnMatch(prior_descriptors, descriptors, k=2)
                    matches = [a for pair in pairs if len(pair) == 2 for a, b in [pair] if a.distance < 0.75 * b.distance]
                    item["dentalMatchCount"] = len(matches)
                    if len(matches) < 12:
                        dropped["overlap"] += 1
                        item.update(status="rejected", rejectionReasons=["insufficient_dental_overlap"])
                        observations.append(item)
                        continue
                    first = np.float32([prior_keypoints[m.queryIdx].pt for m in matches])
                    second = np.float32([keypoints[m.trainIdx].pt for m in matches])
                    _, inlier_mask = cv2.findFundamentalMat(first, second, cv2.FM_RANSAC, 2.0, 0.999)
                    inliers = inlier_mask.ravel().astype(bool) if inlier_mask is not None else np.zeros(len(matches), bool)
                    item["geometricInlierCount"] = int(inliers.sum())
                    if inliers.sum() < 10:
                        dropped["overlap"] += 1
                        item.update(status="rejected", rejectionReasons=["unverified_dental_overlap"])
                        observations.append(item)
                        continue
                    displacement = np.linalg.norm(first[inliers] - second[inliers], axis=1)
                    item["medianDentalDisplacementPx"] = float(np.median(displacement))
                    item["translationInterpretation"] = "image_displacement_proxy_not_physical_camera_translation"
                    if item["medianDentalDisplacementPx"] < 3.0:
                        dropped["parallax"] += 1
                        item.update(status="rejected", rejectionReasons=["insufficient_dental_viewpoint_change"])
                        observations.append(item)
                        continue
                if len(report["selectedFrames"]) >= int(config["maxFrames"]):
                    dropped["frame_limit"] += 1
                    item.update(status="rejected", rejectionReasons=["frame_limit"])
                    observations.append(item)
                    continue
            filename = f"frame_{int(index):08d}.jpg"
            if not cv2.imwrite(os.path.join(frames_dir, filename), frame, [cv2.IMWRITE_JPEG_QUALITY, 95]):
                raise ValueError("Cannot persist decoded frame")
            item.update(fileName=filename, status="accepted_by_reviewed_region_geometry" if regions else "accepted_global_diagnostic_only",
                        rejectionReasons=[], sha256=file_sha256(os.path.join(frames_dir, filename)))
            report["selectedFrames"].append(item)
            observations.append(item.copy())
            previous = small
            if regions:
                roi_features = features
        count = len(report["selectedFrames"])
        display_frames = [item["frameIndex"] for item in observations
                          if item["displayBorderEvidence"]["suspectedDisplayBorder"]]
        display_suspected = len(observations) >= 5 and len(display_frames) >= .7 * len(observations)
        report["captureTarget"] = {"status": "suspected_display_capture" if display_suspected else "not_determined",
            "method": "persistent_dark_display_border_heuristic_v1", "confirmed": False,
            "analyzedFrames": len(observations), "positiveFrames": len(display_frames),
            "positiveFrameIndices": display_frames,
            "reason": "Persistent full-width dark bands above and below the content resemble a monitor bezel; review original video" if display_suspected else
                      "No persistent display border detected; physical dental target remains unverified"}
        if display_suspected:
            report["failureCode"] = "CAPTURE_TARGET_SCREEN_SUSPECTED"
        blur = {"status": "measured", "method": "grayscale_laplacian_variance",
                "averageSharpness": float(np.mean([x["sharpness"] for x in observations])) if observations else None,
                "units": "intensity_squared", "interpretation": "Uncalibrated focus proxy"}
        observed_labels = sorted({label for frame in report["selectedFrames"] for label in frame.get("visibleRegions", [])})
        missing_labels = sorted(set(config["dentalRegions"]["expectedRegions"]) - set(observed_labels)) if regions else []
        dental_ready = bool(regions) and count >= 3 and not missing_labels and not display_suspected
        report.update(status="ready" if dental_ready else "rejected", blur=blur, motionBlur=blur,
            frameQuality={"status": "measured", "calibrated": False, "observations": observations},
            exposure={"status": "measured", "averageLuminance": float(np.mean([x["luminance"] for x in observations])) if observations else None,
                      "units": "8bit_grayscale_intensity"},
            redundancy={"status": "estimated", "method": "mean_absolute_160x90_pixel_difference",
                        "meanDifference": float(np.mean(differences)) if differences else None},
            frameSelection={"totalFrames": frame_count, "analyzedFrames": len(observations),
                            "selectedFramesCount": count, "dropped": dropped},
            qualityDecision={"status": "accepted_for_experimental_geometry" if dental_ready else "rejected", "calibrated": False,
                             "method": "reviewed_dental_roi_and_geometric_pair_checks" if regions else "global_diagnostic_only",
                             "reason": "Video appears to show a display; the camera observed its surface, not physical teeth" if display_suspected else
                                       "Operator-declared dental regions; at least three connected frames and all declared regions required" if regions else
                                       "No reviewed dental regions: global image quality cannot identify teeth"})
        report["dentalEvidence"].update(acceptedFrames=count, observedRegionLabels=observed_labels,
            expectedRegionLabels=config["dentalRegions"]["expectedRegions"] if regions else [],
            missingRegionLabels=missing_labels, coverageStatus="operator_declared_not_per_tooth_measured",
            annotatorIdentityVerified=False)
        return finish(None if dental_ready else report["qualityDecision"]["reason"])
    finally:
        cap.release()
