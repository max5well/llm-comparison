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
from src.db.models import EvaluationMetrics
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
    evaluation = get_evaluation(db, UUID(evaluation_id))

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )

    # Get all results
    model_results = get_evaluation_results(db, UUID(evaluation_id))
    judge_results = get_evaluation_judge_results(db, UUID(evaluation_id))
    from src.db.queries import get_test_question

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
            question = get_test_question(db, result.question_id)
            if question:
                results_by_question[question_id]['question'] = {
                    'id': str(question.id),
                    'text': question.question,
                    'expected_answer': question.expected_answer
                }

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

    return DetailedResultsResponse(
        evaluation_id=str(evaluation.id),
        evaluation_name=evaluation.name,
        total_questions=evaluation.total_questions,
        models_tested=evaluation.models_tested,
        question_results=question_results,
        summary_metrics=metrics_list
    )


# New Metrics endpoints for the enhanced metrics system

class NewMetricsSummaryResponse(BaseModel):
    avg_accuracy: Optional[float] = None
    avg_faithfulness: Optional[float] = None
    avg_reasoning: Optional[float] = None
    avg_context_utilization: Optional[float] = None
    total_cost_usd: float
    avg_latency_ms: float
    total_questions: int
    models_tested: List[str]
    status: str


class NewMetricsByModelResponse(BaseModel):
    metrics_by_model: Dict[str, Any]


@router.get("/{evaluation_id}/metrics-summary", response_model=NewMetricsSummaryResponse)
async def get_new_metrics_summary(
    evaluation_id: str,
    db: Session = Depends(get_db)
):
    """
    Get new metrics summary for an evaluation.
    """
    evaluation = get_evaluation(db, UUID(evaluation_id))

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )

    # Get new metrics from database
    metrics_records = get_evaluation_metrics(db, UUID(evaluation_id))

    if not metrics_records:
        # No new metrics available, return default values
        return NewMetricsSummaryResponse(
            avg_accuracy=None,
            avg_faithfulness=None,
            avg_reasoning=None,
            avg_context_utilization=None,
            total_cost_usd=0.0,
            avg_latency_ms=0.0,
            total_questions=evaluation.total_questions,
            models_tested=evaluation.models_tested,
            status=evaluation.status
        )

    # Calculate averages from metrics records
    total_accuracy = sum(m.accuracy_score or 0 for m in metrics_records)
    total_faithfulness = sum(m.faithfulness_score or 0 for m in metrics_records)
    total_reasoning = sum(m.reasoning_score or 0 for m in metrics_records)
    total_context_util = sum(m.context_utilization_score or 0 for m in metrics_records)
    total_cost = sum(m.total_cost_usd or 0 for m in metrics_records)
    total_latency = sum(m.avg_latency_ms or 0 for m in metrics_records)

    count = len(metrics_records)
    if count > 0:
        return NewMetricsSummaryResponse(
            avg_accuracy=total_accuracy / count,
            avg_faithfulness=total_faithfulness / count,
            avg_reasoning=total_reasoning / count,
            avg_context_utilization=total_context_util / count,
            total_cost_usd=total_cost,
            avg_latency_ms=total_latency / count,
            total_questions=evaluation.total_questions,
            models_tested=evaluation.models_tested,
            status=evaluation.status
        )

    return NewMetricsSummaryResponse(
        avg_accuracy=None,
        avg_faithfulness=None,
        avg_reasoning=None,
        avg_context_utilization=None,
        total_cost_usd=0.0,
        avg_latency_ms=0.0,
        total_questions=evaluation.total_questions,
        models_tested=evaluation.models_tested,
        status=evaluation.status
    )


@router.get("/{evaluation_id}/metrics-by-model", response_model=NewMetricsByModelResponse)
async def get_new_metrics_by_model(
    evaluation_id: str,
    db: Session = Depends(get_db)
):
    """
    Get new metrics broken down by model for an evaluation.
    """
    evaluation = get_evaluation(db, UUID(evaluation_id))

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )

    # Get new metrics from database
    metrics_records = get_evaluation_metrics(db, UUID(evaluation_id))

    if not metrics_records:
        # No new metrics available
        return NewMetricsByModelResponse(metrics_by_model={})

    # Group metrics by model and include question-level data
    metrics_by_model = {}

    # Also get detailed results for question-level data
    model_results = get_evaluation_results(db, UUID(evaluation_id))

    # Group model results by model
    results_by_model = {}
    for result in model_results:
        model_key = result.model_name
        if model_key not in results_by_model:
            results_by_model[model_key] = []

        results_by_model[model_key].append({
            'question_id': str(result.question_id),
            'latency_ms': result.latency_ms,
            'cost_usd': float(result.cost_usd) if result.cost_usd else 0,
            'tokens_in': result.tokens_in,
            'tokens_out': result.tokens_out,
            'error_message': result.error_message,
            'answer': result.answer
        })

    # Create metrics structure for each model
    for model_name in evaluation.models_tested:
        # Get metric record for this model
        metric_record = next((m for m in metrics_records if m.model_name == model_name), None)

        # Get question results for this model
        question_results = results_by_model.get(model_name, [])

        if metric_record:
            metrics_by_model[model_name] = {
                'model': model_name,
                'provider': 'unknown',  # Could be stored in metrics or derived from model name
                'questions': []
            }

            # Add question-level metrics
            for question_result in question_results:
                question_metrics = {
                    'question_id': question_result['question_id'],
                    'latency_ms': question_result['latency_ms'],
                    'cost_usd': question_result['cost_usd'],
                    'accuracy_score': metric_record.accuracy_score,
                    'faithfulness_score': metric_record.faithfulness_score,
                    'reasoning_score': metric_record.reasoning_score,
                    'context_utilization_score': metric_record.context_utilization_score
                }
                metrics_by_model[model_name]['questions'].append(question_metrics)
        else:
            # No metrics record for this model, create basic structure
            metrics_by_model[model_name] = {
                'model': model_name,
                'provider': 'unknown',
                'questions': []
            }

            for question_result in question_results:
                question_metrics = {
                    'question_id': question_result['question_id'],
                    'latency_ms': question_result['latency_ms'],
                    'cost_usd': question_result['cost_usd'],
                    'accuracy_score': None,
                    'faithfulness_score': None,
                    'reasoning_score': None,
                    'context_utilization_score': None
                }
                metrics_by_model[model_name]['questions'].append(question_metrics)

    return NewMetricsByModelResponse(metrics_by_model=metrics_by_model)


def create_judgment_result(
    db: Session,
    evaluation_id: str,
    model_result_id: str,
    judge_response: str,
    score: float,
    feedback: str,
    judgment_provider: str,
    judgment_model: str
):
    """
    Create a judgment result for a single model evaluation.
    Since the JudgeResult table is designed for comparing two models,
    this function stores the judgment information in the ModelResult's
    item_metadata field as a JSON structure.
    """
    from src.db.models import ModelResult
    from uuid import UUID
    import json

    # Update the ModelResult with judgment information
    model_result = db.query(ModelResult).filter(ModelResult.id == model_result_id).first()
    if not model_result:
        raise ValueError(f"Model result not found: {model_result_id}")

    # Store judgment data in item_metadata
    if model_result.item_metadata is None:
        model_result.item_metadata = {}

    model_result.item_metadata.update({
        "judgment": {
            "judge_response": judge_response,
            "score": score,
            "feedback": feedback,
            "judge_provider": judgment_provider,
            "judge_model": judgment_model
        }
    })

    db.commit()
    return model_result
