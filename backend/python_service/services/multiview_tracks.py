"""Geometrically verified sparse tracks across registered dental-region views.

This is sparse measurement evidence, not dense MVS or a surface constructor.
"""
import cv2
import numpy as np


def build_multiview_tracks(features, poses, intrinsic, *, ratio=0.72, max_error=2.0,
                           min_parallax=0.5, seed=0):
    """Triangulate only tracks supported by >=3 distinct registered views."""
    indices = sorted(poses)
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    parent = {}
    members = {}
    pair_evidence = []

    def root(item):
        if item not in parent:
            parent[item] = item
            members[item] = {item[0]: item}
        if parent[item] != item:
            parent[item] = root(parent[item])
        return parent[item]

    for offset, first_view in enumerate(indices):
        key1, descriptors1 = features[first_view]
        if descriptors1 is None:
            continue
        for second_view in indices[offset + 1:]:
            key2, descriptors2 = features[second_view]
            if descriptors2 is None or min(len(descriptors1), len(descriptors2)) < 8:
                continue
            pairs = matcher.knnMatch(descriptors1, descriptors2, k=2)
            matches = [a for pair in pairs if len(pair) == 2 for a, b in [pair] if a.distance < ratio * b.distance]
            matches = list({m.trainIdx: m for m in sorted(matches, key=lambda m: -m.distance)}.values())
            if len(matches) < 8:
                continue
            pixels1 = np.float32([key1[m.queryIdx].pt for m in matches])
            pixels2 = np.float32([key2[m.trainIdx].pt for m in matches])
            cv2.setRNGSeed(int(seed))
            _, mask = cv2.findFundamentalMat(pixels1, pixels2, cv2.FM_RANSAC,
                                              max_error, 0.999)
            if mask is None:
                continue
            verified = [m for m, valid in zip(matches, mask.ravel()) if valid]
            pair_evidence.append({"firstView": first_view, "secondView": second_view,
                                  "ratioMatches": len(matches), "geometricInliers": len(verified)})
            for match in verified:
                left, right = (first_view, match.queryIdx), (second_view, match.trainIdx)
                a, b = root(left), root(right)
                if a == b or set(members[a]).intersection(members[b]):
                    continue
                parent[b] = a
                members[a].update(members.pop(b))

    points, tracks = [], []
    for observations in members.values():
        if len(observations) < 3:
            continue
        observations = [observations[index] for index in sorted(observations)]
        centers = {i: -poses[i][0].T @ poses[i][1] for i, _ in observations}
        first, second = max(((a, b) for n, a in enumerate(observations)
                             for b in observations[n + 1:]),
                            key=lambda pair: np.linalg.norm(centers[pair[0][0]] - centers[pair[1][0]]))
        i, feature_i = first
        j, feature_j = second
        r1, t1 = poses[i]
        r2, t2 = poses[j]
        projection1 = intrinsic @ np.column_stack((r1, t1))
        projection2 = intrinsic @ np.column_stack((r2, t2))
        pixel1 = np.asarray(features[i][0][feature_i].pt, dtype=np.float64)
        pixel2 = np.asarray(features[j][0][feature_j].pt, dtype=np.float64)
        homogeneous = cv2.triangulatePoints(projection1, projection2,
                                             pixel1.reshape(2, 1), pixel2.reshape(2, 1))[:, 0]
        if abs(homogeneous[3]) < 1e-12:
            continue
        point = homogeneous[:3] / homogeneous[3]
        if not np.isfinite(point).all():
            continue
        ray1, ray2 = point - centers[i], point - centers[j]
        cosine = np.dot(ray1, ray2) / (np.linalg.norm(ray1) * np.linalg.norm(ray2))
        parallax = np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))
        if not np.isfinite(parallax) or parallax < min_parallax:
            continue
        errors = []
        for view, feature in observations:
            rotation, translation = poses[view]
            camera_point = rotation @ point + translation
            if camera_point[2] <= 0:
                break
            projected = intrinsic @ camera_point
            error = float(np.linalg.norm(projected[:2] / projected[2] - features[view][0][feature].pt))
            errors.append(error)
        if len(errors) != len(observations) or max(errors) > max_error:
            continue
        points.append(point)
        tracks.append({"views": [view for view, _ in observations], "length": len(observations),
                       "observations": [{"view": view, "keypoint": feature,
                                         "pixel": list(features[view][0][feature].pt)} for view, feature in observations],
                       "maxReprojectionErrorPx": max(errors), "parallaxDegrees": float(parallax)})
    return np.asarray(points, dtype=np.float64).reshape(-1, 3), tracks, pair_evidence


