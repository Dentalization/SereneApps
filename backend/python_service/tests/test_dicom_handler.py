import io
import os
import sys
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace

import numpy as np
import pydicom

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

from services.dicom_handler import DicomHandler


class DicomWindowingTests(unittest.TestCase):
    def _make_handler(self, window_center=None, window_width=None):
        handler = DicomHandler.__new__(DicomHandler)

        if window_center is None and window_width is None:
            handler.first_ds = SimpleNamespace()
        else:
            handler.first_ds = SimpleNamespace(
                WindowCenter=window_center,
                WindowWidth=window_width,
            )

        return handler

    def test_prefers_dicom_window_when_more_than_70_percent_is_covered(self):
        handler = self._make_handler(window_center=400, window_width=1200)
        pixel_array = np.concatenate([
            np.linspace(-150, 950, 80, dtype=np.float32),
            np.full(10, -800, dtype=np.float32),
            np.full(10, 1100, dtype=np.float32),
        ])

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            window_center, window_width, window_min, window_max = handler._resolve_window_settings(pixel_array)

        self.assertEqual(window_center, 400.0)
        self.assertEqual(window_width, 1200.0)
        self.assertEqual(window_min, -200.0)
        self.assertEqual(window_max, 1000.0)
        self.assertIn('[Window] Using DICOM window.', stdout.getvalue())

    def test_falls_back_to_auto_window_when_more_than_30_percent_is_outside(self):
        handler = self._make_handler(window_center=400, window_width=1200)
        pixel_array = np.concatenate([
            np.linspace(-150, 950, 60, dtype=np.float32),
            np.full(20, -800, dtype=np.float32),
            np.full(20, 1100, dtype=np.float32),
        ])

        expected_min = float(np.percentile(pixel_array, 1))
        expected_max = float(np.percentile(pixel_array, 99))
        expected_center = (expected_min + expected_max) / 2.0
        expected_width = expected_max - expected_min

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            window_center, window_width, window_min, window_max = handler._resolve_window_settings(pixel_array)

        self.assertAlmostEqual(window_center, expected_center)
        self.assertAlmostEqual(window_width, expected_width)
        self.assertAlmostEqual(window_min, expected_min)
        self.assertAlmostEqual(window_max, expected_max)
        self.assertIn('[Window] Auto-window selected.', stdout.getvalue())

    def test_keeps_existing_auto_window_fallback_when_dicom_window_is_missing(self):
        handler = self._make_handler()
        pixel_array = np.array([-1000, -250, 0, 300, 900, 1200], dtype=np.float32)

        expected_min = float(np.percentile(pixel_array, 1))
        expected_max = float(np.percentile(pixel_array, 99))

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            _, _, window_min, window_max = handler._resolve_window_settings(pixel_array)

        self.assertAlmostEqual(window_min, expected_min)
        self.assertAlmostEqual(window_max, expected_max)
        self.assertIn('No DICOM window found', stdout.getvalue())

    def test_metadata_exposes_additional_first_slice_fields(self):
        handler = DicomHandler.__new__(DicomHandler)
        handler.volume = None
        handler.shape = None
        handler.files = ['slice1.dcm']
        handler.series_uid = 'series-1'
        handler.all_series = {'series-1': ['slice1.dcm']}
        handler.first_ds = SimpleNamespace(
            Rows=512,
            Columns=512,
            PixelSpacing=[0.2, 0.2],
            SliceThickness=0.4,
            WindowCenter=400,
            WindowWidth=1200,
            PatientName=pydicom.valuerep.PersonName('Jane^Doe'),
            PatientID='P-42',
            PatientBirthDate='19800115',
            PatientSex='F',
            StudyDate='20260413',
            StudyDescription='CBCT Implant Planning',
            InstitutionName='Serene Dental',
            KVP='90',
            Exposure='10.5',
            ExposureTime='125',
            FocalSpots='0.5',
            Manufacturer='Morita',
            ManufacturerModelName='Veraview X800',
            SoftwareVersions='3.2.1',
            ReconstructionDiameter='80.0',
        )
        handler._read_dicom_safe = lambda _: SimpleNamespace(
            SeriesDescription='Primary CBCT',
            SeriesNumber=1,
            Modality='CT',
        )

        metadata = handler.get_metadata()

        self.assertEqual(metadata['PatientName'], 'Jane Doe')
        self.assertEqual(metadata['PatientID'], 'P-42')
        self.assertEqual(metadata['StudyDescription'], 'CBCT Implant Planning')
        self.assertEqual(metadata['InstitutionName'], 'Serene Dental')
        self.assertEqual(metadata['Manufacturer'], 'Morita')
        self.assertEqual(metadata['ManufacturerModelName'], 'Veraview X800')
        self.assertEqual(metadata['SoftwareVersions'], '3.2.1')
        self.assertEqual(metadata['FieldOfViewDimensions'], '80.0')
        self.assertEqual(metadata['series'][0]['series_description'], 'Primary CBCT')
        self.assertEqual(metadata['series'][0]['type'], '3D Volume')


if __name__ == '__main__':
    unittest.main()
