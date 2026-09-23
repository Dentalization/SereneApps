"""
tooth_segmentation_service.py
Phase 12 — Dental Semantic Layer: Tooth Segmentation & FDI Mapping

Implements a geometric heuristic segmentation pipeline:
  1. Project arch vertices onto the parabolic X-axis
  2. Divide into 16 positional buckets (8 per quadrant)
  3. Assign FDI numbers based on arch coordinate + Z-height
  4. Emit ToothInstance objects with centroid, bounds, and vertex membership

IMPORTANT: This is a geometric heuristic, NOT an ML-based segmentation.
All instances are marked confidence ≤ 0.40 and experimental = True.
The interface (segment_teeth_from_mesh signature) is designed for future
ML engine drop-in replacement (PointNet++, MNET, etc.).

Engine ID: geometric_heuristic_v1
"""

from __future__ import annotations

import math
import json
import os
from typing import Any

import numpy as np


# ---------------------------------------------------------------------------
# FDI Constants
# ---------------------------------------------------------------------------

# Tooth types by position within a quadrant (1=central → 8=3rd molar)
_POSITION_TO_TYPE = {
    1: "incisor",   # central incisor
    2: "incisor",   # lateral incisor
    3: "canine",
    4: "premolar",
    5: "premolar",
    6: "molar",
    7: "molar",
    8: "molar",
}

# Quadrant colour hints (for frontend consumption)
_QUADRANT_COLOR = {
    1: "#22d3ee",   # cyan
    2: "#818cf8",   # indigo
    3: "#34d399",   # emerald
    4: "#fbbf24",   # amber
}

# Arch X boundaries
ARCH_X_MAX = 28.0   # mm
ARCH_BUCKET_WIDTH = ARCH_X_MAX / 8  # 3.5 mm per tooth slot


def _fdi_from_quadrant_position(quadrant: int, position: int) -> int:
    """
    FDI notation: quadrant * 10 + position
    Q1: 11-18, Q2: 21-28, Q3: 31-38, Q4: 41-48
    """
    return quadrant * 10 + position


def _assign_quadrant_and_position(
    x: float,
    z: float,
    gingival_z_mid: float,
) -> tuple[int, int]:
    """
    Assign FDI quadrant and position index from arch X coordinate and Z height.

    Arch coordinate system (from dental_filter_service.py):
      X > 0 → patient right
      X < 0 → patient left
      Z > gingival_z_mid → upper arch; Z ≤ gingival_z_mid → lower arch

    Quadrant assignment:
      Upper right (X > 0) → Q1 (FDI 11–18, position 1=central → 8=molar)
      Upper left  (X < 0) → Q2 (FDI 21–28, position 1=central → 8=molar)
      Lower left  (X < 0) → Q3 (FDI 31–38, position 1=central → 8=molar)
      Lower right (X > 0) → Q4 (FDI 41–48, position 1=central → 8=molar)
    """
    is_upper = z > gingival_z_mid
    is_right = x >= 0.0

    if is_upper and is_right:
        quadrant = 1
    elif is_upper and not is_right:
        quadrant = 2
    elif not is_upper and not is_right:
        quadrant = 3
    else:
        quadrant = 4

    # Position within quadrant: 1 (central/incisor) → 8 (3rd molar)
    # Distance from midline increases with |x|
    abs_x = abs(x)
    # Clamp to [0, ARCH_X_MAX]
    abs_x = min(abs_x, ARCH_X_MAX)
    # bucket: 0 = midline, 7 = most distal
    bucket = int(abs_x / ARCH_BUCKET_WIDTH)
    bucket = min(bucket, 7)
    position = bucket + 1  # 1-indexed

    return quadrant, position


# ---------------------------------------------------------------------------
# Core segmentation function
# ---------------------------------------------------------------------------

