from typing import List, Dict, Any
from dataclasses import dataclass
from statistics import mean, median, stdev


@dataclass
class ModelMetrics:
    """Aggregated metrics for a model's performance."""
    model_name: str
    total_questions: int

    # Performance metrics
    avg_latency_ms: float
    median_latency_ms: float
    p95_latency_ms: float

    # Cost metrics
    total_cost_usd: float
    avg_cost_per_query: float

    # Token metrics
    total_tokens_in: int
    total_tokens_out: int
    avg_tokens_in: float
    avg_tokens_out: float

    # Quality metrics (from judge)
    win_rate: float
    tie_rate: float
    loss_rate: float
    avg_score: float

    # Criteria breakdown
    avg_correctness: float
    avg_relevance: float
    avg_completeness: float
    avg_clarity: float
    avg_conciseness: float

    # Error rate
    error_count: int
    error_rate: float


class MetricsCalculator:
    """Calculate aggregated metrics from evaluation results."""

    @staticmethod
    def calculate_model_metrics(
        model_results: List[Dict[str, Any]],
        judge_results: List[Dict[str, Any]],
        model_identifier: str  # 'model_a' or 'model_b'
    ) -> ModelMetrics:
        """
        Calculate comprehensive metrics for a model.

        Args:
            model_results: List of result dicts with latency, cost, tokens, etc.
            judge_results: List of judge result dicts
            model_identifier: Which model in comparisons ('model_a' or 'model_b')

        Returns:
            ModelMetrics object with all calculated metrics
        """
        if not model_results:
            raise ValueError("No model results provided")

        total_questions = len(model_results)
        model_name = model_results[0].get('model_name', 'unknown')

        # Performance metrics
        latencies = [r['latency_ms'] for r in model_results if r.get('latency_ms')]
        avg_latency = mean(latencies) if latencies else 0
        median_latency = median(latencies) if latencies else 0
        p95_latency = MetricsCalculator._percentile(latencies, 95) if latencies else 0

        # Cost metrics
        costs = [r['cost_usd'] for r in model_results if r.get('cost_usd') is not None]
        total_cost = sum(costs) if costs else 0
        avg_cost = mean(costs) if costs else 0

        # Token metrics
        tokens_in = [r['tokens_in'] for r in model_results if r.get('tokens_in')]
        tokens_out = [r['tokens_out'] for r in model_results if r.get('tokens_out')]
        total_tokens_in = sum(tokens_in) if tokens_in else 0
        total_tokens_out = sum(tokens_out) if tokens_out else 0
        avg_tokens_in = mean(tokens_in) if tokens_in else 0
        avg_tokens_out = mean(tokens_out) if tokens_out else 0

        # Error metrics
        error_count = sum(1 for r in model_results if r.get('error_message'))
        error_rate = (error_count / total_questions) * 100 if total_questions > 0 else 0

        # Quality metrics from judge
        if judge_results:
            wins = sum(1 for j in judge_results if j.get('winner') == model_identifier)
            ties = sum(1 for j in judge_results if j.get('winner') == 'tie')
            losses = len(judge_results) - wins - ties

            win_rate = (wins / len(judge_results)) * 100
            tie_rate = (ties / len(judge_results)) * 100
            loss_rate = (losses / len(judge_results)) * 100

            # Get score field based on model identifier
            score_field = f'score_{"a" if model_identifier == "model_a" else "b"}'
            scores = [j[score_field] for j in judge_results if score_field in j]
            avg_score = mean(scores) if scores else 0

            # Extract criteria scores
            criteria_scores = MetricsCalculator._extract_criteria_scores(
                judge_results, model_identifier
            )
        else:
            win_rate = tie_rate = loss_rate = avg_score = 0
            criteria_scores = {
                'correctness': 0, 'relevance': 0, 'completeness': 0,
                'clarity': 0, 'conciseness': 0
            }

        return ModelMetrics(
            model_name=model_name,
            total_questions=total_questions,
            avg_latency_ms=round(avg_latency, 2),
            median_latency_ms=round(median_latency, 2),
            p95_latency_ms=round(p95_latency, 2),
            total_cost_usd=round(total_cost, 6),
            avg_cost_per_query=round(avg_cost, 6),
            total_tokens_in=total_tokens_in,
            total_tokens_out=total_tokens_out,
            avg_tokens_in=round(avg_tokens_in, 2),
            avg_tokens_out=round(avg_tokens_out, 2),
            win_rate=round(win_rate, 2),
            tie_rate=round(tie_rate, 2),
            loss_rate=round(loss_rate, 2),
            avg_score=round(avg_score, 2),
            avg_correctness=round(criteria_scores['correctness'], 2),
            avg_relevance=round(criteria_scores['relevance'], 2),
            avg_completeness=round(criteria_scores['completeness'], 2),
            avg_clarity=round(criteria_scores['clarity'], 2),
            avg_conciseness=round(criteria_scores['conciseness'], 2),
            error_count=error_count,
            error_rate=round(error_rate, 2)
        )

    @staticmethod
    def _extract_criteria_scores(
        judge_results: List[Dict[str, Any]],
        model_identifier: str
    ) -> Dict[str, float]:
        """Extract and average criteria scores from judge results."""
        criteria_names = ['correctness', 'relevance', 'completeness', 'clarity', 'conciseness']
        aggregated = {name: [] for name in criteria_names}

        for judge_result in judge_results:
            criteria_scores = judge_result.get('criteria_scores', {})
            for criterion in criteria_names:
                if criterion in criteria_scores:
                    score = criteria_scores[criterion].get(model_identifier)
                    if score is not None:
                        aggregated[criterion].append(score)

        return {
            name: mean(scores) if scores else 0
            for name, scores in aggregated.items()
        }

    @staticmethod
    def _percentile(data: List[float], percentile: int) -> float:
        """Calculate percentile of a dataset."""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = (percentile / 100) * len(sorted_data)
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[min(int(index) + 1, len(sorted_data) - 1)]
            return (lower + upper) / 2

    @staticmethod
    def compare_models(
        metrics_a: ModelMetrics,
        metrics_b: ModelMetrics
    ) -> Dict[str, Any]:
        """
        Generate comparison summary between two models.

        Args:
            metrics_a: Metrics for model A
            metrics_b: Metrics for model B

        Returns:
            Dict with comparison insights
        """
        return {
            'model_a': metrics_a.model_name,
            'model_b': metrics_b.model_name,
            'quality_winner': MetricsCalculator._determine_winner(
                metrics_a.avg_score, metrics_b.avg_score
            ),
            'speed_winner': MetricsCalculator._determine_winner(
                -metrics_a.avg_latency_ms, -metrics_b.avg_latency_ms  # Negative because lower is better
            ),
            'cost_winner': MetricsCalculator._determine_winner(
                -metrics_a.total_cost_usd, -metrics_b.total_cost_usd  # Negative because lower is better
            ),
            'quality_difference': abs(metrics_a.avg_score - metrics_b.avg_score),
            'speed_difference_ms': abs(metrics_a.avg_latency_ms - metrics_b.avg_latency_ms),
            'cost_difference_usd': abs(metrics_a.total_cost_usd - metrics_b.total_cost_usd),
            'win_rates': {
                'model_a': metrics_a.win_rate,
                'model_b': metrics_b.win_rate,
                'tie': metrics_a.tie_rate  # Same for both
            }
        }

    @staticmethod
    def _determine_winner(score_a: float, score_b: float, threshold: float = 0.05) -> str:
        """Determine winner with threshold for ties."""
        diff = score_a - score_b
        if abs(diff) < threshold:
            return 'tie'
        return 'model_a' if diff > 0 else 'model_b'

    @staticmethod
    def generate_summary_report(
        metrics: List[ModelMetrics],
        comparison: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive summary report.

        Args:
            metrics: List of ModelMetrics objects
            comparison: Optional comparison dict from compare_models

        Returns:
            Summary report dict
        """
        return {
            'models': [
                {
                    'name': m.model_name,
                    'avg_score': m.avg_score,
                    'win_rate': m.win_rate,
                    'avg_latency_ms': m.avg_latency_ms,
                    'total_cost_usd': m.total_cost_usd,
                    'error_rate': m.error_rate
                }
                for m in metrics
            ],
            'comparison': comparison,
            'best_quality': max(metrics, key=lambda m: m.avg_score).model_name,
            'fastest': min(metrics, key=lambda m: m.avg_latency_ms).model_name,
            'most_cost_effective': min(metrics, key=lambda m: m.total_cost_usd).model_name,
        }
