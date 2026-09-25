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
from research.reproduce import reproduce
from research.dental_roi_prepare import prepare as prepare_dental_review
from services.lidra_service import analyze_video_acquisition, display_border_evidence, file_sha256
from services.reconstruction_service import triangulate_verified, process_3d_scan_reconstruction, mesh_topology_diagnostics, select_reconstruction_views, ReconstructionUnavailable
from services.dense_multiview_stereo import dense_multiview_surface, _candidate_pairs
from services.dental_region_evidence import normalize_regions
from services.per_tooth_support import summarize_tooth_support
from services.mesh_surface_audit import self_intersection_report


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
    def test_display_border_requires_two_persistent_frame_edges(self):
        image = np.full((400, 240, 3), 130, np.uint8)
        image[78:100] = 8
        image[382:400] = 8
        self.assertTrue(display_border_evidence(image)['suspectedDisplayBorder'])
        image[382:400] = 130
        self.assertFalse(display_border_evidence(image)['suspectedDisplayBorder'])

    def test_dense_pair_budget_keeps_both_ends_of_full_arch_sweep(self):
        pairs = _candidate_pairs(list(range(8)), 12)
        self.assertEqual(len(pairs), 12)
        self.assertEqual(pairs[:7], [(index, index + 1) for index in range(7)])
        self.assertIn((0, 1), pairs)
        self.assertIn((6, 7), pairs)
        self.assertNotIn((0, 7), pairs)

    def test_offline_review_page_prepares_frames_without_inventing_polygons(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            video = root / 'review-fixture.avi'
            writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*'MJPG'), 10, (160, 120))
            self.assertTrue(writer.isOpened())
            for index in range(4):
                writer.write(np.full((120, 160, 3), index * 30 + 30, np.uint8))
            writer.release()
            template_path = prepare_dental_review(video, root / 'private-review', 4)
            template = json.loads(template_path.read_text())
            self.assertEqual(template['videoSha256'], file_sha256(video))
            self.assertTrue(all(item['polygon'] is None for item in template['frames']))
            page = (template_path.parent / 'annotate.html').read_text()
            self.assertIn('operator_annotated_unverified', page)
            self.assertIn('data:image/jpeg;base64,', page)
            self.assertNotIn('"polygon":[[', page)

    def test_reconstruction_view_budget_preserves_new_declared_region(self):
        frames = [{"frameIndex": index, "visibleRegions": ["left"] if index != 4 else ["right"],
                   "dentalFeatureCount": 100, "medianDentalDisplacementPx": 5} for index in range(8)]
        chosen, report = select_reconstruction_views(frames, 3)
        self.assertEqual([frame["frameIndex"] for frame in chosen], [0, 4, 7])
        self.assertEqual(report["translationStatus"], "physical_camera_translation_not_measured")

    def test_self_intersection_audit_checks_nonadjacent_triangles(self):
        vertices = np.array([[0, 0, 0], [2, 0, 0], [0, 2, 0],
                             [.5, .5, -1], [.5, .5, 1], [1.5, .5, 1]], float)
        result = self_intersection_report(vertices, np.array([[0, 1, 2], [3, 4, 5]]))
        self.assertEqual(result['status'], 'evaluated')
        self.assertGreater(result['count'], 0)

    def test_tooth_report_counts_projected_support_without_claiming_completeness(self):
        vertices = np.array([[0, 0, 4], [.1, 0, 4], [0, .1, 4]], float)
        faces = np.array([[0, 1, 2]])
        views = [{"frameIndex": i} for i in range(3)]
        poses = {i: (np.eye(3), np.zeros(3)) for i in range(3)}
        k = np.array([[100, 0, 50], [0, 100, 50], [0, 0, 1]], float)
        tooth = {"expectedToothIds": [11], "frames": [
            {"frameIndex": i, "toothRegions": [{"fdi": 11,
                "polygon": [[.4, .4], [.6, .4], [.6, .6], [.4, .6]]}]} for i in range(3)]}
        report = summarize_tooth_support(vertices, faces, views, poses, k, tooth, (100, 100))
        self.assertEqual(report['status'], 'projection_support_only')
        self.assertEqual(report['teeth'][0]['verticesInThreeOrMoreViews'], 3)
        self.assertIsNone(report['teeth'][0]['anatomicalSurfaceCompleteness'])
        self.assertFalse(report['teeth'][0]['labelVerified'])
        observed = summarize_tooth_support(vertices, faces, views, poses, k, tooth, (100, 100),
                                            vertex_view_bits=np.full(3, 0b011, dtype=np.uint16))
        self.assertEqual(observed['status'], 'observed_multiview_support_only')
        self.assertEqual(observed['teeth'][0]['verticesInThreeOrMoreViews'], 0)

    def test_dental_annotations_are_bound_to_video_and_each_frame(self):
        record = {"source": "operator_annotated_unverified", "reviewer": "software-test", "videoSha256": "a" * 64,
                  "expectedRegions": ["anterior"], "frames": [
                    {"frameIndex": i, "polygon": [[.1, .1], [.9, .1], [.9, .9], [.1, .9]],
                     "mouthStable": True, "visibleRegions": ["anterior"]} for i in (0, 4)]}
        self.assertEqual(sorted(normalize_regions(record, "a" * 64, 5)), [0, 4])
        with self.assertRaisesRegex(ValueError, 'exact source video'):
            normalize_regions(record, "b" * 64, 5)
        with self.assertRaisesRegex(ValueError, 'mouth-stability'):
            normalize_regions({**record, "frames": [{**record["frames"][0], "mouthStable": None},
                                                  record["frames"][1]]}, "a" * 64, 5)

    def test_dense_cpu_stereo_requires_consensus_of_three_observed_views(self):
        # Controlled planar software fixture checks actual OpenCV depth/fusion execution.
        # It is not dental data or a reconstruction-accuracy experiment.
        base = np.random.default_rng(11).integers(30, 220, (240, 320), dtype=np.uint8)
        images = [cv2.cvtColor(cv2.warpAffine(base, np.float32([[1, 0, -shift], [0, 1, 0]]),
                       (320, 240)), cv2.COLOR_GRAY2BGR) for shift in (0, 12, 24)]
        masks = [np.full((240, 320), 255, np.uint8) for _ in images]
        intrinsic = np.array([[500, 0, 160], [0, 500, 120], [0, 0, 1]], float)
        poses = {i: (np.eye(3), np.array([-0.096 * i, 0, 0])) for i in range(3)}
        two_view, two_evidence = dense_multiview_surface(images[:2], masks[:2], intrinsic,
                                                           {i: poses[i] for i in (0, 1)})
        self.assertIsNone(two_view)
        self.assertEqual(two_evidence['status'], 'insufficient_registered_views')
        dense, evidence = dense_multiview_surface(images, masks, intrinsic, poses)
        self.assertEqual(evidence['status'], 'executed')
        self.assertGreater(len(dense[0]), 100)
        self.assertGreater(len(dense[1]), 100)
        self.assertEqual(len({view for pair in evidence['pairFrames'] for view in pair}), 3)
        self.assertEqual(len(dense[0]), len(dense[2]))
        self.assertTrue(all(int(bits).bit_count() >= 3 for bits in dense[2]))
        self.assertTrue(np.all(dense[3] >= 2))

    def test_dense_surface_keeps_new_supported_regions_from_multiple_pairs(self):
        # Four-view planar software fixture; this tests patch union, not dental coverage.
        base = np.random.default_rng(11).integers(30, 220, (240, 320), dtype=np.uint8)
        images = [cv2.cvtColor(cv2.warpAffine(base, np.float32([[1, 0, -shift], [0, 1, 0]]),
                       (320, 240)), cv2.COLOR_GRAY2BGR) for shift in (0, 12, 24, 36)]
        masks = [np.full((240, 320), 255, np.uint8) for _ in images]
        masks[0][:, 190:] = 0
        masks[3][:, :130] = 0
        intrinsic = np.array([[500, 0, 160], [0, 500, 120], [0, 0, 1]], float)
        poses = {i: (np.eye(3), np.array([-0.096 * i, 0, 0])) for i in range(4)}
        dense, report = dense_multiview_surface(images, masks, intrinsic, poses)
        self.assertEqual(report['status'], 'executed')
        self.assertGreaterEqual(len(report['surfacePatches']), 2)
        self.assertGreater(len(np.unique(dense[4])), 1)
        self.assertEqual(len(dense[1]), len(dense[4]))
        self.assertTrue(all(int(bits).bit_count() >= 3 for bits in dense[2]))

    def test_mesh_topology_reports_fragments_without_claiming_anatomy(self):
        faces = np.array([[0, 1, 2], [1, 2, 3], [4, 5, 6]], dtype=int)
        topology = mesh_topology_diagnostics(8, faces)
        self.assertEqual(topology['connectedComponents'], 2)
        self.assertEqual(topology['largestComponentFaces'], 2)
        self.assertEqual(topology['largestComponentFaceFraction'], 2 / 3)
        self.assertEqual(topology['usedVertices'], 7)
        self.assertEqual(topology['isolatedVertices'], 1)
        self.assertEqual(topology['nonManifoldEdges'], 0)
        self.assertEqual(topology['inconsistentWindingEdges'], 1)
        self.assertFalse(topology['watertight'])
        with self.assertRaisesRegex(ValueError, 'invalid vertex'):
            mesh_topology_diagnostics(3, np.array([[0, 1, 3]]))

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
            region = {"source": "operator_annotated_unverified", "reviewer": "synthetic_software_fixture_only",
                      "videoSha256": file_sha256(video), "expectedRegions": ["synthetic_fixture"],
                      "frames": [{"frameIndex": i, "polygon": [[0.01, 0.01], [0.99, 0.01], [0.99, 0.99], [0.01, 0.99]],
                                  "mouthStable": True, "visibleRegions": ["synthetic_fixture"]} for i in range(12)]}
            sampling = {"strategy": "geometry_aware", "minPixelDifference": .1, "dentalRegions": region}
            result = process_3d_scan_reconstruction(str(Path(tmp) / 'output'), video_path=video,
                configuration={'frameSampling': sampling, 'reconstruction': {'parameters': {'maxViews': 4}}})
            self.assertTrue(result['success'])
            self.assertGreaterEqual(result['metadata']['vertexCount'], 20)
            self.assertGreater(result['metadata']['faceCount'], 0)
            self.assertGreaterEqual(result['metadata']['meshTopology']['connectedComponents'], 1)
            self.assertIn('firstFrame', result['metadata']['bestPair'])
            self.assertGreaterEqual(len(result['cameraTrajectory']), 3)
            self.assertGreater(result['metadata']['multiViewSparse']['pointCount'], 0)
            self.assertGreaterEqual(len(result['metadata']['multiViewSparse']['contributingFrames']), 3)
            adjustment = result['metadata']['multiViewSparse']['bundleAdjustment']
            self.assertIn(adjustment['status'], ('executed', 'initial_solution_retained', 'rejected_no_improvement'))
            self.assertIn('initialMedianReprojectionPx', adjustment)
            self.assertEqual(result['metadata']['registeredFrames'], len(result['cameraTrajectory']))
            self.assertTrue(any(view['provenance'] == 'pnp_ransac' for view in result['cameraTrajectory']))
            self.assertEqual(len(result['metadata']['featureSupport']['normalizedBounds']), 4)
            self.assertEqual(result['metadata']['units'], 'arbitrary')
            self.assertIsNone(result['confidence'])
            self.assertEqual(result['metadata']['measurementCapability'], 'visualization_only')
            self.assertFalse(result['metadata']['validated'])
            self.assertTrue(all(len(a['sha256']) == 64 for a in result['assets'].values()))
            replay = reproduce(video, {'frameSampling': sampling,
                               'reconstruction': {'parameters': {'maxViews': 4}}},
                               Path(tmp) / 'repeat-output', 'synthetic_fixture')
            replay_manifest = json.loads(Path(replay['manifest']).read_text())
            with self.assertRaises(ValueError):
                require_research_source(replay_manifest, Path(tmp) / 'repeat-output/mesh.obj')
            repeat = {'assets': replay_manifest['assets']}
            self.assertEqual({k: v['sha256'] for k, v in result['assets'].items()},
                             {k: v['sha256'] for k, v in repeat['assets'].items()})
            self.assertIn('maxFeatures', result['metadata']['configuration']['reconstruction']['parameters'])
            self.assertIn('minSharpness', result['metadata']['configuration']['frameSampling'])
            self.assertEqual(len(result['metadata']['reproducibility']['sourceSha256']), 8)
            self.assertTrue(all('sha256' in f for f in result['metadata']['selectedFrames']))
            global_diagnostic = process_3d_scan_reconstruction(str(Path(tmp) / 'global-diagnostic'),
                video_path=video, configuration={'frameSampling': {'strategy': 'uniform',
                    'maxFrames': 12, 'minPixelDifference': .1},
                    'reconstruction': {'parameters': {'maxViews': 4}}})
            self.assertTrue(global_diagnostic['metadata']['diagnosticOnly'])
            self.assertEqual(global_diagnostic['metadata']['denseMultiView']['status'], 'disabled_global_diagnostic')
            self.assertEqual(global_diagnostic['metadata']['dentalEvidence']['status'], 'unavailable')
            reuse_dir = Path(tmp) / 'reuse-output'
            measured = analyze_video_acquisition(video, str(reuse_dir), configuration=sampling)
            self.assertEqual(measured['status'], 'ready')
            with patch('services.reconstruction_service.analyze_video_acquisition', side_effect=AssertionError('video analyzed twice')):
                reused = process_3d_scan_reconstruction(str(reuse_dir), video_path=video,
                    configuration={'frameSampling': sampling, 'reconstruction': {'parameters': {'maxViews': 4}}})
            self.assertEqual(reused['metadata']['acquisitionSource'], 'verified_persisted_report')
            self.assertEqual([(f['frameIndex'], f['sha256']) for f in reused['metadata']['selectedFrames']],
                             [(f['frameIndex'], f['sha256']) for f in measured['selectedFrames']])
            tampered_dir = Path(tmp) / 'tampered-output'
            tampered = analyze_video_acquisition(video, str(tampered_dir), configuration=sampling)
            first_frame = tampered_dir / 'frames' / tampered['selectedFrames'][0]['fileName']
            first_frame.write_bytes(b'tampered software fixture')
            with self.assertRaisesRegex(ReconstructionUnavailable, 'checksum mismatch'):
                process_3d_scan_reconstruction(str(tampered_dir), video_path=video,
                    configuration={'frameSampling': sampling})
            with self.assertRaisesRegex(ValueError, 'already exists'):
                process_3d_scan_reconstruction(str(Path(tmp) / 'output'), video_path=video)


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
