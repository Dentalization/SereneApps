"""Conservative CPU dense stereo fusion from >=3 registered, dental-masked views.

No hole filling, priors, interpolation across missing pixels, or metric-scale claim.
This is an experimental OpenCV baseline, not COLMAP/OpenMVS.
"""
import time

import cv2
import numpy as np


def _candidate_pairs(views, max_pairs):
    """Preserve local overlap across the entire camera path before wider baselines."""
    return [(views[index], views[index + gap])
            for gap in range(1, len(views))
            for index in range(len(views) - gap)][:max_pairs]


def _stereo_pair(images, masks, intrinsic, poses, first, second, stride=3):
    height, width = images[first].shape[:2]
    rotation1, translation1 = poses[first]
    rotation2, translation2 = poses[second]
    relative_rotation = rotation2 @ rotation1.T
    relative_translation = translation2 - relative_rotation @ translation1
    if np.linalg.norm(relative_translation) < 1e-8:
        return None
    try:
        rect1, rect2, proj1, proj2, q, _, _ = cv2.stereoRectify(
            intrinsic, None, intrinsic, None, (width, height), relative_rotation,
            relative_translation, flags=cv2.CALIB_ZERO_DISPARITY, alpha=0)
        map1x, map1y = cv2.initUndistortRectifyMap(intrinsic, None, rect1, proj1,
                                                     (width, height), cv2.CV_32FC1)
        map2x, map2y = cv2.initUndistortRectifyMap(intrinsic, None, rect2, proj2,
                                                     (width, height), cv2.CV_32FC1)
    except cv2.error:
        return None
    gray1 = cv2.remap(cv2.cvtColor(images[first], cv2.COLOR_BGR2GRAY), map1x, map1y, cv2.INTER_LINEAR)
    gray2 = cv2.remap(cv2.cvtColor(images[second], cv2.COLOR_BGR2GRAY), map2x, map2y, cv2.INTER_LINEAR)
    mask1 = cv2.remap(masks[first], map1x, map1y, cv2.INTER_NEAREST) > 0
    mask2 = cv2.remap(masks[second], map2x, map2y, cv2.INTER_NEAREST) > 0
    disparity_count = max(16, min(128, ((width // 3 + 15) // 16) * 16))
    minimum = -disparity_count // 2
    matcher = cv2.StereoSGBM_create(minDisparity=minimum, numDisparities=disparity_count,
        blockSize=5, P1=8 * 25, P2=32 * 25, disp12MaxDiff=1, uniquenessRatio=10,
        speckleWindowSize=50, speckleRange=2)
    try:
        disparity = matcher.compute(gray1, gray2).astype(np.float32) / 16.0
    except cv2.error:
        return None
    yy, xx = np.mgrid[0:height:stride, 0:width:stride]
    disparity_sample = disparity[::stride, ::stride]
    right_x = np.rint(xx - disparity_sample).astype(np.int32)
    inside = (right_x >= 0) & (right_x < width)
    right_x = np.clip(right_x, 0, width - 1)
    valid = (mask1[::stride, ::stride] & inside & mask2[yy, right_x]
             & np.isfinite(disparity_sample) & (disparity_sample > minimum + 1))
    xyz_rect = cv2.reprojectImageTo3D(disparity, q)[::stride, ::stride]
    xyz_camera = xyz_rect @ rect1
    world = (xyz_camera - translation1) @ rotation1
    valid &= np.isfinite(world).all(axis=2) & (xyz_camera[:, :, 2] > 0)
    if valid.sum() < 100:
        return None
    return {"first": first, "second": second, "world": world, "valid": valid,
            "disparityCount": int(valid.sum()), "disparityRange": [minimum, minimum + disparity_count]}


def dense_multiview_surface(images, masks, intrinsic, poses, *, stride=3, max_pairs=12):
    """Fuse pair estimates; only return faces whose vertices have independent pair support."""
    started = time.perf_counter()
    views = sorted(poses)
    if len(views) < 3:
        return None, {"status": "insufficient_registered_views", "pairsExecuted": 0}
    height, width = images[0].shape[:2]
    resize_factor = min(1.0, 800.0 / max(width, height))
    if resize_factor < 1.0:
        target = (round(width * resize_factor), round(height * resize_factor))
        images = [cv2.resize(image, target, interpolation=cv2.INTER_AREA) for image in images]
        masks = [cv2.resize(mask, target, interpolation=cv2.INTER_NEAREST) for mask in masks]
        intrinsic = intrinsic.copy()
        intrinsic[0] *= target[0] / width
        intrinsic[1] *= target[1] / height
    candidates = _candidate_pairs(views, max_pairs)
    pair_results = []
    for first, second in candidates:
        result = _stereo_pair(images, masks, intrinsic, poses, first, second, stride)
        if result is not None:
            pair_results.append(result)
    pair_plan = {"pairSelection": "temporal_neighbors_then_wider_baselines_v1",
                 "attemptedPairFrames": [[first, second] for first, second in candidates],
                 "pairsAttempted": len(candidates)}
    if len(pair_results) < 2:
        return None, {"status": "insufficient_consistent_stereo_pairs", "pairsExecuted": len(pair_results),
                      "durationMs": (time.perf_counter() - started) * 1000, **pair_plan}
    all_points = np.concatenate([pair["world"][pair["valid"]] for pair in pair_results])
    median_depth = float(np.median(np.linalg.norm(all_points, axis=1)))
    voxel = max(1e-6, median_depth / max(float(intrinsic[0, 0]), 1) * stride * 3)
    origin = np.median(all_points, axis=0)
    buckets = {}
    for pair_id, pair in enumerate(pair_results):
        for y, x in zip(*np.nonzero(pair["valid"])):
            point = pair["world"][y, x]
            key = tuple(np.floor((point - origin) / voxel).astype(int))
            entry = buckets.setdefault(key, {"pairs": set(), "views": set(), "points": []})
            entry["pairs"].add(pair_id)
            entry["views"].update((pair["first"], pair["second"]))
            entry["points"].append(point)
    supported = {key for key, entry in buckets.items() if len(entry["pairs"]) >= 2
                 and len(entry["views"]) >= 3}
    if len(supported) < 100:
        return None, {"status": "insufficient_three_view_consensus", "pairsExecuted": len(pair_results),
                      "rawStereoPoints": len(all_points), "supportedVoxels": len(supported),
                      "durationMs": (time.perf_counter() - started) * 1000, **pair_plan}
    # Tile the supported surface from every useful pair. A supported voxel is
    # assigned to the first (largest) patch that can form observed triangles;
    # no extra triangles bridge unobserved gaps between pair patches.
    pair_support = []
    for pair_id, pair in enumerate(pair_results):
        key_by_pixel = {}
        support = np.zeros(pair["valid"].shape, dtype=bool)
        for y, x in zip(*np.nonzero(pair["valid"])):
            key = tuple(np.floor((pair["world"][y, x] - origin) / voxel).astype(np.int64))
            if key in supported:
                support[y, x] = True
                key_by_pixel[(int(y), int(x))] = key
        pair_support.append((pair_id, pair, support, key_by_pixel))
    pair_support.sort(key=lambda item: int(item[2].sum()), reverse=True)
    claimed = set()
    vertex_chunks, face_chunks, bit_chunks, pair_count_chunks, face_sources, patches = [], [], [], [], [], []
    for pair_id, pair, support, key_by_pixel in pair_support:
        owned = support.copy()
        for (y, x), key in key_by_pixel.items():
            if key in claimed:
                owned[y, x] = False
        if int(owned.sum()) < 3:
            continue
        local_grid = pair["world"]
        vertex_ids = np.full(owned.shape, -1, dtype=np.int32)
        vertex_ids[owned] = np.arange(int(owned.sum()))
        local_vertices = local_grid[owned].astype(np.float64)
        local_faces = []
        for y in range(owned.shape[0] - 1):
            for x in range(owned.shape[1] - 1):
                for cells in (((y, x), (y + 1, x), (y, x + 1)),
                              ((y + 1, x), (y + 1, x + 1), (y, x + 1))):
                    if not all(owned[cy, cx] for cy, cx in cells):
                        continue
                    ids = [int(vertex_ids[cy, cx]) for cy, cx in cells]
                    triangle = local_vertices[ids]
                    edges = np.linalg.norm(triangle - np.roll(triangle, 1, axis=0), axis=1)
                    area = np.linalg.norm(np.cross(triangle[1] - triangle[0], triangle[2] - triangle[0]))
                    if edges.max() <= voxel * 5 and area > 1e-12:
                        local_faces.append(ids)
        if not local_faces:
            continue
        local_faces = np.asarray(local_faces, dtype=np.int32)
        used = np.unique(local_faces)
        remap = np.full(len(local_vertices), -1, dtype=np.int32)
        remap[used] = np.arange(len(used))
        local_faces = remap[local_faces]
        used_pixels = list(zip(*np.nonzero(owned)))
        used_keys = [key_by_pixel[tuple(map(int, used_pixels[index]))] for index in used]
        local_bits = np.asarray([sum(1 << view for view in buckets[key]["views"])
                                 for key in used_keys], dtype=np.uint16)
        local_pair_counts = np.asarray([len(buckets[key]["pairs"]) for key in used_keys], dtype=np.uint8)
        offset = sum(len(chunk) for chunk in vertex_chunks)
        vertex_chunks.append(local_vertices[used])
        face_chunks.append(local_faces + offset)
        bit_chunks.append(local_bits)
        pair_count_chunks.append(local_pair_counts)
        face_sources.append(np.full(len(local_faces), pair_id, dtype=np.int16))
        claimed.update(used_keys)
        patches.append({"pairId": pair_id, "firstView": pair["first"], "secondView": pair["second"],
                        "addedVoxels": len(set(used_keys)), "vertexCount": len(used), "faceCount": len(local_faces)})
    if not face_chunks or sum(len(chunk) for chunk in face_chunks) < 100:
        return None, {"status": "insufficient_supported_faces", "pairsExecuted": len(pair_results),
                      "supportedVoxels": len(supported), "coveredSupportedVoxels": len(claimed),
                      "faceCount": sum(len(chunk) for chunk in face_chunks), **pair_plan}
    vertices = np.concatenate(vertex_chunks)
    faces = np.concatenate(face_chunks)
    view_bits = np.concatenate(bit_chunks)
    pair_counts = np.concatenate(pair_count_chunks)
    face_pair_ids = np.concatenate(face_sources)
    diagnostics = {"status": "executed", "method": "opencv_rectified_sgbm_multiview_supported_patch_union_v2",
        **pair_plan,
        "pairsExecuted": len(pair_results), "pairFrames": [[p["first"], p["second"]] for p in pair_results],
        "surfacePatches": patches, "coveredSupportedVoxels": len(claimed),
        "rawStereoPoints": len(all_points), "supportedVoxels": len(supported),
        "supportedVertices": len(vertices), "faceCount": len(faces), "voxelSizeArbitraryUnits": voxel,
        "stridePixels": stride, "durationMs": (time.perf_counter() - started) * 1000,
        "workingImageSize": [images[0].shape[1], images[0].shape[0]],
        "inferredGeometry": False, "unsupportedFacesRemoved": True,
        "normalConsistency": "not_evaluated", "selfIntersections": "not_evaluated",
        "nonManifoldEdges": "not_evaluated"}
    diagnostics["minimumIndependentViewCount"] = min(int(bits).bit_count() for bits in view_bits)
    diagnostics["minimumSupportingPairCount"] = int(pair_counts.min())
    return (vertices, faces, view_bits, pair_counts, face_pair_ids), diagnostics
