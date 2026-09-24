"""Software verification with mathematical/controlled fixtures, NOT dataset validation."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import cv2
import numpy as np
from research import vtk_runtime as vtk
from research.validation import (rigid_matrix, kabsch, transform_points, sample_surface, surface_metrics,
                                transformed_mesh, evaluate, repeatability, require_research_source, register)
from research.dataset import audit_dataset, dataset_layout, derive_reference
from services.lidra_service import analyze_video_acquisition
from services.reconstruction_service import triangulate_verified, process_3d_scan_reconstruction, ReconstructionUnavailable


class SurfaceSoftwareTests(unittest.TestCase):
    def plane(self):
        source = vtk.vtkPlaneSource()
        source.SetOrigin(0, 0, 0)
        source.SetPoint1(1, 0, 0)
        source.SetPoint2(0, 1, 0)
        source.Update()
        triangles = vtk.vtkTriangleFilter()
        triangles.SetInputData(source.GetOutput())
        triangles.Update()
        return triangles.GetOutput()

    def test_surface_distance_is_to_triangles_not_vertices(self):
        mesh = self.plane()
        transform = np.eye(4)
        transform[2, 3] = 2
        metrics = surface_metrics(transformed_mesh(mesh, transform), mesh, count=100, completeness_tolerance=.1)
        self.assertAlmostEqual(metrics['rmsSurfaceDeviation'], 2)
        self.assertAlmostEqual(metrics['sampledHausdorffDistance'], 2)
        self.assertEqual(metrics['completeness'], 0)
        self.assertAlmostEqual(surface_metrics(mesh, mesh, count=100)['rmsSurfaceDeviation'], 0, places=12)

    def test_rigid_registration_preserves_scale(self):
        source = np.array([[0, 0, 0], [1, 0, 0], [0, 2, 0], [0, 0, 3]], float)
        rotation = np.array([[0, -1, 0], [1, 0, 0], [0, 0, 1]])
        target = source @ rotation.T + [4, 5, 6]
        matrix = kabsch(source, target)
        np.testing.assert_allclose(transform_points(source, matrix), target, atol=1e-12)
        for invalid in [np.diag([2, 2, 2, 1]), np.diag([-1, 1, 1, 1]), np.full((4, 4), np.nan)]:
            with self.assertRaises(ValueError): rigid_matrix(invalid)

    def test_icp_and_sampling_are_reproducible(self):
        mesh = self.plane()
        samples = sample_surface(mesh, 100, 7)
        np.testing.assert_array_equal(samples, sample_surface(mesh, 100, 7))
        displaced = samples + [0, 0, .1]
        matrix, log = register(displaced, mesh, np.eye(4))
        self.assertTrue(log['converged'])
        np.testing.assert_allclose(transform_points(displaced, matrix), samples, atol=1e-10)

    def test_dataset_absence_does_not_produce_metrics(self):
        for result in [evaluate({}), repeatability({}), audit_dataset(None)]:
            self.assertEqual(result['status'], 'DATASET_UNAVAILABLE')
            self.assertIsNone(result.get('metrics'))

    def test_configuration_cannot_relabel_arbitrary_scale(self):
        # Isolate the scale gate; this mock never authorizes or evaluates a fixture.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mesh = root / 'fixture.obj'
            mesh.write_text('software fixture; never loaded')
            provenance = root / 'provenance.json'
            provenance.write_text(json.dumps({'testFixture': True, 'units': 'arbitrary',
                                              'scale': {'status': 'uncalibrated'}}))
            config = {'reconstructionPath': str(mesh), 'referencePath': str(mesh),
                      'provenancePath': str(provenance), 'units': 'mm', 'referenceUnits': 'mm',
                      'scaleCalibration': {'evidence': 'untrusted configuration assertion'}}
            with patch('research.validation.require_research_source'):
                with self.assertRaisesRegex(ValueError, 'cannot relabel arbitrary units'):
                    evaluate(config)

    def test_synthetic_unknown_and_unregistered_assets_rejected(self):
        for provenance in [{}, {'synthetic': True}, {'synthetic': False, 'geometrySource': 'procedural'}]:
            with self.assertRaises(ValueError): require_research_source(provenance, '/does/not/exist')
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'mesh.obj'
            p.write_text('controlled software fixture')
            with self.assertRaises(ValueError):
                require_research_source({'synthetic': False, 'geometrySource': 'image_derived',
                    'engine': 'e', 'engineVersion': '1', 'videoChecksum': 'a' * 64, 'assets': {}}, p)


class AcquisitionSoftwareTests(unittest.TestCase):
    def test_missing_corrupt_and_blank_video_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for path in [None, root / 'broken.mp4']:
                (root / 'broken.mp4').write_bytes(b'not video')
                report = analyze_video_acquisition(path, tmp)
                self.assertEqual(report['status'], 'unavailable')
                self.assertIsNone(report['qualityScore'])
                self.assertEqual(report['selectedFrames'], [])
            writer = cv2.VideoWriter(str(root / 'blank.avi'), cv2.VideoWriter_fourcc(*'MJPG'), 10, (320, 240))
            for _ in range(5): writer.write(np.zeros((240, 320, 3), np.uint8))
            writer.release()
            report = analyze_video_acquisition(str(root / 'blank.avi'), tmp)
            self.assertEqual(report['status'], 'rejected')
            self.assertEqual(report['blur']['averageSharpness'], 0)
            self.assertIsNone(report['coverage']['coverageScore'])
            with self.assertRaises(ReconstructionUnavailable):
                process_3d_scan_reconstruction(tmp, video_path=str(root / 'blank.avi'))

    def test_triangulation_recovers_projected_points_and_rejects_no_parallax(self):
        points = np.array([[.1, .2, 3], [.5, -.3, 4], [-.8, .6, 6]], float)
        intrinsic = np.array([[500, 0, 320], [0, 500, 240], [0, 0, 1]], float)
        shift = np.array([-1, 0, 0], float)
        project = lambda p: (p @ intrinsic.T)[:, :2] / p[:, 2:]
        result, valid, _, _ = triangulate_verified(project(points), project(points + shift), intrinsic, np.eye(3), shift)
        self.assertTrue(valid.all())
        np.testing.assert_allclose(result, points, atol=1e-10)
        result, _, _, _ = triangulate_verified(project(points), project(points), intrinsic, np.eye(3), np.zeros(3))
        self.assertEqual(len(result), 0)

    def test_controlled_video_executes_real_feature_pipeline(self):
        # Synthetic image sequence verifies code execution only. Never exported as a research dataset.
        rng = np.random.default_rng(44)
        points = rng.uniform([-1.4, -.9, 3], [1.4, .9, 6], (260, 3))
        textures = rng.integers(0, 256, (260, 13, 13), dtype=np.uint8)
        with tempfile.TemporaryDirectory() as tmp:
            video = str(Path(tmp) / 'software-fixture.avi')
            writer = cv2.VideoWriter(video, cv2.VideoWriter_fourcc(*'MJPG'), 10, (640, 480))
            self.assertTrue(writer.isOpened())
            for camera_x in np.linspace(0, .65, 12):
                image = np.full((480, 640), 70, np.uint8)
                for point, texture in zip(points, textures):
                    x = round(640 * (point[0] - camera_x) / point[2] + 320)
                    y = round(640 * point[1] / point[2] + 240)
                    if 7 <= x < 633 and 7 <= y < 473: image[y-6:y+7, x-6:x+7] = texture
                writer.write(cv2.cvtColor(image, cv2.COLOR_GRAY2BGR))
            writer.release()
            result = process_3d_scan_reconstruction(str(Path(tmp) / 'output'), video_path=video,
                configuration={'frameSampling': {'minPixelDifference': .1}, 'reconstruction': {'parameters': {'maxViews': 4}}})
            self.assertTrue(result['success'])
            self.assertGreaterEqual(result['metadata']['vertexCount'], 20)
            self.assertGreater(result['metadata']['faceCount'], 0)
            self.assertEqual(len(result['cameraTrajectory']), 2)
            self.assertEqual(result['metadata']['units'], 'arbitrary')
            self.assertIsNone(result['confidence'])
            self.assertEqual(result['metadata']['measurementCapability'], 'visualization_only')
            self.assertFalse(result['metadata']['validated'])
            self.assertTrue(all(len(a['sha256']) == 64 for a in result['assets'].values()))

    def test_invalid_configuration_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError): analyze_video_acquisition(None, tmp, configuration={'maxFrames': 0})
            with self.assertRaises(ValueError): analyze_video_acquisition(None, tmp, configuration={'minLuminance': float('nan')})
            with self.assertRaises(ValueError): process_3d_scan_reconstruction(tmp, configuration={'reconstruction': {'parameters': {'magic': True}}})


class DicomInventoryTests(unittest.TestCase):
    def test_empty_layout_and_corrupt_entries_preserved_without_phi(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = dataset_layout(tmp)
            self.assertEqual(audit_dataset(root / 'raw')['status'], 'DATASET_UNAVAILABLE')
            (root / 'raw' / 'patient-name.dcm').write_bytes(b'broken')
            result = audit_dataset(root / 'raw')
            self.assertEqual(len(result['unreadableFiles']), 1)
            self.assertNotIn('patient-name', json.dumps(result))
            self.assertEqual((root / 'raw' / 'patient-name.dcm').read_bytes(), b'broken')


    def test_dicom_header_qc_and_explicit_derivation_preserve_raw(self):
        import pydicom
        from pydicom.dataset import FileDataset, FileMetaDataset
        from pydicom.uid import generate_uid, ExplicitVRLittleEndian, CTImageStorage
        from research.validation import checksum
        with tempfile.TemporaryDirectory() as tmp:
            root = dataset_layout(tmp)
            study_uid, series_uid = generate_uid(), generate_uid()
            for i in range(3):
                meta = FileMetaDataset()
                meta.TransferSyntaxUID = ExplicitVRLittleEndian
                meta.MediaStorageSOPClassUID = CTImageStorage
                meta.MediaStorageSOPInstanceUID = generate_uid()
                ds = FileDataset(str(root / 'raw' / f'{i}.dcm'), {}, file_meta=meta, preamble=b'\0' * 128)
                ds.StudyInstanceUID, ds.SeriesInstanceUID = study_uid, series_uid
                ds.SOPInstanceUID, ds.SOPClassUID = meta.MediaStorageSOPInstanceUID, CTImageStorage
                ds.Modality = 'CT'
                ds.Rows = ds.Columns = 8
                ds.PixelSpacing = [1, 1]
                ds.SliceThickness = 1
                ds.ImageOrientationPatient = [1, 0, 0, 0, 1, 0]
                ds.ImagePositionPatient = [0, 0, i]
                ds.BitsAllocated = ds.BitsStored = 16
                ds.HighBit, ds.PixelRepresentation, ds.SamplesPerPixel = 15, 0, 1
                ds.PhotometricInterpretation = 'MONOCHROME2'
                pixels = np.zeros((8, 8), np.uint16)
                pixels[2:6, 2:6] = 100
                ds.PixelData = pixels.tobytes()
                ds.save_as(ds.filename, enforce_file_format=True)
            before = {p.name: checksum(p) for p in (root / 'raw').iterdir()}
            audit = audit_dataset(root / 'raw')
            self.assertEqual(audit['studyCount'], 1) # Count of the controlled unit fixture only.
            self.assertEqual(audit['studies'][0]['exclusionReason'], [])
            self.assertIsNone(audit['usableSamples'])
            config = {'rawSeriesPath': str(root / 'raw'), 'threshold': 50,
                      'scientificJustification': 'controlled software test only', 'reviewer': 'unit-test'}
            result = derive_reference(config, root / 'derived' / 'test')
            self.assertFalse(result['referenceApproved'])
            self.assertEqual(result['coordinateSystem'], 'DICOM_LPS')
            self.assertEqual(before, {p.name: checksum(p) for p in (root / 'raw').iterdir()})
            with self.assertRaises(ValueError): derive_reference(config, root / 'raw' / 'forbidden')
            (root / 'raw' / '1.dcm').unlink()
            # Two regular endpoints cannot establish a missing acquisition count; this is documented.
            self.assertEqual(audit_dataset(root / 'raw')['studies'][0]['missingSliceDetection'], 'spacing_consistency_only_not_acquisition_count_proof')


if __name__ == '__main__': unittest.main()
