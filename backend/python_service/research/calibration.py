"""Explicit independent scale derivation, never registration-based scale fitting.

No calibration is estimated from a validation reference. Inputs require a separately
measured physical distance and checksum-linked evidence. This does not validate anatomy.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from vtkmodules.util.numpy_support import numpy_to_vtk, vtk_to_numpy

from .validation import checksum, load_mesh, require_research_source, DATASET_UNAVAILABLE

VERSION = 'independent-scale-1'


def scale_from_landmarks(points, indices, distance, uncertainty):
    if not isinstance(indices, list) or len(indices) != 2 or any(type(i) is not int for i in indices):
        raise ValueError('Exactly two integer vertex indices required')
    if indices[0] == indices[1] or min(indices) < 0 or max(indices) >= len(points):
        raise ValueError('Distinct in-range vertices required')
    distance, uncertainty = float(distance), float(uncertainty)
    if not np.isfinite([distance, uncertainty]).all() or distance <= 0 or not 0 <= uncertainty < distance:
        raise ValueError('Positive finite physical distance and nonnegative uncertainty smaller than distance required')
    baseline = float(np.linalg.norm(points[indices[1]] - points[indices[0]]))
    if not np.isfinite(baseline) or baseline <= 1e-12:
        raise ValueError('Calibration landmarks have zero or invalid separation')
    return distance / baseline, baseline


def calibrate(config, output):
    source = Path(config.get('reconstructionPath') or '')
    manifest_path = Path(config.get('provenancePath') or '')
    evidence = config.get('independentMeasurement') or {}
    evidence_path = Path(evidence.get('evidencePath') or '')
    if not all(p.is_file() for p in (source, manifest_path, evidence_path)):
        return {'status': DATASET_UNAVAILABLE, 'dataStatus': 'CALIBRATION_INPUT_UNAVAILABLE',
                'metrics': None, 'processingVersion': VERSION,
                'reason': 'Real reconstruction, provenance and independent calibration evidence required'}
    provenance = json.loads(manifest_path.read_text())
    require_research_source(provenance, source)
    if provenance.get('units') != 'arbitrary' or provenance.get('scale', {}).get('status') not in ('uncalibrated', 'unvalidated'):
        raise ValueError('Only an explicitly arbitrary-scale original may be calibrated')
    if not provenance.get('coordinateSystem'):
        raise ValueError('Original coordinate system required')
    if evidence.get('source') != 'independent_physical_measurement' or evidence.get('usedValidationReference') is not False:
        raise ValueError('Independent physical measurement required; fitting to the validation reference is forbidden')
    for key in ('measurementId', 'device', 'measuredAt', 'reviewer', 'landmarkDefinition'):
        if not isinstance(evidence.get(key), str) or not evidence[key].strip():
            raise ValueError(f'Calibration evidence requires {key}')
    try:
        measured_at = datetime.fromisoformat(evidence['measuredAt'].replace('Z', '+00:00'))
        if measured_at.tzinfo is None:
            raise ValueError('Timezone required')
    except ValueError as error:
        raise ValueError('Calibration timestamp must be an ISO timestamp with timezone') from error
    if evidence.get('units') not in ('mm', 'm', 'um'):
        raise ValueError('Explicit physical units required')
    evidence_hash = checksum(evidence_path)
    if evidence.get('evidenceSha256') != evidence_hash:
        raise ValueError('Independent evidence checksum mismatch')
    if evidence_path.resolve() in (source.resolve(), manifest_path.resolve()):
        raise ValueError('Calibration evidence must be a separate measurement record')
    source_hash, manifest_hash = checksum(source), checksum(manifest_path)
    mesh = load_mesh(source)
    points = vtk_to_numpy(mesh.GetPoints().GetData()).astype(float)
    factor, baseline = scale_from_landmarks(points, evidence.get('vertexIndices'), evidence.get('distance'), evidence.get('uncertainty'))
    derived_points = points * factor
    if not np.isfinite(derived_points).all():
        raise ValueError('Invalid scaled coordinates')
    # Record the exact topology and transform. The source mesh is never rewritten.
    mesh.GetPoints().SetData(numpy_to_vtk(derived_points, deep=True))
    faces = vtk_to_numpy(mesh.GetPolys().GetConnectivityArray()).reshape(-1, 3)
    target = Path(output).resolve()
    if any(p.resolve().is_relative_to(target) for p in (source, manifest_path, evidence_path)):
        raise ValueError('Output must not contain input assets')
    if checksum(source) != source_hash or checksum(manifest_path) != manifest_hash or checksum(evidence_path) != evidence_hash:
        raise ValueError('Calibration input changed during processing')
    target.mkdir(parents=True, exist_ok=False)
    mesh_path = target / 'calibrated.obj'
    with mesh_path.open('x') as stream:
        stream.write('# Independently scaled research derivative; not experimentally or clinically validated\n')
        for point in derived_points:
            stream.write('v ' + ' '.join(format(float(x), '.17g') for x in point) + '\n')
        for face in faces:
            stream.write('f ' + ' '.join(str(int(i) + 1) for i in face) + '\n')
    units = evidence['units']
    transform = np.diag([factor, factor, factor, 1.]).tolist()
    safe_evidence = {key: value for key, value in evidence.items() if key != 'evidencePath'}
    result = {**provenance, 'processingVersion': VERSION, 'units': units,
        'scale': {'status': 'calibrated', 'evidence': evidence_hash, 'factor': factor,
                  'method': 'independent_two_landmark_uniform_scale', 'originalLandmarkDistance': baseline,
                  'independentMeasurement': safe_evidence,
                  'uncertaintyScope': 'Provided physical-distance uncertainty only; landmark placement, SfM and surface uncertainty are not propagated'},
        'parent': {'assetChecksum': source_hash, 'provenanceChecksum': manifest_hash},
        'rawToDerivedTransform': transform, 'rawPreserved': True,
        'assets': {'mesh': {'fileName': mesh_path.name, 'checksum': checksum(mesh_path),
                            'sha256': checksum(mesh_path), 'version': checksum(mesh_path), 'units': units,
                            'coordinateSystem': provenance['coordinateSystem'], 'measurementCapability': 'visualization_only'}},
        'calibrationTimestamp': datetime.now(timezone.utc).isoformat(),
        'status': 'calibrated_not_validated', 'validated': False, 'clinicallyValidated': False,
        'clinicalStatus': 'experimental', 'measurementCapability': 'visualization_only',
        'validation': {'status': 'not_evaluated'},
        'limitations': ['Uniform scale cannot correct local distortion', 'No scale fitted to validation reference',
                        'Calibration does not establish reconstruction accuracy',
                        'Existing annotations remain attached to the original asset; no automatic migration']}
    # Do not inherit an old assertion of clinical/measurement capability or stale asset registry.
    result['capabilities'] = {'measurementCapability': 'visualization_only', 'clinicallyValidated': False}
    result['postProcessing'] = {'enabled': True, 'version': VERSION, 'coordinateTransform': transform,
                                'rawAssetChecksum': source_hash, 'rawPreserved': True}
    with (target / 'provenance.json').open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    return result
