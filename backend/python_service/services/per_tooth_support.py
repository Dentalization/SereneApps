"""Projection audit against reviewed tooth polygons.

Projection into a polygon is only support on the *reconstructed* mesh. It is
not a percentage of the true anatomical tooth surface or FDI verification.
"""
import cv2
import numpy as np

from .dental_region_evidence import region_mask


def summarize_tooth_support(vertices, faces, views, poses, intrinsic, dental_regions, image_shape,
                            vertex_view_bits=None):
    expected = dental_regions.get("expectedToothIds", []) if isinstance(dental_regions, dict) else []
    if not expected:
        return {"status": "unavailable", "reason": "No individually reviewed tooth polygons",
                "toothIdentity": "unverified", "teeth": []}
    height, width = image_shape[:2]
    points = np.asarray(vertices, dtype=float)
    triangles = np.asarray(faces, dtype=int)
    if vertex_view_bits is not None and len(vertex_view_bits) != len(points):
        raise ValueError("Vertex support count does not match mesh vertices")
    support = {tooth: np.zeros(len(points), dtype=np.uint8) for tooth in expected}
    frames = {tooth: set() for tooth in expected}
    records = {item["frameIndex"]: item for item in dental_regions["frames"]}
    for view_index, (rotation, translation) in poses.items():
        frame_index = views[view_index]["frameIndex"]
        record = records.get(frame_index, {})
        camera = points @ rotation.T + translation
        projected = camera @ intrinsic.T
        valid = np.isfinite(projected).all(axis=1) & (camera[:, 2] > 0)
        with np.errstate(divide="ignore", invalid="ignore"):
            pixels = projected[:, :2] / projected[:, 2:3]
        pixels = np.where(np.isfinite(pixels), pixels, -1)
        x = np.rint(pixels[:, 0]).astype(np.int64)
        y = np.rint(pixels[:, 1]).astype(np.int64)
        valid &= (x >= 0) & (x < width) & (y >= 0) & (y < height)
        x = np.clip(x, 0, width - 1)
        y = np.clip(y, 0, height - 1)
        for tooth in record.get("toothRegions", []):
            tooth_id = tooth["fdi"]
            polygon = np.asarray(tooth["polygon"], dtype=float)
            mask = region_mask((height, width), polygon)
            observed = valid & (mask[y, x] > 0)
            if vertex_view_bits is not None:
                observed &= (np.asarray(vertex_view_bits, dtype=np.uint16) & (1 << view_index)) != 0
            if observed.any():
                support[tooth_id] += observed.astype(np.uint8)
                frames[tooth_id].add(frame_index)
    teeth = []
    for tooth_id in expected:
        supported = support[tooth_id] >= 3
        face_support = np.all(supported[triangles], axis=1) if len(triangles) else np.zeros(0, bool)
        teeth.append({"fdi": tooth_id, "labelSource": "operator_declared_reviewed_polygon",
                      "labelVerified": False, "sourceFrames": sorted(frames[tooth_id]),
                      "projectedVerticesInAnyView": int(np.count_nonzero(support[tooth_id])),
                      "verticesInThreeOrMoreViews": int(np.count_nonzero(supported)),
                      "facesWithThreeViewVertexSupport": int(np.count_nonzero(face_support)),
                      "fractionOfReconstructedMeshVerticesWithThreeViewSupport":
                          float(np.mean(supported)) if len(points) else 0.0,
                      "anatomicalSurfaceCompleteness": None,
                      "referenceSurfaceDeviation": None})
    return {"status": "observed_multiview_support_only" if vertex_view_bits is not None else "projection_support_only",
            "toothIdentity": "operator_declared_unverified",
            "anatomicalCompleteness": "unavailable", "teeth": teeth,
            "missingExpectedTeeth": [entry["fdi"] for entry in teeth if entry["verticesInThreeOrMoreViews"] == 0]}
