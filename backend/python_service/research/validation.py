"""Reproducible rigid, sampled-surface comparison. No synthetic research results.

Distances are from deterministic area-weighted surface samples to the complete opposing
triangle surface. Reported Hausdorff/completeness are sampling approximations, never exact.
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from . import vtk_runtime as vtk
from vtkmodules.util.numpy_support import vtk_to_numpy

VERSION = "surface-validation-1"
DATASET_UNAVAILABLE = "DATASET_UNAVAILABLE"


def checksum(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_mesh(path):
    path = Path(path)
    readers = {".stl": vtk.vtkSTLReader, ".ply": vtk.vtkPLYReader, ".obj": vtk.vtkOBJReader}
    if path.suffix.lower() not in readers:
        raise ValueError("Reference/reconstruction must be STL, PLY or OBJ")
    reader = readers[path.suffix.lower()]()
    reader.SetFileName(str(path))
    reader.Update()
    triangulator = vtk.vtkTriangleFilter()
    triangulator.SetInputData(reader.GetOutput())
    triangulator.Update()
    mesh = vtk.vtkPolyData()
    mesh.DeepCopy(triangulator.GetOutput())
    if mesh.GetNumberOfPoints() < 3 or mesh.GetNumberOfPolys() < 1:
        raise ValueError("Input has no triangle surface; a sparse point cloud is not a surface reference")
    vertices = vtk_to_numpy(mesh.GetPoints().GetData())
    if not np.isfinite(vertices).all():
        raise ValueError("Non-finite geometry")
    return mesh


def sample_surface(mesh, count=5000, seed=0):
    if not 32 <= int(count) <= 100000:
        raise ValueError("surfaceSamples must be in [32, 100000]")
    points = vtk_to_numpy(mesh.GetPoints().GetData()).astype(float)
    faces = vtk_to_numpy(mesh.GetPolys().GetConnectivityArray()).reshape(-1, 3)
    triangles = points[faces]
    areas = np.linalg.norm(np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]), axis=1) / 2
    if not np.isfinite(areas).all() or areas.sum() <= 0:
        raise ValueError("Mesh has no nondegenerate surface")
    random = np.random.default_rng(seed)
    chosen = triangles[random.choice(len(triangles), int(count), p=areas / areas.sum())]
    uv = random.random((int(count), 2))
    u = np.sqrt(uv[:, 0])
    return (1 - u[:, None]) * chosen[:, 0] + (u * (1 - uv[:, 1]))[:, None] * chosen[:, 1] + (u * uv[:, 1])[:, None] * chosen[:, 2]


def rigid_matrix(value):
    matrix = np.asarray(value, dtype=float)
    if matrix.shape != (4, 4) or not np.isfinite(matrix).all() or not np.allclose(matrix[3], [0, 0, 0, 1]):
        raise ValueError("Alignment must be a finite homogeneous 4x4 matrix")
    rotation = matrix[:3, :3]
    if not np.allclose(rotation.T @ rotation, np.eye(3), atol=1e-6) or not np.isclose(np.linalg.det(rotation), 1, atol=1e-6):
        raise ValueError("Alignment must be rigid: scale, shear, reflection and nonrigid transforms are forbidden")
    return matrix


def transform_points(points, matrix):
    return points @ matrix[:3, :3].T + matrix[:3, 3]


def transformed_mesh(mesh, matrix):
    transform = vtk.vtkTransform()
    transform.SetMatrix(rigid_matrix(matrix).ravel().tolist())
    operation = vtk.vtkTransformPolyDataFilter()
    operation.SetInputData(mesh)
    operation.SetTransform(transform)
    operation.Update()
    result = vtk.vtkPolyData()
    result.DeepCopy(operation.GetOutput())
    return result


def closest_points(points, mesh):
    locator = vtk.vtkStaticCellLocator()
    locator.SetDataSet(mesh)
    locator.BuildLocator()
    closest = np.empty_like(points, dtype=float)
    distances = np.empty(len(points))
    for index, point in enumerate(points):
        target = [0., 0., 0.]
        cell_id, sub_id, squared = vtk.reference(0), vtk.reference(0), vtk.reference(0.)
        locator.FindClosestPoint(point, target, cell_id, sub_id, squared)
        closest[index] = target
        distances[index] = np.sqrt(max(0, float(squared)))
    return closest, distances


def kabsch(source, target):
    left, right = source.mean(axis=0), target.mean(axis=0)
    u, _, vt = np.linalg.svd((source - left).T @ (target - right))
    correction = np.eye(3)
    correction[2, 2] = np.linalg.det(vt.T @ u.T)
    rotation = vt.T @ correction @ u.T
    result = np.eye(4)
    result[:3, :3], result[:3, 3] = rotation, right - rotation @ left
    return rigid_matrix(result)


def register(source_points, reference, initial, method="rigid_icp", max_iterations=50, tolerance=1e-7):
    matrix = rigid_matrix(initial)
    if method not in ("rigid", "rigid_icp"):
        raise ValueError("Only rigid or rigid_icp registration is supported")
    if not 1 <= int(max_iterations) <= 200 or not np.isfinite(tolerance) or tolerance <= 0:
        raise ValueError("Invalid registration stopping criteria")
    history, converged = [], method == "rigid"
    if method == "rigid_icp":
        for _ in range(int(max_iterations)):
            current = transform_points(source_points, matrix)
            target, distances = closest_points(current, reference)
            matrix = kabsch(current, target) @ matrix
            rms = float(np.sqrt(np.mean(distances ** 2)))
            history.append(rms)
            if len(history) > 1 and abs(history[-1] - history[-2]) < tolerance:
                converged = True
                break
    return matrix, {"method": method, "transform": matrix.tolist(), "initialTransform": np.asarray(initial).tolist(),
        "maxIterations": int(max_iterations), "tolerance": tolerance, "iterations": len(history),
        "converged": converged, "rmsHistory": history, "scaleFitting": False,
        "warning": "Local rigid alignment may converge to the wrong correspondence; review alignment independently"}


def surface_metrics(source, reference, count=5000, seed=0, completeness_tolerance=0.1):
    if not np.isfinite(completeness_tolerance) or completeness_tolerance <= 0:
        raise ValueError("Completeness tolerance must be positive in declared units")
    samples_a, samples_b = sample_surface(source, count, seed), sample_surface(reference, count, seed + 1)
    _, forward = closest_points(samples_a, reference)
    _, backward = closest_points(samples_b, source)
    return {
        "meanAbsoluteSurfaceDeviation": float(forward.mean()), "medianAbsoluteSurfaceDeviation": float(np.median(forward)),
        "rmsSurfaceDeviation": float(np.sqrt(np.mean(forward ** 2))), "maximumSampledDeviation": float(forward.max()),
        "sampledHausdorffDistance": float(max(forward.max(), backward.max())),
        "symmetricChamferMeanDistance": float((forward.mean() + backward.mean()) / 2),
        "completeness": float(np.mean(backward <= completeness_tolerance)),
        "completenessTolerance": completeness_tolerance,
        "definitions": {"forward": "Area-weighted reconstruction samples to closest reference triangle surface",
          "sampledHausdorffDistance": "Maximum of both directed sampled distances; lower bound approximation to continuous Hausdorff",
          "symmetricChamferMeanDistance": "Arithmetic mean of the two directed mean distances (not squared)",
          "completeness": "Fraction of area-weighted reference samples within tolerance of reconstruction triangle surface"},
        "sampling": {"method": "triangle_area_weighted_uniform", "samplesPerSurface": count, "seed": seed},
    }


def require_research_source(provenance, mesh_path):
    if provenance.get("synthetic") is not False or provenance.get("geometrySource") != "image_derived" or provenance.get("testFixture") or provenance.get("datasetStatus") == "software_verification_only":
        raise ValueError("Synthetic, unknown or procedural geometry is excluded from research validation")
    if not provenance.get("engine") or not provenance.get("engineVersion") or not provenance.get("videoChecksum"):
        raise ValueError("Engine and real input provenance required")
    matching = [item for item in (provenance.get("assets") or {}).values() if isinstance(item, dict)
                and item.get("checksum", item.get("sha256")) == checksum(mesh_path)]
    if not matching:
        raise ValueError("Reconstruction checksum is not registered in its provenance manifest")


def scale_accuracy(config):
    pairs = config.get("scaleLandmarks") or []
    if not pairs:
        return {"status": "unavailable", "reason": "Independent corresponding length landmarks not supplied"}
    results = []
    for pair in pairs:
        source, reference = np.asarray(pair["reconstruction"], float), np.asarray(pair["reference"], float)
        if source.shape != (2, 3) or reference.shape != (2, 3) or not np.isfinite(source).all() or not np.isfinite(reference).all():
            raise ValueError("Scale landmarks require two finite corresponding 3D points per asset")
        length, target = float(np.linalg.norm(source[1] - source[0])), float(np.linalg.norm(reference[1] - reference[0]))
        if target <= 0 or length <= 0:
            raise ValueError("Zero-length scale landmarks")
        results.append({"id": pair["id"], "scope": pair.get("scope", "unspecified"), "reconstructionLength": length, "referenceLength": target,
                        "relativeScaleError": length / target - 1, "absoluteLengthError": length - target})
    return {"status": "measured", "method": "Independent specified landmark distances; no scale fitted during registration",
            "landmarks": results, "meanRelativeScaleError": float(np.mean([x["relativeScaleError"] for x in results]))}


def evaluate(config):
    paths = [config.get("reconstructionPath"), config.get("referencePath"), config.get("provenancePath")]
    if not all(paths) or not all(Path(p).is_file() for p in paths):
        return {"status": DATASET_UNAVAILABLE, "metrics": None, "reason": "Real reconstruction, provenance and reference files required", "processingVersion": VERSION}
    provenance = json.loads(Path(config["provenancePath"]).read_text())
    require_research_source(provenance, config["reconstructionPath"])
    if config.get("units") not in ("mm", "m", "um") or config.get("referenceUnits") != config["units"]:
        raise ValueError("Both assets must have explicit identical physical units; no implicit scaling")
    if not config.get("scaleCalibration", {}).get("evidence"):
        raise ValueError("Independent scale calibration evidence is required; arbitrary-scale SfM is visualization only")
    if provenance.get("units") != config["units"] or provenance.get("scale", {}).get("status") not in ("calibrated", "validated"):
        raise ValueError("Registered geometry must already have documented physical scale; a configuration cannot relabel arbitrary units")
    if not provenance.get("scale", {}).get("evidence"):
        raise ValueError("Asset scale calibration provenance is missing")
    if config.get("surfaceSelection") != "whole_supplied_mesh":
        raise ValueError("Only whole_supplied_mesh is supported; prepare and version any ROI meshes explicitly")
    for field in ("scanId", "referenceId", "captureProtocol", "coordinateSystem", "inclusionCriteria", "exclusionCriteria", "referenceSource"):
        if field not in config or config[field] in (None, ""):
            raise ValueError(f"Explicit {field} required")
    for field in ("source", "generationMethod", "device", "resolution"):
        if field not in config["referenceSource"]:
            raise ValueError(f"Reference provenance requires {field}; use documented unavailable for unknowns")
    source, reference = load_mesh(paths[0]), load_mesh(paths[1])
    count, seed = int(config.get("surfaceSamples", 5000)), int(config.get("seed", 0))
    registration = config.get("registration") or {}
    if "initialTransform" not in registration:
        raise ValueError("Initial alignment must be supplied explicitly (identity is allowed)")
    matrix, alignment = register(sample_surface(source, count, seed), reference, registration["initialTransform"],
        registration.get("method", "rigid_icp"), int(registration.get("maxIterations", 50)), float(registration.get("tolerance", 1e-7)))
    metrics = surface_metrics(transformed_mesh(source, matrix), reference, count, seed, float(config["completenessTolerance"]))
    return {"status": "computed_experimental", "scanId": config["scanId"], "referenceId": config["referenceId"],
        "engine": provenance["engine"], "engineVersion": provenance["engineVersion"], "captureProtocol": config["captureProtocol"],
        "registrationMethod": alignment["method"], "registration": alignment, "metrics": metrics, "scaleAccuracy": scale_accuracy(config),
        "units": config["units"], "coordinateSystem": config["coordinateSystem"], "configuration": config,
        "reconstructionChecksum": checksum(paths[0]), "referenceChecksum": checksum(paths[1]),
        "processingVersion": VERSION, "timestamp": datetime.now(timezone.utc).isoformat(), "clinicallyValidated": False,
        "precision": {"status": "unavailable", "reason": "Use repeated-scan evaluation; trueness is not precision"}}


def repeatability(config):
    scans = config.get("scans", [])
    if len(scans) < 2 or any(not Path(scan.get("reconstructionPath", "")).is_file() for scan in scans):
        return {"status": DATASET_UNAVAILABLE, "metrics": None, "reason": "At least two real repeated captures required"}
    for field in ("objectId", "device", "operator", "captureProtocol"):
        values = [scan.get(field) for scan in scans]
        if any(not value for value in values) or len(set(values)) != 1:
            raise ValueError(f"Repeated scans must share explicit {field}")
    if len({scan.get("scanId") for scan in scans}) != len(scans) or any(not scan.get("scanId") or not scan.get("sessionId") for scan in scans):
        raise ValueError("Unique scans and explicit sessions required")
    pairs = []
    for i, scan in enumerate(scans):
        for other in scans[i + 1:]:
            other_provenance = json.loads(Path(other["provenancePath"]).read_text())
            require_research_source(other_provenance, other["reconstructionPath"])
            if other_provenance.get("units") != config["validation"].get("units") or other_provenance.get("scale", {}).get("status") not in ("calibrated", "validated") or not other_provenance.get("scale", {}).get("evidence"):
                raise ValueError("Every repeated capture requires documented physical scale")
            params = {**config["validation"], **scan, "referencePath": other["reconstructionPath"], "referenceId": other["scanId"],
                      "referenceSource": {"source": "repeat_capture_comparator_not_truth", "device": other["device"],
                        "generationMethod": other_provenance["engine"], "resolution": "see comparator provenance"}}
            result = evaluate(params)
            if result["status"] != "computed_experimental":
                return {"status": DATASET_UNAVAILABLE, "metrics": None}
            pairs.append({"scanA": scan["scanId"], "scanB": other["scanId"],
                "group": "within_session" if scan["sessionId"] == other["sessionId"] else "between_session",
                "metrics": result["metrics"], "registration": result["registration"]})
    summaries = {}
    for name in ("within_session", "between_session"):
        values = [p["metrics"]["symmetricChamferMeanDistance"] for p in pairs if p["group"] == name]
        summaries[name] = {"pairCount": len(values), "meanPairwiseSurfaceDistance": float(np.mean(values)) if values else None,
                           "definition": "Mean of pairwise rigid-aligned symmetric surface distances; not independent observations or a confidence interval"}
    return {"status": "computed_experimental", "metricType": "precision_repeatability_not_trueness", "pairs": pairs,
            "groups": summaries, "configuration": config, "processingVersion": VERSION, "clinicallyValidated": False}


def write_report(result, output):
    target = Path(output)
    target.mkdir(parents=True, exist_ok=True)
    # Refuse accidental overwrite of an earlier experiment's evidence.
    with (target / "validation.json").open("x") as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    with (target / "report.md").open("x") as stream:
        stream.write("# Experimental geometry evaluation\n\nStatus: **" + result["status"] + "**\n\n")
        stream.write("Software-computed results require independent review. No clinical validation or automatic capability promotion.\n\n")
        stream.write("```json\n" + json.dumps(result, indent=2, allow_nan=False) + "\n```\n")
