from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID

from src.db.database import get_db
from src.db.queries import (
    get_evaluation, get_evaluation_results,
    get_evaluation_judge_results, get_evaluation_metrics
)
from src.core.metrics import MetricsCalculator, ModelMetrics

router = APIRouter(prefix="/results", tags=["Results"])


class ModelMetricsResponse(BaseModel):
    model_name: str
    total_questions: int
    avg_latency_ms: float
    median_latency_ms: float
    p95_latency_ms: float
    total_cost_usd: float
    avg_cost_per_query: float
    total_tokens_in: int
    total_tokens_out: int
    avg_tokens_in: float
    avg_tokens_out: float
    win_rate: float
    tie_rate: float
    loss_rate: float
    avg_score: float
    avg_correctness: float
    avg_relevance: float
    avg_completeness: float
    avg_clarity: float
    avg_conciseness: float
    error_count: int
    error_rate: float


class QuestionResultResponse(BaseModel):
    question_id: str
    question: str
    expected_answer: Optional[str]
    model_answers: Dict[str, Any]
    judge_results: Optional[Dict[str, Any]]


class EvaluationSummaryResponse(BaseModel):
    evaluation_id: str
    evaluation_name: str
    status: str
    total_questions: int
    models_tested: List[str]
    metrics: List[ModelMetricsResponse]
    comparison: Optional[Dict[str, Any]]


class DetailedResultsResponse(BaseModel):
    evaluation_id: str
    evaluation_name: str
    total_questions: int
    models_tested: List[str]
    question_results: List[QuestionResultResponse]
    summary_metrics: List[ModelMetricsResponse]


@router.get("/{evaluation_id}/summary", response_model=EvaluationSummaryResponse)
async def get_evaluation_summary(
    evaluation_id: str,
    db: Session = Depends(get_db)
):
    """
    Get summary results for an evaluation.

    Includes aggregated metrics for each model and comparison.
    """
    evaluation = get_evaluation(db, UUID(evaluation_id))

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )

    if evaluation.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Evaluation is not completed. Current status: {evaluation.status}"
        )

    # Get all results
    model_results = get_evaluation_results(db, UUID(evaluation_id))
    judge_results = get_evaluation_judge_results(db, UUID(evaluation_id))

    # Group results by model
    results_by_model = {}
    for result in model_results:
        model_key = result.model_name
        if model_key not in results_by_model:
            results_by_model[model_key] = []

        results_by_model[model_key].append({
            'model_name': result.model_name,
            'latency_ms': result.latency_ms,
            'cost_usd': float(result.cost_usd) if result.cost_usd else 0,
            'tokens_in': result.tokens_in,
            'tokens_out': result.tokens_out,
            'error_message': result.error_message
        })

    # Format judge results
    judge_results_list = []
    for jr in judge_results:
        judge_results_list.append({
            'winner': jr.winner,
            'score_a': float(jr.score_a) if jr.score_a else 0,
            'score_b': float(jr.score_b) if jr.score_b else 0,
            'criteria_scores': jr.criteria_scores
        })

    # Calculate metrics for each model
    metrics_list = []
    model_names = list(results_by_model.keys())

    for idx, (model_name, results) in enumerate(results_by_model.items()):
        model_identifier = f'model_{"a" if idx == 0 else "b"}'

        metrics = MetricsCalculator.calculate_model_metrics(
            model_results=results,
            judge_results=judge_results_list,
            model_identifier=model_identifier
        )

        metrics_list.append(ModelMetricsResponse(
            model_name=metrics.model_name,
            total_questions=metrics.total_questions,
            avg_latency_ms=metrics.avg_latency_ms,
            median_latency_ms=metrics.median_latency_ms,
            p95_latency_ms=metrics.p95_latency_ms,
            total_cost_usd=metrics.total_cost_usd,
            avg_cost_per_query=metrics.avg_cost_per_query,
            total_tokens_in=metrics.total_tokens_in,
            total_tokens_out=metrics.total_tokens_out,
            avg_tokens_in=metrics.avg_tokens_in,
            avg_tokens_out=metrics.avg_tokens_out,
            win_rate=metrics.win_rate,
            tie_rate=metrics.tie_rate,
            loss_rate=metrics.loss_rate,
            avg_score=metrics.avg_score,
            avg_correctness=metrics.avg_correctness,
            avg_relevance=metrics.avg_relevance,
            avg_completeness=metrics.avg_completeness,
            avg_clarity=metrics.avg_clarity,
            avg_conciseness=metrics.avg_conciseness,
            error_count=metrics.error_count,
            error_rate=metrics.error_rate
        ))

    # Generate comparison if 2 models
    comparison = None
    if len(metrics_list) == 2:
        metrics_objs = [
            ModelMetrics(**m.dict())
            for m in metrics_list
        ]
        comparison = MetricsCalculator.compare_models(
            metrics_objs[0],
            metrics_objs[1]
        )

    return EvaluationSummaryResponse(
        evaluation_id=str(evaluation.id),
        evaluation_name=evaluation.name,
        status=evaluation.status,
        total_questions=evaluation.total_questions,
        models_tested=evaluation.models_tested,
        metrics=metrics_list,
        comparison=comparison
    )


