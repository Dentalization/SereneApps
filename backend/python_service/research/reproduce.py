"""Run the existing baseline on a supplied video in a NEW evidence directory.

Input-kind is an operator declaration, not independently verified research evidence.
No reference comparison or clinical promotion is performed by this command.
"""
import argparse
import json
from pathlib import Path
from services.reconstruction_service import process_3d_scan_reconstruction


def reproduce(video, configuration, output, input_kind):
    if input_kind not in ('real_capture', 'synthetic_fixture'):
        raise ValueError('Explicit real_capture or synthetic_fixture declaration required')
    source = Path(video)
    if not source.is_file():
        return {'status': 'DATASET_UNAVAILABLE', 'dataStatus': 'SMARTPHONE_VALIDATION_DATASET_UNAVAILABLE', 'metrics': None}
    target = Path(output)
    target.mkdir(parents=True, exist_ok=False)
    result = process_3d_scan_reconstruction(str(target), video_path=str(source), configuration=configuration)
    metadata = result['metadata']
    fixture = input_kind == 'synthetic_fixture'
    manifest = {**metadata, 'videoChecksum': metadata['input']['sha256'],
                'synthetic': fixture, 'testFixture': fixture,
                'inputKind': input_kind, 'inputKindEvidence': 'operator_declaration_not_independently_verified',
                'datasetStatus': 'software_verification_only' if fixture else 'not_evaluated',
                'assets': result['assets'], 'validation': {'status': 'not_evaluated'},
                'clinicallyValidated': False, 'measurementCapability': 'visualization_only'}
    with (target / 'provenance.json').open('x') as stream:
        json.dump(manifest, stream, indent=2, allow_nan=False)
    return {'status': 'reconstructed_experimental', 'inputKind': input_kind,
            'manifest': str(target / 'provenance.json'), 'clinicallyValidated': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--video', required=True)
    parser.add_argument('--config', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--input-kind', required=True, choices=['real_capture', 'synthetic_fixture'])
    args = parser.parse_args()
    result = reproduce(args.video, json.loads(Path(args.config).read_text()), args.output, args.input_kind)
    print(json.dumps(result, allow_nan=False))
