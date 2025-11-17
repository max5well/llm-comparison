from typing import List, Union
import asyncio
from functools import partial

from .base_embedding import BaseEmbeddingProvider, EmbeddingResponse, EMBEDDING_PRICING, EMBEDDING_DIMENSIONS


class BGEEmbeddingProvider(BaseEmbeddingProvider):
    """BGE (BAAI General Embedding) local model provider implementation."""

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.provider_name = "bge"
        self.model_cache = {}

    def _load_model(self, model: str):
        """Load BGE model using sentence-transformers."""
        if model in self.model_cache:
            return self.model_cache[model]

        try:
            from sentence_transformers import SentenceTransformer
            model_instance = SentenceTransformer(model)
            self.model_cache[model] = model_instance
            return model_instance
        except ImportError:
            raise ImportError(
                "sentence-transformers is required for BGE models. "
                "Install it with: pip install sentence-transformers"
            )

    async def embed_texts(
        self,
        texts: Union[str, List[str]],
        model: str = "BAAI/bge-base-en-v1.5",
        **kwargs
    ) -> EmbeddingResponse:
        """Generate embeddings using local BGE model."""
        texts = self.normalize_texts(texts)

        try:
            # Load model
            model_instance = self._load_model(model)

            # Run embedding in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            encode_func = partial(
                model_instance.encode,
                texts,
                normalize_embeddings=True,
                **kwargs
            )
            embeddings_array = await loop.run_in_executor(None, encode_func)

            # Convert numpy array to list
            embeddings = embeddings_array.tolist()

            dimensions = self.get_dimensions(model)

            # Estimate token count for local models
            estimated_tokens = sum(len(text.split()) * 1.3 for text in texts)
            token_count = int(estimated_tokens)

            cost = self.calculate_cost(model, token_count)  # Always 0 for local models

            return EmbeddingResponse(
                embeddings=embeddings,
                model=model,
                provider=self.provider_name,
                dimensions=dimensions,
                token_count=token_count,
                cost_usd=cost,
                metadata={"local_model": True}
            )

        except Exception as e:
            raise Exception(f"BGE embedding error: {str(e)}")

    def get_available_models(self) -> List[str]:
        """Return list of available BGE embedding models."""
        return [
            "BAAI/bge-large-en-v1.5",
            "BAAI/bge-base-en-v1.5",
            "BAAI/bge-small-en-v1.5"
        ]

    def get_dimensions(self, model: str) -> int:
        """Return embedding dimensions for BGE model."""
        return EMBEDDING_DIMENSIONS[self.provider_name].get(model, 768)

    def calculate_cost(self, model: str, token_count: int) -> float:
        """Calculate cost for BGE embedding request (always 0 for local models)."""
        return 0.0
