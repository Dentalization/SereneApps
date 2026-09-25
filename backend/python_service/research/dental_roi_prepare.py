"""Prepare private frame previews for a human dental-region review.

The emitted JSON is intentionally incomplete and cannot pass the acquisition gate.
"""
import argparse
import json
import os
from pathlib import Path

import cv2
import numpy as np

from research.annotation_ui import annotation_page
from services.lidra_service import file_sha256


def prepare(video_path, output_dir, max_candidates=48):
    source = Path(video_path).resolve(strict=True)
    if not source.is_file() or not 3 <= max_candidates <= 120:
        raise ValueError("An existing video and 3–120 candidates are required")
    target = Path(output_dir).resolve()
    target.mkdir(mode=0o700, parents=True, exist_ok=False)
    cap = cv2.VideoCapture(str(source))
    try:
        if not cap.isOpened():
            raise ValueError("Video cannot be decoded")
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total < 3:
            raise ValueError("Video has too few frames")
        indices = np.linspace(0, total - 1, min(total, max_candidates), dtype=int)
        frames = []
        for index in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(index))
            success, frame = cap.read()
            if not success or frame is None:
                continue
            scale = min(1.0, 900 / max(frame.shape[:2]))
            preview = cv2.resize(frame, (round(frame.shape[1] * scale), round(frame.shape[0] * scale)))
            filename = f"frame_{int(index):08d}.jpg"
            ok, encoded = cv2.imencode(".jpg", preview, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ok:
                raise ValueError("Cannot encode frame preview")
            descriptor = os.open(target / filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(encoded.tobytes())
            frames.append({"frameIndex": int(index), "preview": filename, "polygon": None,
                           "mouthStable": None, "visibleRegions": []})
        template = {"source": "operator_annotated_unverified", "reviewer": None,
                    "videoSha256": file_sha256(source), "expectedRegions": [], "frames": frames,
                    "instructions": "Review every listed frame. Enter reviewer, expectedRegions, a normalized polygon enclosing only visible teeth, mouthStable true/false, and visibleRegions. Remove rejected/unannotated frames; keep at least three. Preview filenames are not sent to the scan API."}
        descriptor = os.open(target / "roi_template.json", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(template, stream, indent=2)
        preview_bytes = {frame["preview"]: (target / frame["preview"]).read_bytes() for frame in frames}
        descriptor = os.open(target / "annotate.html", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(annotation_page(template, preview_bytes))
        return target / "roi_template.json"
    finally:
        cap.release()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--max-candidates", type=int, default=48)
    arguments = parser.parse_args()
    print(prepare(arguments.video, arguments.output, arguments.max_candidates))