def segment_teeth_from_mesh(
    vertices: list[list[float]],
    faces: list[list[int]],
    arch_params: dict[str, Any] | None = None,
    scan_id: str = "",
    patient_id: str = "",
) -> list[dict[str, Any]]:
    """
    Segment a dental arch mesh into individual tooth instances using
    geometric heuristics.

    Args:
        vertices: List of [x, y, z] vertex positions in mm.
        faces: List of [i1, i2, i3] face indices (0- or 1-based auto-detected).
        arch_params: Optional arch fitting parameters from dental_filter_service.
                     Expected keys: {"a": float, "b": float} (parabolic fit).
        scan_id: Scan identifier for provenance.
        patient_id: Patient identifier for provenance.

    Returns:
        List of ToothInstance dicts. May be empty if mesh has no vertices.
    """
    if not vertices:
        return []

    verts = np.array(vertices, dtype=np.float64)
    n = len(verts)

    # Arch geometry
    a_fit = float((arch_params or {}).get("a", 0.045))
    b_fit = float((arch_params or {}).get("b", 20.0))

    xs = verts[:, 0]
    zs = verts[:, 2]

    z_min = float(np.min(zs))
    z_max = float(np.max(zs))
    gingival_z_mid = z_min + (z_max - z_min) * 0.5  # midpoint split for upper/lower

    # 1. Assign each vertex to a (quadrant, position) bucket
    # key = (quadrant, position) → list of vertex indices
    buckets: dict[tuple[int, int], list[int]] = {}

    for idx in range(n):
        x = float(xs[idx])
        z = float(zs[idx])

        # Only segment vertices within the arch envelope
        if abs(x) > ARCH_X_MAX + 2.0:
            continue

        q, pos = _assign_quadrant_and_position(x, z, gingival_z_mid)
        key = (q, pos)
        if key not in buckets:
            buckets[key] = []
        buckets[key].append(idx)

    if not buckets:
        return []

    # 2. Build face adjacency for face_count per bucket
    # Detect 1-based faces
    is_one_based = False
    if faces:
        flat = [i for f in faces for i in f]
        if flat and max(flat) == n:
            is_one_based = True

    # vertex_index → bucket key
    vertex_to_bucket: dict[int, tuple[int, int]] = {}
    for key, indices in buckets.items():
        for vi in indices:
            vertex_to_bucket[vi] = key

    # Count faces per bucket (face belongs to bucket if majority of its vertices do)
    bucket_face_count: dict[tuple[int, int], int] = {k: 0 for k in buckets}
    for face in faces:
        i1 = (face[0] - 1) if is_one_based else face[0]
        i2 = (face[1] - 1) if is_one_based else face[1]
        i3 = (face[2] - 1) if is_one_based else face[2]

        votes: dict[tuple[int, int], int] = {}
        for vi in (i1, i2, i3):
            bk = vertex_to_bucket.get(vi)
            if bk is not None:
                votes[bk] = votes.get(bk, 0) + 1

        if votes:
            winning_bucket = max(votes, key=lambda k: votes[k])
            bucket_face_count[winning_bucket] = bucket_face_count.get(winning_bucket, 0) + 1

    # 3. Build ToothInstance per bucket
    instances: list[dict[str, Any]] = []

    for (quadrant, position), vertex_indices in sorted(buckets.items()):
        if len(vertex_indices) < 2:
            # Too sparse to be a real tooth region
            continue

        bucket_verts = verts[vertex_indices]

        centroid = bucket_verts.mean(axis=0).tolist()
        centroid = [round(c, 3) for c in centroid]

        bmin = bucket_verts.min(axis=0).tolist()
        bmax = bucket_verts.max(axis=0).tolist()
        bounds = {
            "min": [round(v, 3) for v in bmin],
            "max": [round(v, 3) for v in bmax],
        }

        fdi = _fdi_from_quadrant_position(quadrant, position)
        tooth_type = _POSITION_TO_TYPE.get(position, "molar")
        face_count = bucket_face_count.get((quadrant, position), 0)

        # Confidence heuristic:
        # - More vertices → slightly higher confidence (capped at 0.40)
        # - Very sparse buckets get penalised
        vertex_density_score = min(len(vertex_indices) / max(n / 16, 1), 1.0)
        confidence = round(min(0.40, vertex_density_score * 0.40), 3)

        instance: dict[str, Any] = {
            "id": f"tooth-{fdi}",
            "fdi": fdi,
            "quadrant": quadrant,
            "position_in_quadrant": position,
            "type": tooth_type,
            "centroid": centroid,
            "bounds": bounds,
            "vertex_count": len(vertex_indices),
            "vertex_indices": vertex_indices[:64],  # subset — keep payload small
            "face_count": face_count,
            "confidence": confidence,
            "color_hint": _QUADRANT_COLOR.get(quadrant, "#64748b"),
            "experimental": True,
            "engine": "geometric_heuristic_v1",
            "segmentation_note": (
                "Geometric heuristic segmentation (X-position bucketing). "
                "Not ML-based. Confidence reflects density relative to arch, "
                "not clinical diagnostic quality."
            ),
            "scan_id": scan_id,
            "patient_id": patient_id,
        }
        instances.append(instance)

    return instances


# ---------------------------------------------------------------------------
# Pipeline helper: run segmentation and persist result
# ---------------------------------------------------------------------------

def run_tooth_segmentation_pipeline(
    study_dir: str,
    vertices: list[list[float]],
    faces: list[list[int]],
    arch_params: dict[str, Any] | None = None,
    scan_id: str = "",
    patient_id: str = "",
) -> dict[str, Any]:
    """
    Run segmentation, write tooth_instances.json to study_dir, return summary.
    """
    import time
    from datetime import datetime, timezone

    start = time.time()

    instances = segment_teeth_from_mesh(
        vertices=vertices,
        faces=faces,
        arch_params=arch_params,
        scan_id=scan_id,
        patient_id=patient_id,
    )

    duration_ms = int((time.time() - start) * 1000)

    result = {
        "scan_id": scan_id,
        "patient_id": patient_id,
        "engine": "geometric_heuristic_v1",
        "tooth_count": len(instances),
        "instances": instances,
        "duration_ms": duration_ms,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "experimental": True,
        "disclaimer": (
            "Tooth boundaries are estimated from parabolic arch X-position heuristics. "
            "This is NOT a clinically validated segmentation. "
            "FDI assignments are approximate and may not reflect the true anatomical tooth."
        ),
    }

    out_path = os.path.join(study_dir, "tooth_instances.json")
    try:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
    except OSError as e:
        print(f"[ToothSeg] Warning: could not write tooth_instances.json: {e}")

    return result


# ---------------------------------------------------------------------------
# Unit-testable: load cached result from disk
# ---------------------------------------------------------------------------

def load_tooth_instances(study_dir: str) -> dict[str, Any] | None:
    """
    Read cached tooth_instances.json from study_dir.
    Returns None if not found or invalid.
    """
    path = os.path.join(study_dir, "tooth_instances.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
