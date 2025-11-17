from typing import List, Union
import voyageai
from tenacity import retry, stop_after_attempt, wait_exponential

from .base_embedding import BaseEmbeddingProvider, EmbeddingResponse, EMBEDDING_PRICING, EMBEDDING_DIMENSIONS


class VoyageEmbeddingProvider(BaseEmbeddingProvider):
    """Voyage AI embedding provider implementation."""

    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.provider_name = "voyage"
        self.client = voyageai.AsyncClient(api_key=api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def embed_texts(
        self,
        texts: Union[str, List[str]],
        model: str = "voyage-2",
        **kwargs
    ) -> EmbeddingResponse:
        """Generate embeddings using Voyage AI API."""
        texts = self.normalize_texts(texts)

        try:
            response = await self.client.embed(
                texts=texts,
                model=model,
                **kwargs
            )

            embeddings = response.embeddings
            token_count = response.total_tokens
            dimensions = self.get_dimensions(model)
            cost = self.calculate_cost(model, token_count)

            return EmbeddingResponse(
                embeddings=embeddings,
                model=model,
                provider=self.provider_name,
                dimensions=dimensions,
                token_count=token_count,
                cost_usd=cost
            )

        except Exception as e:
            raise Exception(f"Voyage embedding error: {str(e)}")

    def get_available_models(self) -> List[str]:
        """Return list of available Voyage embedding models."""
        return [
            "voyage-large-2",
            "voyage-code-2",
            "voyage-2",
            "voyage-lite-02-instruct"
        ]

    def get_dimensions(self, model: str) -> int:
        """Return embedding dimensions for Voyage model."""
        return EMBEDDING_DIMENSIONS[self.provider_name].get(model, 1024)

    def calculate_cost(self, model: str, token_count: int) -> float:
        """Calculate cost for Voyage embedding request."""
        price_per_million = EMBEDDING_PRICING[self.provider_name].get(model, 0.100)
        return (token_count / 1_000_000) * price_per_million
