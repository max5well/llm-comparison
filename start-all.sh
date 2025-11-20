#!/bin/bash

echo "🚀 Starting LLM Compare Platform"
echo "=================================="
echo ""

# Unset any placeholder API keys from the environment
# This ensures .env file values are used instead
unset OPENAI_API_KEY ANTHROPIC_API_KEY MISTRAL_API_KEY TOGETHER_API_KEY HUGGINGFACE_API_KEY VOYAGE_API_KEY COHERE_API_KEY

# Check if .env exists and has OpenAI key
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with your OpenAI API key"
    exit 1
fi

if grep -q "your_openai_key_here" .env; then
    echo "⚠️  WARNING: You need to add your OpenAI API key to .env file"
    echo ""
    echo "Edit .env and replace 'your_openai_key_here' with your actual key"
    echo ""
    read -p "Press Enter after you've added your API key, or Ctrl+C to cancel..."
fi

echo "🐳 Starting Docker services (PostgreSQL, Redis, Backend)..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check backend health
echo "🔍 Checking backend health..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

echo ""
echo "✅ All services started!"
echo ""
echo "=========================================="
echo "🌐 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:8000"
echo "📚 API Docs:  http://localhost:8000/docs"
echo "=========================================="
echo ""
echo "Frontend is already running. Open http://localhost:3000 to get started!"
echo ""
echo "To stop all services: docker-compose down"
