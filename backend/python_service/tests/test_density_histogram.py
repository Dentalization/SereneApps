import os
import sys
import unittest

import numpy as np

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

import main  # noqa: E402


class DensityHistogramTests(unittest.TestCase):
    def test_density_percentages_use_misch_ranges_over_bone_candidate_voxels(self):
        values = np.array([
            0.10,
            0.31,
            0.34,
            0.40,
            0.50,
            0.60,
        ], dtype=np.float32)

        histogram = main._compute_density_histogram(values, bins=np.array([0.0, 0.5, 1.0], dtype=np.float32))

        self.assertEqual(histogram["counts"], [4, 2])
        self.assertEqual(histogram["density_voxel_count"], 5)
        self.assertEqual(histogram["d4_pct"], 20.0)
        self.assertEqual(histogram["d3_pct"], 40.0)
        self.assertEqual(histogram["d2_pct"], 20.0)
        self.assertEqual(histogram["d1_pct"], 20.0)

    def test_density_percentages_are_zero_when_no_bone_candidates_exist(self):
        histogram = main._compute_density_histogram(np.array([0.0, 0.12, 0.29], dtype=np.float32))

        self.assertEqual(histogram["density_voxel_count"], 0)
        self.assertEqual(histogram["d1_pct"], 0.0)
        self.assertEqual(histogram["d2_pct"], 0.0)
        self.assertEqual(histogram["d3_pct"], 0.0)
        self.assertEqual(histogram["d4_pct"], 0.0)


if __name__ == '__main__':
    unittest.main()
