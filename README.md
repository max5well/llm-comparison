# LLM Performance Comparison Platform

A comprehensive platform for comparing LLM performance on RAG (Retrieval-Augmented Generation) tasks with automated evaluation using LLM-as-a-judge.

## Features

### Core Capabilities
- **Multi-LLM Support**: OpenAI, Anthropic, Mistral, Together AI
- **Multiple Embedding Providers**: OpenAI, Voyage AI, Cohere, BGE (local)
- **Vector Storage**: ChromaDB for fast similarity search
- **Document Processing**: PDF, DOCX, TXT support with intelligent chunking
- **Synthetic Test Generation**: Automatically generate evaluation questions from documents
- **LLM-as-a-Judge**: Automated comparison and scoring of model outputs
- **Comprehensive Metrics**: Latency, cost, quality, and detailed scoring across multiple criteria
- **Workspace Management**: Organize evaluations by project/use-case

### Tech Stack
- **Backend**: Python 3.11 + FastAPI
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Vector Store**: ChromaDB
- **Deployment**: Docker + Docker Compose

## Quick Start

### Prerequisites
- Docker and Docker Compose
- API keys for LLM providers (at least one):
  - OpenAI API key
  - Anthropic API key (optional)
  - Mistral API key (optional)
  - Together API key (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd llm-compare
```

2. Create `.env` file:
```bash
cp backend/.env.example .env
```

3. Edit `.env` and add your API keys:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
TOGETHER_API_KEY=...

# Database
POSTGRES_PASSWORD=secure_password_here

# Auth
API_KEY_SECRET=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_here
```

4. Start the services:
```bash
docker-compose up -d
```

5. The API will be available at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - Alternative docs: `http://localhost:8000/redoc`

### Local Development (without Docker)

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL and Redis locally, then update `.env` with connection strings.

4. Initialize the database:
```bash
python -c "from src.db.database import init_db; init_db()"
```

5. Run the application:
```bash
python src/main.py
# or
uvicorn src.main:app --reload
```

## Usage Guide

### 1. Create a User Account

```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

Response:
```json
{
  "user_id": "...",
  "email": "user@example.com",
  "api_key": "your-api-key-here",
  "message": "User created successfully..."
}
```

**Important**: Save your API key - it won't be shown again!

### 2. Create a Workspace

```bash
curl -X POST "http://localhost:8000/workspace/create?user_id=YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My RAG Project",
    "description": "Testing RAG performance",
    "embedding_model": "text-embedding-3-small",
    "embedding_provider": "openai",
    "chunk_size": 1000,
    "chunk_overlap": 200
  }'
```

### 3. Upload Documents

```bash
curl -X POST "http://localhost:8000/workspace/{workspace_id}/upload" \
  -F "file=@path/to/document.pdf"
```

### 4. Process Documents

```bash
curl -X POST "http://localhost:8000/rag/{document_id}/process"
```

This will:
- Extract text from the document
- Chunk the text intelligently
- Generate embeddings
- Store in vector database

### 5. Create Test Dataset

**Option A: Upload JSONL**
```bash
curl -X POST "http://localhost:8000/evaluation/dataset/{dataset_id}/upload-jsonl" \
  -F "file=@questions.jsonl"
```

Format: `{"question": "What is...", "expected_answer": "The answer is..."}`

**Option B: Generate Synthetic Questions**
```bash
curl -X POST "http://localhost:8000/evaluation/dataset/generate-synthetic" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "...",
    "dataset_name": "Auto-generated Questions",
    "num_questions_per_chunk": 2,
    "include_answers": true,
    "generation_model": "gpt-4o-mini",
    "generation_provider": "openai"
  }'
```

### 6. Run Evaluation

```bash
curl -X POST "http://localhost:8000/evaluation/create" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "...",
    "dataset_id": "...",
    "name": "GPT-4 vs Claude Comparison",
    "models_to_test": [
      {"model": "gpt-4o-mini", "provider": "openai"},
      {"model": "claude-3-5-haiku-20241022", "provider": "anthropic"}
    ],
    "judge_model": "gpt-4o-mini",
    "judge_provider": "openai"
  }'
```

### 7. Get Results

**Summary Results:**
```bash
curl "http://localhost:8000/results/{evaluation_id}/summary"
```

**Detailed Results:**
```bash
curl "http://localhost:8000/results/{evaluation_id}/detailed"
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Create user account
- `GET /auth/me` - Get user info

### Workspaces
- `POST /workspace/create` - Create workspace
- `GET /workspace/list` - List all workspaces
- `GET /workspace/{id}` - Get workspace details
- `DELETE /workspace/{id}` - Delete workspace
- `POST /workspace/{id}/upload` - Upload document
- `GET /workspace/{id}/documents` - List documents

### RAG
- `POST /rag/{document_id}/process` - Process document
- `POST /rag/query` - Query RAG system
- `GET /rag/document/{document_id}/chunks` - Get document chunks

