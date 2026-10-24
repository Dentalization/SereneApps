#!/usr/bin/env python3
"""
experiments/scripts/build_status.py

Rebuilds status.csv strictly from raw metadata.json files.
Does not hand-edit any label. When run on an empty directory,
initializes all 36 cells with zero attempts, zero valid runs,
and 'pending' cell_status.
"""

import argparse
import csv
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def get_default_cells(config_path):
    with open(config_path, "r") as f:
        config = json.load(f)

    n_tiers = config.get("n_tiers", [25, 100, 200])
    vu_levels = config.get("vu_levels", [10, 50, 100, 200])
    architectures = config.get("architectures", ["sync", "background", "celery"])

    cells = {}
    for n in n_tiers:
        for vu in vu_levels:
            for arch in architectures:
                key = (arch, n, vu)
                phase = "phase1" if (n == 25 or (n == 100 and vu == 10)) else "phase2"
                cells[key] = {
                    "arch": arch,
                    "n_slices": n,
                    "vus": vu,
                    "valid_count": 0,
                    "attempts": 0,
                    "failure_reasons": "",
                    "last_attempt_time": "",
                    "wall_clock_seconds": 0.0,
                    "phase": phase,
                    "cell_status": "pending",
                }
    return cells


def build_status(results_dir, output_csv_path, config_path):
    results_dir = Path(results_dir)
    output_csv_path = Path(output_csv_path)
    config_path = Path(config_path)

    cells = get_default_cells(config_path)

    raw_dir = results_dir / "raw"
    if raw_dir.exists() and raw_dir.is_dir():
        run_dirs = sorted([d for d in raw_dir.iterdir() if d.is_dir() and d.name.startswith("run_")])
        for run_dir in run_dirs:
            meta_file = run_dir / "metadata.json"
            if not meta_file.exists():
                continue
            try:
                with open(meta_file, "r") as f:
                    meta = json.load(f)
            except Exception:
                continue

            arch = meta.get("arch")
            n = meta.get("n_slices")
            vu = meta.get("vus")
            if not arch or n is None or vu is None:
                continue

            key = (arch, int(n), int(vu))
            if key not in cells:
                continue

            cell = cells[key]
            cell["attempts"] += 1
            cell["last_attempt_time"] = meta.get("timestamp", "")
            cell["wall_clock_seconds"] = float(meta.get("duration_seconds", 0.0))

            status = meta.get("status", "unknown")
            val_only = meta.get("validation_only", False)
            is_val_false = (val_only is False) or (isinstance(val_only, str) and val_only.lower() == "false")

            if status == "success" and is_val_false:
                cell["valid_count"] += 1
            else:
                triggers = meta.get("validation_triggers", [])
                err_msg = f"{status}: {'; '.join(triggers)}" if triggers else status
                existing = [x for x in cell["failure_reasons"].split("; ") if x]
                if err_msg not in existing:
                    existing.append(err_msg)
                cell["failure_reasons"] = "; ".join(existing)

            # Determine cell_status
            if cell["valid_count"] >= 5:
                cell["cell_status"] = "completed"
            elif cell["attempts"] >= 15 and cell["valid_count"] == 0:
                cell["cell_status"] = "infeasible_phase1" if cell["phase"] == "phase1" else "infeasible_phase2"
            else:
                cell["cell_status"] = "pending"

    output_csv_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "arch", "n_slices", "vus", "valid_count", "attempts",
        "failure_reasons", "last_attempt_time", "wall_clock_seconds",
        "phase", "cell_status"
    ]
    with open(output_csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for cell in cells.values():
            writer.writerow(cell)

    print(f"[Build Status] Successfully generated: {output_csv_path}")
    print(f"  Total cells: {len(cells)}")
    print(f"  Completed cells: {sum(1 for c in cells.values() if c['cell_status'] == 'completed')}")
    print(f"  Infeasible cells: {sum(1 for c in cells.values() if 'infeasible' in c['cell_status'])}")
    print(f"  Pending cells: {sum(1 for c in cells.values() if c['cell_status'] == 'pending')}")


def main():
    parser = argparse.ArgumentParser(description="Rebuild status.csv from raw metadata.json files.")
    parser.add_argument("--results-dir", default=str(REPO_ROOT / "experiments" / "results" / "confirmatory_frozen_v2"),
                        help="Path to results directory containing raw/")
    parser.add_argument("--output-csv", default=None,
                        help="Path to write status.csv (defaults to <results-dir>/status.csv)")
    parser.add_argument("--config", default=str(REPO_ROOT / "experiments" / "config" / "experiment.json"),
                        help="Path to experiment.json config")
    args = parser.parse_args()

    results_dir = Path(args.results_dir)
    output_csv = Path(args.output_csv) if args.output_csv else results_dir / "status.csv"
    build_status(results_dir, output_csv, args.config)


if __name__ == "__main__":
    main()
