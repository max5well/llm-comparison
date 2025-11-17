from typing import Dict, Any, Optional
from dataclasses import dataclass
import json

from src.core.llm_providers import get_llm_provider, LLMMessage


@dataclass
class JudgeResult:
    """Result from LLM judge evaluation."""
    winner: str  # 'model_a', 'model_b', or 'tie'
    score_a: float
    score_b: float
    reasoning: str
    confidence: float
    criteria_scores: Dict[str, Any]
    judge_response: str


class LLMJudge:
    """LLM-as-a-judge for evaluating and comparing model outputs."""

    JUDGE_PROMPT_TEMPLATE = """You are an impartial expert evaluator comparing two AI model responses.

Question:
{question}

{context_section}

Model A Response:
{answer_a}

Model B Response:
{answer_b}

Your task is to evaluate both responses based on the following criteria:
1. **Correctness**: Is the answer factually accurate?
2. **Relevance**: Does the answer address the question directly?
3. **Completeness**: Does the answer cover all important aspects?
4. **Clarity**: Is the answer well-structured and easy to understand?
5. **Conciseness**: Is the answer appropriately detailed without being verbose?

Provide your evaluation in the following JSON format:
{{
  "winner": "model_a" | "model_b" | "tie",
  "score_a": <score 0-10 for Model A>,
  "score_b": <score 0-10 for Model B>,
  "reasoning": "<detailed explanation of your decision>",
  "confidence": <0-1, how confident you are in this judgment>,
  "criteria_scores": {{
    "correctness": {{"model_a": <0-10>, "model_b": <0-10>}},
    "relevance": {{"model_a": <0-10>, "model_b": <0-10>}},
    "completeness": {{"model_a": <0-10>, "model_b": <0-10>}},
    "clarity": {{"model_a": <0-10>, "model_b": <0-10>}},
    "conciseness": {{"model_a": <0-10>, "model_b": <0-10>}}
  }}
}}

Important guidelines:
- Be objective and unbiased in your evaluation
- Consider accuracy as the most important factor
- A response that is correct but verbose is better than one that is concise but wrong
- Mark as "tie" only if both responses are truly equivalent in quality
- Explain your reasoning clearly

Return ONLY the JSON object, no other text."""

    def __init__(
        self,
        provider: str = "openai",
        model: str = "gpt-4o-mini",
        temperature: float = 0.3  # Lower temperature for more consistent judgments
    ):
        """
        Initialize LLM judge.

        Args:
            provider: LLM provider to use for judging
            model: Model to use for judging
            temperature: Temperature for generation (lower = more consistent)
        """
        self.provider = get_llm_provider(provider)
        self.model = model
        self.temperature = temperature
        self.provider_name = provider

    async def judge_pair(
        self,
        question: str,
        answer_a: str,
        answer_b: str,
        context: Optional[str] = None,
        expected_answer: Optional[str] = None
    ) -> JudgeResult:
        """
        Compare two model answers and determine which is better.

        Args:
            question: The question that was asked
            answer_a: Answer from model A
            answer_b: Answer from model B
            context: Optional context/retrieved chunks used
            expected_answer: Optional ground truth answer

        Returns:
            JudgeResult with comparison details
        """
        # Build context section if provided
        context_section = ""
        if context:
            context_section = f"Context/Retrieved Information:\n{context}\n\n"
        if expected_answer:
            context_section += f"Expected Answer (for reference):\n{expected_answer}\n\n"

        # Format prompt
        prompt = self.JUDGE_PROMPT_TEMPLATE.format(
            question=question,
            context_section=context_section,
            answer_a=answer_a,
            answer_b=answer_b
        )

        # Get judgment from LLM
        messages = [LLMMessage(role="user", content=prompt)]

        response = await self.provider.generate(
            messages=messages,
            model=self.model,
            temperature=self.temperature
        )

        if response.error:
            raise Exception(f"Error in judge evaluation: {response.error}")

        # Parse JSON response
        try:
            judgment = self._extract_json(response.content)
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse judge response: {str(e)}\nResponse: {response.content}")

        # Create JudgeResult
        return JudgeResult(
            winner=judgment.get('winner', 'tie'),
            score_a=float(judgment.get('score_a', 0)),
            score_b=float(judgment.get('score_b', 0)),
            reasoning=judgment.get('reasoning', ''),
            confidence=float(judgment.get('confidence', 0.5)),
            criteria_scores=judgment.get('criteria_scores', {}),
            judge_response=response.content
        )

    async def evaluate_single_answer(
        self,
        question: str,
        answer: str,
        context: Optional[str] = None,
        expected_answer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate a single answer for quality metrics.

        Args:
            question: The question
            answer: The answer to evaluate
            context: Optional context
            expected_answer: Optional ground truth

        Returns:
            Dict with evaluation scores
        """
        prompt = f"""You are an expert evaluator. Evaluate the following answer.

Question:
{question}

{"Context: " + context if context else ""}
{"Expected Answer: " + expected_answer if expected_answer else ""}

Answer to Evaluate:
{answer}

Evaluate the answer on these criteria (score 0-10 for each):
1. Correctness: Factual accuracy
2. Relevance: Addresses the question
3. Completeness: Covers important aspects
4. Clarity: Well-structured and clear
5. Conciseness: Appropriately detailed

Return a JSON object:
{{
  "overall_score": <0-10>,
  "correctness": <0-10>,
  "relevance": <0-10>,
  "completeness": <0-10>,
  "clarity": <0-10>,
  "conciseness": <0-10>,
  "feedback": "<brief evaluation summary>"
}}

Return ONLY the JSON object."""

        messages = [LLMMessage(role="user", content=prompt)]

        response = await self.provider.generate(
            messages=messages,
            model=self.model,
            temperature=self.temperature
        )

        if response.error:
            raise Exception(f"Error in evaluation: {response.error}")

        return self._extract_json(response.content)

    def _extract_json(self, text: str) -> Dict:
        """
        Extract JSON object from LLM response.

        Args:
            text: Text that may contain JSON

        Returns:
            Parsed JSON dict
        """
        import re

        # Look for JSON object pattern
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            json_str = json_match.group(0)
            return json.loads(json_str)

        # If no object found, try parsing entire text
        return json.loads(text)

    def calculate_win_rate(self, judge_results: list[JudgeResult], model_name: str) -> Dict[str, float]:
        """
        Calculate win/tie/loss rates for a model.

        Args:
            judge_results: List of JudgeResult objects
            model_name: 'model_a' or 'model_b'

        Returns:
            Dict with win_rate, tie_rate, loss_rate percentages
        """
        if not judge_results:
            return {'win_rate': 0.0, 'tie_rate': 0.0, 'loss_rate': 0.0}

        wins = sum(1 for r in judge_results if r.winner == model_name)
        ties = sum(1 for r in judge_results if r.winner == 'tie')
        losses = len(judge_results) - wins - ties

        total = len(judge_results)

        return {
            'win_rate': (wins / total) * 100,
            'tie_rate': (ties / total) * 100,
            'loss_rate': (losses / total) * 100
        }
