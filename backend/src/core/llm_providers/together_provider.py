import time
from typing import List
from together import AsyncTogether
from tenacity import retry, stop_after_attempt, wait_exponential

from .base_provider import BaseLLMProvider, LLMResponse, LLMMessage, PRICING


class TogetherProvider(BaseLLMProvider):
    """Together AI LLM provider implementation."""

    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.provider_name = "together"
        self.client = AsyncTogether(api_key=api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def generate(
        self,
        messages: List[LLMMessage],
        model: str = "meta-llama/Llama-3-8b-chat-hf",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> LLMResponse:
        """Generate a response using Together API."""
        start_time = time.time()

        try:
            formatted_messages = self.format_messages(messages)

            response = await self.client.chat.completions.create(
                model=model,
                messages=formatted_messages,
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
        """Return list of available Together models."""
        return [
            "meta-llama/Llama-3-70b-chat-hf",
            "meta-llama/Llama-3-8b-chat-hf",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "mistralai/Mistral-7B-Instruct-v0.2",
            "togethercomputer/RedPajama-INCITE-7B-Chat"
        ]

    def calculate_cost(self, model: str, tokens_in: int, tokens_out: int) -> float:
        """Calculate cost for Together request."""
        pricing = PRICING.get(self.provider_name, {}).get(model)

        if not pricing:
            # Default to Llama 3 8b pricing if model not found
            pricing = PRICING[self.provider_name]["meta-llama/Llama-3-8b-chat-hf"]

        # Together often has flat pricing for both input/output
        input_cost = (tokens_in / 1_000_000) * pricing["input"]
        output_cost = (tokens_out / 1_000_000) * pricing["output"]

        return input_cost + output_cost
