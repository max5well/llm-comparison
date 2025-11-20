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

    # ============================================================================
    # NEW METRIC EVALUATION METHODS FOR COMPREHENSIVE ANSWER QUALITY ASSESSMENT
    # ============================================================================

    async def evaluate_accuracy(
        self,
        question: str,
        expected_answer: Optional[str],
        generated_answer: str
    ) -> Dict[str, Any]:
        """
        Evaluate semantic accuracy of answer compared to expected answer.

        Args:
            question: The question that was asked
            expected_answer: The expected/reference answer (can be None)
            generated_answer: The answer generated by the model

        Returns:
            Dict with score (0.0-1.0) and explanation
        """
        if not expected_answer:
            return {"score": None, "explanation": "No expected answer provided for comparison"}

        prompt = f"""You are an expert evaluator. Score the semantic accuracy of the generated answer compared to the expected answer.

Question: {question}

Expected Answer: {expected_answer}

Generated Answer: {generated_answer}

Rate the accuracy from 0.0 to 1.0 where:
- 1.0 = Perfectly accurate, all key points covered
- 0.7-0.9 = Mostly accurate with minor omissions
- 0.4-0.6 = Partially accurate, missing key information
- 0.0-0.3 = Largely inaccurate or wrong

Respond in JSON format:
{{
  "score": 0.85,
  "explanation": "Brief explanation of the score"
}}"""

        try:
            messages = [LLMMessage(role="user", content=prompt)]
            response = await self.provider.generate(
                messages=messages,
                model=self.model,
                temperature=0.0
            )

            if response.error:
                return {"score": 0.0, "explanation": f"Error: {response.error}"}

            result = self._extract_json(response.content)
            score = float(result.get("score", 0.0))
            score = max(0.0, min(1.0, score))  # Clamp to 0-1

            return {
                "score": score,
                "explanation": result.get("explanation", "No explanation provided")
            }
        except Exception as e:
            return {"score": 0.0, "explanation": f"Error evaluating accuracy: {str(e)}"}

    async def evaluate_faithfulness(
        self,
        question: str,
        context: str,
        generated_answer: str
    ) -> Dict[str, Any]:
        """
        Evaluate if answer is faithful to the retrieved context (no hallucination).

        Args:
            question: The question that was asked
            context: The retrieved context from RAG
            generated_answer: The answer generated by the model

        Returns:
            Dict with score (0.0-1.0) and explanation
        """
        prompt = f"""You are an expert evaluator. Score how faithfully the answer is grounded in the provided context.

Question: {question}

Retrieved Context:
{context}

Generated Answer: {generated_answer}

Rate the faithfulness from 0.0 to 1.0 where:
- 1.0 = All claims are directly supported by the context
- 0.7-0.9 = Most claims supported, minor unsupported details
- 0.4-0.6 = Some claims not grounded in context
- 0.0-0.3 = Significant hallucination, many unsupported claims

Respond in JSON format:
{{
  "score": 0.92,
  "explanation": "Brief explanation highlighting any hallucinations"
}}"""

        try:
            messages = [LLMMessage(role="user", content=prompt)]
            response = await self.provider.generate(
                messages=messages,
                model=self.model,
                temperature=0.0
            )

            if response.error:
                return {"score": 0.0, "explanation": f"Error: {response.error}"}

            result = self._extract_json(response.content)
            score = float(result.get("score", 0.0))
            score = max(0.0, min(1.0, score))

            return {
                "score": score,
                "explanation": result.get("explanation", "No explanation provided")
            }
        except Exception as e:
            return {"score": 0.0, "explanation": f"Error evaluating faithfulness: {str(e)}"}

    async def evaluate_reasoning(
        self,
        question: str,
        generated_answer: str
    ) -> Dict[str, Any]:
        """
        Evaluate quality of reasoning, especially for multi-hop questions.

        Args:
            question: The question that was asked
            generated_answer: The answer generated by the model

        Returns:
            Dict with score (0.0-1.0) and explanation
        """
        prompt = f"""You are an expert evaluator. Score the quality of reasoning in the answer.

Question: {question}

Generated Answer: {generated_answer}

Rate the reasoning quality from 0.0 to 1.0 where:
- 1.0 = Excellent logical flow, clear step-by-step reasoning
- 0.7-0.9 = Good reasoning with minor logical gaps
- 0.4-0.6 = Weak reasoning, missing steps or unclear logic
- 0.0-0.3 = Poor or no clear reasoning

Respond in JSON format:
{{
  "score": 0.88,
  "explanation": "Brief explanation of reasoning quality"
}}"""

        try:
            messages = [LLMMessage(role="user", content=prompt)]
            response = await self.provider.generate(
                messages=messages,
                model=self.model,
                temperature=0.0
            )

            if response.error:
                return {"score": 0.0, "explanation": f"Error: {response.error}"}

            result = self._extract_json(response.content)
            score = float(result.get("score", 0.0))
            score = max(0.0, min(1.0, score))

            return {
                "score": score,
                "explanation": result.get("explanation", "No explanation provided")
            }
        except Exception as e:
            return {"score": 0.0, "explanation": f"Error evaluating reasoning: {str(e)}"}

    async def evaluate_context_utilization(
        self,
        question: str,
        context: str,
        generated_answer: str
    ) -> Dict[str, Any]:
        """
        Evaluate how well the answer uses the retrieved context.

        Args:
            question: The question that was asked
            context: The retrieved context from RAG
            generated_answer: The answer generated by the model

        Returns:
            Dict with score (0.0-1.0) and explanation
        """
        prompt = f"""You are an expert evaluator. Score how effectively the answer utilizes the retrieved context.

Question: {question}

Retrieved Context:
{context}

Generated Answer: {generated_answer}

Rate the context utilization from 0.0 to 1.0 where:
- 1.0 = Excellent use of context, all relevant information incorporated
- 0.7-0.9 = Good use, most relevant context utilized
- 0.4-0.6 = Partial use, missed some relevant context
- 0.0-0.3 = Poor use, ignored most relevant context

Respond in JSON format:
{{
  "score": 0.90,
  "explanation": "Brief explanation of context utilization"
}}"""

        try:
            messages = [LLMMessage(role="user", content=prompt)]
            response = await self.provider.generate(
                messages=messages,
                model=self.model,
                temperature=0.0
            )

            if response.error:
                return {"score": 0.0, "explanation": f"Error: {response.error}"}

            result = self._extract_json(response.content)
            score = float(result.get("score", 0.0))
            score = max(0.0, min(1.0, score))

            return {
                "score": score,
                "explanation": result.get("explanation", "No explanation provided")
            }
        except Exception as e:
            return {"score": 0.0, "explanation": f"Error evaluating context utilization: {str(e)}"}

    async def evaluate_all_quality_metrics(
        self,
        question: str,
        expected_answer: Optional[str],
        context: str,
        generated_answer: str
    ) -> Dict[str, Dict[str, Any]]:
        """
        Evaluate all quality metrics at once (Accuracy, Faithfulness, Reasoning, Context Utilization).

        Args:
            question: The question that was asked
            expected_answer: The expected/reference answer (can be None)
            context: The retrieved context from RAG
            generated_answer: The answer generated by the model

        Returns:
            Dictionary with all metrics
        """
        # Run all evaluations in parallel for speed
        import asyncio

        accuracy_task = self.evaluate_accuracy(question, expected_answer, generated_answer)
        faithfulness_task = self.evaluate_faithfulness(question, context, generated_answer)
        reasoning_task = self.evaluate_reasoning(question, generated_answer)
        context_util_task = self.evaluate_context_utilization(question, context, generated_answer)

        accuracy, faithfulness, reasoning, context_util = await asyncio.gather(
            accuracy_task,
            faithfulness_task,
            reasoning_task,
            context_util_task
        )

        return {
            "accuracy": accuracy,
            "faithfulness": faithfulness,
            "reasoning": reasoning,
            "context_utilization": context_util
        }


# ============================================================================
# UTILITY FUNCTIONS FOR METRIC CALCULATIONS
# ============================================================================

def calculate_overall_score(metrics: Dict[str, Optional[float]]) -> float:
    """
    Calculate overall score from individual metrics.

    Weighted average:
    - Accuracy: 30% (if available)
    - Faithfulness: 30%
    - Reasoning: 20%
    - Context Utilization: 20%

    Args:
        metrics: Dict with keys accuracy, faithfulness, reasoning, context_utilization

    Returns:
        Overall score 0.0-1.0
    """
    weights = {
        "accuracy": 0.30,
        "faithfulness": 0.30,
        "reasoning": 0.20,
        "context_utilization": 0.20
    }

    total_score = 0.0
    total_weight = 0.0

    for metric, weight in weights.items():
        score = metrics.get(metric)
        if score is not None:
            total_score += score * weight
            total_weight += weight

    if total_weight == 0:
        return 0.0

    return total_score / total_weight
