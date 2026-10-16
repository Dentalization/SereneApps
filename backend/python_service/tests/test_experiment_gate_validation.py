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

    def test_is_cell_completed(self):
        import tempfile
        import json
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            cell = {"arch": "sync", "n": 25, "vu": 10, "rep": 1}

            # 1. No directory -> False
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)

            # 2. Directory without metadata.json -> False
            run_dir = tmp_path / "run_20261017_000000_sync_N25_VU10_rep1"
            run_dir.mkdir()
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertFalse(completed)

            # 3. Directory with valid metadata.json -> True
            with open(run_dir / "metadata.json", "w") as f:
                json.dump({"status": "success"}, f)
            completed, name, status = is_cell_completed(cell, tmp_path)
            self.assertTrue(completed)
            self.assertEqual(name, run_dir.name)
            self.assertEqual(status, "success")


if __name__ == "__main__":
    unittest.main()
