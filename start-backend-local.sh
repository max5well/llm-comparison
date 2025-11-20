#!/bin/bash

echo "🚀 Starting Backend Locally (without Docker)"
echo "=============================================="
echo ""

# Unset any placeholder API keys from the environment
# This ensures .env file values are used instead
unset OPENAI_API_KEY ANTHROPIC_API_KEY MISTRAL_API_KEY TOGETHER_API_KEY HUGGINGFACE_API_KEY VOYAGE_API_KEY COHERE_API_KEY

cd backend

# Check if API keys are set
if grep -q "your_openai_key_here" .env; then
    echo "⚠️  Please add your OpenAI API key to backend/.env"
    echo ""
    echo "Edit backend/.env and replace:"
    echo "  OPENAI_API_KEY=your_openai_key_here"
    echo "with your actual key"
    echo ""
    read -p "Press Enter after editing, or Ctrl+C to cancel..."
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -q -r requirements.txt

# Create necessary directories
mkdir -p data/chroma data/uploads logs

# Initialize database
echo "🗄️  Initializing database..."
python3 -c "from src.db.database import init_db; init_db()" 2>/dev/null || echo "Database already initialized"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Starting backend server on http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================================"
echo ""

# Start the server
python3 src/main.py
