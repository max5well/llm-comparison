from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from src.core.config import settings
from src.db.database import init_db
from src.api import auth, workspace

# Import additional API routers
from src.api import rag, evaluation, results


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    print(f"Starting {settings.app_name}...")
    print(f"Environment: {settings.env}")

    # Initialize database
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization error: {str(e)}")

    yield

    # Shutdown
    print(f"Shutting down {settings.app_name}...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="LLM Performance Comparison Platform for RAG Evaluation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.debug else "An error occurred"
        }
    )


# Include API routers
app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(rag.router)
app.include_router(evaluation.router)
app.include_router(results.router)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "environment": settings.env
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": time.time()
    }


@app.get("/info")
async def info():
    """Get API information and available endpoints."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "environment": settings.env,
        "features": {
            "llm_providers": ["openai", "anthropic", "mistral", "together"],
            "embedding_providers": ["openai", "voyage", "cohere", "bge"],
            "vector_store": "chromadb",
            "supported_file_types": settings.allowed_file_types.split(',')
        }
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
