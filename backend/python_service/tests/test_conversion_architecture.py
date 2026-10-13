import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

import main
from fastapi import BackgroundTasks


def _request(headers=None):
    request = MagicMock()
    request.headers = headers or {}
    return request


class ConversionArchitectureSwitchTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.upload_root = self._tmp.name
        self.study_id = "study-x"
        os.makedirs(os.path.join(self.upload_root, self.study_id))
        self._patches = [
            patch.object(main, "UPLOAD_DIR", self.upload_root),
            patch.object(main, "generate_study_thumbnails", MagicMock()),
        ]
        for p in self._patches:
            p.start()

    def tearDown(self):
        for p in self._patches:
            p.stop()
        self._tmp.cleanup()

    def _call(self, arch):
        with patch.dict(os.environ, {"XCORE_CONVERSION_ARCH": arch}):
            return main.trigger_vti_conversion(
                study_id=self.study_id,
                background_tasks=BackgroundTasks(),
                request=_request(),
            )

    def test_sync_runs_conversion_inline_and_reports_ready(self):
        with patch.object(main, "_ensure_vti_conversion_singleflight") as conv:
            body = self._call("sync")
        conv.assert_called_once()
        self.assertEqual(body["status"], "ready")
        self.assertEqual(body["architecture"], "sync")

    def test_background_schedules_task_and_returns_immediately(self):
        tasks = BackgroundTasks()
        with patch.object(main, "_ensure_vti_conversion_singleflight") as conv, \
                patch.dict(os.environ, {"XCORE_CONVERSION_ARCH": "background"}):
            body = main.trigger_vti_conversion(
                study_id=self.study_id, background_tasks=tasks, request=_request()
            )
        conv.assert_not_called()
        self.assertEqual(len(tasks.tasks), 1)
        self.assertEqual(body["status"], "converting")
        self.assertEqual(body["architecture"], "background")

    def test_celery_enqueues_without_running_inline(self):
        fake_task = MagicMock()
        fake_module = MagicMock(convert_study_task=fake_task)
        with patch.dict(sys.modules, {"services.conversion_worker": fake_module}), \
                patch.object(main, "_ensure_vti_conversion_singleflight") as conv:
            body = self._call("celery")
        conv.assert_not_called()
        fake_task.delay.assert_called_once()
        self.assertEqual(body["architecture"], "celery")

    def test_unknown_architecture_is_rejected(self):
        with self.assertRaises(main.HTTPException) as ctx:
            self._call("broker-typo")
        self.assertEqual(ctx.exception.status_code, 500)

    def test_background_concurrency_semaphore_limits_parallel_runs(self):
        import threading
        import time

        sem = threading.Semaphore(1)
        with patch.object(main, "_conversion_semaphore", sem):
            running = []

            def fake_convert(*args, **kwargs):
                running.append(True)
                time.sleep(0.05)
                running.pop()

            with patch.object(main, "convert_study_to_vti", side_effect=fake_convert):
                threads = [
                    threading.Thread(target=main._ensure_vti_conversion_singleflight, args=(os.path.join(self.upload_root, f"s{i}"), True))
                    for i in range(2)
                ]
                for t in threads:
                    t.start()
                for t in threads:
                    t.join()
            self.assertEqual(len(running), 0)


if __name__ == "__main__":
    unittest.main()
