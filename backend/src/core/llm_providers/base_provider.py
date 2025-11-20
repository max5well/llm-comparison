from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    MISTRAL = "mistral"
    TOGETHER = "together"
    HUGGINGFACE = "huggingface"


@dataclass
class LLMResponse:
    """Standard response format for all LLM providers."""
    content: str
    model: str
    provider: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    cost_usd: float
    metadata: Dict[str, Any] = None
    error: Optional[str] = None


@dataclass
class LLMMessage:
    """Standard message format for LLM conversations."""
    role: str  # 'system', 'user', 'assistant'
    content: str


class BaseLLMProvider(ABC):
    """Base class for all LLM providers."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.provider_name = None

    @abstractmethod
    async def generate(
        self,
        messages: List[LLMMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> LLMResponse:
        """
        Generate a response from the LLM.

        Args:
            messages: List of conversation messages
            model: Model identifier
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters

        Returns:
            LLMResponse object with generation results
        """
        pass

    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Return list of available models for this provider."""
        pass

    @abstractmethod
    def calculate_cost(self, model: str, tokens_in: int, tokens_out: int) -> float:
        """Calculate cost in USD for a request."""
        pass

    def format_messages(self, messages: List[LLMMessage]) -> Any:
        """
        Format messages for provider-specific API.
        Override if provider requires special formatting.
        """
        return [{"role": msg.role, "content": msg.content} for msg in messages]


# Pricing data (as of January 2025, in USD per 1M tokens)
PRICING = {
    "openai": {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.150, "output": 0.600},
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    },
    "anthropic": {
        "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
        "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
        "claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
        "claude-3-sonnet-20240229": {"input": 3.00, "output": 15.00},
        "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
    },
    "mistral": {
        "mistral-large-latest": {"input": 2.00, "output": 6.00},
        "mistral-medium-latest": {"input": 0.70, "output": 2.10},
        "mistral-small-latest": {"input": 0.20, "output": 0.60},
        "open-mistral-7b": {"input": 0.25, "output": 0.25},
        "open-mixtral-8x7b": {"input": 0.70, "output": 0.70},
    },
    "together": {
        "meta-llama/Llama-3-70b-chat-hf": {"input": 0.90, "output": 0.90},
        "meta-llama/Llama-3-8b-chat-hf": {"input": 0.20, "output": 0.20},
        "mistralai/Mixtral-8x7B-Instruct-v0.1": {"input": 0.60, "output": 0.60},
        "mistralai/Mistral-7B-Instruct-v0.2": {"input": 0.20, "output": 0.20},
    }
}
