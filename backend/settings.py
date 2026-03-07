import json
import os

SETTINGS_FILE = "settings.json"

def _load_settings():
    """讀取所有設定"""
    # 向後相容：支援環境變數設定單一資料夾
    env_folder_id = os.environ.get("TARGET_FOLDER_ID")

    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                # 向後相容：舊格式 {"target_folder_id": "xxx"} 轉新格式
                if "target_folder_id" in data and "classes" not in data:
                    return {"classes": {"default": data["target_folder_id"]}}
                return data
        except:
            pass

    if env_folder_id:
        return {"classes": {"default": env_folder_id}}

    return {"classes": {}}

def _save_settings(data):
    """儲存所有設定"""
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

def get_target_folder_id(class_slug=None):
    """根據班級 slug 取得對應的 Google Drive 資料夾 ID"""
    data = _load_settings()
    classes = data.get("classes", {})

    if class_slug:
        return classes.get(class_slug, "")

    # 向後相容：沒給 class_slug 回傳 default
    return classes.get("default", "")

def get_all_classes():
    """取得所有班級設定 [{slug, folder_id}, ...]"""
    data = _load_settings()
    classes = data.get("classes", {})
    return [{"slug": slug, "folder_id": fid} for slug, fid in classes.items()]

def save_class_folder(class_slug, folder_id):
    """新增或修改一個班級的資料夾設定"""
    data = _load_settings()
    if "classes" not in data:
        data["classes"] = {}
    data["classes"][class_slug] = folder_id
    return _save_settings(data)

def delete_class_folder(class_slug):
    """刪除一個班級的設定"""
    data = _load_settings()
    classes = data.get("classes", {})
    if class_slug in classes:
        del classes[class_slug]
        data["classes"] = classes
        return _save_settings(data)
    return False

# 向後相容
def save_target_folder_id(folder_id):
    return save_class_folder("default", folder_id)
