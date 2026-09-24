"""Controlled software contracts only; no research/clinical dataset is created."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from research.calibration import calibrate, scale_from_landmarks
from research.validation import checksum, evaluate
from research.evidence import dataset_evidence


class CalibrationTests(unittest.TestCase):
    def test_known_distance_scale_and_invalid_landmarks(self):
        points = np.array([[0, 0, 0], [2, 0, 0], [0, 1, 0]], float)
        self.assertEqual(scale_from_landmarks(points, [0, 1], 10, .1), (5, 2))
        for indices, distance, uncertainty in [([0, 0], 10, .1), ([-1, 1], 10, .1),
                ([0, 9], 10, .1), ([0., 1], 10, .1), ([0, 1], 0, .1),
                ([0, 1], float('nan'), .1), ([0, 1], 10, -1)]:
            with self.assertRaises(ValueError): scale_from_landmarks(points, indices, distance, uncertainty)

    def test_no_inputs_produce_no_geometry(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'out'
            self.assertEqual(calibrate({}, target)['status'], 'DATASET_UNAVAILABLE')
            self.assertFalse(target.exists())

    def fixture(self, root):
        mesh = root / 'fixture.obj'
        mesh.write_text('# software fixture\nv 0 0 0\nv 2 0 0\nv 0 1 0\nf 1 2 3\n')
        manifest = root / 'source.json'
        manifest.write_text(json.dumps({'synthetic': True, 'testFixture': True,
            'geometrySource': 'procedural', 'units': 'arbitrary', 'scale': {'status': 'uncalibrated'},
            'coordinateSystem': 'fixture_xyz'}))
        record = root / 'measurement.txt'; record.write_text('Controlled unit-test measurement assertion only')
        return {'reconstructionPath': str(mesh), 'provenancePath': str(manifest),
            'independentMeasurement': {'source': 'independent_physical_measurement', 'usedValidationReference': False,
                'measurementId': 'fixture-only', 'device': 'unit-test', 'reviewer': 'unit-test',
                'measuredAt': '2026-09-24T00:00:00Z', 'landmarkDefinition': 'test vertices',
                'evidencePath': str(record), 'evidenceSha256': checksum(record),
                'vertexIndices': [0, 1], 'distance': 10, 'uncertainty': .1, 'units': 'mm'}}

    def test_procedural_source_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaisesRegex(ValueError, 'Synthetic'):
                calibrate(self.fixture(root), root / 'out')
            self.assertFalse((root / 'out').exists())

    def test_derivation_preserves_source_and_never_promotes_capability(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); config = self.fixture(root)
            before = checksum(config['reconstructionPath'])
            # Only isolate derivation math; synthetic flags remain in output and validation still rejects it.
            with patch('research.calibration.require_research_source'):
                result = calibrate(config, root / 'out')
                with self.assertRaises(FileExistsError): calibrate(config, root / 'out')
            self.assertEqual(checksum(config['reconstructionPath']), before)
            self.assertEqual(result['scale']['factor'], 5)
            self.assertEqual(result['parent']['assetChecksum'], before)
            self.assertEqual(result['measurementCapability'], 'visualization_only')
            self.assertFalse(result['clinicallyValidated'])
            self.assertTrue(result['synthetic'])
            self.assertIn('v 10 0 0', (root / 'out/calibrated.obj').read_text())

    def test_reference_fitting_and_tampered_evidence_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); config = self.fixture(root)
            with patch('research.calibration.require_research_source'):
                config['independentMeasurement']['usedValidationReference'] = True
                with self.assertRaisesRegex(ValueError, 'forbidden'): calibrate(config, root / 'out')
                config['independentMeasurement']['usedValidationReference'] = False
                config['independentMeasurement']['evidenceSha256'] = '0' * 64
                with self.assertRaisesRegex(ValueError, 'checksum'): calibrate(config, root / 'out')
            self.assertFalse((root / 'out').exists())

    def test_validation_rejects_unlinked_calibration_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); config = self.fixture(root)
            provenance = Path(config['provenancePath'])
            record = json.loads(provenance.read_text())
            record.update({'units': 'mm', 'scale': {'status': 'calibrated', 'evidence': 'a' * 64}})
            provenance.write_text(json.dumps(record))
            # Isolate the evidence-link gate, never computing fixture validation metrics.
            with patch('research.validation.require_research_source'):
                with self.assertRaisesRegex(ValueError, 'must match'):
                    evaluate({'reconstructionPath': config['reconstructionPath'],
                              'referencePath': config['reconstructionPath'], 'provenancePath': str(provenance),
                              'units': 'mm', 'referenceUnits': 'mm', 'scaleCalibration': {'evidence': 'b' * 64}})

    def test_validation_rejects_coordinate_and_reference_identity_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); source = self.fixture(root)
            provenance = Path(source['provenancePath'])
            record = json.loads(provenance.read_text())
            record.update({'units': 'mm', 'scale': {'status': 'calibrated', 'evidence': 'a' * 64}})
            provenance.write_text(json.dumps(record))
            config = {'reconstructionPath': source['reconstructionPath'], 'referencePath': source['reconstructionPath'],
                'provenancePath': str(provenance), 'units': 'mm', 'referenceUnits': 'mm',
                'scaleCalibration': {'evidence': 'a' * 64}, 'surfaceSelection': 'whole_supplied_mesh',
                'scanId': 'fixture', 'referenceId': 'fixture-reference', 'captureProtocol': 'software-only',
                'coordinateSystem': 'reference_xyz', 'referenceCoordinateSystem': 'reference_xyz',
                'sourceCoordinateSystem': 'wrong', 'inclusionCriteria': 'all', 'exclusionCriteria': 'none',
                'referenceSource': {'source': 'fixture', 'generationMethod': 'fixture', 'device': 'none',
                                    'resolution': 'not applicable', 'sha256': '0' * 64}}
            with patch('research.validation.require_research_source'):
                with self.assertRaisesRegex(ValueError, 'Source coordinate'):
                    evaluate(config)
                config['sourceCoordinateSystem'] = 'fixture_xyz'
                with self.assertRaisesRegex(ValueError, 'Reference checksum'):
                    evaluate(config)

    def test_historical_records_do_not_imply_current_raw_availability(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); folder = root / 'scripts/xcore-benchmark'; (folder / 'results').mkdir(parents=True)
            (folder / 'benchmark.single.config.json').write_text(json.dumps({'case': {'caseId': 'fixture',
                'folderPath': str(root / 'absent')}, 'repeatRuns': 1}))
            (folder / 'results/benchmark-runs.csv').write_text('run_id,case_id,status,file_count,file_size_bytes,total_slices\nrun1,fixture,success,2,100,2\n')
            result = dataset_evidence(root)
            self.assertEqual(result['historicalCBCT']['status'], 'repository_benchmark_evidence_present')
            self.assertEqual(result['currentRawDICOM']['status'], 'RAW_DICOM_UNAVAILABLE_CURRENT_ENVIRONMENT')
            self.assertEqual(result['repeatedCaptures']['status'], 'REPEATED_CAPTURE_DATA_UNAVAILABLE')
