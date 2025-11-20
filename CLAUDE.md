# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM Performance Comparison Platform - A full-stack application for comparing LLM performance on RAG (Retrieval-Augmented Generation) tasks with automated evaluation using LLM-as-a-judge.

**Tech Stack:**
- Backend: Python 3.11 + FastAPI + SQLAlchemy
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Database: SQLite (development) / PostgreSQL (production)
- Vector Store: ChromaDB
- Cache: Redis (optional)

## Development Commands

### Backend

**Start backend (using system Python):**
```bash
cd backend
PYTHONPATH=/Users/maxwell/Projects/llm-compare/backend python3 src/main.py
# or use the script:
./start-backend-local.sh
```

**Install backend dependencies:**
```bash
python3 -m pip install --user fastapi uvicorn sqlalchemy python-dotenv pydantic openai anthropic chromadb
python3 -m pip install --user beautifulsoup4 pandas openpyxl lxml pypdf2 python-docx pdfplumber python-multipart
python3 -m pip install --user email-validator python-jose passlib bcrypt tiktoken
```

**Note:** This project uses system Python with `--user` flag instead of a virtual environment due to dependency conflicts with torch on Python 3.12.

### Frontend

**Start frontend:**
```bash
cd frontend
npm run dev
# or use the script:
./start-frontend.sh
```

**Install frontend dependencies:**
```bash
cd frontend
npm install
```

**Build frontend:**
```bash
cd frontend
npm run build
```

**Lint frontend:**
```bash
cd frontend
npm run lint
```

### Full Stack

**Start both services:**
```bash
./start-all.sh
```

**Services run on:**
- Backend API: http://localhost:8001
- Frontend: http://localhost:3000
- API Docs: http://localhost:8001/docs

## High-Level Architecture

### Data Flow: Document Processing → RAG → Evaluation

1. **Document Upload → Processing:**
   - User uploads file via `workspace.py::upload_document()`
   - Document record created with `processing_status='pending'`
   - Background task calls `rag.py::process_document()`:
     - Extract text via `document_extraction.py` (supports 30+ file types)
     - Chunk text using `chunking.py::TextChunker`
     - Generate embeddings via embedding providers
     - Store in ChromaDB with `rag_index.py::RAGIndex`
     - Update document status to `completed` or `failed`

2. **Dataset Creation:**
   - **Manual:** User adds questions one by one
   - **File Upload:** JSONL/CSV/JSON with questions
   - **AI Generation:**
     - Calls `evaluation.py::generate_synthetic_dataset()`
     - Background task fetches document chunks
     - Uses `synthetic_data.py::SyntheticDataGenerator` to create questions from content
     - Stores questions in `test_questions` table

3. **Evaluation Execution:**
   - User creates evaluation via `evaluation.py::create_evaluation()`
   - Background task loops through each question:
     - Queries RAG system via `rag_index.py::RAGIndex.query()`
     - Gets responses from each model in `models_to_test`
     - Sends to judge model via `llm_judge.py::LLMJudge`
     - Stores results in `model_results` and `judge_results`
   - Calculates metrics via `metrics.py::MetricsCalculator`

4. **Results Display:**
   - Frontend fetches from `results.py::get_summary_results()`
   - Shows aggregate metrics, charts, and detailed comparisons

### Key Architectural Patterns

**Background Task Pattern:**
- Document processing, question generation, and evaluations all run as FastAPI `BackgroundTasks`
- Frontend polls for status updates (e.g., checking `processing_status` or `evaluation.status`)
- Critical for long-running operations to avoid HTTP timeouts

**Provider Abstraction:**
- All LLM providers inherit from `BaseLLMProvider` in `llm_providers/__init__.py`
- All embedding providers inherit from `BaseEmbeddingProvider` in `embedding_providers/__init__.py`
- Factory pattern: `get_llm_provider()` and `get_embedding_provider()` instantiate correct class
- Makes adding new providers straightforward

**Database Schema Relationships:**
```
User → Workspace → Document → Chunk
            ↓
        TestDataset → TestQuestion
            ↓
        Evaluation → ModelResult → JudgeResult
```

