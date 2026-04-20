import os
import sys
import tempfile
import unittest

import numpy as np

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

from services.vti_converter import (  # noqa: E402
    TOOTH_SEGMENT_METHOD,
    _build_heuristic_tooth_labels,
    read_label_manifest,
    run_tooth_segmentation,
)


class ToothSegmentationTests(unittest.TestCase):
    def test_no_labels_when_threshold_has_no_voxels(self):
        volume = np.zeros((24, 24, 24), dtype=np.float32)

        labels, manifest = _build_heuristic_tooth_labels(volume)

        self.assertIsNone(labels)
        self.assertEqual(manifest['num_labels'], 0)
        self.assertEqual(manifest['segmentation_status'], 'missing')
        self.assertEqual(manifest['segmentation_method'], TOOTH_SEGMENT_METHOD)

    def test_rejects_border_touching_hard_tissue_components(self):
        volume = np.zeros((32, 32, 32), dtype=np.float32)
        volume[0:10, 6:18, 6:18] = 0.82

        labels, manifest = _build_heuristic_tooth_labels(volume)

        self.assertIsNone(labels)
        self.assertEqual(manifest['num_labels'], 0)

    def test_rejects_components_smaller_than_minimum_after_erosion(self):
        volume = np.zeros((32, 32, 32), dtype=np.float32)
        volume[8:14, 8:14, 8:14] = 0.9

        labels, manifest = _build_heuristic_tooth_labels(volume)

        self.assertIsNone(labels)
        self.assertEqual(manifest['num_labels'], 0)

    def test_kept_components_regrow_but_stay_clipped_to_threshold_mask(self):
        volume = np.zeros((32, 32, 32), dtype=np.float32)
        volume[6:16, 6:16, 6:16] = 0.87

        labels, manifest = _build_heuristic_tooth_labels(volume)

        self.assertIsNotNone(labels)
        self.assertEqual(manifest['num_labels'], 1)
        self.assertGreater(manifest['voxel_counts']['1'], 8 * 8 * 8)
        self.assertLessEqual(manifest['voxel_counts']['1'], int(np.count_nonzero(volume > 0.45)))
        self.assertFalse(np.any((labels > 0) & (volume <= 0.45)))

    def test_label_ordering_is_deterministic_by_centroid(self):
        volume = np.zeros((40, 40, 40), dtype=np.float32)
        volume[24:34, 20:30, 20:30] = 0.91
        volume[6:16, 20:30, 20:30] = 0.91

        labels_a, manifest_a = _build_heuristic_tooth_labels(volume)
        labels_b, manifest_b = _build_heuristic_tooth_labels(volume)

        self.assertEqual(manifest_a['label_ids'], [1, 2])
        self.assertEqual(manifest_a, manifest_b)
        self.assertTrue(np.array_equal(labels_a, labels_b))
        self.assertLess(np.where(labels_a == 1)[0].mean(), np.where(labels_a == 2)[0].mean())

    def test_writes_label_map_and_manifest_for_valid_clusters(self):
        volume = np.zeros((36, 36, 36), dtype=np.float32)
        volume[4:14, 4:14, 4:14] = 0.82
        volume[20:30, 20:30, 20:30] = 0.91

        with tempfile.TemporaryDirectory() as study_path:
            info = run_tooth_segmentation(
                volume=volume,
                spacing=(0.5, 0.5, 0.5),
                study_path=study_path,
                safe_uid='series123',
                origin=(1.0, 2.0, 3.0),
            )

            manifest = read_label_manifest(study_path, 'series123')

            self.assertIsNotNone(info)
            self.assertEqual(info['num_labels'], 2)
            self.assertEqual(info['segmentation_method'], TOOTH_SEGMENT_METHOD)
            self.assertTrue(os.path.exists(os.path.join(study_path, 'labels_series123.vti')))
            self.assertEqual(info['spacing'], [0.5, 0.5, 0.5])
            self.assertEqual(info['origin'], [1.0, 2.0, 3.0])
            self.assertEqual(manifest['label_ids'], [1, 2])


if __name__ == '__main__':
    unittest.main()
