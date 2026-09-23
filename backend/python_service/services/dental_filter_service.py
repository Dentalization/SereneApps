import struct
import math
from typing import Any
import numpy as np

def export_binary_stl(
    vertices: list[list[float]],
    faces: list[list[int]],
    normals: list[list[float]] | None = None,
    header_text: str = "SereneApps Python Dental 3D Reconstruction"
) -> bytes:
    """
    Exports a 3D triangle mesh to binary STL format.
    80-byte header, uint32 triangle count, 50 bytes per triangle.
    """
    header = header_text.ljust(80)[:80].encode("ascii", errors="replace")
    triangle_count = len(faces)
    
    # Check if 1-based (OBJ format)
    is_one_based = False
    if faces and any(f[0] == len(vertices) or f[1] == len(vertices) or f[2] == len(vertices) for f in faces):
        is_one_based = True

    chunks: list[bytes] = [header, struct.pack("<I", triangle_count)]

    for i, face in enumerate(faces):
        idx1 = (face[0] - 1) if is_one_based else face[0]
        idx2 = (face[1] - 1) if is_one_based else face[1]
        idx3 = (face[2] - 1) if is_one_based else face[2]

        v1 = vertices[idx1] if 0 <= idx1 < len(vertices) else [0.0, 0.0, 0.0]
        v2 = vertices[idx2] if 0 <= idx2 < len(vertices) else [0.0, 0.0, 0.0]
        v3 = vertices[idx3] if 0 <= idx3 < len(vertices) else [0.0, 0.0, 0.0]

        if normals and i < len(normals):
            nx, ny, nz = normals[i]
        else:
            # Cross product (v2 - v1) x (v3 - v1)
            ax, ay, az = v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]
            bx, by, bz = v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]
            cx = ay * bz - az * by
            cy = az * bx - ax * bz
            cz = ax * by - ay * bx
            norm = math.sqrt(cx * cx + cy * cy + cz * cz) or 1.0
            nx, ny, nz = cx / norm, cy / norm, cz / norm

        chunks.append(
            struct.pack(
                "<ffffffffffffH",
                float(nx), float(ny), float(nz),
                float(v1[0]), float(v1[1]), float(v1[2]),
                float(v2[0]), float(v2[1]), float(v2[2]),
                float(v3[0]), float(v3[1]), float(v3[2]),
                0  # Attribute byte count
            )
        )

    return b"".join(chunks)


def apply_dental_geometry_filters(
    vertices: list[list[float]],
    normals: list[list[float]],
    faces: list[list[int]],
    scan_scope: str = "full"
) -> dict[str, Any]:
    """
    Applies classical computer vision & geometric dental filtering:
      1. Parabolic arch curve fitting: y = -a * x^2 + b
      2. Dental region extraction & envelope bounding
      3. Statistical outlier vertex pruning
      4. Gingival base plane delimitation
      5. Normal vector outward regularization
    """
    logs: list[dict[str, str]] = []

    # 1. Fit parabolic arch
    xs = np.array([v[0] for v in vertices], dtype=np.float64)
    ys = np.array([v[1] for v in vertices], dtype=np.float64)

    # Least squares fit y = a * (-x^2) + b
    X = -(xs ** 2)
    A = np.vstack([X, np.ones(len(X))]).T
    try:
        sol, residuals, _, _ = np.linalg.lstsq(A, ys, rcond=None)
        a_fit = float(np.clip(sol[0], 0.02, 0.08))
        b_fit = float(np.clip(sol[1], 10.0, 30.0))
    except Exception:
        a_fit = 0.045
        b_fit = 20.0

    # 2. Dental Region Envelope & Outlier Pruning
    valid_indices: set[int] = set()
    pruned_outliers = 0
    max_arch_distance = 12.0  # mm

    for idx, v in enumerate(vertices):
        x, y, _ = v[0], v[1], v[2]
        expected_y = -a_fit * (x * x) + b_fit
        dist = abs(y - expected_y)
        if dist <= max_arch_distance and abs(x) <= 28.0:
            valid_indices.add(idx)
        else:
            pruned_outliers += 1

    # 3. Gingival Base Plane Delimitation
    valid_zs = [vertices[i][2] for i in valid_indices] if valid_indices else [0.0]
    min_z = float(min(valid_zs))
    max_z = float(max(valid_zs))
    gingival_z = min_z + (max_z - min_z) * 0.15

    # 4. Filtered Vertices & Outward Normal Regularization
    new_vertices: list[list[float]] = []
    new_normals: list[list[float]] = []
    old_to_new: dict[int, int] = {}

    for old_idx, v in enumerate(vertices):
        if old_idx in valid_indices:
            old_to_new[old_idx] = len(new_vertices)
            new_vertices.append(v)

            # Compute outward normal based on arch curve tangent
            norm_in = normals[old_idx] if old_idx < len(normals) else [0.0, -1.0, 0.0]
            tangent_y = -2 * a_fit * v[0]
            normal_x = tangent_y
            normal_y = 1.0
            norm_len = math.sqrt(normal_x * normal_x + normal_y * normal_y) or 1.0
            out_x = -normal_x / norm_len
            out_y = -normal_y / norm_len

            blended_x = norm_in[0] * 0.4 + out_x * 0.6
            blended_y = norm_in[1] * 0.4 + out_y * 0.6
            blended_z = norm_in[2]
            final_len = math.sqrt(blended_x ** 2 + blended_y ** 2 + blended_z ** 2) or 1.0
            new_normals.append([
                round(blended_x / final_len, 3),
                round(blended_y / final_len, 3),
                round(blended_z / final_len, 3)
            ])

    # 5. Rebuild Faces (1-based for OBJ/STL)
    new_faces: list[list[int]] = []
    is_one_based = faces and any(f[0] == len(vertices) or f[1] == len(vertices) or f[2] == len(vertices) for f in faces)

    for f in faces:
        i1 = (f[0] - 1) if is_one_based else f[0]
        i2 = (f[1] - 1) if is_one_based else f[1]
        i3 = (f[2] - 1) if is_one_based else f[2]

        if i1 in valid_indices and i2 in valid_indices and i3 in valid_indices:
            new_faces.append([old_to_new[i1] + 1, old_to_new[i2] + 1, old_to_new[i3] + 1])

    bounds = {
        "min": [
            round(min(v[0] for v in new_vertices), 3) if new_vertices else -24.0,
            round(min(v[1] for v in new_vertices), 3) if new_vertices else 0.0,
            round(min(v[2] for v in new_vertices), 3) if new_vertices else -8.0,
        ],
        "max": [
            round(max(v[0] for v in new_vertices), 3) if new_vertices else 24.0,
            round(max(v[1] for v in new_vertices), 3) if new_vertices else 21.5,
            round(max(v[2] for v in new_vertices), 3) if new_vertices else 8.0,
        ]
    }

    return {
        "vertices": new_vertices,
        "normals": new_normals,
        "faces": new_faces,
        "bounds": bounds,
        "metrics": {
            "dentalArchFit": {"a": round(a_fit, 5), "b": round(b_fit, 3)},
            "prunedOutliersCount": pruned_outliers,
            "gingivalThresholdZ": round(gingival_z, 2),
            "originalVertexCount": len(vertices),
            "filteredVertexCount": len(new_vertices),
            "filteredFaceCount": len(new_faces),
            "researchDisclaimer": "Experimental geometric representation for X-Core visualization; not calibrated for diagnostic production."
        },
        "logs": logs
    }
