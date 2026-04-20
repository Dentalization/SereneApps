import os
import sys
import unittest

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

from services.vti_converter import (  # noqa: E402
    _crop_margin_voxels_for_spacing,
    _slice_normal_z_sign,
)


class VtiPreprocessGeometryTests(unittest.TestCase):
    def test_slice_normal_z_sign_detects_inferior_slice_direction(self):
        self.assertEqual(_slice_normal_z_sign([1, 0, 0, 0, -1, 0]), -1.0)

    def test_slice_normal_z_sign_defaults_to_superior_for_missing_or_positive_orientation(self):
        self.assertEqual(_slice_normal_z_sign(None), 1.0)
        self.assertEqual(_slice_normal_z_sign([1, 0, 0, 0, 1, 0]), 1.0)

    def test_crop_margin_uses_10mm_physical_margin_with_safe_minimum(self):
        self.assertEqual(_crop_margin_voxels_for_spacing((0.4, 0.4, 1.0)), 25)
        self.assertEqual(_crop_margin_voxels_for_spacing((2.0, 2.0, 1.0)), 6)


if __name__ == '__main__':
    unittest.main()