### Evaluation
- `POST /evaluation/dataset/create` - Create test dataset
- `POST /evaluation/dataset/{id}/upload-jsonl` - Upload questions (JSONL)
- `POST /evaluation/dataset/{id}/upload-csv` - Upload questions (CSV)
- `POST /evaluation/dataset/generate-synthetic` - Generate synthetic questions
- `POST /evaluation/create` - Create and run evaluation
- `GET /evaluation/{id}` - Get evaluation status
- `GET /evaluation/workspace/{id}/datasets` - List datasets
- `GET /evaluation/workspace/{id}/evaluations` - List evaluations

### Results
- `GET /results/{evaluation_id}/summary` - Get summary metrics
- `GET /results/{evaluation_id}/detailed` - Get detailed results

## Metrics Tracked

### Performance Metrics
- **Latency**: Average, median, P95 response time
- **Cost**: Total and per-query cost in USD
- **Tokens**: Input/output token counts

### Quality Metrics (from LLM Judge)
- **Win Rate**: Percentage of times model won
- **Average Score**: Overall quality score (0-10)
- **Criteria Scores**:
  - Correctness
  - Relevance
  - Completeness
  - Clarity
  - Conciseness

### Error Metrics
- Error count and error rate

## Architecture

```
┌─────────────────────────────────────────────┐
│           FastAPI Backend                    │
│  ┌────────────────────────────────────────┐ │
│  │  Authentication & User Management      │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  Workspace & Document Management       │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  RAG Pipeline                          │ │
│  │  - Document extraction                 │ │
│  │  - Chunking                           │ │
│  │  - Embedding generation               │ │
│  │  - Vector search                      │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  Evaluation Engine                     │ │
│  │  - Test dataset management            │ │
│  │  - Multi-model comparison             │ │
│  │  - LLM-as-a-judge                     │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  Metrics & Analytics                   │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
           │            │            │
           ▼            ▼            ▼
    PostgreSQL     ChromaDB       Redis
```

## Project Structure

```
llm-compare/
├── backend/
│   ├── src/
│   │   ├── api/                    # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── workspace.py
│   │   │   ├── rag.py
│   │   │   ├── evaluation.py
│   │   │   └── results.py
│   │   ├── core/                   # Core business logic
│   │   │   ├── llm_providers/     # LLM integrations
│   │   │   ├── embedding_providers/ # Embedding integrations
│   │   │   ├── chunking.py        # Text chunking
│   │   │   ├── rag_index.py       # Vector storage
│   │   │   ├── synthetic_data.py  # Question generation
│   │   │   ├── llm_judge.py       # Evaluation logic
│   │   │   ├── metrics.py         # Metrics calculation
│   │   │   └── config.py          # Configuration
│   │   ├── db/                     # Database
│   │   │   ├── models.py
│   │   │   ├── queries.py
│   │   │   ├── database.py
│   │   │   └── schema.sql
│   │   ├── utils/                  # Utilities
│   │   │   ├── auth.py
│   │   │   └── document_extraction.py
│   │   └── main.py                # FastAPI app
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Advanced Configuration

### Custom Chunking Strategy

```python
from src.core.chunking import TextChunker

chunker = TextChunker(
    chunk_size=1500,
    chunk_overlap=300
)

# Use paragraph-based chunking
chunks = chunker.chunk_by_paragraphs(text)
```

### Custom Judge Prompt

Modify `src/core/llm_judge.py` to customize evaluation criteria.

### Adding New LLM Providers

1. Create provider class in `src/core/llm_providers/`
2. Inherit from `BaseLLMProvider`
3. Implement required methods
4. Register in `LLMProviderFactory`

## Troubleshooting

### Database Connection Issues
```bash
docker-compose logs postgres
```

### ChromaDB Persistence Issues
Ensure the volume is correctly mounted:
```bash
docker-compose down -v
docker-compose up -d
```

### API Key Errors
Verify your API keys in `.env` are correct and properly formatted.

### Memory Issues
For large documents, increase Docker memory:
```bash
# Docker Desktop: Settings -> Resources -> Memory
```

## Performance Tips

1. **Chunk Size**: Smaller chunks (500-800 tokens) for precise retrieval, larger (1000-1500) for context
2. **Embedding Models**:
   - Fast & cheap: `text-embedding-3-small`
   - High quality: `text-embedding-3-large`
   - Free (local): BGE models
3. **Judge Models**:
   - Fast: `gpt-4o-mini`, `claude-3-5-haiku`
   - Accurate: `gpt-4o`, `claude-3-5-sonnet`

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Email: support@example.com

## Roadmap

- [ ] Real-time evaluation streaming
- [ ] Support for more file types (HTML, Markdown, JSON)
- [ ] Custom evaluation metrics
- [ ] Multi-language support
- [ ] Integration with Langchain/LlamaIndex
- [ ] Web UI dashboard
- [ ] Batch evaluation API
- [ ] Export results to various formats

## Acknowledgments

Built with:
- FastAPI
- ChromaDB
- OpenAI
- Anthropic
- PostgreSQL
- Redis
