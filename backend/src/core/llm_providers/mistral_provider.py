import time
from typing import List
from mistralai.async_client import MistralAsyncClient
from mistralai.models.chat_completion import ChatMessage
from tenacity import retry, stop_after_attempt, wait_exponential

from .base_provider import BaseLLMProvider, LLMResponse, LLMMessage, PRICING


class MistralProvider(BaseLLMProvider):
    """Mistral AI LLM provider implementation."""

    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.provider_name = "mistral"
        self.client = MistralAsyncClient(api_key=api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def generate(
        self,
        messages: List[LLMMessage],
        model: str = "mistral-small-latest",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> LLMResponse:
        """Generate a response using Mistral API."""
        start_time = time.time()

        try:
            # Convert to Mistral's ChatMessage format
            mistral_messages = [
                ChatMessage(role=msg.role, content=msg.content)
                for msg in messages
            ]

            response = await self.client.chat(
                model=model,
                messages=mistral_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )

            latency_ms = int((time.time() - start_time) * 1000)

            tokens_in = response.usage.prompt_tokens
            tokens_out = response.usage.completion_tokens
            cost = self.calculate_cost(model, tokens_in, tokens_out)

            return LLMResponse(
                content=response.choices[0].message.content,
                model=model,
                provider=self.provider_name,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
                cost_usd=cost,
                metadata={
                    "finish_reason": response.choices[0].finish_reason,
                    "response_id": response.id,
                }
            )

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return LLMResponse(
                content="",
                model=model,
                provider=self.provider_name,
                tokens_in=0,
                tokens_out=0,
                latency_ms=latency_ms,
                cost_usd=0.0,
                error=str(e)
            )

    def get_available_models(self) -> List[str]:
        """Return list of available Mistral models."""
        return [
            "mistral-large-latest",
            "mistral-medium-latest",
            "mistral-small-latest",
            "open-mistral-7b",
            "open-mixtral-8x7b"
        ]

    def calculate_cost(self, model: str, tokens_in: int, tokens_out: int) -> float:
        """Calculate cost for Mistral request."""
        pricing = PRICING.get(self.provider_name, {}).get(model)

        if not pricing:
            # Default to small model pricing if model not found
            pricing = PRICING[self.provider_name]["mistral-small-latest"]

        input_cost = (tokens_in / 1_000_000) * pricing["input"]
        output_cost = (tokens_out / 1_000_000) * pricing["output"]

        return input_cost + output_cost
