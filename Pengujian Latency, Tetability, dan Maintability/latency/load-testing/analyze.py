#!/usr/bin/env python3
"""Generate repeated-measurement statistics from SereneApps k6 results.

The normal input is the aggregate JSON written by k6 handleSummary(). For
compatibility with k6's ``--out json`` event stream, this program can also
derive the required values from Point events; its p95 then uses nearest-rank
calculation and is marked as an event-stream fallback in the console output.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_RESULTS_DIR = BASE_DIR / "results"
DEFAULT_SUMMARY_DIR = BASE_DIR / "summary"
P95_TARGET_MS = 2_000.0

SCENARIOS = (
    ("test_1vu", "1 VU", 1),
    ("test_10vu", "10 VU", 10),
    ("test_50vu", "50 VU", 50),
    ("test_100vu", "100 VU", 100),
    ("test_200vu", "200 VU", 200),
)

METRICS = (
    ("duration_avg_ms", "http_req_duration", "avg"),
    ("duration_p95_ms", "http_req_duration", "p(95)"),
    # Throughput must come from k6's measured HTTP request rate, not from
    # iteration counts (one iteration may issue multiple HTTP requests).
    ("throughput_rps", "http_reqs", "rate"),
    ("failed_rate", "http_req_failed", "rate"),
    # A run is a latency measurement only if at least one VU iteration ran.
    # This prevents a failed setup() from being misreported as a 0 ms result.
    ("iterations_count", "iterations", "count"),
)


@dataclass(frozen=True)
class Statistic:
    mean: float | None
    standard_deviation: float | None
    coefficient_of_variation: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Calculate mean, sample SD, and CV%% for k6 repeated measurements."
    )
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=DEFAULT_RESULTS_DIR,
        help=f"Directory containing run_1, run_2, and run_3 (default: {DEFAULT_RESULTS_DIR})",
    )
    parser.add_argument(
        "--summary-dir",
        type=Path,
        default=DEFAULT_SUMMARY_DIR,
        help=f"Directory to write summary_table.csv and summary_report.md (default: {DEFAULT_SUMMARY_DIR})",
    )
    parser.add_argument(
        "--runs",
        type=int,
        nargs="+",
        default=[1, 2, 3],
        help="Run numbers to analyse; defaults to 1 2 3.",
    )
    parser.add_argument(
        "--allow-incomplete",
        action="store_true",
        help="Write a partial report with N/A cells instead of returning a non-zero status for missing data.",
    )
    return parser.parse_args()


def to_float(value: Any) -> float | None:
    """Return a finite float, otherwise None."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def percentile_nearest_rank(values: list[float], percentile: float) -> float:
    """Compute a percentile using the nearest-rank method for event-stream fallback."""
    ordered = sorted(values)
    rank = max(1, math.ceil((percentile / 100) * len(ordered)))
    return ordered[rank - 1]


def extract_from_summary(summary: dict[str, Any]) -> dict[str, float]:
    """Extract the required metrics, including k6's measured request rate."""
    metrics = summary.get("metrics")
    if not isinstance(metrics, dict):
        return {}

    extracted: dict[str, float] = {}
    for result_key, metric_name, aggregation in METRICS:
        metric = metrics.get(metric_name)
        values = metric.get("values") if isinstance(metric, dict) else None
        value = values.get(aggregation) if isinstance(values, dict) else None
        numeric = to_float(value)
        if numeric is not None:
            extracted[result_key] = numeric
    return extracted


