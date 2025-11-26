from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server Configuration
    app_name: str = "LLM Compare Platform"
    env: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    # Database Configuration
    database_url: str
    db_echo: bool = False

    # Redis Configuration
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 3600

    # Vector Store Configuration
    chroma_persist_directory: str = "./data/chroma"
    chroma_collection_name: str = "rag_documents"

    # API Keys for LLM Providers
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    anthropic_base_url: Optional[str] = None  # Support for custom Anthropic endpoints
    mistral_api_key: Optional[str] = None
    together_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None

    # Embedding Provider Keys
    voyage_api_key: Optional[str] = None
    cohere_api_key: Optional[str] = None

    # Authentication
    api_key_secret: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Google OAuth & Drive Integration
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: str = "http://localhost:3000/auth/google/callback"

    # Default Settings
    default_chunk_size: int = 1000
    default_chunk_overlap: int = 200
    default_top_k_retrieval: int = 5
    default_llm_temperature: float = 0.7
    default_max_tokens: int = 2000

    # Judge Model Configuration
    default_judge_model: str = "gpt-4o-mini"
    default_judge_provider: str = "openai"

    # Rate Limiting
    rate_limit_requests_per_minute: int = 60

    # File Upload
    max_upload_size_mb: int = 50
    allowed_file_types: str = "pdf,docx,doc,txt,md,markdown,text,html,htm,csv,xlsx,xls,json,pptx,ppt,rtf,odt,py,js,ts,tsx,jsx,java,cpp,c,h,cs,go,rb,php,swift,kt,rs,sql,sh,bash,yaml,yml,xml,css,scss,less"

    # Logging
    log_level: str = "INFO"
    log_file: str = "./logs/app.log"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
