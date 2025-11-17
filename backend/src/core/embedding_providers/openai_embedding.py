from typing import List, Union
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
import tiktoken

from .base_embedding import BaseEmbeddingProvider, EmbeddingResponse, EMBEDDING_PRICING, EMBEDDING_DIMENSIONS


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """OpenAI embedding provider implementation."""

    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.provider_name = "openai"
        self.client = AsyncOpenAI(api_key=api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def embed_texts(
        self,
        texts: Union[str, List[str]],
        model: str = "text-embedding-3-small",
        **kwargs
    ) -> EmbeddingResponse:
        """Generate embeddings using OpenAI API."""
        texts = self.normalize_texts(texts)

        try:
            response = await self.client.embeddings.create(
                input=texts,
                model=model,
                **kwargs
            )

            embeddings = [item.embedding for item in response.data]
            token_count = response.usage.total_tokens
            dimensions = self.get_dimensions(model)
            cost = self.calculate_cost(model, token_count)

            return EmbeddingResponse(
                embeddings=embeddings,
                model=model,
                provider=self.provider_name,
                dimensions=dimensions,
                token_count=token_count,
                cost_usd=cost,
                metadata={"response_id": response.model}
            )

        except Exception as e:
            raise Exception(f"OpenAI embedding error: {str(e)}")

    def get_available_models(self) -> List[str]:
        """Return list of available OpenAI embedding models."""
        return [
            "text-embedding-3-small",
            "text-embedding-3-large",
            "text-embedding-ada-002"
        ]

    def get_dimensions(self, model: str) -> int:
        """Return embedding dimensions for OpenAI model."""
        return EMBEDDING_DIMENSIONS[self.provider_name].get(model, 1536)

    def calculate_cost(self, model: str, token_count: int) -> float:
        """Calculate cost for OpenAI embedding request."""
        price_per_million = EMBEDDING_PRICING[self.provider_name].get(model, 0.020)
        return (token_count / 1_000_000) * price_per_million

    def count_tokens(self, text: str, model: str = "text-embedding-3-small") -> int:
        """Count tokens in text using tiktoken."""
        try:
            encoding = tiktoken.encoding_for_model(model)
            return len(encoding.encode(text))
        except:
            # Fallback to cl100k_base encoding
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
