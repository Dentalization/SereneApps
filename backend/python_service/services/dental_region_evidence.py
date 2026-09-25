"""Auditable, video-bound operator regions; no verified clinical identity claim."""
import hashlib
import json

import cv2
import numpy as np


def normalize_regions(record, video_sha256, frame_count):
    """Return reviewed polygons keyed by decoded frame index, or reject ambiguity."""
    if not isinstance(record, dict) or record.get("source") != "operator_annotated_unverified":
        raise ValueError("Dental regions require operator_annotated_unverified provenance")
    if record.get("videoSha256") != video_sha256 or not isinstance(record.get("reviewer"), str) or not record["reviewer"].strip():
        raise ValueError("Dental regions must identify reviewer and exact source video SHA256")
    expected = record.get("expectedRegions")
    if not isinstance(expected, list) or not expected or len(expected) > 64 or any(
            not isinstance(label, str) or not label.strip() or len(label) > 64 for label in expected):
        raise ValueError("Dental regions require explicit expected coverage labels")
    if len(set(expected)) != len(expected):
        raise ValueError("Expected dental region labels must be unique")
    expected_teeth = record.get("expectedToothIds", [])
    if not isinstance(expected_teeth, list) or len(expected_teeth) > 32 or any(
            type(tooth) is not int or tooth // 10 not in (1, 2, 3, 4) or tooth % 10 not in range(1, 9)
            for tooth in expected_teeth) or len(set(expected_teeth)) != len(expected_teeth):
        raise ValueError("Expected FDI tooth IDs must be unique adult identifiers")
    frames = record.get("frames")
    if not isinstance(frames, list) or not 2 <= len(frames) <= 120:
        raise ValueError("Dental regions require 2–120 individually reviewed frames")
    result = {}
    for item in frames:
        if not isinstance(item, dict) or type(item.get("frameIndex")) is not int:
            raise ValueError("Dental region frame index is invalid")
        index = item["frameIndex"]
        polygon = np.asarray(item.get("polygon"), dtype=np.float64)
        if index in result or not 0 <= index < frame_count or polygon.ndim != 2 or polygon.shape[1] != 2 or not 3 <= len(polygon) <= 64:
            raise ValueError("Dental region must be a unique in-range polygon")
        if not np.isfinite(polygon).all() or (polygon < 0).any() or (polygon > 1).any():
            raise ValueError("Dental region coordinates must be normalized to [0,1]")
        if abs(float(cv2.contourArea(polygon.astype(np.float32)))) < 0.002:
            raise ValueError("Dental region polygon is too small")
        labels = item.get("visibleRegions")
        if not isinstance(labels, list) or any(label not in expected for label in labels):
            raise ValueError("Visible region labels must be a subset of expected regions")
        if item.get("mouthStable") is not True and item.get("mouthStable") is not False:
            raise ValueError("Each frame requires an explicit mouth-stability review")
        tooth_regions = item.get("toothRegions", [])
        if not isinstance(tooth_regions, list) or len(tooth_regions) > 32:
            raise ValueError("Frame tooth regions must be an array")
        tooth_ids = set()
        for tooth in tooth_regions:
            if not isinstance(tooth, dict) or tooth.get("fdi") not in expected_teeth or tooth["fdi"] in tooth_ids:
                raise ValueError("Frame tooth ID is missing, unexpected or duplicated")
            tooth_ids.add(tooth["fdi"])
            tooth_polygon = np.asarray(tooth.get("polygon"), dtype=np.float64)
            if tooth_polygon.ndim != 2 or tooth_polygon.shape[1] != 2 or not 3 <= len(tooth_polygon) <= 64:
                raise ValueError("Tooth region requires a polygon")
            if not np.isfinite(tooth_polygon).all() or (tooth_polygon < 0).any() or (tooth_polygon > 1).any():
                raise ValueError("Tooth polygon coordinates must be normalized")
            if abs(float(cv2.contourArea(tooth_polygon.astype(np.float32)))) < 0.00005:
                raise ValueError("Tooth region polygon is too small")
            if any(cv2.pointPolygonTest(polygon.astype(np.float32), tuple(map(float, point)), False) < 0
                   for point in tooth_polygon):
                raise ValueError("Tooth polygon must lie inside the dental region")
        result[index] = polygon
    return result


def region_mask(shape, polygon):
    height, width = shape[:2]
    pixels = np.rint(polygon * [width - 1, height - 1]).astype(np.int32)
    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(mask, [pixels], 255)
    return mask


def region_digest(record):
    canonical = json.dumps(record, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(canonical.encode()).hexdigest()
