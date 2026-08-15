import os
import struct
import sys
import tempfile
import unittest

import cv2
import numpy as np

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

from services.morita_volume import discover_jm_volumes, load_jm_volume_for_viewer
from services.vti_converter import scan_dicom_series


class MoritaVolumeTests(unittest.TestCase):
    def _write_volume(self, study_path):
        x_min, x_max = -1, 1
        y_min, y_max = -1, 1
        z_min, z_max = -1, 2
        xml = (
            "<?xml version='1.0' encoding='Shift_JIS' ?>"
            "<JmVolume><Attribute>"
            '<tfXGridSize value="0.25"/>'
            '<tfYGridSize value="0.25"/>'
            '<tfZGridSize value="0.25"/>'
            "</Attribute></JmVolume>"
        ).encode('shift_jis')
        # Morita's CArray3D order is X, Y, Z.
        voxels = np.arange(36, dtype='<i2').reshape(3, 3, 4) - 20
        voxels[0, 0, 0] = -32768
        target = os.path.join(study_path, 'CT_0.vol')
        with open(target, 'wb') as output:
            output.write(struct.pack('<I', 17))
            output.write(b'JmVolumeVersion=1')
            output.write(struct.pack('<I', len(xml)))
            output.write(xml)
            output.write(struct.pack('<I', len(b'CArray3D')))
            output.write(b'CArray3D')
            output.write(struct.pack('<6i', x_min, x_max, y_min, y_max, z_min, z_max))
            output.write(voxels.tobytes())
        return target

    def test_discovers_valid_volume_and_builds_a_3d_series(self):
        with tempfile.TemporaryDirectory() as study_path:
            self._write_volume(study_path)
            cv2.imwrite(os.path.join(study_path, 'Panoramik.jpg'), np.full((8, 8), 127, dtype=np.uint8))
            cv2.imwrite(os.path.join(study_path, 'Cephalometri.jpg'), np.full((8, 8), 127, dtype=np.uint8))
            cv2.imwrite(os.path.join(study_path, 'Capture.tif'), np.full((8, 8), 127, dtype=np.uint8))

            volumes = discover_jm_volumes(study_path)
            self.assertEqual(len(volumes), 1)
            self.assertEqual(volumes[0]['dimensions'], (3, 3, 4))
            self.assertEqual(volumes[0]['num_slices'], 4)

            series = scan_dicom_series(study_path)
            entries = list(series.values())
            self.assertEqual(sum(item['classification'] == '3D' for item in entries), 1)
            self.assertEqual(sum(item['classification'] == '2D' for item in entries), 2)
            self.assertNotIn('Capture.tif', [os.path.basename(item['files'][0][2]) for item in entries])

    def test_normalizes_and_downsamples_volume_for_the_standard_viewer_resolution(self):
        with tempfile.TemporaryDirectory() as study_path:
            self._write_volume(study_path)
            header = discover_jm_volumes(study_path)[0]

            volume, spacing, origin = load_jm_volume_for_viewer(
                header,
                requested_spacing=(0.5, 0.5, 0.5),
            )

            self.assertEqual(volume.shape, (2, 2, 2))
            self.assertEqual(spacing, (0.5, 0.5, 0.5))
            self.assertEqual(origin, (-0.25, -0.25, -0.25))
            self.assertEqual(volume.dtype, np.float32)
            self.assertGreaterEqual(float(volume.min()), 0.0)
            self.assertLessEqual(float(volume.max()), 1.0)

            high_quality_volume, high_quality_spacing, _ = load_jm_volume_for_viewer(
                header,
                requested_spacing=(0.3, 0.3, 0.3),
            )
            self.assertEqual(high_quality_volume.shape, (3, 3, 4))
            self.assertEqual(high_quality_spacing, (0.25, 0.25, 0.25))
            self.assertEqual(
                tuple(np.unravel_index(np.argmax(high_quality_volume), high_quality_volume.shape)),
                (2, 2, 3),
            )


if __name__ == '__main__':
    unittest.main()
