# Getting Started with LLM Compare

## Overview

You now have a complete full-stack application for comparing LLM performance on RAG tasks:

- **Backend**: Python FastAPI server with PostgreSQL, Redis, and ChromaDB
- **Frontend**: Modern React TypeScript SPA with Tailwind CSS

## Quick Start

### Step 1: Start the Backend

Using Docker (Recommended):
```bash
docker-compose up -d
```

Or locally:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
```

Backend will be available at: http://localhost:8000

### Step 2: Start the Frontend

**Easy way** (using the provided script):
```bash
./start-frontend.sh
```

**Manual way**:
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: http://localhost:3000

## First Time Setup

### 1. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
TOGETHER_API_KEY=...

# Embedding Provider API Keys (optional)
VOYAGE_API_KEY=...
COHERE_API_KEY=...

# Database
POSTGRES_PASSWORD=secure_password_here
DATABASE_URL=postgresql://postgres:secure_password_here@localhost:5432/llm_compare

# Redis
REDIS_URL=redis://localhost:6379

# Auth
API_KEY_SECRET=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_here

# ChromaDB
CHROMA_PERSIST_DIRECTORY=./data/chroma
```

### 2. Initialize the Database

If using Docker, this happens automatically.

If running locally:
```bash
cd backend
python -c "from src.db.database import init_db; init_db()"
```

### 3. Access the Application

Open your browser to http://localhost:3000 and:

