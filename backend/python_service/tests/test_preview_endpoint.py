import os
import sys
import unittest

import numpy as np

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

import main  # noqa: E402


class PreviewEndpointTests(unittest.TestCase):
    def test_render_preview_png_from_volume_returns_png_bytes(self):
        volume = np.linspace(0.0, 1.0, 32 * 32 * 12, dtype=np.float32).reshape((32, 32, 12))

        preview_bytes = main._render_preview_png_from_volume(volume)

        self.assertTrue(preview_bytes.startswith(b'\x89PNG\r\n\x1a\n'))
        self.assertGreater(len(preview_bytes), 100)


if __name__ == '__main__':
    unittest.main()
