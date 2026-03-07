from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import os.path
import googleapiclient.errors
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ['https://www.googleapis.com/auth/drive.file']

TOKEN_PATHS = [
    os.environ.get('GOOGLE_TOKEN_FILE'),
    'token.json',
    '../token.json',
    '/etc/secrets/token.json'
]

def get_drive_service():
    creds = None
    
    # 首先檢查有沒有透過 OAuth 取得的個人授權檔 token.json
    for path in TOKEN_PATHS:
        if path and os.path.exists(path):
            try:
                creds = Credentials.from_authorized_user_file(path, SCOPES)
                # 授權檔如果過期則重新整理
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                    try:
                        # 嘗試將更新後的 token 寫回，若在唯讀環境(如 Render)會失敗，但不影響當次執行
                        with open(path, 'w') as token:
                            token.write(creds.to_json())
                    except Exception as e:
                        print(f"無法儲存更新後的 token (這在 Render 等雲端環境很常見): {e}")
                print(f"成功從 {path} 載入授權 token！")
                break
            except Exception as e:
                print(f"找到 {path} 但解析失敗: {e}")
                
    if not creds:
        error_msg = "!!! 嚴重錯誤：找不到任何正確的 token.json !!! 請確定您已在 Render 中設定了 Secret Files"
        print(error_msg)
        raise FileNotFoundError(error_msg)
        
    service = build('drive', 'v3', credentials=creds)
    return service

def upload_file_to_drive(file_obj, filename, folder_id, mime_type):
    service = get_drive_service()
    if not service:
        # Mock Upload for testing
        print(f"Mock Upload: {filename} to {folder_id}")
        return f"mock_file_id_{filename}"
        
    file_metadata = {
        'name': filename,
        'parents': [folder_id]
    }
    media = MediaIoBaseUpload(file_obj, mimetype=mime_type, resumable=True)
    
    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id',
        supportsAllDrives=True
    ).execute()
    
    file_id = file.get('id')
    return file_id

def delete_file_from_drive(file_id):
    service = get_drive_service()
    if not service:
        print(f"Mock Delete: {file_id}")
        return True
    try:
        service.files().delete(fileId=file_id, supportsAllDrives=True).execute()
        return True
    except Exception as e:
        print(f"Failed to delete {file_id}: {e}")
        return False

def list_files_in_folder(folder_id):
    service = get_drive_service()
    if not service:
        print("Mock List")
        return []
    try:
        results = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="files(id, name, createdTime)",
            pageSize=1000,
            orderBy="createdTime desc",
            corpora="allDrives",
            includeItemsFromAllDrives=True,
            supportsAllDrives=True
        ).execute()
        return results.get('files', [])
    except Exception as e:
        print(f"Failed to list files in {folder_id}: {e}")
        return []
