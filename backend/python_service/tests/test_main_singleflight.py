import os
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

PY_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, PY_SERVICE_ROOT)

import main


class SingleflightConversionTests(unittest.TestCase):
    def setUp(self):
        with main._conversion_state_lock:
            main._conversion_events.clear()
            main._conversion_failures.clear()
            main._conversion_waiters.clear()

    def tearDown(self):
        with main._conversion_state_lock:
            main._conversion_events.clear()
            main._conversion_failures.clear()
            main._conversion_waiters.clear()

    def test_waiter_raises_clear_error_when_leader_conversion_fails(self):
        with tempfile.TemporaryDirectory() as study_path:
            leader_started = threading.Event()
            release_leader = threading.Event()
            errors = {}

            def failing_convert(path, force=False, segment=False, progress_callback=None, study_id=None, quality="standard"):
                self.assertEqual(path, study_path)
                self.assertFalse(force)
                self.assertFalse(segment)
                self.assertIsNotNone(progress_callback)
                self.assertEqual(study_id, os.path.basename(study_path))
                self.assertEqual(quality, "standard")
                leader_started.set()
                release_leader.wait(timeout=1)
                raise RuntimeError('boom')

            def run_conversion(role):
                try:
                    main._ensure_vti_conversion_singleflight(study_path)
                except Exception as exc:
                    errors[role] = exc

            with patch.object(main, 'convert_study_to_vti', side_effect=failing_convert):
                leader = threading.Thread(target=run_conversion, args=('leader',))
                waiter = threading.Thread(target=run_conversion, args=('waiter',))

                leader.start()
                self.assertTrue(leader_started.wait(timeout=1))

                waiter.start()
                deadline = time.time() + 1
                while time.time() < deadline:
                    with main._conversion_state_lock:
                        if main._conversion_waiters.get(study_path, 0) > 0:
                            break
                    time.sleep(0.01)
                release_leader.set()

                leader.join(timeout=2)
                waiter.join(timeout=2)

            self.assertFalse(leader.is_alive())
            self.assertFalse(waiter.is_alive())
            self.assertIsInstance(errors.get('leader'), RuntimeError)
            self.assertIsInstance(errors.get('waiter'), RuntimeError)
            self.assertIn('another request', str(errors['waiter']))
            self.assertIn('boom', str(errors['waiter']))

    def test_waiter_times_out_when_inflight_conversion_never_signals_completion(self):
        with tempfile.TemporaryDirectory() as study_path:
            with main._conversion_state_lock:
                main._conversion_events[study_path] = threading.Event()

            with patch.object(main, '_CONVERSION_WAIT_TIMEOUT_SECONDS', 0.05):
                with self.assertRaises(TimeoutError):
                    main._ensure_vti_conversion_singleflight(study_path)

    def test_segment_request_runs_when_volume_exists_but_labels_do_not(self):
        with tempfile.TemporaryDirectory() as study_path:
            open(os.path.join(study_path, 'volume.vti'), 'wb').close()

            with patch.object(main, 'convert_study_to_vti') as mock_convert:
                ran = main._ensure_vti_conversion_singleflight(study_path, segment=True)

            self.assertTrue(ran)
            mock_convert.assert_called_once()
            _, kwargs = mock_convert.call_args
            self.assertFalse(kwargs['force'])
            self.assertTrue(kwargs['segment'])
            self.assertIsNotNone(kwargs['progress_callback'])
            self.assertEqual(kwargs['study_id'], os.path.basename(study_path))
            self.assertEqual(kwargs['quality'], 'standard')


if __name__ == '__main__':
    unittest.main()
