from typing import Dict, Type
from .base_embedding import BaseEmbeddingProvider, EmbeddingProvider, EmbeddingResponse
from .openai_embedding import OpenAIEmbeddingProvider
from .voyage_embedding import VoyageEmbeddingProvider
from .cohere_embedding import CohereEmbeddingProvider
from .bge_embedding import BGEEmbeddingProvider
from src.core.config import settings


class EmbeddingProviderFactory:
    """Factory for creating embedding provider instances."""

    _providers: Dict[str, Type[BaseEmbeddingProvider]] = {
        EmbeddingProvider.OPENAI: OpenAIEmbeddingProvider,
        EmbeddingProvider.VOYAGE: VoyageEmbeddingProvider,
        EmbeddingProvider.COHERE: CohereEmbeddingProvider,
        EmbeddingProvider.BGE: BGEEmbeddingProvider,
    }

    @classmethod
    def create(cls, provider: str, api_key: str = None) -> BaseEmbeddingProvider:
        """
        Create an embedding provider instance.

        Args:
            provider: Provider name (openai, voyage, cohere, bge)
            api_key: API key for the provider. If None, will use key from settings.
                    Not required for BGE (local models).

        Returns:
            Instance of the requested provider

        Raises:
            ValueError: If provider is not supported
        """
        provider = provider.lower()

        if provider not in cls._providers:
            raise ValueError(
                f"Unsupported embedding provider: {provider}. "
                f"Available providers: {list(cls._providers.keys())}"
            )

        # Get API key from settings if not provided (except for BGE)
        if api_key is None and provider != EmbeddingProvider.BGE:
            api_key = cls._get_api_key_from_settings(provider)

        if not api_key and provider != EmbeddingProvider.BGE:
            raise ValueError(f"No API key found for provider: {provider}")

        provider_class = cls._providers[provider]
        return provider_class(api_key=api_key)

    @staticmethod
    def _get_api_key_from_settings(provider: str) -> str:
        """Get API key from settings based on provider name."""
        key_mapping = {
            EmbeddingProvider.OPENAI: settings.openai_api_key,
            EmbeddingProvider.VOYAGE: settings.voyage_api_key,
            EmbeddingProvider.COHERE: settings.cohere_api_key,
        }
        return key_mapping.get(provider)

    @classmethod
    def get_available_providers(cls) -> list[str]:
        """Return list of available provider names."""
        return list(cls._providers.keys())


def get_embedding_provider(provider: str, api_key: str = None) -> BaseEmbeddingProvider:
    """
    Convenience function to get an embedding provider instance.

    Args:
        provider: Provider name
        api_key: Optional API key (not required for BGE)

    Returns:
        Embedding provider instance
    """
    return EmbeddingProviderFactory.create(provider, api_key)


__all__ = [
    "BaseEmbeddingProvider",
    "EmbeddingProvider",
    "EmbeddingResponse",
    "OpenAIEmbeddingProvider",
    "VoyageEmbeddingProvider",
    "CohereEmbeddingProvider",
    "BGEEmbeddingProvider",
    "EmbeddingProviderFactory",
    "get_embedding_provider",
]