1. **Sign up** with your email
2. **Save your API key** (you won't see it again!)
3. **Create a workspace**
4. **Upload documents**
5. **Run evaluations**
6. **View results**

## Complete Workflow Example

### 1. Create a Workspace
```
Name: Customer Support RAG
Description: Testing models for customer support responses
Embedding Provider: OpenAI
Embedding Model: text-embedding-3-small
Chunk Size: 1000
Chunk Overlap: 200
```

### 2. Upload Documents
- Upload your knowledge base documents (PDF, DOCX, TXT)
- Click "Process" to generate embeddings
- Wait for status to change to "completed"

### 3. Create Test Dataset

**Option A**: Upload JSONL file
```jsonl
{"question": "How do I reset my password?", "expected_answer": "Go to settings..."}
{"question": "What are the pricing plans?", "expected_answer": "We offer..."}
```

**Option B**: Generate synthetic questions (backend API)
```bash
curl -X POST "http://localhost:8000/evaluation/dataset/generate-synthetic" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "your-workspace-id",
    "dataset_name": "Auto-generated Questions",
    "num_questions_per_chunk": 2,
    "include_answers": true,
    "generation_model": "gpt-4o-mini",
    "generation_provider": "openai"
  }'
```

### 4. Create Evaluation
```
Name: GPT-4 vs Claude 3.5 Comparison
Dataset: Select your test dataset
Models to Test:
  - OpenAI: gpt-4o-mini
  - Anthropic: claude-3-5-haiku-20241022
Judge Model: OpenAI: gpt-4o-mini
```

### 5. View Results
- See win rates, quality scores, latency, and costs
- Explore interactive charts
- Drill down into individual questions
- Compare model responses side-by-side

## Troubleshooting

### Frontend won't install
See [FRONTEND_SETUP.md](FRONTEND_SETUP.md) for detailed troubleshooting.

Quick fixes:
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Clean cache
npm cache clean --force

# Or use yarn
npm install -g yarn
cd frontend && yarn install && yarn dev
```

### Backend connection errors
1. Check backend is running: http://localhost:8000/health
2. Verify CORS settings in `backend/src/main.py`
3. Check browser console for errors
4. Ensure `.env` file exists with correct values

### Database errors
```bash
# Reset database (Docker)
docker-compose down -v
docker-compose up -d

# Or locally
dropdb llm_compare
createdb llm_compare
python -c "from src.db.database import init_db; init_db()"
```

### Document processing stuck
1. Check ChromaDB is running
2. Verify embedding provider API key
3. Check backend logs: `docker-compose logs backend`
4. Ensure document file is not corrupted

## API Documentation

Once backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         React Frontend (Port 3000)          │
│  - Workspace Management                     │
│  - Document Upload                          │
│  - Evaluation Creation                      │
│  - Results Visualization                    │
└─────────────────┬───────────────────────────┘
                  │
                  │ HTTP/REST API
                  │
┌─────────────────▼───────────────────────────┐
│       FastAPI Backend (Port 8000)           │
│  - Authentication                           │
│  - RAG Pipeline                             │
│  - LLM Integration                          │
│  - Evaluation Engine                        │
└─────┬──────┬────────┬────────┬──────────────┘
      │      │        │        │
      ▼      ▼        ▼        ▼
   PostgreSQL Redis ChromaDB  LLM APIs
```

## Project Structure

```
llm-compare/
├── backend/                # Python FastAPI backend
│   ├── src/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Business logic
│   │   ├── db/            # Database models
│   │   └── utils/         # Utilities
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/              # React TypeScript frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── types/         # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml     # Docker services
├── .env                   # Environment variables
└── README.md
```

## Feature Checklist

### Core Features
- [x] User authentication with API keys
- [x] Workspace management
- [x] Document upload and processing
- [x] Multiple embedding providers
- [x] Test dataset management
- [x] Multi-model evaluation
- [x] LLM-as-a-judge scoring
- [x] Comprehensive metrics tracking
- [x] Results visualization
- [x] Responsive web UI

### Supported Providers
- [x] OpenAI (GPT-4, GPT-3.5)
- [x] Anthropic (Claude 3.5)
- [x] Mistral
- [x] Together AI

### Embedding Providers
- [x] OpenAI embeddings
- [x] Voyage AI
- [x] Cohere
- [x] BGE (local)

## Next Steps

### Immediate
1. ✅ Start backend and frontend
2. ✅ Create your first workspace
3. ✅ Upload test documents
4. ✅ Run your first evaluation

### Short Term
- Add more test datasets
- Try different embedding models
- Compare more LLM providers
- Experiment with chunk sizes
- Analyze cost vs quality tradeoffs

### Medium Term
- Customize evaluation criteria
- Add custom judge prompts
- Integrate with your own data sources
- Set up automated evaluations
- Export results for reporting

### Long Term
- Deploy to production
- Scale to multiple users
- Add real-time streaming
- Implement custom metrics
- Build evaluation workflows

## Support & Resources

- **Documentation**: See README.md and other docs
- **API Reference**: http://localhost:8000/docs
- **Issues**: Create GitHub issues for bugs
- **Frontend Guide**: FRONTEND_OVERVIEW.md
- **Setup Help**: FRONTEND_SETUP.md

## Best Practices

### Document Processing
- Use 500-800 token chunks for precise retrieval
- Use 1000-1500 token chunks for more context
- Set overlap to 10-20% of chunk size
- Process documents before creating evaluations

### Evaluation Setup
- Start with small test datasets (5-10 questions)
- Use cheaper models first (gpt-4o-mini)
- Then compare with premium models
- Use same provider for judge initially

### Cost Management
- Monitor token usage in results
- Start with mini/small models
- Use cheaper judge models for development
- Track costs per evaluation

### Quality Improvement
- Review detailed results for insights
- Check which questions models fail on
- Adjust chunk size based on retrieval quality
- Iterate on embedding provider choice

## Common Workflows

### Development Workflow
1. Upload small test document
2. Create 5-question dataset
3. Run evaluation with 2 models
4. Review results
5. Iterate on configuration

### Production Workflow
1. Upload full knowledge base
2. Generate synthetic dataset (50+ questions)
3. Run comprehensive evaluation
4. Analyze detailed metrics
5. Choose best model
6. Deploy to production

### Comparison Workflow
1. Same workspace, same documents
2. Create multiple evaluations
3. Vary only one parameter (model, chunk size, etc.)
4. Compare results side-by-side
5. Identify optimal configuration

## Tips for Success

1. **Start Simple**: Begin with one document and a few questions
2. **Iterate Quickly**: Use mini models for fast feedback
3. **Monitor Costs**: Check cost metrics before scaling
4. **Review Failures**: Learn from questions where models fail
5. **Document Findings**: Keep notes on what works
6. **Automate**: Build workflows once you find what works

Enjoy comparing LLMs! 🚀
