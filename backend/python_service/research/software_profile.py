"""Controlled synthetic input performance ONLY. Deletes media/geometry; never validates accuracy.
Run: PYTHONPATH=backend/python_service .venv/bin/python -m research.software_profile --output <new.json>
"""
import argparse
import json
import platform
import tempfile
from pathlib import Path
import cv2
import numpy as np
from services.reconstruction_service import process_3d_scan_reconstruction


def profile():
    random = np.random.default_rng(44)
    points = random.uniform([-1.4, -.9, 3], [1.4, .9, 6], (260, 3))
    textures = random.integers(0, 256, (260, 13, 13), dtype=np.uint8)
    runs = []
    with tempfile.TemporaryDirectory(prefix='scan3d-software-profile-') as tmp:
        video = Path(tmp) / 'synthetic-software-input.avi'
        writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*'MJPG'), 10, (640, 480))
        if not writer.isOpened(): raise RuntimeError('Fixture codec unavailable')
        for camera_x in np.linspace(0, .65, 12):
            image = np.full((480, 640), 70, np.uint8)
            for point, texture in zip(points, textures):
                x, y = round(640 * (point[0] - camera_x) / point[2] + 320), round(640 * point[1] / point[2] + 240)
                if 7 <= x < 633 and 7 <= y < 473: image[y-6:y+7, x-6:x+7] = texture
            writer.write(cv2.cvtColor(image, cv2.COLOR_GRAY2BGR))
        writer.release()
        config = {'frameSampling': {'minPixelDifference': .1}, 'reconstruction': {'parameters': {'maxViews': 4}}}
        for i in range(3):
            result = process_3d_scan_reconstruction(str(Path(tmp) / f'run-{i}'), video_path=str(video), configuration=config)
            runs.append({'timingsMs': result['metadata']['timings'], 'memory': result['metadata']['memory'],
                'assetBytes': {k: a['sizeInBytes'] for k, a in result['assets'].items()},
                'inputBytes': video.stat().st_size, 'vertexCount': result['metadata']['vertexCount'],
                'faceCount': result['metadata']['faceCount']})
    return {'status': 'software_verification_only', 'syntheticInput': True, 'datasetStatus': 'DATASET_UNAVAILABLE',
        'experimentallyValidated': False, 'clinicallyValidated': False, 'configuration': config,
        'environment': {'python': platform.python_version(), 'platform': platform.system(), 'machine': platform.machine(),
                        'opencv': cv2.__version__, 'numpy': np.__version__}, 'runs': runs,
        'smartphoneCapture': None, 'networkUploadMs': None, 'gpuMemoryBytes': None,
        'limitations': ['Controlled rendered texture sequence, not a smartphone or dental dataset',
            'No trueness, precision or geometric accuracy is evaluated', 'Memory is process lifetime high-water mark',
            'Media and all reconstructed geometry are discarded after software profiling']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    result = profile()
    with Path(args.output).open('x') as stream: json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({'status': result['status'], 'runs': len(result['runs']), 'output': args.output}))
