import json
import os

SETTINGS_FILE = "settings.json"

def get_target_folder_id():
    # 優先讀取環境變數
    env_folder_id = os.environ.get("TARGET_FOLDER_ID")
    if env_folder_id:
        return env_folder_id
        
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                return data.get("target_folder_id", "")
        except:
            pass
    return ""

def save_target_folder_id(folder_id):
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump({"target_folder_id": folder_id}, f)
        return True
    except:
        return False