@router.get("/{evaluation_id}/detailed", response_model=DetailedResultsResponse)
async def get_detailed_results(
    evaluation_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed question-by-question results for an evaluation.
    """
    try:
    evaluation = get_evaluation(db, UUID(evaluation_id))

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )

    # Get all results
    model_results = get_evaluation_results(db, UUID(evaluation_id))
    judge_results = get_evaluation_judge_results(db, UUID(evaluation_id))

        # Check if results are available
        if not model_results or len(model_results) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evaluation results are not yet available. The evaluation may still be processing."
            )

    # Group results by question
    results_by_question = {}
    for result in model_results:
        question_id = str(result.question_id)
        if question_id not in results_by_question:
            results_by_question[question_id] = {
                'question': None,
                'model_answers': {},
                'judge_result': None
            }

        results_by_question[question_id]['model_answers'][result.model_name] = {
            'answer': result.answer,
            'latency_ms': result.latency_ms,
            'tokens_in': result.tokens_in,
            'tokens_out': result.tokens_out,
            'cost_usd': float(result.cost_usd) if result.cost_usd else 0
        }

        # Get question details
        if not results_by_question[question_id]['question']:
                try:
                    from src.db.models import TestQuestion
                    question = db.query(TestQuestion).filter(TestQuestion.id == result.question_id).first()
            if question:
                results_by_question[question_id]['question'] = {
                    'id': str(question.id),
                    'text': question.question,
                    'expected_answer': question.expected_answer
                }
                except Exception as e:
                    print(f"Error fetching question {result.question_id}: {str(e)}")
                    # Continue without question details

    # Add judge results
    for jr in judge_results:
        question_id = str(jr.question_id)
        if question_id in results_by_question:
            results_by_question[question_id]['judge_result'] = {
                'winner': jr.winner,
                'score_a': float(jr.score_a) if jr.score_a else 0,
                'score_b': float(jr.score_b) if jr.score_b else 0,
                'reasoning': jr.reasoning,
                'confidence': float(jr.confidence) if jr.confidence else 0
            }

    # Format question results
    question_results = []
    for qid, data in results_by_question.items():
        if data['question']:
            question_results.append(QuestionResultResponse(
                question_id=qid,
                question=data['question']['text'],
                expected_answer=data['question'].get('expected_answer'),
                model_answers=data['model_answers'],
                judge_results=data.get('judge_result')
            ))

    # Calculate summary metrics (reuse from summary endpoint logic)
    metrics_list = []
    results_by_model = {}
    for result in model_results:
        model_key = result.model_name
        if model_key not in results_by_model:
            results_by_model[model_key] = []

        results_by_model[model_key].append({
            'model_name': result.model_name,
            'latency_ms': result.latency_ms,
            'cost_usd': float(result.cost_usd) if result.cost_usd else 0,
            'tokens_in': result.tokens_in,
            'tokens_out': result.tokens_out,
            'error_message': result.error_message
        })

    judge_results_list = []
    for jr in judge_results:
        judge_results_list.append({
            'winner': jr.winner,
            'score_a': float(jr.score_a) if jr.score_a else 0,
            'score_b': float(jr.score_b) if jr.score_b else 0,
            'criteria_scores': jr.criteria_scores
        })

    for idx, (model_name, results) in enumerate(results_by_model.items()):
            try:
                # Try to find matching judge results for this model
                # Judge results compare pairs, so we need to match them properly
                # For now, if we can't match, calculate basic metrics without judge scores
                matching_judge_results = []
                if judge_results_list and len(results_by_model) == 2:
                    # Only use judge results if we have exactly 2 models
                    model_names_list = list(results_by_model.keys())
                    current_model_idx = model_names_list.index(model_name)
                    model_identifier = f'model_{"a" if current_model_idx == 0 else "b"}'
                    matching_judge_results = judge_results_list
                else:
                    # For more than 2 models, don't use judge results for now
                    model_identifier = f'model_{idx}'
                    matching_judge_results = []

        metrics = MetricsCalculator.calculate_model_metrics(
            model_results=results,
                    judge_results=matching_judge_results,
            model_identifier=model_identifier
        )
            except Exception as e:
                import traceback
                print(f"Error calculating metrics for model {model_name}: {str(e)}")
                print(traceback.format_exc())
                # Calculate basic metrics without judge results as fallback
                metrics = MetricsCalculator.calculate_model_metrics(
                    model_results=results,
                    judge_results=[],
                    model_identifier=f'model_{idx}'
                )

        metrics_list.append(ModelMetricsResponse(
            model_name=metrics.model_name,
            total_questions=metrics.total_questions,
            avg_latency_ms=metrics.avg_latency_ms,
            median_latency_ms=metrics.median_latency_ms,
            p95_latency_ms=metrics.p95_latency_ms,
            total_cost_usd=metrics.total_cost_usd,
            avg_cost_per_query=metrics.avg_cost_per_query,
            total_tokens_in=metrics.total_tokens_in,
            total_tokens_out=metrics.total_tokens_out,
            avg_tokens_in=metrics.avg_tokens_in,
            avg_tokens_out=metrics.avg_tokens_out,
            win_rate=metrics.win_rate,
            tie_rate=metrics.tie_rate,
            loss_rate=metrics.loss_rate,
            avg_score=metrics.avg_score,
            avg_correctness=metrics.avg_correctness,
            avg_relevance=metrics.avg_relevance,
            avg_completeness=metrics.avg_completeness,
            avg_clarity=metrics.avg_clarity,
            avg_conciseness=metrics.avg_conciseness,
            error_count=metrics.error_count,
            error_rate=metrics.error_rate
        ))

    return DetailedResultsResponse(
        evaluation_id=str(evaluation.id),
        evaluation_name=evaluation.name,
        total_questions=evaluation.total_questions,
        models_tested=evaluation.models_tested,
        question_results=question_results,
        summary_metrics=metrics_list
    )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in get_detailed_results: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