def extract_from_ndjson(text: str) -> tuple[dict[str, float], bool]:
    """Extract aggregate Metric values or derive them from k6 Point events."""
    aggregate: dict[str, float] = {}
    points: dict[str, list[float]] = {
        "http_req_duration": [],
        "http_req_failed": [],
        "iterations": [],
    }

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(event, dict):
            continue

        data = event.get("data")
        if event.get("type") == "Metric" and isinstance(data, dict):
            metric_name = data.get("name")
            values = data.get("values")
            if not isinstance(values, dict):
                continue
            for result_key, required_metric, aggregation in METRICS:
                if metric_name == required_metric:
                    numeric = to_float(values.get(aggregation))
                    if numeric is not None:
                        aggregate[result_key] = numeric

        if event.get("type") == "Point" and isinstance(data, dict):
            metric_name = event.get("metric")
            if metric_name not in points:
                continue
            numeric = to_float(data.get("value"))
            if numeric is not None:
                points[metric_name].append(numeric)

    # k6's JSON output normally has definitions and Points rather than an
    # aggregate Metric object. Only fill values that were not already supplied.
    duration_points = points["http_req_duration"]
    if duration_points:
        aggregate.setdefault("duration_avg_ms", statistics.mean(duration_points))
        aggregate.setdefault("duration_p95_ms", percentile_nearest_rank(duration_points, 95))
    failed_points = points["http_req_failed"]
    if failed_points:
        aggregate.setdefault("failed_rate", statistics.mean(failed_points))
    iteration_points = points["iterations"]
    if iteration_points:
        aggregate.setdefault("iterations_count", len(iteration_points))

    used_point_fallback = any(points.values())
    return aggregate, used_point_fallback


def extract_metrics(json_path: Path) -> tuple[dict[str, float], bool, str | None]:
    """Read either compact k6 summary JSON or its NDJSON event-stream format."""
    if not json_path.is_file():
        return {}, False, f"File tidak ditemukan: {json_path}"

    try:
        text = json_path.read_text(encoding="utf-8")
    except OSError as error:
        return {}, False, f"Tidak dapat membaca {json_path}: {error}"

    try:
        decoded = json.loads(text)
    except json.JSONDecodeError:
        decoded = None

    if isinstance(decoded, dict):
        extracted = extract_from_summary(decoded)
        if extracted:
            return extracted, False, None

    extracted, used_point_fallback = extract_from_ndjson(text)
    if extracted:
        return extracted, used_point_fallback, None
    return {}, False, f"Metrik k6 tidak ditemukan di {json_path.name}"


def calculate_statistic(values: list[float | None]) -> Statistic:
    present = [value for value in values if value is not None]
    if len(present) != len(values) or len(present) < 2:
        return Statistic(None, None, None)

    mean = statistics.mean(present)
    standard_deviation = statistics.stdev(present)  # sample SD: ddof=1
    coefficient_of_variation = None if mean == 0 else (standard_deviation / mean) * 100
    return Statistic(mean, standard_deviation, coefficient_of_variation)


def number_or_na(value: float | None, digits: int = 2) -> str:
    return "N/A" if value is None else f"{value:.{digits}f}"


def percent_or_na(value: float | None, digits: int = 1) -> str:
    return "N/A" if value is None else f"{value:.{digits}f}%"


def execution_valid(iterations_count: float | None) -> bool:
    """A setup failure produces no iterations and therefore no usable latency data."""
    return iterations_count is not None and iterations_count > 0


def execution_status(validities: list[bool]) -> str:
    if all(validities):
        return "Valid"
    return "Tidak valid — VU tidak dieksekusi"


def valid_measurements(
    scenario_data: dict[str, dict[int, float | None]],
    metric_key: str,
    run_numbers: list[int],
) -> tuple[list[float | None], list[bool]]:
    validities = [execution_valid(scenario_data["iterations_count"][run]) for run in run_numbers]
    values = [
        scenario_data[metric_key][run] if valid else None
        for run, valid in zip(run_numbers, validities)
    ]
    return values, validities


def p95_status(values: list[float | None], validities: list[bool]) -> str:
    if not all(validities):
        return execution_status(validities)
    if any(value is None for value in values):
        return "Data tidak lengkap"
    return "Memenuhi" if all(value < P95_TARGET_MS for value in values if value is not None) else "Melebihi"


