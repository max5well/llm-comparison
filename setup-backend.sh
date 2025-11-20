#!/bin/bash

echo "🚀 LLM Compare Backend Setup"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating .env file from example..."
    cp backend/.env.example backend/.env
    echo "⚠️  IMPORTANT: Edit backend/.env and add your API keys!"
    echo ""
    echo "Required keys:"
    echo "  - OPENAI_API_KEY (at minimum)"
    echo "  - DATABASE_URL"
    echo "  - API_KEY_SECRET"
    echo "  - JWT_SECRET_KEY"
    echo ""
    read -p "Press Enter after you've edited backend/.env..."
fi

# Check if venv exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate

    echo "📥 Installing dependencies..."
    pip install -r requirements.txt

    cd ..
else
    echo "✅ Virtual environment already exists"
fi

# Check if port 8000 is in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8000 is already in use"
    echo ""
    echo "Options:"
    echo "1. Kill the process using port 8000 and use that port"
    echo "2. Run backend on port 8001 instead"
    echo ""
    read -p "Choose option (1 or 2): " choice

    if [ "$choice" = "1" ]; then
        PID=$(lsof -Pi :8000 -sTCP:LISTEN -t)
        echo "Killing process $PID..."
        kill -9 $PID
        export PORT=8000
    else
        export PORT=8001
        echo "🔄 Backend will run on port $PORT"
        echo "⚠️  You'll need to update frontend proxy in vite.config.ts"
    fi
else
    export PORT=8000
fi

echo ""
echo "🎯 Starting backend on port $PORT..."
echo ""

cd backend
source venv/bin/activate
PORT=$PORT python src/main.py
