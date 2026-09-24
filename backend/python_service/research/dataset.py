"""Read-only DICOM research inventory and explicit derived-reference preparation.

No claim of anatomical coverage, tooth visibility, diversity or labels follows from DICOM headers.
Raw bytes are never rewritten. Public manifests omit names, patient IDs and original UIDs.
"""
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import pydicom
from .validation import checksum, DATASET_UNAVAILABLE

VERSION = "dicom-research-audit-1"


def dataset_layout(root):
    root = Path(root)
    for folder in ("raw", "derived", "processed", "labels", "references"):
        (root / folder).mkdir(parents=True, exist_ok=True)
    return root


def numbers(value):
    if value is None:
        return None
    try:
        array = np.asarray(value, dtype=float)
        return array.tolist() if np.isfinite(array).all() else None
    except (ValueError, TypeError):
        return None


def audit_dataset(raw_root):
    root = Path(raw_root) if raw_root else None
    if root is None or not root.is_dir() or not any(root.rglob("*")):
        return {"status": DATASET_UNAVAILABLE, "studyCount": None, "usableSamples": None,
                "studies": [], "processingVersion": VERSION, "reason": "Raw DICOM research dataset not supplied"}
    groups, unreadable = {}, []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name.startswith("."):
            continue
        # Containment prevents symlink inventory outside the requested dataset.
        if not path.resolve().is_relative_to(root.resolve()):
            unreadable.append({"fileId": hashlib.sha256(str(path.relative_to(root)).encode()).hexdigest(), "reason": "outside_raw_root"})
            continue
        file_id = checksum(path)
        try:
            data = pydicom.dcmread(path, stop_before_pixels=True)
            if not getattr(data, "StudyInstanceUID", None) or not getattr(data, "SeriesInstanceUID", None):
                raise ValueError("missing_metadata")
            study_id = hashlib.sha256(str(data.StudyInstanceUID).encode()).hexdigest()[:24]
            series_id = hashlib.sha256(str(data.SeriesInstanceUID).encode()).hexdigest()[:24]
            groups.setdefault((study_id, series_id), []).append({"checksum": file_id,
                "sop": str(getattr(data, "SOPInstanceUID", "")), "modality": str(getattr(data, "Modality", "")),
                "rows": int(getattr(data, "Rows", 0)), "columns": int(getattr(data, "Columns", 0)),
                "frames": int(getattr(data, "NumberOfFrames", 1)), "spacing": numbers(getattr(data, "PixelSpacing", None)),
                "thickness": numbers(getattr(data, "SliceThickness", None)),
                "orientation": numbers(getattr(data, "ImageOrientationPatient", None)),
                "position": numbers(getattr(data, "ImagePositionPatient", None))})
        except Exception:
            unreadable.append({"fileId": file_id, "reason": "corrupted_or_non_dicom_or_missing_metadata"})
    records = []
    for (study_id, series_id), items in groups.items():
        first, issues = items[0], []
        required = (first["rows"], first["columns"], first["spacing"], first["orientation"], first["position"], first["modality"])
        if not all(value is not None and value != 0 and value != "" for value in required):
            issues.append("missing_metadata")
        if any(item["frames"] != 1 for item in items):
            issues.append("enhanced_multiframe_requires_explicit_frame_geometry_parser")
        if len({item["checksum"] for item in items}) < len(items) or len({item["sop"] for item in items}) < len(items):
            issues.append("duplicate_slice")
        if any(item["rows"] != first["rows"] or item["columns"] != first["columns"] or item["spacing"] != first["spacing"] for item in items):
            issues.append("inconsistent_dimensions_or_spacing")
        orientation = first["orientation"]
        positions, slice_spacing = [], None
        if orientation and len(orientation) == 6:
            row, column = np.asarray(orientation[:3]), np.asarray(orientation[3:])
            valid = abs(np.dot(row, column)) < 1e-4 and np.allclose([np.linalg.norm(row), np.linalg.norm(column)], 1, atol=1e-4)
            if not valid or any(item["orientation"] is None or not np.allclose(item["orientation"], orientation, atol=1e-4) for item in items):
                issues.append("invalid_orientation")
            if all(item["position"] is not None and len(item["position"]) == 3 for item in items):
                normal = np.cross(row, column)
                positions = sorted(float(np.dot(item["position"], normal)) for item in items)
                if len(positions) > 1:
                    gaps = np.diff(positions)
                    slice_spacing = float(np.median(gaps))
                    if np.any(gaps <= 0):
                        issues.append("duplicate_slice_position")
                    if not np.allclose(gaps, slice_spacing, rtol=0.05, atol=0.01):
                        issues.append("missing_slices_or_nonuniform_spacing")
        else:
            issues.append("invalid_orientation")
        spacing = first["spacing"]
        if not spacing or len(spacing) != 2 or any(x <= 0 for x in spacing):
            issues.append("invalid_spacing")
        if len(items) < 2:
            issues.append("insufficient_slices_for_volume")
        records.append({"studyId": study_id, "seriesId": series_id, "modality": first["modality"],
            "dimensions": [first["columns"], first["rows"], sum(item["frames"] for item in items)],
            "spacing": [*spacing, slice_spacing] if spacing else None, "sliceThickness": first["thickness"],
            "orientation": orientation, "coverage": "requires_anatomical_review", "jawCoverage": "unavailable",
            "toothVisibility": "unavailable", "hasLabels": None, "hasSurfaceReference": None,
            "qualityStatus": "excluded" if issues else "requires_pixel_and_anatomical_review",
            "exclusionReason": sorted(set(issues)), "inputChecksums": [item["checksum"] for item in items],
            "pixelIntegrity": "not_decoded_by_header_audit", "missingSliceDetection": "spacing_consistency_only_not_acquisition_count_proof"})
    if not records:
        return {"status": DATASET_UNAVAILABLE, "studyCount": None, "usableSamples": None, "studies": [],
                "unreadableFiles": unreadable, "reason": "No readable DICOM image series", "processingVersion": VERSION}
    return {"status": "audited_not_ml_ready", "studyCount": len({s["studyId"] for s in records}),
        "seriesCount": len(records), "usableSamples": None, "studies": records, "unreadableFiles": unreadable,
        "patientDiversity": "unavailable_without_approved_cohort_manifest", "labels": "not_supplied_or_verified",
        "referenceGeometry": "not_supplied_or_verified", "mlReadiness": {purpose: "blocked_pending_anatomical_review_labels_and_research_objective"
            for purpose in ("toothSegmentation", "toothDetection", "fdiClassification", "dentalRegionSegmentation", "surfaceRefinement", "reconstructionSupervision", "validation")},
        "processingVersion": VERSION, "timestamp": datetime.now(timezone.utc).isoformat()}


