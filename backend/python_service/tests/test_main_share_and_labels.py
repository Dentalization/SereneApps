import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

import main  # noqa: E402
from fastapi import HTTPException  # noqa: E402


class LabelsEndpointTests(unittest.TestCase):
    def test_labels_endpoint_404_when_missing_and_serves_when_present(self):
        old_upload_dir = main.UPLOAD_DIR
        try:
            with tempfile.TemporaryDirectory() as upload_dir:
                main.UPLOAD_DIR = upload_dir
                study_path = os.path.join(upload_dir, 'study-a')
                os.makedirs(study_path)

                with self.assertRaises(HTTPException) as missing:
                    main.get_volume_labels('study-a', series_uid='1.2.3')
                self.assertEqual(missing.exception.status_code, 404)

                labels_path = os.path.join(study_path, 'labels_1_2_3.vti')
                with open(labels_path, 'wb') as labels_file:
                    labels_file.write(b'<VTKFile></VTKFile>')
                with open(os.path.join(study_path, 'labels_1_2_3.json'), 'w') as manifest_file:
                    json.dump({
                        'segmentation_status': 'ready',
                        'segmentation_method': 'heuristic_v2',
                        'num_labels': 2,
                        'label_ids': [1, 2],
                    }, manifest_file)

                response = main.get_volume_labels('study-a', series_uid='1.2.3')

                self.assertEqual(response.path, labels_path)
                self.assertEqual(response.headers['x-labels-count'], '2')
                self.assertEqual(response.headers['x-segmentation-method'], 'heuristic_v2')
        finally:
            main.UPLOAD_DIR = old_upload_dir


class ShareValidationCacheTests(unittest.TestCase):
    def test_share_token_validation_is_cached_until_expiry(self):
        main._clear_share_validation_cache_for_tests()
        old_urlopen = main.urllib_request.urlopen
        calls = []
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return json.dumps({
                    'valid': True,
                    'studyId': '42',
                    'folderName': 'study-a',
                    'expiresAt': expires_at,
                }).encode('utf-8')

        def fake_urlopen(request, timeout=5):
            calls.append((request, timeout))
            return FakeResponse()

        try:
            main.urllib_request.urlopen = fake_urlopen

            first = main._authorize_study_access('study-a', 'raw-share-token')
            second = main._authorize_study_access('study-a', 'raw-share-token')

            self.assertEqual(first['folderName'], 'study-a')
            self.assertEqual(second['folderName'], 'study-a')
            self.assertEqual(len(calls), 1)
        finally:
            main.urllib_request.urlopen = old_urlopen
            main._clear_share_validation_cache_for_tests()


if __name__ == '__main__':
    unittest.main()
