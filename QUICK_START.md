# Quick Start Guide

## ✅ Frontend is Running!

Your frontend is successfully running at: **http://localhost:3000**

## ⚠️ Backend Setup Needed

To use the full application, you need to start the backend. Here are your options:

### Option 1: Using Docker (Recommended)

```bash
# Make sure you have a .env file with your API keys
docker-compose up -d
```

### Option 2: Local Development

```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with your API keys (see below)
# Then start the server:
python src/main.py
```

## Required Environment Variables

Create a `.env` file in the root directory:

```env
# Required - At least one LLM provider
OPENAI_API_KEY=sk-...

# Optional - Additional providers
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
TOGETHER_API_KEY=...

# Optional - Embedding providers
VOYAGE_API_KEY=...
COHERE_API_KEY=...

# Database (for Docker)
POSTGRES_PASSWORD=your_secure_password

# Database (for local)
DATABASE_URL=postgresql://postgres:password@localhost:5432/llm_compare

# Redis (for local)
REDIS_URL=redis://localhost:6379

# Auth secrets
API_KEY_SECRET=your_random_secret_key_here
JWT_SECRET_KEY=your_random_jwt_secret_here

# ChromaDB
CHROMA_PERSIST_DIRECTORY=./data/chroma
```

## Quick Test Without Backend

While setting up the backend, you can explore the frontend:

1. **Open browser**: http://localhost:3000
2. **Sign up page**: You'll see the login/signup interface
3. **UI Components**: View the modern design and responsive layout

Note: API calls will fail until the backend is running, but you can see the interface!

## Full Application Flow

Once both frontend and backend are running:

1. **Visit** http://localhost:3000
2. **Sign up** with your email
3. **Save your API key** (shown only once!)
4. **Create a workspace**
5. **Upload documents** (PDF, DOCX, TXT)
6. **Process documents** to generate embeddings
7. **Create evaluations** comparing different LLMs
8. **View results** with interactive charts

## Verify Backend is Running

Once you start the backend, verify it's working:

```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": 1234567890
}
```

## Stopping the Servers

### Stop Frontend
Press `Ctrl + C` in the terminal where `npm run dev` is running

### Stop Backend (Docker)
```bash
docker-compose down
```

### Stop Backend (Local)
Press `Ctrl + C` in the terminal where Python is running

## Current Status

✅ **Frontend**: Running on http://localhost:3000
⏳ **Backend**: Not yet started

## Next Steps

1. Set up your `.env` file with at least `OPENAI_API_KEY`
2. Start the backend using Docker or locally
3. Refresh http://localhost:3000
4. Start testing the full application!

## Need Help?

- **Frontend issues**: See `FRONTEND_SETUP.md`
- **Backend issues**: See main `README.md`
- **Complete guide**: See `GETTING_STARTED.md`
- **API docs**: http://localhost:8000/docs (once backend is running)
