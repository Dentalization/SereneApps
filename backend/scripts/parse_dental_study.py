import os
import sys
import json
import re
import struct


def parse_jm_volume_details(file_path):
    """Return lightweight slice and spacing metadata from a J. Morita .vol."""
    try:
        with open(file_path, "rb") as file:
            header = file.read(1024 * 1024)

        marker = b"CArray3D"
        bounds_offset = header.find(marker) + len(marker)
        if header.find(marker) < 0 or len(header) < bounds_offset + 24:
            return {}

        _x_min, _x_max, _y_min, _y_max, z_min, z_max = struct.unpack_from("<6i", header, bounds_offset)
        spacing_match = re.search(rb"tfZGridSize\s+value\s*=\s*['\"]([^'\"]+)", header)
        spacing = spacing_match.group(1).decode("ascii", errors="ignore") if spacing_match else "0.25"
        return {
            "numSlices": max(1, z_max - z_min + 1),
            "sliceThickness": spacing,
            "pixelSpacing": spacing,
        }
    except (OSError, struct.error):
        return {}


def parse_ver_ctrl(file_path):
    """
    Parses ver_ctrl.txt to extract patient info.
    Format: key=value
    """
    metadata = {}
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
            for line in file:
                if "=" in line:
                    key, value = line.strip().split("=", 1)
                    metadata[key.strip()] = value.strip()
    except Exception as exc:
        print(f"Error reading ver_ctrl.txt: {exc}", file=sys.stderr)
    return metadata


def parse_photo_proc(file_path):
    """
    Parses photo_proc.txt.
    Supports both key=value and @key:value formats.
    """
    metadata = {}
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
            content = file.read()

            if "@" in content:
                for token in content.split("@"):
                    if ":" in token:
                        key, value = token.split(":", 1)
                        metadata[key.strip()] = value.strip()

            patterns = {
                "Voltage": r"Voltage=(.*)",
                "Current": r"Current=(.*)",
                "ExposureTime": r"ExposureTime=(.*)",
                "SliceThickness": r"SliceThickness=(.*)",
                "PixelSpacing": r"PixelSpacing=(.*)",
                "VolumeID": r"VolumeID=(.*)",
                "Date": r"Date=(.*)",
                "SliceInterval": r"SliceInterval=(.*)",
            }
            for key, pattern in patterns.items():
                if key in metadata:
                    continue
                match = re.search(pattern, content)
                if match:
                    metadata[key] = match.group(1).strip()
    except Exception as exc:
        print(f"Error reading photo_proc.txt: {exc}", file=sys.stderr)
    return metadata


