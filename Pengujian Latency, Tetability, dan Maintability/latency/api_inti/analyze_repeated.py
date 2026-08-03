#!/usr/bin/env python3
"""Create reproducible n=3 summaries for the SereneApps core API k6 tests.

The program intentionally analyses k6's summary JSON only. It does not pool
raw request samples: each run contributes one avg/p95/throughput/error value.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import statistics
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


DEFAULT_RUNS = 3
P95_TARGET_MS = 2000.0


@dataclass(frozen=True)
class Endpoint:
    key: str
    label: str
    summary_file: str


ENDPOINTS = (
    Endpoint("01-login", "Login pengguna", "01-login-summary.json"),
    Endpoint("02-appointments", "Daftar appointment", "02-appointment-list-summary.json"),
    Endpoint("03-create-appointment", "Membuat appointment", "03-appointment-create-summary.json"),
    Endpoint("04-consultation-detail", "Detail konsultasi", "04-consultation-detail-summary.json"),
    Endpoint("05-consultation-message", "Pesan konsultasi", "05-consultation-message-summary.json"),
    Endpoint("06-image-upload", "Unggah citra gigi", "06-image-upload-summary.json"),
)


@dataclass
class RunResult:
    endpoint: Endpoint
    run: int
    source_file: Path
    valid: bool
    reason: str = ""
    avg_ms: float | None = None
    p95_ms: float | None = None
    request_count: float | None = None
    throughput_rps: float | None = None
    error_rate: float | None = None
    checks_pass: float | None = None
    checks_fail: float | None = None
    vus_max: float | None = None
    actual_duration_ms: float | None = None
    iterations: float | None = None
    k6_status: str = "completed (manifest tidak tersedia)"
    k6_exit_code: str = ""
    timestamp: str = ""


@dataclass(frozen=True)
class Statistic:
    mean: float | None
    sd: float | None
    cv_percent: float | None


# Values matching these patterns are never copied to output and are only
# described by their key/path when a validation error is reported.
SENSITIVE_KEY = re.compile(
    r"setup[_-]?data|access[_-]?token|refresh[_-]?token|token|password|"
    r"authorization|cookie|set[_-]?cookie|headers?",
    re.IGNORECASE,
)
SENSITIVE_VALUE = re.compile(
    r"(?:\bbearer\s+[A-Za-z0-9._~+/=-]{8,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.)",
    re.IGNORECASE,
)


def finite_number(value: Any) -> float | None:
    """Return a finite float, never silently coercing a missing value to zero."""
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def nested_value(value: dict[str, Any], *keys: str) -> Any:
    current: Any = value
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def metric_value(summary: dict[str, Any], metric: str, value: str) -> float | None:
    return finite_number(nested_value(summary, "metrics", metric, "values", value))


def sensitive_findings(value: Any, path: str = "$") -> list[str]:
    """Return paths/categories only; never return a sensitive value itself."""
    findings: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            item_path = f"{path}.{key}"
            if SENSITIVE_KEY.search(str(key)):
                findings.append(f"{item_path} (kunci sensitif)")
            findings.extend(sensitive_findings(item, item_path))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            findings.extend(sensitive_findings(item, f"{path}[{index}]"))
    elif isinstance(value, str) and SENSITIVE_VALUE.search(value):
        findings.append(f"{path} (pola token sensitif)")
    return findings


def read_json(path: Path) -> tuple[dict[str, Any] | None, str]:
    if not path.is_file():
        return None, "file tidak ditemukan"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None, "JSON tidak valid"
    if not isinstance(payload, dict):
        return None, "JSON summary bukan objek"
    return payload, ""


def validate_summary(summary: dict[str, Any]) -> list[str]:
    """Validate metrics needed for a comparable core-API measurement."""
    errors: list[str] = []
    findings = sensitive_findings(summary)
    if findings:
        errors.append("artefak memuat data sensitif: " + "; ".join(findings[:3]))

    required_values = (
        ("state.testRunDurationMs", finite_number(nested_value(summary, "state", "testRunDurationMs"))),
        ("http_req_duration.avg", metric_value(summary, "http_req_duration", "avg")),
        ("http_req_duration.p(95)", metric_value(summary, "http_req_duration", "p(95)")),
        ("http_reqs.count", metric_value(summary, "http_reqs", "count")),
        ("http_reqs.rate", metric_value(summary, "http_reqs", "rate")),
        ("http_req_failed.rate", metric_value(summary, "http_req_failed", "rate")),
        ("checks.passes", metric_value(summary, "checks", "passes")),
        ("checks.fails", metric_value(summary, "checks", "fails")),
        ("vus_max.max", metric_value(summary, "vus_max", "max")),
        ("iterations.count", metric_value(summary, "iterations", "count")),
    )
    for name, number in required_values:
        if number is None:
            errors.append(f"metrik wajib tidak ada/tidak numerik: {name}")

    duration = finite_number(nested_value(summary, "state", "testRunDurationMs"))
    request_count = metric_value(summary, "http_reqs", "count")
    iterations = metric_value(summary, "iterations", "count")
    if duration is not None and duration <= 0:
        errors.append("durasi aktual harus lebih dari nol")
    if request_count is not None and request_count <= 0:
        errors.append("http_reqs.count harus lebih dari nol")
    if iterations is not None and iterations <= 0:
        errors.append("iterations.count harus lebih dari nol (kemungkinan hanya setup/VU=0)")
    return errors


def validate_file(path: Path) -> tuple[bool, str]:
    summary, error = read_json(path)
    if summary is None:
        return False, error
    errors = validate_summary(summary)
    return (not errors), "; ".join(errors)


def manifest_index(path: Path | None) -> dict[tuple[str, int], dict[str, str]]:
    """Take the most recent manifest row for each endpoint/run resume pair."""
    if path is None or not path.is_file():
        return {}
    try:
        with path.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
    except (OSError, csv.Error):
        return {}
    indexed: dict[tuple[str, int], dict[str, str]] = {}
    for row in rows:
        try:
            run = int(row.get("run", ""))
        except ValueError:
            continue
        endpoint = row.get("endpoint", "")
        if endpoint:
            indexed[(endpoint, run)] = row
    return indexed


def parse_result(endpoint: Endpoint, run: int, source_file: Path, manifest: dict[tuple[str, int], dict[str, str]]) -> RunResult:
    result = RunResult(endpoint=endpoint, run=run, source_file=source_file, valid=False)
    manifest_row = manifest.get((endpoint.summary_file, run), {})
    result.k6_status = manifest_row.get("status", result.k6_status)
    result.k6_exit_code = manifest_row.get("k6_exit_code", "")
    result.timestamp = manifest_row.get("finished_at", "") or manifest_row.get("started_at", "")

    summary, load_error = read_json(source_file)
    if summary is None:
        result.reason = load_error
        return result
    errors = validate_summary(summary)
    if errors:
        result.reason = "; ".join(errors)
        return result

    # A threshold breach is an observed result and remains analyzable. Other
    # non-completed statuses are retained in the runs table but excluded from
    # claims of a complete n=3 measurement.
    if result.k6_status not in {"completed", "threshold_failed", "skipped_valid", "completed (manifest tidak tersedia)"}:
        result.reason = f"status k6 tidak layak dianalisis: {result.k6_status}"
        return result

    result.avg_ms = metric_value(summary, "http_req_duration", "avg")
    result.p95_ms = metric_value(summary, "http_req_duration", "p(95)")
    result.request_count = metric_value(summary, "http_reqs", "count")
    result.throughput_rps = metric_value(summary, "http_reqs", "rate")
    result.error_rate = metric_value(summary, "http_req_failed", "rate")
    result.checks_pass = metric_value(summary, "checks", "passes")
    result.checks_fail = metric_value(summary, "checks", "fails")
    result.vus_max = metric_value(summary, "vus_max", "max")
    result.actual_duration_ms = finite_number(nested_value(summary, "state", "testRunDurationMs"))
    result.iterations = metric_value(summary, "iterations", "count")
    result.valid = True
    return result


def calculate_statistic(values: Iterable[float | None]) -> Statistic:
    usable = [value for value in values if value is not None]
    if len(usable) != DEFAULT_RUNS:
        return Statistic(None, None, None)
    mean = statistics.fmean(usable)
    sd = statistics.stdev(usable)  # sample SD: ddof=1
    cv = None if mean == 0 else (sd / mean) * 100
    return Statistic(mean, sd, cv)


def display_number(value: float | None, decimals: int = 2) -> str:
    return "" if value is None else f"{value:.{decimals}f}"


def csv_number(value: float | None) -> str:
    return "" if value is None else f"{value:.6f}"


def status_for(results: list[RunResult]) -> str:
    if len(results) != DEFAULT_RUNS or not all(result.valid for result in results):
        return "Data tidak lengkap"
    return "Lengkap (n=3)"


def target_for_run(result: RunResult) -> str:
    if not result.valid or result.p95_ms is None:
        return "Data tidak valid"
    return "Memenuhi" if result.p95_ms < P95_TARGET_MS else "Tidak memenuhi"


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_runs_table(path: Path, results: list[RunResult], vus: str, duration: str) -> None:
    fields = [
        "endpoint", "run", "vus", "configured_duration", "actual_duration_ms",
        "avg_response_ms", "p95_response_ms", "request_count", "throughput_rps",
        "error_rate_pct", "checks_passed", "checks_failed", "target_p95_status",
        "timestamp", "source_file", "k6_status", "k6_exit_code", "vus_max",
        "iterations_count", "analysis_status", "reason",
    ]
    rows: list[dict[str, str]] = []
    for result in results:
        rows.append({
            "endpoint": result.endpoint.label,
            "run": str(result.run),
            "vus": str(vus),
            "configured_duration": duration,
            "avg_response_ms": csv_number(result.avg_ms),
            "p95_response_ms": csv_number(result.p95_ms),
            "request_count": csv_number(result.request_count),
            "throughput_rps": csv_number(result.throughput_rps),
            "error_rate_pct": csv_number(None if result.error_rate is None else result.error_rate * 100),
            "checks_passed": csv_number(result.checks_pass),
            "checks_failed": csv_number(result.checks_fail),
            "target_p95_status": target_for_run(result),
            "actual_duration_ms": csv_number(result.actual_duration_ms),
            "timestamp": result.timestamp,
            "source_file": str(result.source_file),
            "k6_status": result.k6_status,
            "k6_exit_code": result.k6_exit_code,
            "vus_max": csv_number(result.vus_max),
            "iterations_count": csv_number(result.iterations),
            "analysis_status": "valid" if result.valid else "invalid",
            "reason": result.reason,
        })
    write_csv(path, fields, rows)


def build_summary_rows(grouped: dict[Endpoint, list[RunResult]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for endpoint in ENDPOINTS:
        results = grouped[endpoint]
        avg = calculate_statistic([result.avg_ms for result in results])
        p95 = calculate_statistic([result.p95_ms for result in results])
        throughput = calculate_statistic([result.throughput_rps for result in results])
        error = calculate_statistic([
            None if result.error_rate is None else result.error_rate * 100 for result in results
        ])
        complete = status_for(results) == "Lengkap (n=3)"
        if not complete:
            target_status = "Data tidak lengkap"
        elif all(result.p95_ms is not None and result.p95_ms < P95_TARGET_MS for result in results):
            target_status = "Memenuhi (3/3 run)"
        else:
            target_status = "Tidak memenuhi"

        row: dict[str, str] = {
            "endpoint": endpoint.label,
            "analysis_status": status_for(results),
            "target_status": target_status,
            "target_runs_passed": str(sum(target_for_run(result) == "Memenuhi" for result in results)) if complete else "",
        }
        for position in range(DEFAULT_RUNS):
            result = results[position] if position < len(results) else None
            suffix = str(position + 1)
            row[f"avg_run_{suffix}_ms"] = csv_number(result.avg_ms if result else None)
            row[f"p95_run_{suffix}_ms"] = csv_number(result.p95_ms if result else None)
            row[f"throughput_run_{suffix}_rps"] = csv_number(result.throughput_rps if result else None)
            row[f"error_rate_run_{suffix}_pct"] = csv_number(
                None if not result or result.error_rate is None else result.error_rate * 100
            )
        for prefix, statistic in (("avg", avg), ("p95", p95), ("throughput", throughput), ("error", error)):
            suffix = "_pct" if prefix == "error" else ("_ms" if prefix in {"avg", "p95"} else "_rps")
            label = "error_rate" if prefix == "error" else prefix
            row[f"{label}_mean{suffix}"] = csv_number(statistic.mean)
            row[f"{label}_sd{suffix}"] = csv_number(statistic.sd)
            row[f"{label}_cv_pct"] = (
                "N/A" if statistic.mean == 0 and statistic.cv_percent is None
                else csv_number(statistic.cv_percent)
            )
        rows.append(row)
    return rows


SUMMARY_FIELDS = [
    "endpoint",
    *[f"avg_run_{run}_ms" for run in range(1, DEFAULT_RUNS + 1)],
    "avg_mean_ms", "avg_sd_ms", "avg_cv_pct",
    *[f"p95_run_{run}_ms" for run in range(1, DEFAULT_RUNS + 1)],
    "p95_mean_ms", "p95_sd_ms", "p95_cv_pct",
    *[f"throughput_run_{run}_rps" for run in range(1, DEFAULT_RUNS + 1)],
    "throughput_mean_rps", "throughput_sd_rps", "throughput_cv_pct",
    *[f"error_rate_run_{run}_pct" for run in range(1, DEFAULT_RUNS + 1)],
    "error_rate_mean_pct", "error_rate_sd_pct", "error_rate_cv_pct",
    "target_runs_passed", "target_status", "analysis_status",
]


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    separator = ["---"] * len(headers)
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(separator) + " |"]
    lines.extend("| " + " | ".join(row) + " |" for row in rows)
    return "\n".join(lines)


def report_rows(grouped: dict[Endpoint, list[RunResult]], metric: str, multiplier: float = 1.0) -> list[list[str]]:
    rows: list[list[str]] = []
    for endpoint in ENDPOINTS:
        results = grouped[endpoint]
        values = [
            None if getattr(result, metric) is None else getattr(result, metric) * multiplier
            for result in results
        ]
        statistic = calculate_statistic(values)
        runs = [display_number(value) for value in values]
        while len(runs) < DEFAULT_RUNS:
            runs.append("")
        cv = "N/A" if statistic.cv_percent is None and statistic.mean == 0 else display_number(statistic.cv_percent)
        rows.append([endpoint.label, *runs, display_number(statistic.mean), display_number(statistic.sd), cv, status_for(results)])
    return rows


def write_report(path: Path, grouped: dict[Endpoint, list[RunResult]], vus: str, duration: str) -> None:
    summary_by_endpoint = {row["endpoint"]: row for row in build_summary_rows(grouped)}
    avg_table = markdown_table(
        ["Endpoint", "Run 1", "Run 2", "Run 3", "Mean (ms)", "SD (ms)", "CV (%)", "Status"],
        report_rows(grouped, "avg_ms"),
    )
    p95_table = markdown_table(
        ["Endpoint", "Run 1", "Run 2", "Run 3", "Mean p95 (ms)", "SD (ms)", "CV (%)", "Target < 2000 ms", "Status"],
        [
            row[:-1] + [
                summary_by_endpoint[row[0]]["target_status"],
                row[-1],
            ]
            for row in report_rows(grouped, "p95_ms")
        ],
    )
    throughput_table = markdown_table(
        ["Endpoint", "Run 1", "Run 2", "Run 3", "Mean (req/s)", "SD", "CV (%)", "Status"],
        report_rows(grouped, "throughput_rps"),
    )
    error_table = markdown_table(
        ["Endpoint", "Run 1", "Run 2", "Run 3", "Mean (%)", "SD", "CV (%)", "Status"],
        report_rows(grouped, "error_rate", 100.0),
    )
    overview_rows = []
    for endpoint in ENDPOINTS:
        item = summary_by_endpoint[endpoint.label]
        def mean_sd(mean_key: str, sd_key: str) -> str:
            mean, sd = item[mean_key], item[sd_key]
            return "" if mean == "" or sd == "" else f"{float(mean):.2f} ± {float(sd):.2f}"
        def value_or_blank(key: str) -> str:
            value = item[key]
            return "" if value == "" else (value if value == "N/A" else f"{float(value):.2f}")
        overview_rows.append([
            endpoint.label,
            mean_sd("avg_mean_ms", "avg_sd_ms"),
            value_or_blank("avg_cv_pct"),
            mean_sd("p95_mean_ms", "p95_sd_ms"),
            value_or_blank("p95_cv_pct"),
            mean_sd("throughput_mean_rps", "throughput_sd_rps"),
            value_or_blank("error_rate_mean_pct"),
            item["target_status"],
        ])
    overview_table = markdown_table(
        ["Endpoint", "Rata-rata respons, mean ± SD (ms)", "CV (%)", "p95, mean ± SD (ms)", "CV (%)", "Throughput, mean ± SD (req/s)", "Error rate (%)", "Target p95"],
        overview_rows,
    )
    content = f"""# Hasil Pengujian API Inti — Repeated Measurement

