import os
from datetime import datetime, timedelta, timezone
import jwt
from typing import Optional
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests

security = HTTPBearer()

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-super-secret-key-change-it-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

def verify_google_token(token: str) -> dict:
    """驗證 Google ID Token 並返回資訊 (如 email)"""
    try:
        # 如果未設定 GOOGLE_CLIENT_ID，允許跳過驗證 (僅供開發測試，生產環境必須驗證設定)
        if not GOOGLE_CLIENT_ID:
            print("Warning: GOOGLE_CLIENT_ID not set. Skipping audience verification.")
            idinfo = id_token.verify_oauth2_token(token, requests.Request())
        else:
            idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
            
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
            
        return idinfo
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role", "student")
        
        if role == "student":
            name: str = payload.get("name")
            if not name:
                raise HTTPException(status_code=401, detail="Student name not found in token")
            return {"name": name, "role": role}
        else:
            email: str = payload.get("email")
            if not email:
                raise HTTPException(status_code=401, detail="Email not found in token")
            return {"email": email, "role": role}
            
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
