import json
import os

SETTINGS_FILE = "settings.json"

def _load_settings():
    """讀取所有設定"""
    env_folder_id = os.environ.get("TARGET_FOLDER_ID")

    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                if "target_folder_id" in data and "classes" not in data:
                    return {"classes": {"default": {"folder_id": data["target_folder_id"], "assignment_name": ""}}}
                
                # Migrate string folder IDs to dicts
                classes = data.get("classes", {})
                for slug, info in classes.items():
                    if isinstance(info, str):
                        classes[slug] = {"folder_id": info, "assignment_name": ""}
                
                return data
        except:
            pass

    if env_folder_id:
        return {"classes": {"default": {"folder_id": env_folder_id, "assignment_name": ""}}}

    return {"classes": {}}

def _save_settings(data):
    """儲存所有設定"""
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

def get_class_info(class_slug=None):
    """根據班級 slug 取得對應的 (folder_id, assignment_name)"""
    data = _load_settings()
    classes = data.get("classes", {})

    slug = class_slug if class_slug else "default"
    info = classes.get(slug, {})
    
    # 向後相容
    if isinstance(info, str):
        return info, ""
        
    return info.get("folder_id", ""), info.get("assignment_name", "")

def get_target_folder_id(class_slug=None):
    folder_id, _ = get_class_info(class_slug)
    return folder_id

def get_all_classes():
    """取得所有班級設定"""
    data = _load_settings()
    classes = data.get("classes", {})
    result = []
    for slug, info in classes.items():
        if isinstance(info, str):
            result.append({"slug": slug, "folder_id": info, "assignment_name": ""})
        else:
            result.append({
                "slug": slug, 
                "folder_id": info.get("folder_id", ""), 
                "assignment_name": info.get("assignment_name", "")
            })
    return result

def save_class_folder(class_slug, folder_id, assignment_name=""):
    """新增或修改一個班級的設定"""
    data = _load_settings()
    if "classes" not in data:
        data["classes"] = {}
    data["classes"][class_slug] = {"folder_id": folder_id, "assignment_name": assignment_name}
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
