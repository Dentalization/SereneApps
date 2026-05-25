import os
import json
import urllib.request
import zipfile
import shutil

def install():
    print("Starting installation of obra/superpowers...")
    zip_url = "https://github.com/obra/superpowers/archive/refs/heads/main.zip"
    workspace_dir = "/Users/adrianhalim/SereneApps"
    temp_zip = os.path.join(workspace_dir, "superpowers_temp.zip")
    temp_extract = os.path.join(workspace_dir, "superpowers_temp_extract")

    # 1. Download the ZIP file
    print(f"Downloading from {zip_url}...")
    try:
        urllib.request.urlretrieve(zip_url, temp_zip)
        print("Download complete.")
    except Exception as e:
        print(f"Error downloading zip: {e}")
        return

    # 2. Extract the ZIP file
    print("Extracting ZIP archive...")
    try:
        with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
            zip_ref.extractall(temp_extract)
        print("Extraction complete.")
    except Exception as e:
        print(f"Error extracting zip: {e}")
        # Clean up
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
        return

    # Find the extracted folder (should be superpowers-main)
    extracted_dirs = os.listdir(temp_extract)
    if not extracted_dirs:
        print("Error: Extraction folder is empty.")
        return
    source_dir = os.path.join(temp_extract, extracted_dirs[0])
    print(f"Source folder identified: {source_dir}")

    # Read version from gemini-extension.json if available
    version = "5.1.0"
    gemini_ext_path = os.path.join(source_dir, "gemini-extension.json")
    if os.path.exists(gemini_ext_path):
        try:
            with open(gemini_ext_path, 'r') as f:
                ext_data = json.load(f)
                version = ext_data.get("version", version)
        except Exception as e:
            print(f"Warning: could not parse gemini-extension.json: {e}")

    # Destinations
    destinations = {
        "Global Plugins Directory": "/Users/adrianhalim/.gemini/config/plugins/superpowers",
        "Workspace Plugins Directory": os.path.join(workspace_dir, ".agents/plugins/superpowers")
    }

    for name, path in destinations.items():
        print(f"\nInstalling to {name}: {path}...")
        try:
            # Create directory
            os.makedirs(path, exist_ok=True)
            
            # Copy all contents from source_dir to path
            for item in os.listdir(source_dir):
                s = os.path.join(source_dir, item)
                d = os.path.join(path, item)
                if os.path.isdir(s):
                    if os.path.exists(d):
                        shutil.rmtree(d)
                    shutil.copytree(s, d)
                else:
                    shutil.copy2(s, d)
            
            # Write plugin.json
            plugin_json_path = os.path.join(path, "plugin.json")
            with open(plugin_json_path, 'w') as f:
                json.dump({"name": "superpowers"}, f, indent=2)
                
            # Write installed_version.json
            version_json_path = os.path.join(path, "installed_version.json")
            with open(version_json_path, 'w') as f:
                json.dump({"version": version}, f, indent=2)
                
            print(f"Successfully installed to {name}!")
        except Exception as e:
            print(f"Failed to install to {name}: {e}")

    # Cleanup temporary files
    print("\nCleaning up temporary files...")
    try:
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
        if os.path.exists(temp_extract):
            shutil.rmtree(temp_extract)
        print("Cleanup complete.")
    except Exception as e:
        print(f"Warning during cleanup: {e}")

if __name__ == "__main__":
    install()
