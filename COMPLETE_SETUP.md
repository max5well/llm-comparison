# 🎯 Complete Setup - Frontend + Backend

## Current Status

✅ **Frontend**: Already running at http://localhost:3000
✅ **Project Structure**: Both frontend and backend ready
✅ **Environment File**: Created with defaults
⏳ **Backend Services**: Need to start

---

## Quick Start (2 Steps)

### Step 1: Add Your OpenAI API Key

Edit the `.env` file and add your OpenAI API key:

```bash
# Open in your editor
nano .env

# Or use VS Code
code .env

# Or vim
vim .env
```

Replace this line:
```env
OPENAI_API_KEY=your_openai_key_here
```

With your actual key:
```env
OPENAI_API_KEY=sk-proj-abc123xyz...
```

Save and close the file.

### Step 2: Start Backend Services

```bash
./start-all.sh
```

This will:
- Start PostgreSQL database
- Start Redis cache
- Build and start the backend API
- Show you the URLs when ready

---

## That's It! 🎉

Once the script finishes, you'll have:

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:3000 | ✅ Running |
| Backend API | http://localhost:8000 | ✅ Starting |
| API Docs | http://localhost:8000/docs | ✅ Starting |
| PostgreSQL | localhost:5432 | ✅ Starting |
| Redis | localhost:6379 | ✅ Starting |

---

## First-Time Usage

1. **Open** http://localhost:3000
2. **Sign up** with your email
3. **Copy your API key** (you won't see it again!)
4. **Create a workspace**
5. **Upload a document** (PDF, DOCX, or TXT)
6. **Process the document**
7. **Create an evaluation** comparing models
8. **View results** with beautiful charts!

---

## Alternative: Manual Docker Commands

If the script doesn't work, use these commands:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Check service status
docker-compose ps

# Stop all services
docker-compose down

# Restart just the backend
docker-compose restart backend
```

---

## Troubleshooting

### Backend not starting?

Check the logs:
```bash
docker-compose logs backend
```

Common issues:
- **Missing API key**: Add OPENAI_API_KEY to .env
- **Port conflict**: Something using port 8000
  ```bash
  # Find and kill the process
  lsof -i :8000
  kill -9 <PID>
  ```

### Database errors?

Reset the database:
```bash
docker-compose down -v
docker-compose up -d
```

### Frontend can't connect?

1. Check backend is running: http://localhost:8000/health
2. Check browser console for errors
3. Verify no CORS errors

### Docker not installed?

Install Docker Desktop:
- macOS: https://docs.docker.com/desktop/install/mac-install/
- Or use Homebrew: `brew install --cask docker`

---

## Project Structure

```
llm-compare/
├── frontend/              ← React TypeScript app (port 3000)
│   ├── src/
│   │   ├── pages/        ← All UI pages
│   │   ├── components/   ← Reusable components
│   │   └── services/     ← API client
│   └── package.json
│
├── backend/              ← Python FastAPI (port 8000)
│   ├── src/
│   │   ├── api/         ← API endpoints
│   │   ├── core/        ← Business logic
│   │   └── db/          ← Database models
│   └── requirements.txt
│
├── docker-compose.yml    ← All services orchestration
├── .env                  ← Your configuration
└── start-all.sh         ← One-command startup
```

---

## Development Workflow

### Starting Development

```bash
# Terminal 1: Frontend (already running)
cd frontend && npm run dev

# Terminal 2: Backend
./start-all.sh
# or for just backend:
docker-compose up -d
```

### Making Changes

**Frontend changes**: Hot-reload automatically
**Backend changes**: Restart backend container
```bash
docker-compose restart backend
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just database
docker-compose logs -f postgres
```

### Stopping Everything

```bash
# Stop containers (keep data)
docker-compose down

# Stop and remove all data
docker-compose down -v
```

---

## Testing the Application

### Quick Test Flow

1. **Sign Up**
   - Email: test@example.com
   - Save the API key shown

2. **Create Workspace**
   - Name: "Test Workspace"
   - Provider: OpenAI
   - Model: text-embedding-3-small
   - Chunk size: 1000

3. **Upload Document**
   - Any PDF, DOCX, or TXT file
   - Click "Process" after upload
   - Wait for status: "completed"

4. **Create Evaluation**
   - Models: gpt-4o-mini, gpt-3.5-turbo
   - Judge: gpt-4o-mini
   - Run evaluation

5. **View Results**
   - See win rates, costs, latency
   - Interactive charts
   - Detailed comparisons

---

## Environment Variables Reference

### Required
- `OPENAI_API_KEY` - At minimum this one

### Optional LLM Providers
- `ANTHROPIC_API_KEY` - For Claude models
- `MISTRAL_API_KEY` - For Mistral models
- `TOGETHER_API_KEY` - For Together AI models

### Optional Embedding Providers
- `VOYAGE_API_KEY` - Voyage AI embeddings
- `COHERE_API_KEY` - Cohere embeddings

### Auto-configured
- `POSTGRES_PASSWORD` - Database password
- `API_KEY_SECRET` - API key encryption
- `JWT_SECRET_KEY` - JWT tokens

---

## API Documentation

Once backend is running, explore the API:

**Swagger UI**: http://localhost:8000/docs
- Interactive API testing
- Try all endpoints
- See request/response schemas

**ReDoc**: http://localhost:8000/redoc
- Clean documentation
- Better for reading

---

## Production Deployment

### Frontend
```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel, Netlify, etc.
```

### Backend
```bash
# Update .env for production
ENV=production
DEBUG=False

# Use docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## Support

- **Documentation**: See all .md files in root
- **API Issues**: Check http://localhost:8000/docs
- **Frontend Issues**: Check browser console
- **Logs**: `docker-compose logs -f`

---

## Summary Checklist

- [ ] Edit `.env` with OpenAI API key
- [ ] Run `./start-all.sh`
- [ ] Open http://localhost:3000
- [ ] Sign up and save API key
- [ ] Create first workspace
- [ ] Upload and process document
- [ ] Run evaluation
- [ ] View results!

**You're all set! 🚀**
