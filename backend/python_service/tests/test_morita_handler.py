import os
import sys
import tempfile
import unittest

import cv2
import numpy as np

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

from services.morita_handler import (
    DEFAULT_PIXEL_SPACING,
    DEFAULT_SLICE_THICKNESS,
    MoritaHandler,
)


class MoritaHandlerTests(unittest.TestCase):
    def _write_slice_stack(self, study_path, count=2):
        for index in range(count):
            image = np.full((4, 4), 32 + index * 32, dtype=np.uint8)
            ok = cv2.imwrite(os.path.join(study_path, f'slice_{index:03d}.bmp'), image)
            self.assertTrue(ok)

    def test_invalid_proc_line_uses_fallback_without_blocking_other_metadata(self):
        with tempfile.TemporaryDirectory() as study_path:
            self._write_slice_stack(study_path)
            with open(os.path.join(study_path, 'photo_proc.txt'), 'w', encoding='utf-8') as proc_file:
                proc_file.write('PixelSize=not-a-number\n')
                proc_file.write('SlicePitch=2.5\n')

            handler = MoritaHandler(study_path)

            self.assertEqual(handler.metadata['pixel_spacing'], DEFAULT_PIXEL_SPACING)
            self.assertEqual(handler.metadata['slice_thickness'], 2.5)

    def test_non_positive_metadata_falls_back_and_coronal_render_still_succeeds(self):
        with tempfile.TemporaryDirectory() as study_path:
            self._write_slice_stack(study_path)
            with open(os.path.join(study_path, 'photo_proc.txt'), 'w', encoding='utf-8') as proc_file:
                proc_file.write('PixelSize=0\n')
                proc_file.write('SlicePitch=-4\n')

            handler = MoritaHandler(study_path)
            image_bytes, headers = handler.get_slice('coronal', 0)

            self.assertGreater(len(image_bytes), 0)
            self.assertEqual(headers['X-Pixel-Spacing'], str(DEFAULT_PIXEL_SPACING))
            self.assertEqual(headers['X-Slice-Thickness'], str(DEFAULT_SLICE_THICKNESS))


if __name__ == '__main__':
    unittest.main()
