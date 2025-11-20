"""
Hugging Face LLM Provider using Inference API.

Supports any model available on Hugging Face Hub via the Inference API.
"""
import time
from typing import List, Dict, Any, Optional
import requests

from .base_provider import BaseLLMProvider, LLMResponse, LLMMessage


class HuggingFaceProvider(BaseLLMProvider):
    """
    Hugging Face Inference API provider.

    Supports both:
    - Serverless Inference API (free tier available)
    - Dedicated Endpoints (for production)
    """

    def __init__(self, api_key: str, base_url: str = "https://api-inference.huggingface.co/models/"):
        """
        Initialize Hugging Face provider.

        Args:
            api_key: Hugging Face API token
            base_url: Base URL for Inference API
        """
        super().__init__(api_key=api_key)
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def generate(
        self,
        messages: List[LLMMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> LLMResponse:
        """
        Generate completion using Hugging Face Inference API.

        Args:
            messages: List of messages in the conversation
            model: Hugging Face model ID (e.g., "meta-llama/Llama-3.1-8B-Instruct")
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional parameters

        Returns:
            LLMResponse object with generated text and metadata
        """
        start_time = time.time()

        # Format messages into a prompt
        # Most HF models expect a specific chat format
        prompt = self._format_messages_for_model(messages, model)

        # API endpoint
        url = f"{self.base_url}{model}"

        # Request payload
        payload = {
            "inputs": prompt,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": max_tokens,
                "return_full_text": False,
                **kwargs
            }
        }

        try:
            response = requests.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=120  # Longer timeout for model loading
            )

            response.raise_for_status()
            result = response.json()

            # Extract generated text
            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get("generated_text", "")
            elif isinstance(result, dict):
                generated_text = result.get("generated_text", "")
            else:
                generated_text = str(result)

            # Calculate latency
            latency_ms = int((time.time() - start_time) * 1000)

            # Estimate token counts (approximation)
            tokens_in = self._estimate_tokens(prompt)
            tokens_out = self._estimate_tokens(generated_text)

            # Calculate cost (Inference API has different pricing)
            # Free tier: $0, Pro tier: varies by model
            # For estimation, we'll use a very low rate
            cost_usd = 0.0  # Free for most models on Inference API

            return LLMResponse(
                content=generated_text.strip(),
                model=model,
                provider="huggingface",
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                metadata={
                    "finish_reason": "stop",
                    "inference_api": True
                }
            )

        except requests.exceptions.HTTPError as e:
            error_detail = ""
            try:
                error_detail = e.response.json().get("error", str(e))
            except:
                error_detail = str(e)

            raise Exception(
                f"Hugging Face API error: {error_detail}. "
                f"Model: {model}. "
                f"Note: Model might be loading (cold start) or unavailable."
            )
        except Exception as e:
            raise Exception(f"Error calling Hugging Face API: {str(e)}")

    def _format_messages_for_model(self, messages: List[LLMMessage], model: str) -> str:
        """
        Format messages into a prompt string suitable for the model.

        Different models have different chat templates. This is a generic approach.
        """
        # Check if model supports chat templates
        model_lower = model.lower()

        # For Llama-based models
        if "llama" in model_lower or "mistral" in model_lower:
            formatted_parts = []
            for msg in messages:
                if msg.role == "system":
                    formatted_parts.append(f"<|system|>\n{msg.content}</s>")
                elif msg.role == "user":
                    formatted_parts.append(f"<|user|>\n{msg.content}</s>")
                elif msg.role == "assistant":
                    formatted_parts.append(f"<|assistant|>\n{msg.content}</s>")
            formatted_parts.append("<|assistant|>")
            return "\n".join(formatted_parts)

        # For other models, use a simple format
        else:
            formatted_parts = []
            for msg in messages:
                if msg.role == "system":
                    formatted_parts.append(f"System: {msg.content}")
                elif msg.role == "user":
                    formatted_parts.append(f"Human: {msg.content}")
                elif msg.role == "assistant":
                    formatted_parts.append(f"Assistant: {msg.content}")
            formatted_parts.append("Assistant:")
            return "\n\n".join(formatted_parts)

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token)."""
        return max(1, len(text) // 4)

    def get_available_models(self) -> List[str]:
        """
        Return a list of popular/recommended Hugging Face models.

        Note: Users can enter any model ID from Hugging Face Hub.
        """
        return [
            # Llama models
            "meta-llama/Llama-3.1-8B-Instruct",
            "meta-llama/Llama-3.1-70B-Instruct",
            "meta-llama/Llama-2-7b-chat-hf",

            # Mistral models
            "mistralai/Mistral-7B-Instruct-v0.3",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",

            # Other popular models
            "HuggingFaceH4/zephyr-7b-beta",
            "tiiuae/falcon-7b-instruct",
            "google/flan-t5-xxl",
            "bigscience/bloom",

            # Smaller/faster models
            "microsoft/phi-2",
            "stabilityai/stablelm-2-1_6b",
        ]