def write_csv(
    csv_path: Path,
    run_numbers: list[int],
    data: dict[str, dict[str, dict[int, float | None]]],
) -> None:
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        header = ["Skenario", "Virtual Users"]
        header.extend(f"run{run}_execution_valid" for run in run_numbers)
        for result_key, _, _ in METRICS:
            header.extend(f"{result_key}_run{run}" for run in run_numbers)
        for result_key, _, _ in METRICS:
            header.extend(
                [
                    f"{result_key}_mean",
                    f"{result_key}_sd_sample",
                    f"{result_key}_cv_pct",
                ]
            )
        writer.writerow(header)

        for scenario_key, label, vu in SCENARIOS:
            row: list[str | int] = [label, vu]
            scenario_data = data[scenario_key]
            row.extend(
                "valid" if execution_valid(scenario_data["iterations_count"][run]) else "invalid"
                for run in run_numbers
            )
            for result_key, _, _ in METRICS:
                row.extend(number_or_na(scenario_data[result_key][run], 6) for run in run_numbers)
            for result_key, _, _ in METRICS:
                statistic = calculate_statistic(
                    [scenario_data[result_key][run] for run in run_numbers]
                )
                row.extend(
                    [
                        number_or_na(statistic.mean, 6),
                        number_or_na(statistic.standard_deviation, 6),
                        number_or_na(statistic.coefficient_of_variation, 6),
                    ]
                )
            writer.writerow(row)


def write_markdown(
    markdown_path: Path,
    run_numbers: list[int],
    data: dict[str, dict[str, dict[int, float | None]]],
) -> None:
    run_headers = " | ".join(f"Run {run}" for run in run_numbers)
    separator = "|".join(["---"] * (len(run_numbers) + 5))

    with markdown_path.open("w", encoding="utf-8") as handle:
        handle.write("# Hasil Pengujian Load Testing — Repeated Measurement\n\n")
        handle.write(
            f"> Setiap skenario diuji sebanyak {len(run_numbers)} kali. "
            "SD adalah sample standard deviation (ddof=1); CV = SD/mean × 100%.\n\n"
        )
        handle.write(
            "> CV dilaporkan sebagai statistik deskriptif dan tidak digunakan untuk membuat klaim konsistensi pengukuran.\n"
        )
        handle.write(
            "> Run tanpa iterasi VU (misalnya `setup()` gagal) ditandai **Tidak valid** dan tidak boleh digunakan sebagai data latency.\n\n"
        )

        handle.write("## Rata-rata Response Time (`http_req_duration`, avg, ms)\n\n")
        handle.write(
            f"| Skenario | {run_headers} | Mean (ms) | SD (ms) | CV (%) | Status eksekusi |\n"
        )
        handle.write(f"|{separator}|\n")
        for scenario_key, label, _ in SCENARIOS:
            values, validities = valid_measurements(
                data[scenario_key], "duration_avg_ms", run_numbers
            )
            statistic = calculate_statistic(values)
            run_values = " | ".join(number_or_na(value, 2) for value in values)
            handle.write(
                f"| {label} | {run_values} | {number_or_na(statistic.mean)} | "
                f"{number_or_na(statistic.standard_deviation)} | "
                f"{percent_or_na(statistic.coefficient_of_variation)} | "
                f"{execution_status(validities)} |\n"
            )

        handle.write("\n## p95 Response Time (`http_req_duration`, ms)\n\n")
        handle.write(
            f"| Skenario | {run_headers} | Mean p95 (ms) | SD (ms) | CV (%) | Target < {P95_TARGET_MS:.0f} ms |\n"
        )
        handle.write(f"|{separator}|\n")
        for scenario_key, label, _ in SCENARIOS:
            values, validities = valid_measurements(
                data[scenario_key], "duration_p95_ms", run_numbers
            )
            statistic = calculate_statistic(values)
            run_values = " | ".join(number_or_na(value, 2) for value in values)
            handle.write(
                f"| {label} | {run_values} | {number_or_na(statistic.mean)} | "
                f"{number_or_na(statistic.standard_deviation)} | "
                f"{percent_or_na(statistic.coefficient_of_variation)} | {p95_status(values, validities)} |\n"
            )

        handle.write("\n## Throughput (`http_reqs.rate`, req/s)\n\n")
        handle.write(
            f"| Skenario | {run_headers} | Mean (req/s) | SD | CV (%) | Status eksekusi |\n"
        )
        handle.write(f"|{separator}|\n")
        for scenario_key, label, _ in SCENARIOS:
            values, validities = valid_measurements(
                data[scenario_key], "throughput_rps", run_numbers
            )
            statistic = calculate_statistic(values)
            run_values = " | ".join(number_or_na(value, 2) for value in values)
            handle.write(
                f"| {label} | {run_values} | {number_or_na(statistic.mean)} | "
                f"{number_or_na(statistic.standard_deviation)} | "
                f"{percent_or_na(statistic.coefficient_of_variation)} | "
                f"{execution_status(validities)} |\n"
            )

        handle.write("\n## Error Rate (`http_req_failed`)\n\n")
        handle.write(f"| Skenario | {run_headers} | Mean Rate | SD | CV (%) | Status eksekusi |\n")
        error_separator = "|".join(["---"] * (len(run_numbers) + 4))
        handle.write(f"|{error_separator}|\n")
        for scenario_key, label, _ in SCENARIOS:
            values, validities = valid_measurements(
                data[scenario_key], "failed_rate", run_numbers
            )
            statistic = calculate_statistic(values)
            run_values = " | ".join(number_or_na(value, 4) for value in values)
            handle.write(
                f"| {label} | {run_values} | {number_or_na(statistic.mean, 4)} | "
                f"{number_or_na(statistic.standard_deviation, 4)} | "
                f"{percent_or_na(statistic.coefficient_of_variation)} | "
                f"{execution_status(validities)} |\n"
            )

        handle.write("\n---\n")
        handle.write(
            "Catatan: CV tidak didefinisikan ketika mean = 0; nilainya ditampilkan sebagai N/A. "
            "Hasil tidak valid harus diulang.\n"
        )


