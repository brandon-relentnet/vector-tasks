#!/bin/bash

# Kill any existing processes on ports 3000 and 8000
fuser -k 3000/tcp
fuser -k 8000/tcp

# Start FastAPI Backend
echo "Starting FastAPI Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000 &

# Start Vite Frontend
echo "Starting Vite Frontend..."
cd ..
npm run dev
