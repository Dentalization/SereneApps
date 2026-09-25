"""Bounded triangle self-intersection check for an experimental surface mesh."""
import numpy as np


def self_intersection_report(vertices, faces, max_candidates=2_000_000):
    points = np.asarray(vertices, dtype=np.float64)
    triangles = np.asarray(faces, dtype=np.int32)
    if len(triangles) == 0:
        return {"status": "unavailable", "reason": "no_faces"}
    try:
        import vtk
    except ImportError:
        return {"status": "unavailable", "reason": "vtk_unavailable"}
    triangle_points = points[triangles]
    lower = triangle_points.min(axis=1)
    upper = triangle_points.max(axis=1)
    order = np.argsort(lower[:, 0], kind="stable")
    active = []
    tested = 0
    intersections = 0
    for current in order:
        active = [previous for previous in active if upper[previous, 0] >= lower[current, 0]]
        for previous in active:
            if (upper[previous, 1:] < lower[current, 1:]).any() or (upper[current, 1:] < lower[previous, 1:]).any():
                continue
            if set(triangles[previous]).intersection(triangles[current]):
                continue
            tested += 1
            if tested > max_candidates:
                return {"status": "unavailable", "reason": "candidate_budget_exceeded",
                        "candidatePairsChecked": tested}
            a, b = triangle_points[previous], triangle_points[current]
            if vtk.vtkTriangle.TrianglesIntersect(*[tuple(p) for p in a], *[tuple(p) for p in b]):
                intersections += 1
        active.append(current)
    return {"status": "evaluated", "count": intersections, "candidatePairsChecked": tested,
            "method": "vtk_triangles_intersect_non_adjacent_aabb_sweep_v1"}
