import os
from google_auth_oauthlib.flow import InstalledAppFlow

# 設定我們需要的權限：管理 Google Drive 的檔案
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def main():
    if not os.path.exists('client_secret.json'):
        print("錯誤：找不到 client_secret.json！")
        print("請到 Google Cloud Console 下載你的「OAuth 2.0 用戶端 ID」JSON 檔，並重新命名為 client_secret.json")
        return

    print("準備開啟瀏覽器進行 Google 登入...")
    flow = InstalledAppFlow.from_client_secrets_file('client_secret.json', SCOPES)
    
    # 開啟本地端伺服器接收回呼，會自動彈出瀏覽器要求登入授權
    creds = flow.run_local_server(port=0)
    
    # 儲存取得的憑證，這個檔案就是後端真正需要的授權檔
    with open('token.json', 'w') as token:
        token.write(creds.to_json())
        
    print("\n✅ 成功！已經產生 token.json 檔案。")
    print("請將 token.json 的內容複製，並像之前的 service-account.json 一樣，放到 Render 的 Secret Files 中！")

if __name__ == '__main__':
    main()
