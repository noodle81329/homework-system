@echo off
echo Starting Backend Server...
cd backend
uv run uvicorn main:app --reload
