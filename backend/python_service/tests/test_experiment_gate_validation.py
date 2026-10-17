import os
import sys
import unittest
from pathlib import Path

# Add experiments directory to sys.path
REPO_ROOT = Path(__file__).resolve().parents[3]
EXPERIMENTS_DIR = REPO_ROOT / "experiments"
if str(EXPERIMENTS_DIR) not in sys.path:
    sys.path.insert(0, str(EXPERIMENTS_DIR))

from run_experiment import (
    check_preflight_gate,
    determine_validation_status,
    get_harness_provenance,
    is_cell_completed,
)


class ExperimentGateValidationTests(unittest.TestCase):
    def setUp(self):
        self.config = {
            "gate": {
                "max_swap_used_mb": 500.0,
                "min_available_memory_mb": 3000.0,
                "require_ac_power": True,
                "min_disk_free_gb": 5.0,
                "max_retries": 1,
                "retry_delay_seconds": 0,
            }
        }
        self.passing_readings = {
            "swap_used_mb": 50.0,
            "available_memory_mb": 4200.0,
            "ac_power_connected": True,
            "disk_free_gb": 15.0,
            "thermal_state": "nominal",
        }
        self.failing_readings = {
            "swap_used_mb": 7126.31,
            "available_memory_mb": 1507.37,
            "ac_power_connected": False,
            "disk_free_gb": 2.19,
            "thermal_state": "nominal",
        }

    def test_gate_passes_and_no_skip_yields_validation_only_false(self):
        passed, readings, reasons = check_preflight_gate(self.config, readings=self.passing_readings)
        self.assertTrue(passed)
        self.assertEqual(len(reasons), 0)

        validation_only, triggers = determine_validation_status(
            gate_passed=passed,
            skip_gate=False,
            failure_reasons=reasons,
        )
        self.assertFalse(validation_only)
        self.assertEqual(triggers, [])

    def test_gate_fails_yields_validation_only_true_with_recorded_triggers(self):
        passed, readings, reasons = check_preflight_gate(self.config, readings=self.failing_readings)
        self.assertFalse(passed)
        self.assertGreater(len(reasons), 0)

        validation_only, triggers = determine_validation_status(
            gate_passed=passed,
            skip_gate=False,
            failure_reasons=reasons,
        )
        self.assertTrue(validation_only)
        self.assertEqual(triggers, reasons)
        # Verify specific triggers are recorded
        trigger_text = " ".join(triggers)
        self.assertIn("Swap used", trigger_text)
        self.assertIn("Available memory", trigger_text)
        self.assertIn("AC wall power is disconnected", trigger_text)
        self.assertIn("Disk free", trigger_text)

    def test_skip_gate_yields_validation_only_true(self):
        # Case 1: host state actually passes, but skip_gate flag is enabled
        passed, readings, reasons = check_preflight_gate(self.config, readings=self.passing_readings)
        validation_only, triggers = determine_validation_status(
            gate_passed=passed,
            skip_gate=True,
            failure_reasons=reasons,
        )
        self.assertTrue(validation_only)
        self.assertIn("skip_gate_flag_enabled", triggers)

        # Case 2: host state fails and skip_gate flag is enabled
        passed_f, readings_f, reasons_f = check_preflight_gate(self.config, readings=self.failing_readings)
        validation_only_f, triggers_f = determine_validation_status(
            gate_passed=passed_f,
            skip_gate=True,
            failure_reasons=reasons_f,
        )
        self.assertTrue(validation_only_f)
        self.assertIn("skip_gate_flag_enabled", triggers_f)
        self.assertTrue(any("Swap used" in t for t in triggers_f))

    def test_harness_provenance_field_names(self):
        provenance = get_harness_provenance()
        self.assertIn("git_commit", provenance)
        self.assertIn("git_dirty", provenance)
        self.assertIn("script_sha256", provenance)
        self.assertNotIn("harness_git_commit", provenance)
        self.assertNotIn("harness_script_sha256", provenance)
        self.assertIsInstance(provenance["git_dirty"], bool)
        self.assertIsInstance(provenance["git_commit"], str)
        self.assertIsInstance(provenance["script_sha256"], str)

    def test_is_cell_completed_success_and_validation_only_false(self):
        """Case (a): status == 'success' AND validation_only == False -> completed"""
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            cell = {"arch": "sync", "n": 25, "vu": 10, "rep": 1}
            run_dir = tmp_path / "run_20261017_000000_sync_N25_VU10_rep1"
            run_dir.mkdir()
            with open(run_dir / "metadata.json", "w") as f:
                json.dump({"status": "success", "validation_only": False}, f)
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertTrue(completed)
            self.assertEqual(name, run_dir.name)
            self.assertEqual(status, "success")

    def test_is_cell_completed_gate_failed_not_completed(self):
        """Case (b): status == 'gate_failed' -> not completed"""
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            cell = {"arch": "sync", "n": 25, "vu": 10, "rep": 1}
            run_dir = tmp_path / "run_20261017_000000_sync_N25_VU10_rep1"
            run_dir.mkdir()

            # Standard gate_failed with validation_only: True
            with open(run_dir / "metadata.json", "w") as f:
                json.dump({"status": "gate_failed", "validation_only": True}, f)
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)
            self.assertIsNone(name)
            self.assertIsNone(status)

            # gate_failed even if validation_only were False
            with open(run_dir / "metadata.json", "w") as f:
                json.dump({"status": "gate_failed", "validation_only": False}, f)
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)

    def test_is_cell_completed_k6_failed_not_completed(self):
        """Case (c): status == 'k6_failed' -> not completed"""
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            cell = {"arch": "sync", "n": 25, "vu": 10, "rep": 1}
            run_dir = tmp_path / "run_20261017_000000_sync_N25_VU10_rep1"
            run_dir.mkdir()

            with open(run_dir / "metadata.json", "w") as f:
                json.dump({"status": "k6_failed", "validation_only": False}, f)
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)
            self.assertIsNone(name)
            self.assertIsNone(status)

    def test_is_cell_completed_success_with_validation_only_true_not_completed(self):
        """Case (d): status == 'success' AND validation_only == True -> not completed"""
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            cell = {"arch": "sync", "n": 25, "vu": 10, "rep": 1}
            run_dir = tmp_path / "run_20261017_000000_sync_N25_VU10_rep1"
            run_dir.mkdir()

            with open(run_dir / "metadata.json", "w") as f:
                json.dump({"status": "success", "validation_only": True}, f)
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)
            self.assertIsNone(name)
            self.assertIsNone(status)

    def test_is_cell_completed_missing_dir_or_metadata(self):
        """Negative tests: missing directory, missing metadata.json, corrupt JSON"""
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            cell = {"arch": "sync", "n": 25, "vu": 10, "rep": 1}

            # 1. No directory exists
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)

            # 2. Directory exists without metadata.json
            run_dir = tmp_path / "run_20261017_000000_sync_N25_VU10_rep1"
            run_dir.mkdir()
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)

            # 3. Corrupt metadata.json
            with open(run_dir / "metadata.json", "w") as f:
                f.write("{invalid json")
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)

    def test_is_cell_completed_multiple_attempts_finds_valid_success(self):
        """When multiple run directories exist for a cell, find the validated success run"""
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            cell = {"arch": "sync", "n": 25, "vu": 10, "rep": 1}

            # Attempt 1: gate_failed
            dir1 = tmp_path / "run_20261017_010000_sync_N25_VU10_rep1"
            dir1.mkdir()
            with open(dir1 / "metadata.json", "w") as f:
                json.dump({"status": "gate_failed", "validation_only": True}, f)

            # Attempt 2: k6_failed
            dir2 = tmp_path / "run_20261017_020000_sync_N25_VU10_rep1"
            dir2.mkdir()
            with open(dir2 / "metadata.json", "w") as f:
                json.dump({"status": "k6_failed", "validation_only": False}, f)

            # Attempt 3: valid success
            dir3 = tmp_path / "run_20261017_030000_sync_N25_VU10_rep1"
            dir3.mkdir()
            with open(dir3 / "metadata.json", "w") as f:
                json.dump({"status": "success", "validation_only": False}, f)

            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertTrue(completed)
            self.assertEqual(name, dir3.name)
            self.assertEqual(status, "success")


if __name__ == "__main__":
    unittest.main()
