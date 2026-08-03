#!/usr/bin/env python3
"""Synthetic checks for the repeated-measurement analyzer (no k6/API call)."""

from __future__ import annotations

import csv
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent))
import analyze_repeated as analyzer  # noqa: E402


def synthetic_summary(avg: float, p95: float, secret: bool = False) -> dict:
    summary = {
        "state": {"testRunDurationMs": 180000},
        "metrics": {
            "http_req_duration": {"values": {"avg": avg, "p(95)": p95, "count": 50}},
            "http_reqs": {"values": {"count": 50, "rate": 16.67}},
            "http_req_failed": {"values": {"rate": 0.02}},
            "checks": {"values": {"passes": 48, "fails": 2}},
            "vus_max": {"values": {"max": 10}},
            "iterations": {"values": {"count": 30}},
        },
    }
    if secret:
        summary["setup_data"] = {"accessToken": "secret-value-not-to-be-printed"}
    return summary


class RepeatedAnalyzerTest(unittest.TestCase):
    def write_complete_fixture(self, root: Path) -> None:
        for endpoint in analyzer.ENDPOINTS:
            for run, avg, p95 in ((1, 100.0, 150.0), (2, 110.0, 160.0), (3, 120.0, 170.0)):
                target = root / f"run_{run}" / endpoint.summary_file
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(json.dumps(synthetic_summary(avg, p95)), encoding="utf-8")

    def test_complete_n3_has_sample_sd_and_cv(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            results = base / "results"
            summary = base / "summary"
            self.write_complete_fixture(results)

            exit_code = analyzer.run_analysis(results, summary, None, "10", "3m", False)
            self.assertEqual(exit_code, 0)
            with (summary / "runs_table.csv").open(newline="", encoding="utf-8") as handle:
                run_reader = csv.DictReader(handle)
                self.assertTrue({
                    "endpoint", "run", "vus", "configured_duration", "actual_duration_ms",
                    "avg_response_ms", "p95_response_ms", "request_count", "throughput_rps",
                    "error_rate_pct", "checks_passed", "checks_failed", "target_p95_status",
                    "timestamp", "source_file",
                }.issubset(set(run_reader.fieldnames or [])))
                self.assertEqual(len(list(run_reader)), 18)
            with (summary / "summary_table.csv").open(newline="", encoding="utf-8") as handle:
                summary_reader = csv.DictReader(handle)
                self.assertTrue({
                    "avg_run_1_ms", "avg_run_2_ms", "avg_run_3_ms", "avg_mean_ms", "avg_sd_ms", "avg_cv_pct",
                    "p95_run_1_ms", "p95_run_2_ms", "p95_run_3_ms", "p95_mean_ms", "p95_sd_ms", "p95_cv_pct",
                    "throughput_run_1_rps", "throughput_run_2_rps", "throughput_run_3_rps", "throughput_mean_rps", "throughput_sd_rps", "throughput_cv_pct",
                    "error_rate_run_1_pct", "error_rate_run_2_pct", "error_rate_run_3_pct", "error_rate_mean_pct",
                    "target_runs_passed", "target_status",
                }.issubset(set(summary_reader.fieldnames or [])))
                first = next(summary_reader)
            self.assertEqual(first["analysis_status"], "Lengkap (n=3)")
            self.assertAlmostEqual(float(first["avg_mean_ms"]), 110.0, places=6)
            self.assertAlmostEqual(float(first["avg_sd_ms"]), 10.0, places=6)
            self.assertAlmostEqual(float(first["avg_cv_pct"]), 9.090909, places=5)
            self.assertEqual(first["target_status"], "Memenuhi (3/3 run)")
            self.assertTrue((summary / "summary_report.md").is_file())

    def test_missing_run_keeps_statistics_blank_and_returns_nonzero(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            results = base / "results"
            summary = base / "summary"
            self.write_complete_fixture(results)
            (results / "run_3" / analyzer.ENDPOINTS[0].summary_file).unlink()

            exit_code = analyzer.run_analysis(results, summary, None, "10", "3m", False)
            self.assertEqual(exit_code, 1)
            with (summary / "summary_table.csv").open(newline="", encoding="utf-8") as handle:
                first = next(csv.DictReader(handle))
            self.assertEqual(first["analysis_status"], "Data tidak lengkap")
            self.assertEqual(first["avg_mean_ms"], "")
            self.assertEqual(first["target_status"], "Data tidak lengkap")

    def test_sensitive_setup_data_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "summary.json"
            target.write_text(json.dumps(synthetic_summary(100, 150, secret=True)), encoding="utf-8")
            valid, reason = analyzer.validate_file(target)
            self.assertFalse(valid)
            self.assertIn("data sensitif", reason)
            self.assertNotIn("secret-value-not-to-be-printed", reason)

    def test_zero_mean_cv_is_na(self) -> None:
        statistic = analyzer.calculate_statistic([0.0, 0.0, 0.0])
        self.assertEqual(statistic.mean, 0.0)
        self.assertEqual(statistic.sd, 0.0)
        self.assertIsNone(statistic.cv_percent)

    def test_dry_run_does_not_overwrite_existing_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            existing = base / "results" / "run_1" / analyzer.ENDPOINTS[0].summary_file
            existing.parent.mkdir(parents=True, exist_ok=True)
            existing.write_text("artefak-asli-tidak-boleh-berubah", encoding="utf-8")
            environment = {
                **os.environ,
                "PATIENT_EMAIL": "patient@example.test",
                "PATIENT_PASSWORD": "password-only-for-test",
                "DENTIST_EMAIL": "dentist@example.test",
                "DENTIST_PASSWORD": "password-only-for-test",
                "DENTIST_PROFILE_ID": "1",
                "DRY_RUN": "1",
                "RESULTS_DIR": str(base / "results"),
                "SUMMARY_DIR": str(base / "summary"),
            }
            runner = Path(__file__).resolve().parent / "run_repeated.sh"
            completed = subprocess.run(
                [str(runner)], cwd=runner.parent, env=environment, text=True,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertIn("tidak akan menimpa hasil", completed.stdout)
            self.assertNotIn("password-only-for-test", completed.stdout + completed.stderr)
            self.assertEqual(existing.read_text(encoding="utf-8"), "artefak-asli-tidak-boleh-berubah")


if __name__ == "__main__":
    unittest.main()
