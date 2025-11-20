from typing import Dict, Type
from .base_provider import BaseLLMProvider, LLMProvider, LLMResponse, LLMMessage
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .huggingface_provider import HuggingFaceProvider
# Temporarily disabled - uncomment when you have API keys
# from .mistral_provider import MistralProvider
# from .together_provider import TogetherProvider
from src.core.config import settings


class LLMProviderFactory:
    """Factory for creating LLM provider instances."""

    _providers: Dict[str, Type[BaseLLMProvider]] = {
        LLMProvider.OPENAI: OpenAIProvider,
        LLMProvider.ANTHROPIC: AnthropicProvider,
        LLMProvider.HUGGINGFACE: HuggingFaceProvider,
        # Temporarily disabled - uncomment when you have API keys
        # LLMProvider.MISTRAL: MistralProvider,
        # LLMProvider.TOGETHER: TogetherProvider,
    }

    @classmethod
    def create(cls, provider: str, api_key: str = None) -> BaseLLMProvider:
        """
        Create an LLM provider instance.

        Args:
            provider: Provider name (openai, anthropic, mistral, together)
            api_key: API key for the provider. If None, will use key from settings.

        Returns:
            Instance of the requested provider

        Raises:
            ValueError: If provider is not supported
        """
        provider = provider.lower()

        if provider not in cls._providers:
            raise ValueError(
                f"Unsupported provider: {provider}. "
                f"Available providers: {list(cls._providers.keys())}"
            )

        # Get API key from settings if not provided
        if api_key is None:
            api_key = cls._get_api_key_from_settings(provider)

        if not api_key:
            raise ValueError(f"No API key found for provider: {provider}")

        provider_class = cls._providers[provider]
        return provider_class(api_key=api_key)

    @staticmethod
    def _get_api_key_from_settings(provider: str) -> str:
        """Get API key from settings based on provider name."""
        key_mapping = {
            LLMProvider.OPENAI: settings.openai_api_key,
            LLMProvider.ANTHROPIC: settings.anthropic_api_key,
            LLMProvider.MISTRAL: settings.mistral_api_key,
            LLMProvider.TOGETHER: settings.together_api_key,
            LLMProvider.HUGGINGFACE: settings.huggingface_api_key,
        }
        return key_mapping.get(provider)

    @classmethod
    def get_available_providers(cls) -> list[str]:
        """Return list of available provider names."""
        return list(cls._providers.keys())


def get_llm_provider(provider: str, api_key: str = None) -> BaseLLMProvider:
    """
    Convenience function to get an LLM provider instance.

    Args:
        provider: Provider name
        api_key: Optional API key

    Returns:
        LLM provider instance
    """
    return LLMProviderFactory.create(provider, api_key)


__all__ = [
    "BaseLLMProvider",
    "LLMProvider",
    "LLMResponse",
    "LLMMessage",
    "OpenAIProvider",
    "AnthropicProvider",
    "MistralProvider",
    "TogetherProvider",
    "LLMProviderFactory",
    "get_llm_provider",
]
