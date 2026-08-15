"""Utilities for J. Morita ``.vol`` CBCT exports.

The J. Morita volume format stores a small XML header followed by a signed
16-bit ``CArray3D``.  It is not DICOM, so it must be discovered separately
from regular DICOM-series scanning.
"""

from __future__ import annotations

import hashlib
import math
import os
import struct
import xml.etree.ElementTree as ET

import numpy as np


JM_VOLUME_MAGIC = b"JmVolumeVersion="
JM_VOLUME_ARRAY_MARKER = b"CArray3D"
JM_VOLUME_BACKGROUND = -32768


def _float_attribute(root: ET.Element, name: str, fallback: float) -> float:
    for node in root.iter(name):
        try:
            value = float(node.attrib.get("value", fallback))
            if value > 0:
                return value
        except (TypeError, ValueError):
            pass
    return fallback


def _volume_uid(file_path: str, study_path: str) -> str:
    relative_path = os.path.relpath(file_path, study_path).replace(os.sep, "/")
    digest = hashlib.md5(relative_path.encode("utf-8")).hexdigest()
    return f"morita_volume_{digest}"


def read_jm_volume_header(file_path: str, study_path: str | None = None) -> dict:
    """Read and validate the non-pixel header of a J. Morita ``.vol`` file."""
    with open(file_path, "rb") as source:
        header_bytes = source.read(1024 * 1024)

    if JM_VOLUME_MAGIC not in header_bytes[:128]:
        raise ValueError("Not a J. Morita volume")

    xml_start = header_bytes.find(b"<?xml")
    xml_end = header_bytes.find(b"</JmVolume>", xml_start)
    if xml_start < 0 or xml_end < 0:
        raise ValueError("J. Morita volume XML header is incomplete")
    xml_end += len(b"</JmVolume>")

    try:
        root = ET.fromstring(header_bytes[xml_start:xml_end].decode("shift_jis", errors="ignore"))
    except ET.ParseError as error:
        raise ValueError(f"J. Morita volume XML header is invalid: {error}") from error

    array_marker_offset = header_bytes.find(JM_VOLUME_ARRAY_MARKER, xml_end)
    if array_marker_offset < 0:
        raise ValueError("J. Morita volume pixel array marker is missing")

    bounds_offset = array_marker_offset + len(JM_VOLUME_ARRAY_MARKER)
    if len(header_bytes) < bounds_offset + 24:
        raise ValueError("J. Morita volume bounds are incomplete")
    x_min, x_max, y_min, y_max, z_min, z_max = struct.unpack_from("<6i", header_bytes, bounds_offset)
    dimensions = (x_max - x_min + 1, y_max - y_min + 1, z_max - z_min + 1)
    if min(dimensions) <= 0:
        raise ValueError("J. Morita volume dimensions are invalid")

    data_offset = bounds_offset + 24
    expected_data_bytes = math.prod(dimensions) * np.dtype("<i2").itemsize
    file_size = os.path.getsize(file_path)
    if file_size - data_offset != expected_data_bytes:
        raise ValueError("J. Morita volume pixel data size does not match its header")

    spacing = (
        _float_attribute(root, "tfXGridSize", 0.25),
        _float_attribute(root, "tfYGridSize", 0.25),
        _float_attribute(root, "tfZGridSize", 0.25),
    )
    resolved_study_path = study_path or os.path.dirname(file_path)
    return {
        "file_path": file_path,
        "series_uid": _volume_uid(file_path, resolved_study_path),
        "dimensions": dimensions,
        "spacing": spacing,
        "origin": (x_min * spacing[0], y_min * spacing[1], z_min * spacing[2]),
        "data_offset": data_offset,
        "num_slices": dimensions[2],
        "description": f"J. Morita CBCT ({os.path.basename(file_path)})",
    }


def discover_jm_volumes(study_path: str) -> list[dict]:
    """Return valid J. Morita raw volumes found beneath ``study_path``."""
    volumes = []
    for root, _dirs, files in os.walk(study_path):
        for filename in files:
            if not filename.lower().endswith(".vol"):
                continue
            file_path = os.path.join(root, filename)
            try:
                volumes.append(read_jm_volume_header(file_path, study_path))
            except (OSError, ValueError):
                continue
    return sorted(volumes, key=lambda volume: volume["file_path"])


def load_jm_volume_for_viewer(header: dict, requested_spacing: tuple[float, float, float] | None = None) -> tuple[np.ndarray, tuple[float, float, float], tuple[float, float, float]]:
    """Load a bounded-resolution normalized volume for VTI rendering.

    Raw Morita scans can be hundreds of MB.  Downsampling before materializing
    the array keeps normal viewer conversion within a predictable memory budget.
    """
    spacing = tuple(float(value) for value in header["spacing"])
    target = min(requested_spacing) if requested_spacing else min(spacing)
    # Keep a high-quality request at native resolution when its target does
    # not reach the next whole source-voxel stride. Standard and fast presets
    # still reduce 0.25 mm source voxels to 0.50 mm and 1.00 mm respectively.
    stride = max(1, int(target / min(spacing)))
    x_size, y_size, z_size = header["dimensions"]
    # J. Morita CArray3D serializes X, Y, Z in that order.  Unlike a DICOM
    # stack, it is not Z, Y, X, so retain this layout for VTK directly.
    raw = np.memmap(
        header["file_path"],
        mode="r",
        dtype="<i2",
        offset=header["data_offset"],
        shape=(x_size, y_size, z_size),
    )

    sample_stride = max(stride, 4)
    sample = np.asarray(raw[::sample_stride, ::sample_stride, ::sample_stride])
    valid_sample = sample[sample != JM_VOLUME_BACKGROUND]
    if valid_sample.size == 0:
        # Tiny synthetic studies and heavily masked acquisitions can place the
        # only sampled point in the background. Retry at full resolution before
        # declaring the source empty.
        sample = np.asarray(raw)
        valid_sample = sample[sample != JM_VOLUME_BACKGROUND]
    if valid_sample.size == 0:
        raise ValueError("J. Morita volume contains no visible voxels")
    low, high = np.percentile(valid_sample, (1, 99.5))
    if high <= low:
        low, high = float(valid_sample.min()), float(valid_sample.max())
    if high <= low:
        raise ValueError("J. Morita volume intensity range is invalid")

    reduced = np.asarray(raw[::stride, ::stride, ::stride], dtype=np.int16)
    normalized = (reduced.astype(np.float32) - low) / (high - low)
    normalized = np.clip(normalized, 0.0, 1.0).astype(np.float32, copy=False)
    normalized[reduced == JM_VOLUME_BACKGROUND] = 0.0

    volume_xyz = np.ascontiguousarray(normalized)
    effective_spacing = tuple(value * stride for value in spacing)
    return volume_xyz, effective_spacing, tuple(header["origin"])
