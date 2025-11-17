import time
from typing import List
from anthropic import AsyncAnthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from .base_provider import BaseLLMProvider, LLMResponse, LLMMessage, PRICING


class AnthropicProvider(BaseLLMProvider):
    """Anthropic (Claude) LLM provider implementation."""

    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.provider_name = "anthropic"
        self.client = AsyncAnthropic(api_key=api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def generate(
        self,
        messages: List[LLMMessage],
        model: str = "claude-3-5-haiku-20241022",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> LLMResponse:
        """Generate a response using Anthropic API."""
        start_time = time.time()

        try:
            # Anthropic requires system message to be separate
            system_message = None
            conversation_messages = []

            for msg in messages:
                if msg.role == "system":
                    system_message = msg.content
                else:
                    conversation_messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })

            request_params = {
                "model": model,
                "messages": conversation_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                **kwargs
            }

            if system_message:
                request_params["system"] = system_message

            response = await self.client.messages.create(**request_params)

            latency_ms = int((time.time() - start_time) * 1000)

            tokens_in = response.usage.input_tokens
            tokens_out = response.usage.output_tokens
            cost = self.calculate_cost(model, tokens_in, tokens_out)

            return LLMResponse(
                content=response.content[0].text,
                model=model,
                provider=self.provider_name,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
                cost_usd=cost,
                metadata={
                    "stop_reason": response.stop_reason,
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
        """Return list of available Anthropic models."""
        return [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]

    def calculate_cost(self, model: str, tokens_in: int, tokens_out: int) -> float:
        """Calculate cost for Anthropic request."""
        pricing = PRICING.get(self.provider_name, {}).get(model)

        if not pricing:
            # Default to haiku pricing if model not found
            pricing = PRICING[self.provider_name]["claude-3-5-haiku-20241022"]

        input_cost = (tokens_in / 1_000_000) * pricing["input"]
        output_cost = (tokens_out / 1_000_000) * pricing["output"]

        return input_cost + output_cost
