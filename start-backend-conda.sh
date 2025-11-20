#!/bin/bash

echo "🚀 Starting Backend with Conda"
echo "==============================="
echo ""

# Unset any placeholder API keys from the environment
# This ensures .env file values are used instead
unset OPENAI_API_KEY ANTHROPIC_API_KEY MISTRAL_API_KEY TOGETHER_API_KEY HUGGINGFACE_API_KEY VOYAGE_API_KEY COHERE_API_KEY

cd backend

# Create conda environment if it doesn't exist
if ! conda env list | grep -q "llm-compare"; then
    echo "📦 Creating conda environment..."
    conda create -y -n llm-compare python=3.11
fi

# Activate conda environment
echo "🔄 Activating conda environment..."
eval "$(conda shell.bash hook)"
conda activate llm-compare

# Install core dependencies
echo "📥 Installing dependencies..."
pip install fastapi uvicorn python-multipart sqlalchemy python-dotenv pydantic pydantic-settings openai anthropic chromadb pypdf2 python-docx pdfplumber python-jose passlib bcrypt tiktoken -q

# Create necessary directories
mkdir -p data/chroma data/uploads logs

# Initialize database
echo "🗄️  Initializing database..."
python3 -c "from src.db.database import init_db; init_db()" 2>/dev/null || echo "Database initialization (will init on first run)"

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
