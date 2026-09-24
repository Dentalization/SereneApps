"""Measured acquisition diagnostics. No anatomical coverage or calibrated score is inferred."""
import hashlib
import json
import os
import time
from datetime import datetime, timezone

import cv2
import numpy as np

VERSION = "lidra_measured_v2"
DEFAULT_CONFIG = {"maxFrames": 48, "minSharpness": 30.0, "minLuminance": 20.0,
                  "maxLuminance": 235.0, "minPixelDifference": 3.0}


def file_sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def analyze_video_acquisition(video_path=None, study_dir="", scan_scope="full", configuration=None):
    started = time.perf_counter()
    requested = configuration or {}
    if not isinstance(requested, dict) or set(requested) - (set(DEFAULT_CONFIG) | {"strategy"}):
        raise ValueError("Unsupported frame sampling parameters")
    if requested.get("strategy", "uniform") != "uniform":
        raise ValueError("Only uniform frame sampling is implemented")
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
        indices = np.linspace(0, frame_count - 1, min(frame_count, int(config["maxFrames"])), dtype=int)
        frames_dir = os.path.join(study_dir, "frames")
        os.makedirs(frames_dir, exist_ok=True)
        observations, differences = [], []
        previous = None
        dropped = {"blur": 0, "exposure": 0, "redundancy": 0, "decode": 0}
        for index in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(index))
            ok, frame = cap.read()
            if not ok or frame is None:
                dropped["decode"] += 1
                continue
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            sharpness, luminance = float(cv2.Laplacian(gray, cv2.CV_64F).var()), float(gray.mean())
            item = {"frameIndex": int(index), "timestampMs": float(index / fps * 1000),
                    "timestampMethod": "frame_index_divided_by_reported_fps", "sharpness": sharpness,
                    "luminance": luminance, "underexposedFraction": float((gray < 20).mean()),
                    "overexposedFraction": float((gray > 235).mean()), "provenance": "measured",
                    "qualityScore": None}
            observations.append(item.copy())
            small = cv2.resize(gray, (160, 90))
            difference = float(cv2.absdiff(small, previous).mean()) if previous is not None else None
            if difference is not None:
                differences.append(difference)
            if sharpness < float(config["minSharpness"]):
                dropped["blur"] += 1
                continue
            if not float(config["minLuminance"]) <= luminance <= float(config["maxLuminance"]):
                dropped["exposure"] += 1
                continue
            if difference is not None and difference < float(config["minPixelDifference"]):
                dropped["redundancy"] += 1
                continue
            filename = f"frame_{int(index):08d}.jpg"
            if not cv2.imwrite(os.path.join(frames_dir, filename), frame, [cv2.IMWRITE_JPEG_QUALITY, 95]):
                raise ValueError("Cannot persist decoded frame")
            item.update(fileName=filename, status="accepted_by_heuristic", sha256=file_sha256(os.path.join(frames_dir, filename)))
            report["selectedFrames"].append(item)
            previous = small
        count = len(report["selectedFrames"])
        blur = {"status": "measured", "method": "grayscale_laplacian_variance",
                "averageSharpness": float(np.mean([x["sharpness"] for x in observations])) if observations else None,
                "units": "intensity_squared", "interpretation": "Uncalibrated focus proxy"}
        report.update(status="ready" if count >= 2 else "rejected", blur=blur, motionBlur=blur,
            frameQuality={"status": "measured", "calibrated": False, "observations": observations},
            exposure={"status": "measured", "averageLuminance": float(np.mean([x["luminance"] for x in observations])) if observations else None,
                      "units": "8bit_grayscale_intensity"},
            redundancy={"status": "estimated", "method": "mean_absolute_160x90_pixel_difference",
                        "meanDifference": float(np.mean(differences)) if differences else None},
            frameSelection={"totalFrames": frame_count, "analyzedFrames": len(observations),
                            "selectedFramesCount": count, "dropped": dropped},
            qualityDecision={"status": "accepted" if count >= 2 else "rejected", "calibrated": False,
                             "method": "documented_thresholds", "reason": "At least two distinct usable frames required"})
        return finish()
    finally:
        cap.release()
