import unittest
import os
import sys

import numpy as np

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

from services.vti_converter import detect_mandibular_canal


class NerveCanalDetectionTests(unittest.TestCase):
    def test_detects_low_density_centerline_in_inferior_volume(self):
        volume = np.zeros((40, 28, 24), dtype=np.float32)
        volume[:, 6:22, 1:14] = 0.48

        for x in range(6, 34):
            y = 14 + int(round(np.sin(x / 5.0) * 2))
            z = 7 + int(round(np.cos(x / 6.0)))
            volume[x, y - 1:y + 2, z - 1:z + 2] = 0.19

        result = detect_mandibular_canal(volume, (0.5, 0.5, 0.5), (10.0, 20.0, -5.0))

        self.assertIsNotNone(result)
        self.assertGreaterEqual(len(result["centerline"]), 6)
        self.assertGreater(result["confidence"], 0)
        self.assertEqual(result["radius_mm"], 1.2)

    def test_returns_none_without_candidate_voxels(self):
        volume = np.zeros((20, 20, 20), dtype=np.float32)
        self.assertIsNone(detect_mandibular_canal(volume, (0.5, 0.5, 0.5)))


if __name__ == "__main__":
    unittest.main()