def main() -> int:
    args = parse_args()
    run_numbers = args.runs
    if len(set(run_numbers)) != len(run_numbers) or any(run < 1 for run in run_numbers):
        print("ERROR: --runs harus berisi nomor run positif dan unik.", file=sys.stderr)
        return 2

    results_dir = args.results_dir.resolve()
    summary_dir = args.summary_dir.resolve()
    summary_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("SereneApps k6 Results Analyzer")
    print("=" * 60)

    data: dict[str, dict[str, dict[int, float | None]]] = {}
    problems: list[str] = []
    fallback_files: list[Path] = []

    for scenario_key, scenario_label, _ in SCENARIOS:
        print(f"\nMemproses skenario: {scenario_label}")
        scenario_data = {result_key: {} for result_key, _, _ in METRICS}
        data[scenario_key] = scenario_data

        for run in run_numbers:
            json_path = results_dir / f"run_{run}" / f"{scenario_key}_run{run}.json"
            print(f"  Run {run}: {json_path}")
            extracted, used_point_fallback, error = extract_metrics(json_path)
            if used_point_fallback:
                fallback_files.append(json_path)
            if error:
                problems.append(error)
            for result_key, metric_name, aggregation in METRICS:
                value = extracted.get(result_key)
                scenario_data[result_key][run] = value
                if value is None:
                    problems.append(
                        f"Metrik {metric_name}.{aggregation} tidak ditemukan di {json_path}"
                    )

    csv_path = summary_dir / "summary_table.csv"
    markdown_path = summary_dir / "summary_report.md"
    write_csv(csv_path, run_numbers, data)
    write_markdown(markdown_path, run_numbers, data)

    print(f"\n✅ CSV disimpan: {csv_path}")
    print(f"✅ Markdown report disimpan: {markdown_path}")
    if fallback_files:
        print("ℹ️  p95 event-stream dihitung dengan nearest-rank untuk:")
        for file_path in fallback_files:
            print(f"   - {file_path}")

    if problems:
        print("\n⚠️  Data belum lengkap:", file=sys.stderr)
        for problem in dict.fromkeys(problems):
            print(f"   - {problem}", file=sys.stderr)
        if not args.allow_incomplete:
            print(
                "Gunakan --allow-incomplete hanya untuk inspeksi data parsial; "
                "jangan gunakan laporan parsial sebagai hasil penelitian.",
                file=sys.stderr,
            )
            return 1

    print(f"\nSelesai. Buka {markdown_path} untuk melihat hasil.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
