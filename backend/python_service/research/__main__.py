import argparse
import json
from pathlib import Path
from .validation import evaluate, repeatability, write_report
from .dataset import audit_dataset, dataset_layout, derive_reference

parser = argparse.ArgumentParser(description="Offline experimental research tools; no automatic validation or clinical promotion")
parser.add_argument("command", choices=["validate", "repeatability", "dataset-audit", "dataset-init", "derive-reference"])
parser.add_argument("--config", help="Researcher-controlled JSON configuration")
parser.add_argument("--raw", help="Read-only DICOM input root")
parser.add_argument("--output", required=True, help="New evidence directory (never a raw data directory)")
args = parser.parse_args()
config = json.loads(Path(args.config).read_text()) if args.config else {}
if args.command == "dataset-init":
    dataset_layout(args.output)
    print(json.dumps({"status": "DATASET_UNAVAILABLE", "layoutCreated": True}))
else:
    if args.raw and Path(args.output).resolve().is_relative_to(Path(args.raw).resolve()):
        parser.error("Output must be outside the raw dataset")
    if args.command in ("validate", "repeatability"):
        result = evaluate(config) if args.command == "validate" else repeatability(config)
        write_report(result, args.output)
    else:
        result = audit_dataset(args.raw) if args.command == "dataset-audit" else derive_reference(config, args.output)
        Path(args.output).mkdir(parents=True, exist_ok=True)
        with (Path(args.output) / "dataset-manifest.json").open("x") as stream:
            json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({"status": result["status"], "output": args.output}))
