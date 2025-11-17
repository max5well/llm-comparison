from abc import ABC, abstractmethod
from typing import List, Union
from dataclasses import dataclass
from enum import Enum
import numpy as np


class EmbeddingProvider(str, Enum):
    OPENAI = "openai"
    VOYAGE = "voyage"
    COHERE = "cohere"
    BGE = "bge"


@dataclass
class EmbeddingResponse:
    """Standard response format for embedding providers."""
    embeddings: List[List[float]]  # List of embedding vectors
    model: str
    provider: str
    dimensions: int
    token_count: int
    cost_usd: float
    metadata: dict = None


class BaseEmbeddingProvider(ABC):
    """Base class for all embedding providers."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.provider_name = None

    @abstractmethod
    async def embed_texts(
        self,
        texts: Union[str, List[str]],
        model: str = None,
        **kwargs
    ) -> EmbeddingResponse:
        """
        Generate embeddings for one or more texts.

        Args:
            texts: Single text or list of texts to embed
            model: Model identifier (provider-specific)
            **kwargs: Additional provider-specific parameters

        Returns:
            EmbeddingResponse object with embedding vectors
        """
        pass

    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Return list of available models for this provider."""
        pass

    @abstractmethod
    def get_dimensions(self, model: str) -> int:
        """Return embedding dimensions for a given model."""
        pass

    @abstractmethod
    def calculate_cost(self, model: str, token_count: int) -> float:
        """Calculate cost in USD for embedding request."""
        pass

    def normalize_texts(self, texts: Union[str, List[str]]) -> List[str]:
        """Ensure texts is always a list."""
        if isinstance(texts, str):
            return [texts]
        return texts


# Embedding pricing data (as of January 2025, in USD per 1M tokens)
EMBEDDING_PRICING = {
    "openai": {
        "text-embedding-3-small": 0.020,
        "text-embedding-3-large": 0.130,
        "text-embedding-ada-002": 0.100,
    },
    "voyage": {
        "voyage-large-2": 0.120,
        "voyage-code-2": 0.120,
        "voyage-2": 0.100,
        "voyage-lite-02-instruct": 0.040,
    },
    "cohere": {
        "embed-english-v3.0": 0.100,
        "embed-multilingual-v3.0": 0.100,
        "embed-english-light-v3.0": 0.020,
        "embed-multilingual-light-v3.0": 0.020,
    },
    "bge": {
        # BGE models are open source, no API costs
        "BAAI/bge-large-en-v1.5": 0.0,
        "BAAI/bge-base-en-v1.5": 0.0,
        "BAAI/bge-small-en-v1.5": 0.0,
    }
}

# Model dimensions
EMBEDDING_DIMENSIONS = {
    "openai": {
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
        "text-embedding-ada-002": 1536,
    },
    "voyage": {
        "voyage-large-2": 1536,
        "voyage-code-2": 1536,
        "voyage-2": 1024,
        "voyage-lite-02-instruct": 1024,
    },
    "cohere": {
        "embed-english-v3.0": 1024,
        "embed-multilingual-v3.0": 1024,
        "embed-english-light-v3.0": 384,
        "embed-multilingual-light-v3.0": 384,
    },
    "bge": {
        "BAAI/bge-large-en-v1.5": 1024,
        "BAAI/bge-base-en-v1.5": 768,
        "BAAI/bge-small-en-v1.5": 384,
    }
}
