"""Separate historical repository evidence from present, read-only file availability."""
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

from .validation import checksum


def dataset_evidence(repository):
    root = Path(repository).resolve()
    config_path = root / 'scripts/xcore-benchmark/benchmark.single.config.json'
    csv_path = root / 'scripts/xcore-benchmark/results/benchmark-runs.csv'
    config = json.loads(config_path.read_text()) if config_path.is_file() else {}
    case = config.get('case', {})
    raw_path = Path(case['folderPath']) if case.get('folderPath') else None
    availability = 'RAW_DICOM_UNAVAILABLE_CURRENT_ENVIRONMENT'
    reason = 'Configured raw path is missing'
    if raw_path is not None:
        try:
            if raw_path.is_dir():
                # Existence/readability does not establish DICOM validity or ML suitability.
                next(raw_path.iterdir(), None)
                availability, reason = 'local_directory_accessible_not_audited', 'Run read-only dataset-audit to inspect DICOM'
        except OSError:
            reason = 'Configured raw path is inaccessible'
    rows = []
    if csv_path.is_file():
        with csv_path.open() as stream:
            rows = list(csv.DictReader(stream))
    case_rows = [r for r in rows if r.get('case_id') == case.get('caseId')]
    run_ids = sorted({r['run_id'] for r in case_rows})
    historical = []
    for run_id in run_ids:
        run = [r for r in case_rows if r['run_id'] == run_id]
        historical.append({'runId': run_id, 'successCount': sum(r['status'] == 'success' for r in run),
                           'failureCount': sum(r['status'] != 'success' for r in run),
                           'fileCounts': sorted({int(r['file_count']) for r in run}),
                           'sourceBytes': sorted({int(r['file_size_bytes']) for r in run}),
                           'reportedSliceCounts': sorted({int(r['total_slices']) for r in run})})
    return {'schemaVersion': '1', 'checkedAt': datetime.now(timezone.utc).isoformat(),
        'historicalCBCT': {'status': 'repository_benchmark_evidence_present' if historical else 'unavailable',
                          'caseId': case.get('caseId'), 'folderAlias': case.get('folderAlias'),
                          'repeatRunsConfigured': config.get('repeatRuns'), 'runs': historical,
                          'meaning': 'Repeated software processing of a recorded case; not repeated physical smartphone captures, surface truth or clinical validation'},
        'currentRawDICOM': {'status': availability, 'reason': reason,
                           'configuredPathSource': 'scripts/xcore-benchmark/benchmark.single.config.json',
                           'studyCount': None, 'usableSamples': None},
        'smartphone': {'status': 'SMARTPHONE_VALIDATION_DATASET_UNAVAILABLE',
                       'basis': 'No smartphone research dataset supplied in the authorized workflow; tracked-file audit recorded in re-audit report'},
        'repeatedCaptures': {'status': 'REPEATED_CAPTURE_DATA_UNAVAILABLE'},
        'surfaceReferences': {'status': 'REFERENCE_GEOMETRY_UNAVAILABLE'},
        'syntheticFixtures': {'permittedUse': 'software_verification_only', 'researchEligible': False},
        'sources': [{'path': str(p.relative_to(root)), 'sha256': checksum(p)} for p in (config_path, csv_path) if p.is_file()],
        'clinicalValidation': False}
