"""Internal service access and overlapping-attempt containment, no research dataset."""
import asyncio
import json
import os
import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main
from fastapi import HTTPException
from starlette.requests import Request


def request(token=None, body=None):
    headers = [(b'authorization', ('Bearer ' + token).encode())] if token else []
    async def receive():
        return {'type': 'http.request', 'body': json.dumps(body or {}).encode(), 'more_body': False}
    return Request({'type': 'http', 'method': 'POST', 'path': '/reconstruct/3d-scan', 'headers': headers}, receive)


def raw_request(token, body):
    async def receive():
        return {'type': 'http.request', 'body': body, 'more_body': False}
    return Request({'type': 'http', 'method': 'POST', 'path': '/reconstruct/3d-scan',
                    'headers': [(b'authorization', ('Bearer ' + token).encode())]}, receive)


class ScanServiceTests(unittest.TestCase):
    def test_local_scan_environment_fallback_preserves_explicit_values(self):
        with tempfile.TemporaryDirectory() as tmp:
            env_file = Path(tmp) / '.env'
            env_file.write_text('SCAN3D_SERVICE_TOKEN="local-test-token"\n'
                                'export SCAN3D_STORAGE_ROOT="/private/test scan storage"\n'
                                'DATABASE_URL=must-not-be-loaded\n')
            with patch.dict(os.environ, {}, clear=True):
                main._load_local_scan_service_environment(env_file)
                self.assertEqual(os.environ['SCAN3D_SERVICE_TOKEN'], 'local-test-token')
                self.assertEqual(os.environ['SCAN3D_STORAGE_ROOT'], '/private/test scan storage')
                self.assertNotIn('DATABASE_URL', os.environ)
                main._scan_service_authorize(request('local-test-token'))
            with patch.dict(os.environ, {'SCAN3D_SERVICE_TOKEN': 'explicit-token',
                                      'SCAN3D_STORAGE_ROOT': '/explicit/storage'}, clear=True):
                main._load_local_scan_service_environment(env_file)
                self.assertEqual(os.environ['SCAN3D_SERVICE_TOKEN'], 'explicit-token')
                self.assertEqual(os.environ['SCAN3D_STORAGE_ROOT'], '/explicit/storage')
            with patch.dict(os.environ, {'SCAN3D_SERVICE_TOKEN': ''}, clear=True):
                main._load_local_scan_service_environment(env_file)
                self.assertEqual(os.environ['SCAN3D_SERVICE_TOKEN'], '')
                with self.assertRaises(HTTPException) as result:
                    main._scan_service_authorize(request('local-test-token'))
                self.assertEqual(result.exception.status_code, 503)

    def test_thumbnail_slice_count_rejects_non_numeric_metadata(self):
        self.assertEqual(main._metadata_slice_count({'num_slices': [1, 2]}), 1)
        self.assertEqual(main._metadata_slice_count({'num_slices': '12'}), 12)
        self.assertEqual(main._metadata_slice_count({'num_slices': float('nan')}), 1)
        self.assertEqual(main._metadata_slice_count({'num_slices': -3}), 1)

    def test_malformed_json_returns_client_error(self):
        with patch.dict(os.environ, {'SCAN3D_SERVICE_TOKEN': 'test-only'}):
            for endpoint in (main.reconstruct_3d_scan, main.lidra_analyze):
                with self.assertRaises(HTTPException) as result:
                    asyncio.run(endpoint(raw_request('test-only', b'{invalid')))
                self.assertEqual(result.exception.status_code, 400)

    def test_lidra_rejects_non_object_configuration(self):
        with patch.dict(os.environ, {'SCAN3D_SERVICE_TOKEN': 'test-only'}):
            with patch.object(main, '_scan_paths', return_value=('/tmp/attempt', '/tmp/video.mp4')):
                with self.assertRaises(HTTPException) as result:
                    asyncio.run(main.lidra_analyze(request('test-only', {'configuration': ['invalid']})))
                self.assertEqual(result.exception.status_code, 422)

    def test_service_authentication_is_fail_closed(self):
        with patch.dict(os.environ, {'SCAN3D_SERVICE_TOKEN': ''}):
            with self.assertRaises(HTTPException) as result: main._scan_service_authorize(request())
            self.assertEqual(result.exception.status_code, 503)
        with patch.dict(os.environ, {'SCAN3D_SERVICE_TOKEN': 'unit-test-only'}):
            with self.assertRaises(HTTPException) as result: main._scan_service_authorize(request('wrong'))
            self.assertEqual(result.exception.status_code, 401)
            main._scan_service_authorize(request('unit-test-only'))

    def test_paths_reject_traversal_missing_video_and_output_escape(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'SCAN3D_STORAGE_ROOT': tmp}):
            study = Path(tmp) / 'SCAN-3D-unit'
            study.mkdir()
            video = study / 'raw.mp4'
            video.write_bytes(b'not decoded in path unit test')
            body = {'folderName': study.name, 'videoPath': str(video), 'outputDir': str(study / 'attempts' / 'unit')}
            output, source = main._scan_paths(body)
            self.assertEqual(Path(source), video.resolve())
            for invalid in [{**body, 'folderName': '../private'}, {**body, 'videoPath': __file__}, {**body, 'outputDir': tmp}, []]:
                with self.assertRaises(HTTPException): main._scan_paths(invalid)
            link = study / 'escape'
            link.symlink_to(Path(tmp).parent, target_is_directory=True)
            with self.assertRaises(HTTPException): main._scan_paths({**body, 'outputDir': str(link / 'attempts' / 'unit')})

    def test_overlapping_python_compute_is_locked_until_original_finishes(self):
        entered, finish = threading.Event(), threading.Event()
        def computation(**kwargs):
            entered.set()
            self.assertTrue(finish.wait(3))
            return {'success': True}
        with tempfile.TemporaryDirectory() as tmp, patch.object(main, 'process_3d_scan_reconstruction', computation):
            with ThreadPoolExecutor(max_workers=2) as pool:
                first = pool.submit(main._run_scan_exclusively, tmp, str(Path(tmp) / 'video.mp4'), 'full', {})
                self.assertTrue(entered.wait(2))
                try:
                    with self.assertRaises(HTTPException) as result:
                        main._run_scan_exclusively(tmp, str(Path(tmp) / 'video.mp4'), 'full', {})
                    self.assertEqual(result.exception.status_code, 409)
                finally: finish.set()
                self.assertTrue(first.result()['success'])
            self.assertTrue(main._run_scan_exclusively(tmp, str(Path(tmp) / 'video.mp4'), 'full', {})['success'])

    def test_legacy_scan_routes_and_procedural_segmentation_blocked(self):
        with self.assertRaises(HTTPException): main._authorize_study_access('SCAN-3D-unit')
        with self.assertRaises(HTTPException): main._authorize_study_access('../../private')
        with patch.dict(os.environ, {'SCAN3D_SERVICE_TOKEN': 'test-only'}):
            with self.assertRaises(HTTPException) as result:
                asyncio.run(main.segment_tooth_instances(request('test-only')))
            self.assertEqual(result.exception.status_code, 409)


if __name__ == '__main__': unittest.main()
