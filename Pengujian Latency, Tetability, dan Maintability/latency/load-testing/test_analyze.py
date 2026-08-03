#!/usr/bin/env python3
"""Focused tests for the load-testing n=3 analyzer (no k6 execution)."""

from __future__ import annotations

import csv
import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent))
import analyze  # noqa: E402


class LoadTestingAnalyzerTest(unittest.TestCase):
    def test_summary_uses_k6_http_request_rate_for_throughput(self) -> None:
        summary = {
            "metrics": {
                "http_req_duration": {"values": {"avg": 100, "p(95)": 150}},
                "http_req_failed": {"values": {"rate": 0}},
                "http_reqs": {"values": {"count": 90, "rate": 12.5}},
                "iterations": {"values": {"count": 30}},
            }
        }
        extracted = analyze.extract_from_summary(summary)
        self.assertEqual(extracted["throughput_rps"], 12.5)
        self.assertNotEqual(extracted["throughput_rps"], extracted["iterations_count"])

    def test_report_has_throughput_and_no_cv_classification(self) -> None:
        data = {}
        for scenario_key, _, _ in analyze.SCENARIOS:
            data[scenario_key] = {
                metric: {run: value for run, value in ((1, 10.0), (2, 11.0), (3, 12.0))}
                for metric, _, _ in analyze.METRICS
            }
            data[scenario_key]["iterations_count"] = {1: 30.0, 2: 30.0, 3: 30.0}

        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            csv_path = directory / "summary_table.csv"
            markdown_path = directory / "summary_report.md"
            analyze.write_csv(csv_path, [1, 2, 3], data)
            analyze.write_markdown(markdown_path, [1, 2, 3], data)
            with csv_path.open(newline="", encoding="utf-8") as handle:
                self.assertIn("throughput_rps_run1", next(csv.reader(handle)))
            markdown = markdown_path.read_text(encoding="utf-8")
            self.assertIn("http_reqs.rate", markdown)
            self.assertNotIn("Stabil", markdown)
            self.assertNotIn("reproducible", markdown)


if __name__ == "__main__":
    unittest.main()
