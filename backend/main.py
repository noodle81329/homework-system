import os
import io
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

import auth
import drive
import settings

app = FastAPI(title="Homework Submission API")

# 設定 CORS 允許前端 Vite 伺服器請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEACHER_EMAILS = os.environ.get("TEACHER_EMAILS", "teacher@example.com").split(",")

@app.post("/api/auth/login")
def login(credential: dict):
    # 判斷是否為教師登入(帶有 Google Token) 或者是學生登入(帶有姓名)
    token = credential.get("credential")
    student_name = credential.get("student_name")
    
    if token:
        # 教師或管理員透過 Google 登入
        idinfo = auth.verify_google_token(token)
        email = idinfo.get("email")
        
        if email not in TEACHER_EMAILS:
            raise HTTPException(status_code=403, detail="Not authorized as teacher")
            
        role = "teacher"
        access_token = auth.create_access_token(data={"email": email, "role": role})
        return {"access_token": access_token, "user": {"email": email, "role": role, "name": idinfo.get("name")}}
        
    elif student_name:
        # 學生輸入姓名登入
        role = "student"
        access_token = auth.create_access_token(data={"name": student_name, "role": role})
        return {"access_token": access_token, "user": {"name": student_name, "role": role}}
        
    else:
        raise HTTPException(status_code=400, detail="Must provide Google token or student name")

@app.get("/api/student/status")
def get_student_status(
    class_slug: Optional[str] = Query(None),
    current_user: dict = Depends(auth.get_current_user)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    student_name = current_user.get("name")
    if not student_name:
         raise HTTPException(status_code=400, detail="Student name missing in token")
         
    folder_id = settings.get_target_folder_id(class_slug)
    if not folder_id:
        return {
            "is_submitted": False,
            "submitted_at": None,
            "file_name": None,
            "total_submissions": 0
        }
        
    files = drive.list_files_in_folder(folder_id)
    total_submissions = len(files)
    
    prefix = f"[{student_name}] "
    my_file = next((f for f in files if f['name'].startswith(prefix)), None)
    
    if my_file:
        original_name = my_file['name'][len(prefix):]
        return {
            "is_submitted": True,
            "submitted_at": my_file.get('createdTime'),
            "file_name": original_name,
            "total_submissions": total_submissions
        }
    
    return {
        "is_submitted": False,
        "submitted_at": None,
        "file_name": None,
        "total_submissions": total_submissions
    }

@app.post("/api/student/upload")
async def upload_homework(
    file: UploadFile = File(...),
    class_slug: Optional[str] = Query(None),
    current_user: dict = Depends(auth.get_current_user)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    student_name = current_user.get("name")
    
    target_folder_id = settings.get_target_folder_id(class_slug)
    if not target_folder_id:
        raise HTTPException(status_code=400, detail="Teacher hasn't set the target folder yet.")
    
    prefix = f"[{student_name}] "
    uploaded_filename = f"{prefix}{file.filename}"
    
    files = drive.list_files_in_folder(target_folder_id)
    my_file = next((f for f in files if f['name'].startswith(prefix)), None)
    if my_file:
        drive.delete_file_from_drive(my_file['id'])
    
    contents = await file.read()
    file_obj = io.BytesIO(contents)
    
    drive.upload_file_to_drive(file_obj, uploaded_filename, target_folder_id, file.content_type)
    
    return {"message": "Upload successful", "file_name": file.filename}

@app.get("/api/teacher/submissions")
def get_all_submissions(
    class_slug: Optional[str] = Query(None),
    current_user: dict = Depends(auth.get_current_user)
):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    folder_id = settings.get_target_folder_id(class_slug)
    if not folder_id:
        return []
        
    files = drive.list_files_in_folder(folder_id)
    
    submissions = []
    for f in files:
        name_parts = f['name'].split("] ", 1)
        if len(name_parts) == 2 and name_parts[0].startswith("["):
            student_name = name_parts[0][1:]
            file_name = name_parts[1]
        else:
            student_name = "Unknown"
            file_name = f['name']
            
        submissions.append({
            "student_name": student_name,
            "is_submitted": True,
            "file_name": file_name,
            "submitted_at": f.get('createdTime')
        })
        
    return submissions

@app.get("/api/teacher/classes")
def get_all_classes(current_user: dict = Depends(auth.get_current_user)):
    """取得所有班級設定"""
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
    return settings.get_all_classes()

@app.post("/api/teacher/classes")
def save_class(
    class_slug: str = Form(...),
    folder_id: str = Form(...),
    current_user: dict = Depends(auth.get_current_user)
):
    """新增或修改班級設定"""
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
    success = settings.save_class_folder(class_slug, folder_id)
    if success:
        return {"message": "Class saved", "class_slug": class_slug}
    else:
        raise HTTPException(status_code=500, detail="Failed to save class settings")

@app.delete("/api/teacher/classes/{class_slug}")
def delete_class(class_slug: str, current_user: dict = Depends(auth.get_current_user)):
    """刪除班級設定"""
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
    success = settings.delete_class_folder(class_slug)
    if success:
        return {"message": "Class deleted"}
    else:
        raise HTTPException(status_code=404, detail="Class not found")

# 向後相容舊版 API
@app.get("/api/teacher/settings")
def get_endpoint_settings(current_user: dict = Depends(auth.get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"target_folder_id": settings.get_target_folder_id()}

@app.post("/api/teacher/settings")
def save_endpoint_settings(folder_id: str = Form(...), current_user: dict = Depends(auth.get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
    success = settings.save_target_folder_id(folder_id)
    if success:
        return {"message": "Settings saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save settings")
