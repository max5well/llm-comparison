from typing import List, Union
import cohere
from tenacity import retry, stop_after_attempt, wait_exponential

from .base_embedding import BaseEmbeddingProvider, EmbeddingResponse, EMBEDDING_PRICING, EMBEDDING_DIMENSIONS


class CohereEmbeddingProvider(BaseEmbeddingProvider):
    """Cohere embedding provider implementation."""

    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.provider_name = "cohere"
        self.client = cohere.AsyncClient(api_key=api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def embed_texts(
        self,
        texts: Union[str, List[str]],
        model: str = "embed-english-v3.0",
        input_type: str = "search_document",
        **kwargs
    ) -> EmbeddingResponse:
        """Generate embeddings using Cohere API."""
        texts = self.normalize_texts(texts)

        try:
            response = await self.client.embed(
                texts=texts,
                model=model,
                input_type=input_type,  # 'search_document', 'search_query', 'classification', 'clustering'
                **kwargs
            )

            embeddings = [list(emb) for emb in response.embeddings]
            dimensions = self.get_dimensions(model)

            # Estimate token count (Cohere doesn't always provide this)
            estimated_tokens = sum(len(text.split()) * 1.3 for text in texts)
            token_count = int(estimated_tokens)

            cost = self.calculate_cost(model, token_count)

            return EmbeddingResponse(
                embeddings=embeddings,
                model=model,
                provider=self.provider_name,
                dimensions=dimensions,
                token_count=token_count,
                cost_usd=cost,
                metadata={"input_type": input_type}
            )

        except Exception as e:
            raise Exception(f"Cohere embedding error: {str(e)}")

    def get_available_models(self) -> List[str]:
        """Return list of available Cohere embedding models."""
        return [
            "embed-english-v3.0",
            "embed-multilingual-v3.0",
            "embed-english-light-v3.0",
            "embed-multilingual-light-v3.0"
        ]

    def get_dimensions(self, model: str) -> int:
        """Return embedding dimensions for Cohere model."""
        return EMBEDDING_DIMENSIONS[self.provider_name].get(model, 1024)

    def calculate_cost(self, model: str, token_count: int) -> float:
        """Calculate cost for Cohere embedding request."""
        price_per_million = EMBEDDING_PRICING[self.provider_name].get(model, 0.100)
        return (token_count / 1_000_000) * price_per_million
