import os
from google.oauth2 import service_account
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
    
    return file.get('id')

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
