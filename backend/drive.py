import os
import json
import googleapiclient.errors
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2 import service_account

SCOPES = ['https://www.googleapis.com/auth/drive']

def get_drive_service():
    json_str = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    
    if not json_str:
        raise Exception("找不到 GOOGLE_APPLICATION_CREDENTIALS 環境變數")
    
    try:
        info = json.loads(json_str)
    except json.JSONDecodeError:
        raise Exception("GOOGLE_APPLICATION_CREDENTIALS 內容不是合法的 JSON")
    
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    service = build('drive', 'v3', credentials=creds)
    print("成功使用 Service Account 建立 Drive 連線！")
    return service

def upload_file_to_drive(file_obj, filename, folder_id, mime_type):
    service = get_drive_service()
    file_metadata = {'name': filename, 'parents': [folder_id]}
    media = MediaIoBaseUpload(file_obj, mimetype=mime_type, resumable=True)
    file = service.files().create(
        body=file_metadata, media_body=media,
        fields='id', supportsAllDrives=True
    ).execute()
    return file.get('id')

def delete_file_from_drive(file_id):
    service = get_drive_service()
    try:
        service.files().delete(fileId=file_id, supportsAllDrives=True).execute()
        return True
    except Exception as e:
        print(f"Failed to delete {file_id}: {e}")
        return False

def list_files_in_folder(folder_id):
    service = get_drive_service()
    try:
        results = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="files(id, name, createdTime)",
            pageSize=1000, orderBy="createdTime desc",
            corpora="allDrives", includeItemsFromAllDrives=True,
            supportsAllDrives=True
        ).execute()
        return results.get('files', [])
    except Exception as e:
        print(f"Failed to list files in {folder_id}: {e}")
        return []