**Frontend State Management:**
- No Redux/Zustand - uses React hooks and local state
- API client in `services/api.ts` wraps all backend calls
- Types defined in `types/index.ts` match backend Pydantic models

## Important Implementation Details

### Document Processing Error Handling
- All extraction methods in `document_extraction.py` must return meaningful error messages
- PDF extraction wraps each page in try-catch to handle partial failures
- Error messages stored in `Document.error_message` and displayed in UI
- Frontend shows error details in red alert boxes on WorkspaceDetail page

### File Type Support
- 30+ file types supported via `document_extraction.py`
- Key methods: `_extract_from_pdf()`, `_extract_from_docx()`, `_extract_from_html()`, etc.
- All extraction errors must bubble up with descriptive messages
- `is_supported_file()` checks against whitelist

### AI Question Generation with Polling
- Generation happens in background task and may take 10-20 seconds
- Frontend must poll `getDatasetQuestions()` API to fetch results
- Current implementation: polls every 1 second for up to 20 seconds
- Pattern: Create dataset → Poll for questions → Display in UI

### Smart Suggestions Based on Chunks
- Backend endpoint: `workspace.py::get_workspace_stats()`
- Returns `total_chunks`, `suggested_min_questions`, `suggested_max_questions`
- Formula: min = chunks/10, max = chunks/2
- Frontend fetches on mount and displays suggestion text

### Workspace Stats Calculation
- Stats calculated on-demand from completed documents
- Only counts documents with `processing_status='completed'`
- Used for smart suggestions and estimated time calculations

## Environment Configuration

**Backend `.env` requirements:**
```env
# At minimum, need OpenAI key for basic functionality
OPENAI_API_KEY=sk-...

# Database (SQLite for dev)
DATABASE_URL=sqlite:///./llm_compare.db

# Auth secrets
API_KEY_SECRET=any_random_string
JWT_SECRET_KEY=another_random_string

# Port (8001 to avoid conflicts)
PORT=8001

# File types (comma-separated, no spaces)
ALLOWED_FILE_TYPES=pdf,docx,txt,html,md,csv,xlsx,py,js,java,cpp,go,rs
```

**Frontend proxy configuration:**
- Vite proxies `/api/*` to `http://localhost:8001` (see `vite.config.ts`)
- This avoids CORS issues during development

## Common Gotchas

1. **Port 8000 vs 8001:** Backend uses 8001 to avoid conflicts. Ensure frontend proxy points to correct port.

2. **System Python with --user flag:** Due to torch dependency conflicts, this project uses system Python with `--user` installations instead of venv.

3. **Background tasks and polling:** AI generation and processing are async. Frontend must poll for completion.

4. **Error message field:** Must be included in all Document responses and displayed in UI.

5. **Context/Reference column:** Dataset questions have a `context` field for tracking source chunks. Must be visible in UI table.

6. **LLM_MODELS export:** Frontend types must export `LLM_MODELS` mapping for CreateDataset to work.

7. **Database migrations:** No Alembic yet. Schema changes require manual updates to both `models.py` and database.

## Debugging Tips

**Check backend logs:**
```bash
# Backend runs in foreground, logs to stdout
# Look for "Error processing document" or "Error generating synthetic questions"
```

**Check frontend browser console:**
```bash
# Open DevTools → Console
# Look for API errors or missing exports
```

**Verify API connectivity:**
```bash
curl http://localhost:8001/health
curl http://localhost:8001/info
```

**Check database:**
```bash
sqlite3 backend/llm_compare.db
.tables
SELECT * FROM documents WHERE processing_status='failed';
```

## Current Development Status

**Recently Completed:**
- ✅ Document error messages with detailed display
- ✅ Bulk "Process All Pending" button
- ✅ Context/Reference column in dataset creation
- ✅ AI question generation using actual document content (with polling)
- ✅ Smart suggestions for number of questions based on chunks

**In Progress:**
- 🔄 Estimated processing time for workspace creation
- 🔄 Homepage redesign with provider logos and file type icons

**Known Issues:**
- PDF extraction can fail silently if PDF is image-based or encrypted
- No tests currently exist
- Redis is configured but not required for basic functionality