def scan_folder(folder_path):
    """
    Scans a dental study folder and returns normalized metadata and series info.
    Handles Morita CBCT folders, DICOM files, and 2D panoramic/ceph image files.
    """
    result = {
        "modality": "Unknown",
        "series": [],
        "metadata": {},
    }

    photo_proc = {}
    ver_ctrl = {}

    photo_proc_path = os.path.join(folder_path, "photo_proc.txt")
    if os.path.exists(photo_proc_path):
        photo_proc = parse_photo_proc(photo_proc_path)

    ver_ctrl_path = os.path.join(folder_path, "ver_ctrl.txt")
    if os.path.exists(ver_ctrl_path):
        ver_ctrl = parse_ver_ctrl(ver_ctrl_path)

    metadata = {
        "PatientID": ver_ctrl.get("PatientID"),
        "PatientName": ver_ctrl.get("PatientName"),
        "kv": photo_proc.get("kV") or photo_proc.get("Voltage"),
        "ma": photo_proc.get("mA") or photo_proc.get("Current"),
        "ExposureTime": photo_proc.get("EXPTIME") or photo_proc.get("ExposureTime"),
        "SliceThickness": photo_proc.get("SliceThickness"),
        "PixelSpacing": photo_proc.get("PixelSpacing"),
        "Date": photo_proc.get("Date"),
        "VolumeID": photo_proc.get("VOLUME_ID") or photo_proc.get("VolumeID"),
    }
    result["metadata"] = {key: value for key, value in metadata.items() if value is not None}

    slx_files = []
    bmp_files = []
    dcm_files = []
    jm_volume_files = []

    for root, _dirs, files in os.walk(folder_path):
        for filename in files:
            lower_filename = filename.lower()
            file_path = os.path.join(root, filename)

            if lower_filename.endswith(".vol"):
                try:
                    with open(file_path, "rb") as file:
                        if b"JmVolumeVersion=" in file.read(128):
                            jm_volume_files.append(file_path)
                except OSError:
                    pass
            elif lower_filename.endswith(".slx"):
                slx_files.append(file_path)
            elif lower_filename.endswith(".bmp"):
                bmp_files.append(file_path)
            elif lower_filename.endswith((".dcm", ".dcom", ".dicom", ".ima")):
                dcm_files.append(file_path)
            elif "." not in filename:
                try:
                    with open(file_path, "rb") as file:
                        file.seek(128)
                        if file.read(4) == b"DICM":
                            dcm_files.append(file_path)
                except Exception:
                    pass

    total_slices = len(slx_files) + len(bmp_files) + len(dcm_files)

    is_cbct = False
    if result["metadata"].get("VolumeID"):
        is_cbct = True

    slice_thickness = result["metadata"].get("SliceThickness")
    if slice_thickness:
        try:
            if float(slice_thickness) <= 1.0 and total_slices > 50:
                is_cbct = True
        except Exception:
            pass

    if jm_volume_files:
        result["modality"] = "CBCT"
    elif is_cbct:
        result["modality"] = "CBCT"
    elif total_slices > 0:
        result["modality"] = "2D"

    if jm_volume_files:
        volume_details = parse_jm_volume_details(jm_volume_files[0])
        result["series"].append({
            "modality": "CBCT",
            "numSlices": volume_details.get("numSlices", 1),
            "kv": result["metadata"].get("kv"),
            "ma": result["metadata"].get("ma"),
            "sliceThickness": volume_details.get("sliceThickness", slice_thickness or "0.25"),
            "pixelSpacing": volume_details.get("pixelSpacing", result["metadata"].get("PixelSpacing", "0.25")),
            "exposureTime": result["metadata"].get("ExposureTime"),
        })
    elif total_slices > 0:
        result["series"].append({
            "modality": result["modality"],
            "numSlices": total_slices,
            "kv": result["metadata"].get("kv"),
            "ma": result["metadata"].get("ma"),
            "sliceThickness": slice_thickness or "1.0",
            "pixelSpacing": result["metadata"].get("PixelSpacing", "0.25"),
            "exposureTime": result["metadata"].get("ExposureTime"),
        })

    pan_files = []
    for root, _dirs, files in os.walk(folder_path):
        for filename in files:
            lower_filename = filename.lower()
            if not lower_filename.endswith((".jpg", ".jpeg", ".tif", ".tiff", ".png")):
                continue
            if filename.startswith(("thumb_", "image_", "labels_")):
                continue
            if any(keyword in lower_filename for keyword in (
                "panorama", "panoramic", "panoramik", "opg",
                "ceph", "cephalometric", "cephalometri", "sefalometri",
            )):
                pan_files.append(os.path.join(root, filename))

    added_names = set()
    for pan_file in pan_files:
        filename = os.path.basename(pan_file)
        name_without_ext = os.path.splitext(filename)[0]
        normalized_name = name_without_ext.lower()
        if normalized_name in added_names:
            continue
        added_names.add(normalized_name)

        lower_filename = filename.lower()
        pan_modality = "OPG" if any(keyword in lower_filename for keyword in (
            "panorama", "panoramic", "panoramik", "opg",
        )) else "Ceph"
        result["series"].append({
            "modality": pan_modality,
            "numSlices": 1,
            "kv": result["metadata"].get("kv"),
            "ma": result["metadata"].get("ma"),
            "sliceThickness": "1.0",
            "pixelSpacing": result["metadata"].get("PixelSpacing", "0.25"),
            "exposureTime": result["metadata"].get("ExposureTime"),
        })

    if result["modality"] == "Unknown" and result["series"]:
        result["modality"] = "2D"

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No folder path provided"}))
        sys.exit(1)

    target_folder = sys.argv[1]

    if not os.path.isdir(target_folder):
        print(json.dumps({"error": "Path is not a directory"}))
        sys.exit(1)

    try:
        scan_result = scan_folder(target_folder)
        print(json.dumps(scan_result))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