def bundle_adjust_tracks(points, tracks, poses, intrinsic, anchor, baseline_view, iterations=30):
    """Robust joint optimization of registered poses and >=3-view points on CPU.

    The first pose and second-camera baseline norm fix SfM gauge. Failure returns
    original estimates and an explicit status, never a silently altered map.
    """
    if len(points) < 20 or len(poses) < 3 or anchor not in poses or baseline_view not in poses:
        return points, poses, {"status": "insufficient_tracks", "optimizedTracks": 0}
    if len(points) > 3000:
        return points, poses, {"status": "track_budget_exceeded", "optimizedTracks": 0}
    try:
        import torch
    except ImportError:
        return points, poses, {"status": "torch_unavailable", "optimizedTracks": 0}
    view_ids = sorted(poses)
    view_to_slot = {view: slot for slot, view in enumerate(view_ids)}
    observation_points, observation_views, observed_pixels = [], [], []
    for point_index, track in enumerate(tracks):
        for observation in track["observations"]:
            observation_points.append(point_index)
            observation_views.append(view_to_slot[observation["view"]])
            observed_pixels.append(observation["pixel"])
    dtype = torch.float64
    point_parameter = torch.nn.Parameter(torch.tensor(points, dtype=dtype))
    rotation_parameters = {}
    translation_parameters = {}
    for view in view_ids:
        if view == anchor:
            continue
        rotation, translation = poses[view]
        rvec = cv2.Rodrigues(rotation)[0].reshape(3)
        rotation_parameters[view] = torch.nn.Parameter(torch.tensor(rvec, dtype=dtype))
        translation_parameters[view] = torch.nn.Parameter(torch.tensor(translation, dtype=dtype))
    optimizable = [point_parameter, *rotation_parameters.values(), *translation_parameters.values()]
    optimizer = torch.optim.Adam(optimizable, lr=0.003)
    observed = torch.tensor(observed_pixels, dtype=dtype)
    point_index = torch.tensor(observation_points, dtype=torch.long)
    camera_index = torch.tensor(observation_views, dtype=torch.long)
    k = torch.tensor(intrinsic, dtype=dtype)
    anchor_r = torch.tensor(poses[anchor][0], dtype=dtype)
    anchor_t = torch.tensor(poses[anchor][1], dtype=dtype)
    baseline_norm = float(np.linalg.norm(poses[baseline_view][1]))

    def forward():
        rotations, translations = [], []
        for view in view_ids:
            if view == anchor:
                rotations.append(anchor_r)
                translations.append(anchor_t)
                continue
            x, y, z = rotation_parameters[view]
            skew = torch.stack((torch.stack((x * 0, -z, y)),
                                 torch.stack((z, y * 0, -x)),
                                 torch.stack((-y, x, z * 0))))
            rotations.append(torch.matrix_exp(skew))
            t = translation_parameters[view]
            if view == baseline_view:
                t = t / torch.linalg.vector_norm(t).clamp_min(1e-8) * baseline_norm
            translations.append(t)
        rotation_batch = torch.stack(rotations)[camera_index]
        translation_batch = torch.stack(translations)[camera_index]
        camera_points = torch.bmm(rotation_batch, point_parameter[point_index].unsqueeze(-1)).squeeze(-1) + translation_batch
        projection = camera_points @ k.T
        pixel = projection[:, :2] / projection[:, 2:3].clamp_min(1e-6)
        residual = torch.linalg.vector_norm(pixel - observed, dim=1)
        robust = torch.where(residual < 2.0, residual.square() / 2.0, 2.0 * residual - 2.0)
        loss = robust.mean() + 10 * torch.relu(0.1 - camera_points[:, 2]).square().mean()
        return loss, residual

    with torch.no_grad():
        initial_loss, initial_errors = forward()
        initial_median = float(torch.median(initial_errors))
    for _ in range(iterations):
        optimizer.zero_grad()
        loss, _ = forward()
        if not torch.isfinite(loss):
            break
        loss.backward()
        optimizer.step()
    with torch.no_grad():
        final_loss, final_errors = forward()
        final_median = float(torch.median(final_errors))
    if (not np.isfinite(final_median) or not np.isfinite(float(final_loss))
            or float(final_loss) > float(initial_loss)
            or final_median > initial_median * 1.05):
        retained_initial = initial_median <= 1.0 and float(initial_loss) <= 1.0
        return points, poses, {"status": "initial_solution_retained" if retained_initial else "rejected_no_improvement",
                                "optimizedTracks": 0, "evaluatedTracks": len(points),
                                "initialMedianReprojectionPx": initial_median, "finalMedianReprojectionPx": final_median,
                                "initialRobustLoss": float(initial_loss), "finalRobustLoss": float(final_loss)}
    refined_poses = dict(poses)
    for view in rotation_parameters:
        vector = rotation_parameters[view].detach().numpy().reshape(3, 1)
        rotation = cv2.Rodrigues(vector)[0]
        translation = translation_parameters[view].detach().numpy().copy()
        if view == baseline_view:
            translation *= baseline_norm / max(np.linalg.norm(translation), 1e-8)
        refined_poses[view] = (rotation, translation)
    return point_parameter.detach().numpy(), refined_poses, {
        "status": "executed", "method": "torch_cpu_robust_joint_pose_point_v1",
        "optimizedTracks": len(points), "observations": len(observation_points),
        "iterations": iterations, "initialMedianReprojectionPx": initial_median,
        "finalMedianReprojectionPx": final_median, "initialRobustLoss": float(initial_loss),
        "finalRobustLoss": float(final_loss), "gaugeAnchorView": anchor,
        "fixedBaselineView": baseline_view}
