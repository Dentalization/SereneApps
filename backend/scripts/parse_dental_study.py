import os
import sys
import json
import glob
import re

def parse_ver_ctrl(file_path):
    """
    Parses ver_ctrl.txt to extract Patient Info.
    Format: key=value
    """
    metadata = {}
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    metadata[key.strip()] = value.strip()
    except Exception as e:
        print(f"Error reading ver_ctrl.txt: {e}", file=sys.stderr)
    return metadata

def parse_photo_proc(file_path):
    """
    Parses photo_proc.txt.
    Supports both key=value and @key:value formats.
    """
    metadata = {}
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

            # Strategy 1: @Key:Value format (e.g. @kV:90.0)
            if '@' in content:
                # Split by @, then look for colon
                tokens = content.split('@')
                for token in tokens:
                    if ':' in token:
                        key, value = token.split(':', 1)
                        metadata[key.strip()] = value.strip()
            
            # Strategy 2: Key=Value format (fallback or mixed)
            # Re-using regex from previous version as backup
            patterns = {
                'Voltage': r'Voltage=(.*)',
                'Current': r'Current=(.*)',
                'ExposureTime': r'ExposureTime=(.*)',
                'SliceThickness': r'SliceThickness=(.*)',
                'PixelSpacing': r'PixelSpacing=(.*)',
                'VolumeID': r'VolumeID=(.*)',
                'Date': r'Date=(.*)',
                'SliceInterval': r'SliceInterval=(.*)'
            }
            for key, pattern in patterns.items():
                if key not in metadata: # Don't overwrite if found by Strategy 1
                    match = re.search(pattern, content)
                    if match:
                        metadata[key] = match.group(1).strip()
                        
    except Exception as e:
        print(f"Error reading photo_proc.txt: {e}", file=sys.stderr)
    return metadata

def scan_folder(folder_path):
    """
    Scans J. Morita folder structure.
    """
    result = {
        "modality": "Unknown",
        "series": [],
        "metadata": {}
    }

    # 1. Parse Metadata Files
    photo_proc = {}
    ver_ctrl = {}
    
    pp_path = os.path.join(folder_path, "photo_proc.txt")
    if os.path.exists(pp_path):
        photo_proc = parse_photo_proc(pp_path)
        
    vc_path = os.path.join(folder_path, "ver_ctrl.txt")
    if os.path.exists(vc_path):
        ver_ctrl = parse_ver_ctrl(vc_path)
    
    # Merge metadata with normalization
    # Map proprietary keys to standard ones
    # photo_proc might have 'kV' or 'Voltage', 'mA' or 'Current'
    metadata = {
        "PatientID": ver_ctrl.get("PatientID"),
        "PatientName": ver_ctrl.get("PatientName"),
        "kv": photo_proc.get("kV") or photo_proc.get("Voltage"),
        "ma": photo_proc.get("mA") or photo_proc.get("Current"),
        "ExposureTime": photo_proc.get("EXPTIME") or photo_proc.get("ExposureTime"),
        "SliceThickness": photo_proc.get("SliceThickness"),
        "PixelSpacing": photo_proc.get("PixelSpacing"),
        "Date": photo_proc.get("Date"),
        "VolumeID": photo_proc.get("VOLUME_ID") or photo_proc.get("VolumeID")
    }
    
    # Remove None values
    result["metadata"] = {k: v for k, v in metadata.items() if v is not None}

    # 2. Count Files (Recursive)
    slx_files = []
    bmp_files = []
    dcm_files = []

    for root, dirs, files in os.walk(folder_path):
        for file in files:
            lower_file = file.lower()
            if lower_file.endswith('.slx'):
                slx_files.append(os.path.join(root, file))
            elif lower_file.endswith('.bmp'):
                bmp_files.append(os.path.join(root, file))
            elif lower_file.endswith(('.dcm', '.dcom', '.dicom', '.ima')): # Expanded extensions
                dcm_files.append(os.path.join(root, file))
            elif '.' not in file:
                 # Check for DICOM preamble if no extension (optional, but good for robustness)
                 # fast check: read 128 bytes then DICM
                 try:
                     with open(os.path.join(root, file), 'rb') as f:
                         f.seek(128)
                         if f.read(4) == b'DICM':
                             dcm_files.append(os.path.join(root, file))
                 except:
                     pass

    total_slices = len(slx_files) + len(bmp_files) + len(dcm_files)

    # 3. Determine Modality (Logic from User)
    # - VOLUME_ID present
    # - SliceThickness <= 1.0mm
    # - Large number of SLX/BMP files
    is_cbct = False
    
    if result["metadata"].get("VolumeID"):
        is_cbct = True
    
    st = result["metadata"].get("SliceThickness")
    if st:
        try:
            if float(st) <= 1.0 and total_slices > 50:
                is_cbct = True
        except:
            pass
            
    if is_cbct:
        result["modality"] = "CBCT"
    elif total_slices > 0:
        result["modality"] = "2D" # PAN/Ceph
    else:
        result["modality"] = "Unknown" # If no files found
    
    # 4. Construct Series Info
    series_info = {
        "modality": result["modality"],
        "numSlices": total_slices,
        "kv": result["metadata"].get("kv"),
        "ma": result["metadata"].get("ma"),
        "sliceThickness": st or "1.0",
        "pixelSpacing": result["metadata"].get("PixelSpacing", "0.25"),
        "exposureTime": result["metadata"].get("ExposureTime")
    }
    result["series"].append(series_info)
    
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
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