def derive_reference(config, output):
    """Explicit intensity threshold surface, never a dental gold standard or automatic label."""
    raw = Path(config.get("rawSeriesPath", ""))
    if not config.get("rawSeriesPath") or not raw.is_dir():
        return {"status": DATASET_UNAVAILABLE, "reason": "DICOM series unavailable"}
    destination = Path(output).resolve()
    if destination.is_relative_to(raw.resolve()):
        raise ValueError("Derived output must be outside raw data")
    if not config.get("scientificJustification") or not config.get("reviewer"):
        raise ValueError("Reference derivation requires scientific justification and responsible reviewer")
    audit = audit_dataset(raw)
    series = audit.get("studies", [])
    if len(series) != 1 or series[0]["exclusionReason"]:
        raise ValueError("Provide one geometrically consistent image series with no QC exclusions")
    threshold = float(config["threshold"])
    if not np.isfinite(threshold):
        raise ValueError("Explicit finite threshold required")
    datasets = []
    for path in sorted(raw.rglob("*")):
        if path.is_file() and not path.name.startswith("."):
            datasets.append(pydicom.dcmread(path))
    if audit["unreadableFiles"]:
        raise ValueError("Unparseable raw files require resolution before derivation")
    orientation = np.asarray(series[0]["orientation"])
    direction = np.column_stack((orientation[:3], orientation[3:], np.cross(orientation[:3], orientation[3:])))
    datasets.sort(key=lambda ds: np.dot(np.asarray(ds.ImagePositionPatient, float), direction[:, 2]))
    estimated_bytes = len(datasets) * int(datasets[0].Rows) * int(datasets[0].Columns) * 4
    if estimated_bytes > 1024 ** 3:
        raise ValueError("Volume exceeds the offline 1 GiB float buffer limit")
    volume = np.stack([ds.pixel_array.astype(np.float32) * float(getattr(ds, "RescaleSlope", 1)) + float(getattr(ds, "RescaleIntercept", 0)) for ds in datasets])
    if not np.isfinite(volume).all() or not volume.min() < threshold < volume.max():
        raise ValueError("Threshold does not cross the finite decoded volume")
    from . import vtk_runtime as vtk
    from vtkmodules.util.numpy_support import numpy_to_vtk
    image = vtk.vtkImageData()
    image.SetDimensions(volume.shape[2], volume.shape[1], volume.shape[0])
    row_spacing, col_spacing, slice_spacing = series[0]["spacing"]
    image.SetSpacing(col_spacing, row_spacing, slice_spacing)
    image.SetOrigin(*(float(x) for x in datasets[0].ImagePositionPatient))
    image.SetDirectionMatrix(direction.ravel().tolist())
    image.GetPointData().SetScalars(numpy_to_vtk(volume.ravel(), deep=True))
    contour = vtk.vtkFlyingEdges3D()
    contour.SetInputData(image)
    contour.SetValue(0, threshold)
    contour.Update()
    if contour.GetOutput().GetNumberOfPolys() == 0:
        raise ValueError("No surface extracted")
    destination.mkdir(parents=True, exist_ok=True)
    mesh_path = destination / "derived_reference.stl"
    if mesh_path.exists() or (destination / "derivation.json").exists():
        raise FileExistsError("Reference evidence already exists; use a new output directory")
    writer = vtk.vtkSTLWriter()
    writer.SetFileName(str(mesh_path))
    writer.SetInputData(contour.GetOutput())
    writer.SetFileTypeToBinary()
    if not writer.Write():
        raise IOError("Failed to persist derived reference")
    result = {"status": "derived_requires_review", "method": "explicit_intensity_isosurface",
        "units": "mm", "coordinateSystem": "DICOM_LPS", "configuration": config,
        "sourceManifest": audit, "outputChecksum": checksum(mesh_path), "processingVersion": VERSION,
        "validated": False, "referenceApproved": False,
        "warning": "Intensity threshold is not tooth/jaw segmentation; artifacts and partial volume can bias surface position"}
    with (destination / "derivation.json").open("x") as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    return result
