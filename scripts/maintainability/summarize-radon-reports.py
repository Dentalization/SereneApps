#!/usr/bin/env python3

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def load_json(path):
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def summarize_cc(cc_report):
    blocks = []
    for file_path, entries in cc_report.items():
        for entry in entries:
            blocks.append({
                "file": file_path,
                "name": entry.get("name"),
                "type": entry.get("type"),
                "complexity": entry.get("complexity", 0),
                "rank": entry.get("rank"),
                "lineno": entry.get("lineno"),
            })

    complexity_values = [block["complexity"] for block in blocks]
    rank_counts = Counter(block.get("rank") for block in blocks if block.get("rank"))

    return {
        "blockCount": len(blocks),
        "averageComplexity": round(sum(complexity_values) / len(complexity_values), 2) if complexity_values else None,
        "maxComplexity": max(complexity_values) if complexity_values else None,
        "rankCounts": dict(sorted(rank_counts.items())),
        "highestComplexityBlocks": sorted(
            blocks,
            key=lambda block: block["complexity"],
            reverse=True,
        )[:10],
    }


def summarize_mi(mi_report):
    files = []
    for file_path, entry in mi_report.items():
        if isinstance(entry, dict):
            mi_value = entry.get("mi")
            rank = entry.get("rank")
        else:
            mi_value = entry
            rank = None
        files.append({
            "file": file_path,
            "maintainabilityIndex": mi_value,
            "rank": rank,
        })

    values = [
        file_entry["maintainabilityIndex"]
        for file_entry in files
        if isinstance(file_entry["maintainabilityIndex"], (int, float))
    ]

    return {
        "fileCount": len(files),
        "averageMaintainabilityIndex": round(sum(values) / len(values), 2) if values else None,
        "minMaintainabilityIndex": min(values) if values else None,
        "files": sorted(files, key=lambda file_entry: file_entry["maintainabilityIndex"] or 0),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--results-dir", default="maintainability-results")
    args = parser.parse_args()

    results_dir = Path(args.results_dir).resolve()
    cc_report = load_json(results_dir / "radon-cdss-cc.json")
    mi_report = load_json(results_dir / "radon-cdss-mi.json")
    raw_report = load_json(results_dir / "radon-cdss-raw.json")

    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "component": "CDSS Python service",
        "cyclomaticComplexity": summarize_cc(cc_report),
        "maintainabilityIndex": summarize_mi(mi_report),
        "rawMetricFileCount": len(raw_report),
        "evidence": {
            "cyclomaticComplexity": str(results_dir / "radon-cdss-cc.json"),
            "maintainabilityIndex": str(results_dir / "radon-cdss-mi.json"),
            "rawMetrics": str(results_dir / "radon-cdss-raw.json"),
        },
    }

    output_path = results_dir / "radon-cdss-summary.json"
    output_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
