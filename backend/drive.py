import os
from google.oauth2 import service_account
import googleapiclient.errors
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ['https://www.googleapis.com/auth/drive.file']
SERVICE_ACCOUNT_FILE = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'service-account.json')

def get_drive_service():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"Warning: {SERVICE_ACCOUNT_FILE} not found. Drive uploads will fail.")
        return None
        
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
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
    
    # 嘗試將所有權轉移給資料夾的擁有者 (解決 Quota 限額問題)
    try:
        # 首先要取得資料夾的擁有人
        folder_metadata = service.files().get(fileId=folder_id, fields='owners', supportsAllDrives=True).execute()
        if folder_metadata and 'owners' in folder_metadata and len(folder_metadata['owners']) > 0:
            owner_email = folder_metadata['owners'][0].get('emailAddress')
            if owner_email:
                permission = {
                    'type': 'user',
                    'role': 'writer',  # 必須先設定為 writer 才能轉移擁有權給他
                    'emailAddress': owner_email
                }
                # 新增權限 (先加 writer)
                service.permissions().create(
                    fileId=file_id,
                    body=permission,
                    supportsAllDrives=True,
                    sendNotificationEmail=False
                ).execute()
                
                # 更新權限轉為 owner
                transfer_perm = {
                    'type': 'user',
                    'role': 'owner',
                    'emailAddress': owner_email
                }
                # create a new permission with role=owner and transferOwnership=True
                service.permissions().create(
                    fileId=file_id,
                    body=transfer_perm,
                    transferOwnership=True,
                    supportsAllDrives=True,
                    sendNotificationEmail=False
                ).execute()
    except Exception as e:
        print(f"嘗試轉移 ownership 失敗 (這在一般 @gmail.com 帳號間可能不被允許): {e}")
        
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