Konfigurasi nominal: {vus} VU, {duration} per endpoint, tiga run per endpoint.
SD adalah sample standard deviation (`ddof=1`). CV dihitung sebagai SD/mean × 100%; CV ditampilkan `N/A` ketika mean = 0. CV disajikan secara deskriptif dan tidak digunakan untuk mengklaim stabilitas atau reproducibility.

Target penelitian untuk p95 adalah < {P95_TARGET_MS:.0f} ms dan hanya ditandai memenuhi bila ketiga run endpoint tersebut berada di bawah target. Target ini bukan sertifikasi atau standar eksternal.

## Ringkasan untuk BAB IV

{overview_table}

## Rata-rata Response Time (`http_req_duration`, avg, ms)

{avg_table}

## p95 Response Time (`http_req_duration`, ms)

{p95_table}

## Throughput (`http_reqs`, req/s)

{throughput_table}

## Error Rate (`http_req_failed`, %)

{error_table}

## Catatan kelengkapan

Statistik endpoint hanya dihitung bila tepat tiga artefak run yang valid tersedia. Nilai kosong berarti artefak hilang/tidak valid, bukan nol. Lihat `runs_table.csv` untuk status k6, timestamp, dan alasan validasi per run.
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def run_analysis(results_dir: Path, summary_dir: Path, manifest: Path | None, vus: str, duration: str, allow_incomplete: bool) -> int:
    manifests = manifest_index(manifest)
    results: list[RunResult] = []
    grouped: dict[Endpoint, list[RunResult]] = {endpoint: [] for endpoint in ENDPOINTS}
    for endpoint in ENDPOINTS:
        for run in range(1, DEFAULT_RUNS + 1):
            source = results_dir / f"run_{run}" / endpoint.summary_file
            result = parse_result(endpoint, run, source, manifests)
            results.append(result)
            grouped[endpoint].append(result)

    write_runs_table(summary_dir / "runs_table.csv", results, vus, duration)
    summary_rows = build_summary_rows(grouped)
    write_csv(summary_dir / "summary_table.csv", SUMMARY_FIELDS, summary_rows)
    write_report(summary_dir / "summary_report.md", grouped, vus, duration)

    incomplete = [result for result in results if not result.valid]
    if incomplete:
        print(f"Analisis belum lengkap: {len(incomplete)} dari {len(results)} artefak tidak valid/hilang.", file=sys.stderr)
        for result in incomplete[:6]:
            print(f"- {result.endpoint.label}, Run {result.run}: {result.reason}", file=sys.stderr)
        if len(incomplete) > 6:
            print(f"- dan {len(incomplete) - 6} artefak lainnya.", file=sys.stderr)
        return 0 if allow_incomplete else 1
    print(f"Analisis lengkap: {len(results)} artefak valid (6 endpoint × {DEFAULT_RUNS} run).")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results-dir", type=Path, default=Path("results/repeated"))
    parser.add_argument("--summary-dir", type=Path, default=Path("summary"))
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--vus", default="10")
    parser.add_argument("--duration", default="3m")
    parser.add_argument("--allow-incomplete", action="store_true", help="Tulis laporan parsial tetapi tetap tandai statistik kosong.")
    parser.add_argument("--validate-file", type=Path, help="Validasi satu ringkasan k6 tanpa menulis artefak.")
    parser.add_argument("--scan-artifact", type=Path, help="Periksa kebocoran token/kredensial pada satu JSON artefak.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.validate_file:
        valid, reason = validate_file(args.validate_file)
        if valid:
            return 0
        print(f"Artefak tidak valid: {reason}", file=sys.stderr)
        return 1
    if args.scan_artifact:
        summary, error = read_json(args.scan_artifact)
        if summary is None:
            print(f"Artefak tidak dapat dipindai: {error}", file=sys.stderr)
            return 1
        findings = sensitive_findings(summary)
        if findings:
            print("Artefak memuat data sensitif pada: " + "; ".join(findings[:5]), file=sys.stderr)
            return 1
        return 0
    return run_analysis(args.results_dir, args.summary_dir, args.manifest, args.vus, args.duration, args.allow_incomplete)


if __name__ == "__main__":
    raise SystemExit(main())
