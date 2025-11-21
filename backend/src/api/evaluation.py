from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
import json
import csv
import io
import time
from datetime import datetime

from src.db.database import get_db
from src.db.queries import (
    get_workspace, create_test_dataset, get_test_dataset,
    create_test_question, get_dataset_questions, create_evaluation,
    get_evaluation, update_evaluation_status, create_model_result,
    create_judge_result, create_or_update_metrics, get_evaluation_metrics,
    get_evaluation_results, get_evaluation_judge_results, get_workspace_datasets,
    get_workspace_evaluations
)
from src.core.rag_index import RAGIndex
from src.core.llm_providers import get_llm_provider, LLMMessage
from src.core.llm_judge import LLMJudge
from src.core.metrics import MetricsCalculator
from src.core.synthetic_data import SyntheticDataGenerator

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


class CreateTestDatasetRequest(BaseModel):
    workspace_id: str
    name: str
    description: Optional[str] = None
    source: str = "uploaded"  # 'uploaded', 'synthetic', 'manual'


class GenerateSyntheticDataRequest(BaseModel):
    workspace_id: str
    dataset_name: str
    num_questions_per_chunk: int = 2
    include_answers: bool = True
    generation_model: str = "gpt-4o-mini"
    generation_provider: str = "openai"


class TestDatasetResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str]
    source: str
    total_questions: int
    created_at: str


class TestQuestionResponse(BaseModel):
    id: str
    dataset_id: str
    question: str
    expected_answer: Optional[str]
    context: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class CreateEvaluationRequest(BaseModel):
    workspace_id: str
    dataset_id: str
    name: str
    description: Optional[str] = None
    models_to_test: List[Dict[str, str]]  # [{"model": "gpt-4", "provider": "openai"}, ...]
    judge_model: str = "gpt-4o-mini"
    judge_provider: str = "openai"


class EvaluationResponse(BaseModel):
    id: str
    workspace_id: str
    dataset_id: str
    name: str
    status: str
    progress: int
    total_questions: int
    completed_questions: int
    created_at: str


@router.post("/dataset/create", response_model=TestDatasetResponse)
async def create_dataset(
    request: CreateTestDatasetRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new test dataset for evaluations.
    """
    workspace = get_workspace(db, UUID(request.workspace_id))

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    dataset = create_test_dataset(
        db=db,
        workspace_id=UUID(request.workspace_id),
        name=request.name,
        source=request.source,
        description=request.description
    )

    return TestDatasetResponse(
        id=str(dataset.id),
        workspace_id=str(dataset.workspace_id),
        name=dataset.name,
        description=dataset.description,
        source=dataset.source,
        total_questions=dataset.total_questions,
        created_at=dataset.created_at.isoformat()
    )


@router.post("/dataset/{dataset_id}/upload-jsonl")
async def upload_test_questions_jsonl(
    dataset_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload test questions from a JSONL file.

    Expected format: {"question": "...", "expected_answer": "..."}
    """
    dataset = get_test_dataset(db, UUID(dataset_id))

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Read and parse JSONL
    content = await file.read()
    lines = content.decode('utf-8').strip().split('\n')

    questions_added = 0
    for line in lines:
        if not line.strip():
            continue

        try:
            data = json.loads(line)
            create_test_question(
                db=db,
                dataset_id=UUID(dataset_id),
                question=data.get('question', ''),
                expected_answer=data.get('expected_answer'),
                context=data.get('context', ''),
                metadata=data.get('metadata', {})
            )
            questions_added += 1
        except Exception as e:
            print(f"Error parsing line: {line}, error: {str(e)}")
            continue

    # Update dataset total questions
    dataset.total_questions = questions_added
    db.commit()

    return {
        "dataset_id": dataset_id,
        "questions_added": questions_added,
        "message": f"Successfully added {questions_added} questions"
    }


@router.post("/dataset/{dataset_id}/upload-csv")
async def upload_test_questions_csv(
    dataset_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload test questions from a CSV file.

    Expected columns: question, expected_answer (optional)
    """
    dataset = get_test_dataset(db, UUID(dataset_id))

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Read and parse CSV
    content = await file.read()
    csv_file = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(csv_file)

    questions_added = 0
    for row in reader:
        try:
            create_test_question(
                db=db,
                dataset_id=UUID(dataset_id),
                question=row.get('question', ''),
                expected_answer=row.get('expected_answer'),
                metadata={}
            )
            questions_added += 1
        except Exception as e:
            print(f"Error parsing row: {row}, error: {str(e)}")
            continue

    # Update dataset total questions
    dataset.total_questions = questions_added
    db.commit()

    return {
        "dataset_id": dataset_id,
        "questions_added": questions_added,
        "message": f"Successfully added {questions_added} questions"
    }


@router.post("/dataset/{dataset_id}/questions")
async def add_question_to_dataset(
    dataset_id: str,
    question_data: dict,
    db: Session = Depends(get_db)
):
    """
    Add a single question to a dataset.
    """
    from src.db.queries import get_test_dataset, create_test_question

    dataset = get_test_dataset(db, UUID(dataset_id))
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    question = create_test_question(
        db,
        dataset_id=UUID(dataset_id),
        question=question_data["question"],
        expected_answer=question_data.get("expected_answer"),
        context=question_data.get("context")
    )

    return {
        "id": str(question.id),
        "message": "Question added successfully"
    }


@router.get("/dataset/{dataset_id}", response_model=TestDatasetResponse)
async def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific dataset.
    """
    dataset = get_test_dataset(db, UUID(dataset_id))

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    return TestDatasetResponse(
        id=str(dataset.id),
        workspace_id=str(dataset.workspace_id),
        name=dataset.name,
        description=dataset.description,
        source=dataset.source,
        total_questions=dataset.total_questions,
        created_at=dataset.created_at.isoformat()
    )


@router.get("/dataset/{dataset_id}/questions", response_model=List[TestQuestionResponse])
async def get_questions(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all questions for a dataset.
    """
    dataset = get_test_dataset(db, UUID(dataset_id))

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    questions = get_dataset_questions(db, UUID(dataset_id))

    return [
        TestQuestionResponse(
            id=str(q.id),
            dataset_id=str(q.dataset_id),
            question=q.question,
            expected_answer=q.expected_answer,
            context=q.context,
            created_at=q.created_at.isoformat()
        )
        for q in questions
    ]


@router.post("/dataset/generate-synthetic", response_model=TestDatasetResponse)
async def generate_synthetic_dataset(
    request: GenerateSyntheticDataRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate synthetic test questions from workspace documents.
    """
    workspace = get_workspace(db, UUID(request.workspace_id))

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    # Create dataset
    dataset = create_test_dataset(
        db=db,
        workspace_id=UUID(request.workspace_id),
        name=request.dataset_name,
        source="synthetic",
        generation_model=request.generation_model
    )

    # Add background task to generate questions
    background_tasks.add_task(
        generate_synthetic_questions_background,
        UUID(request.workspace_id),
        dataset.id,
        request.num_questions_per_chunk,
        request.include_answers,
        request.generation_model,
        request.generation_provider,
        db
    )

    return TestDatasetResponse(
        id=str(dataset.id),
        workspace_id=str(dataset.workspace_id),
        name=dataset.name,
        description=dataset.description,
        source=dataset.source,
        total_questions=0,  # Will be updated by background task
        created_at=dataset.created_at.isoformat()
    )


async def generate_synthetic_questions_background(
    workspace_id: UUID,
    dataset_id: UUID,
    num_questions_per_chunk: int,
    include_answers: bool,
    generation_model: str,
    generation_provider: str,
    db: Session
):
    """Background task to generate synthetic questions."""
    try:
        # Get workspace and documents
        workspace = get_workspace(db, workspace_id)
        from src.db.queries import get_workspace_documents, get_document_chunks

        documents = get_workspace_documents(db, workspace_id)

        # Collect all chunks with document info
        all_chunks = []
        chunk_metadatas = []
        for doc in documents:
            chunks = get_document_chunks(db, doc.id)
            for chunk in chunks[:10]:  # Limit per doc
                all_chunks.append(chunk.content)
                chunk_metadatas.append({
                    'document_filename': doc.filename,
                    'document_id': str(doc.id),
                    'chunk_index': chunk.chunk_index
                })

        if not all_chunks:
            return

        # Generate questions
        generator = SyntheticDataGenerator(
            provider=generation_provider,
            model=generation_model
        )

        questions = await generator.generate_questions_from_chunks(
            chunks=all_chunks,
            num_questions_per_chunk=num_questions_per_chunk,
            include_answers=include_answers,
            chunk_metadatas=chunk_metadatas
        )

        # Limit total questions to a reasonable number (num_questions_per_chunk * expected_chunks)
        # But we'll let the frontend handle limiting to exact number
        # Save to database - use filename as context instead of chunk content
        for q in questions:
            # Extract filename from metadata if available
            filename = q.metadata.get('chunk_metadata', {}).get('document_filename', 'Document')
            create_test_question(
                db=db,
                dataset_id=dataset_id,
                question=q.question,
                expected_answer=q.expected_answer,
                context=filename,  # Store filename instead of chunk content
                metadata=q.metadata
            )

        # Update dataset
        dataset = get_test_dataset(db, dataset_id)
        dataset.total_questions = len(questions)
        db.commit()

    except Exception as e:
        print(f"Error generating synthetic questions: {str(e)}")


@router.post("/create", response_model=EvaluationResponse)
async def create_evaluation_endpoint(
    request: CreateEvaluationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create and run a new evaluation comparing multiple models.
    """
    # Verify workspace and dataset exist
    workspace = get_workspace(db, UUID(request.workspace_id))
    dataset = get_test_dataset(db, UUID(request.dataset_id))

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    questions = get_dataset_questions(db, UUID(request.dataset_id))

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset has no questions"
        )

    # Create evaluation
    models_tested = [f"{m['provider']}:{m['model']}" for m in request.models_to_test]

    evaluation = create_evaluation(
        db=db,
        workspace_id=UUID(request.workspace_id),
        dataset_id=UUID(request.dataset_id),
        name=request.name,
        models_tested=models_tested,
        description=request.description,
        judge_model=request.judge_model,
        judge_provider=request.judge_provider,
        total_questions=len(questions),
        started_at=datetime.utcnow()
    )

    # Run evaluation in background
    background_tasks.add_task(
        run_evaluation_background,
        evaluation.id,
        request.models_to_test,
        request.judge_model,
        request.judge_provider,
        db
    )

    return EvaluationResponse(
        id=str(evaluation.id),
        workspace_id=str(evaluation.workspace_id),
        dataset_id=str(evaluation.dataset_id),
        name=evaluation.name,
        status=evaluation.status,
        progress=0,
        total_questions=len(questions),
        completed_questions=0,
        created_at=evaluation.created_at.isoformat()
    )


async def run_evaluation_background(
    evaluation_id: UUID,
    models_to_test: List[Dict[str, str]],
    judge_model: str,
    judge_provider: str,
    db: Session
):
    """
    Background task to run evaluation.

    This will be a simplified version. Full implementation would be more complex.
    """
    try:
        # Update status
        update_evaluation_status(db, evaluation_id, "running", started_at=datetime.utcnow())

        # Get evaluation details
        evaluation = get_evaluation(db, evaluation_id)
        questions = get_dataset_questions(db, evaluation.dataset_id)
        workspace = get_workspace(db, evaluation.workspace_id)

        # Initialize RAG index
        rag_index = RAGIndex(
            collection_name=workspace.vector_collection_id,
            embedding_provider=workspace.embedding_provider,
            embedding_model=workspace.embedding_model
        )

        # Initialize judge
        judge = LLMJudge(provider=judge_provider, model=judge_model)

        # Process each question
        for idx, question in enumerate(questions):
            # Retrieve context
            results = await rag_index.query(question.question, top_k=5)
            context = "\n\n".join(results['documents'])

            # Get answers from each model
            model_responses = []
            for model_config in models_to_test:
                start_time = time.time()

                # Create prompt
                prompt = f"""Answer the following question based on the provided context.

Context:
{context}

Question: {question.question}

Answer:"""

                llm = get_llm_provider(model_config['provider'])
                messages = [LLMMessage(role="user", content=prompt)]

                response = await llm.generate(
                    messages=messages,
                    model=model_config['model'],
                    temperature=0.7
                )

                latency_ms = int((time.time() - start_time) * 1000)

                # Store result
                result = create_model_result(
                    db=db,
                    evaluation_id=evaluation_id,
                    question_id=question.id,
                    model_name=model_config['model'],
                    provider=model_config['provider'],
                    answer=response.content,
                    retrieved_chunks=results,
                    tokens_in=response.tokens_in,
                    tokens_out=response.tokens_out,
                    latency_ms=latency_ms,
                    cost_usd=float(response.cost_usd)
                )

                # Evaluate quality metrics using LLM judge
                try:
                    quality_metrics = await judge.evaluate_all_quality_metrics(
                        question=question.question,
                        expected_answer=question.expected_answer,
                        context=context,
                        generated_answer=response.content
                    )

                    # Store quality metrics
                    from src.db.models import QuestionMetrics
                    import uuid

                    metrics_record = QuestionMetrics(
                        id=uuid.uuid4(),
                        model_result_id=result.id,
                        evaluation_id=evaluation_id,
                        question_id=question.id,
                        accuracy_score=quality_metrics['accuracy']['score'],
                        faithfulness_score=quality_metrics['faithfulness']['score'],
                        reasoning_score=quality_metrics['reasoning']['score'],
                        context_utilization_score=quality_metrics['context_utilization']['score'],
                        latency_ms=latency_ms,
                        cost_usd=float(response.cost_usd),
                        accuracy_explanation=quality_metrics['accuracy']['explanation'],
                        faithfulness_explanation=quality_metrics['faithfulness']['explanation'],
                        reasoning_explanation=quality_metrics['reasoning']['explanation'],
                        context_utilization_explanation=quality_metrics['context_utilization']['explanation']
                    )
                    db.add(metrics_record)
                    db.commit()

                except Exception as metric_error:
                    print(f"Error evaluating quality metrics: {str(metric_error)}")
                    # Continue execution even if metrics fail

                model_responses.append(result)

            # Compare pairs with judge (if 2 models)
            if len(model_responses) == 2:
                judge_result = await judge.judge_pair(
                    question=question.question,
                    answer_a=model_responses[0].answer,
                    answer_b=model_responses[1].answer,
                    context=context,
                    expected_answer=question.expected_answer
                )

                create_judge_result(
                    db=db,
                    evaluation_id=evaluation_id,
                    question_id=question.id,
                    model_a_result_id=model_responses[0].id,
                    model_b_result_id=model_responses[1].id,
                    judge_model=judge_model,
                    judge_provider=judge_provider,
                    winner=judge_result.winner,
                    score_a=judge_result.score_a,
                    score_b=judge_result.score_b,
                    reasoning=judge_result.reasoning,
                    confidence=judge_result.confidence,
                    criteria_scores=judge_result.criteria_scores
                )

            # Update progress
            completed = idx + 1
            progress = int((completed / len(questions)) * 100)
            update_evaluation_status(
                db, evaluation_id, "running",
                completed_questions=completed,
                progress=progress
            )

        # Calculate and store evaluation summary
        try:
            from src.db.models import QuestionMetrics, EvaluationSummary
            from src.core.llm_judge import calculate_overall_score

            # Get all metrics for this evaluation
            all_metrics = db.query(QuestionMetrics).filter(
                QuestionMetrics.evaluation_id == evaluation_id
            ).all()

            if all_metrics:
                # Calculate averages
                total_metrics = len(all_metrics)
                avg_accuracy = sum(m.accuracy_score for m in all_metrics if m.accuracy_score is not None) / sum(1 for m in all_metrics if m.accuracy_score is not None) if any(m.accuracy_score is not None for m in all_metrics) else None
                avg_faithfulness = sum(m.faithfulness_score for m in all_metrics if m.faithfulness_score is not None) / sum(1 for m in all_metrics if m.faithfulness_score is not None) if any(m.faithfulness_score is not None for m in all_metrics) else None
                avg_reasoning = sum(m.reasoning_score for m in all_metrics if m.reasoning_score is not None) / sum(1 for m in all_metrics if m.reasoning_score is not None) if any(m.reasoning_score is not None for m in all_metrics) else None
                avg_context_util = sum(m.context_utilization_score for m in all_metrics if m.context_utilization_score is not None) / sum(1 for m in all_metrics if m.context_utilization_score is not None) if any(m.context_utilization_score is not None for m in all_metrics) else None
                avg_latency = int(sum(m.latency_ms for m in all_metrics) / total_metrics)
                avg_cost = sum(m.cost_usd for m in all_metrics) / total_metrics
                total_cost = sum(m.cost_usd for m in all_metrics)

                # Calculate overall score
                overall = calculate_overall_score({
                    "accuracy": avg_accuracy,
                    "faithfulness": avg_faithfulness,
                    "reasoning": avg_reasoning,
                    "context_utilization": avg_context_util
                })

                # Group by model for model-specific summaries
                models_summary = {}
                for model_config in models_to_test:
                    model_key = f"{model_config['provider']}:{model_config['model']}"

                    # Get metrics for this specific model
                    # Note: Would need proper join with ModelResult table to filter by model
                    # For now, we store the model config in summary

                    # Filter by checking model_result's model name (would need join)
                    # For now, store aggregate data
                    models_summary[model_key] = {
                        "model": model_config['model'],
                        "provider": model_config['provider']
                    }

                # Store summary
                summary = EvaluationSummary(
                    id=uuid.uuid4(),
                    evaluation_id=evaluation_id,
                    avg_accuracy=avg_accuracy,
                    avg_faithfulness=avg_faithfulness,
                    avg_reasoning=avg_reasoning,
                    avg_context_utilization=avg_context_util,
                    avg_latency_ms=avg_latency,
                    avg_cost_usd=avg_cost,
                    total_cost_usd=total_cost,
                    overall_score=overall,
                    total_questions=len(questions),
                    total_model_tests=total_metrics,
                    successful_evaluations=total_metrics,
                    failed_evaluations=0,
                    models_summary=models_summary
                )
                db.add(summary)
                db.commit()

        except Exception as summary_error:
            print(f"Error calculating summary metrics: {str(summary_error)}")

        # Mark as completed
        update_evaluation_status(
            db, evaluation_id, "completed",
            completed_at=datetime.utcnow(),
            progress=100
        )

    except Exception as e:
        update_evaluation_status(
            db, evaluation_id, "failed",
            error_message=str(e)
        )
        print(f"Error running evaluation: {str(e)}")


@router.get("/{evaluation_id}", response_model=EvaluationResponse)
async def get_evaluation_status(
    evaluation_id: str,
    db: Session = Depends(get_db)
):
    """Get status of an evaluation."""
    evaluation = get_evaluation(db, UUID(evaluation_id))

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )

    return EvaluationResponse(
        id=str(evaluation.id),
        workspace_id=str(evaluation.workspace_id),
        dataset_id=str(evaluation.dataset_id),
        name=evaluation.name,
        status=evaluation.status,
        progress=evaluation.progress,
        total_questions=evaluation.total_questions,
        completed_questions=evaluation.completed_questions,
        created_at=evaluation.created_at.isoformat()
    )


@router.get("/workspace/{workspace_id}/datasets", response_model=List[TestDatasetResponse])
async def list_workspace_datasets(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """List all datasets in a workspace."""
    datasets = get_workspace_datasets(db, UUID(workspace_id))

    return [
        TestDatasetResponse(
            id=str(d.id),
            workspace_id=str(d.workspace_id),
            name=d.name,
            description=d.description,
            source=d.source,
            total_questions=d.total_questions,
            created_at=d.created_at.isoformat()
        )
        for d in datasets
    ]


@router.get("/workspace/{workspace_id}/evaluations", response_model=List[EvaluationResponse])
async def list_workspace_evaluations(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """List all evaluations in a workspace."""
    evaluations = get_workspace_evaluations(db, UUID(workspace_id))

    return [
        EvaluationResponse(
            id=str(e.id),
            workspace_id=str(e.workspace_id),
            dataset_id=str(e.dataset_id),
            name=e.name,
            status=e.status,
            progress=e.progress,
            total_questions=e.total_questions,
            completed_questions=e.completed_questions,
            created_at=e.created_at.isoformat()
        )
        for e in evaluations
    ]


@router.get("/{evaluation_id}/summary")
async def get_evaluation_summary(
    evaluation_id: str,
    db: Session = Depends(get_db)
):
    """
    Get evaluation summary with aggregate metrics.
    Returns average scores across all models and questions.
    """
    from src.db.models import EvaluationSummary

    summary = db.query(EvaluationSummary).filter(
        EvaluationSummary.evaluation_id == UUID(evaluation_id)
    ).first()

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation summary not found"
        )

    return {
        "evaluation_id": str(summary.evaluation_id),
        "avg_accuracy": float(summary.avg_accuracy) if summary.avg_accuracy else None,
        "avg_faithfulness": float(summary.avg_faithfulness) if summary.avg_faithfulness else None,
        "avg_reasoning": float(summary.avg_reasoning) if summary.avg_reasoning else None,
        "avg_context_utilization": float(summary.avg_context_utilization) if summary.avg_context_utilization else None,
        "avg_latency_ms": summary.avg_latency_ms,
        "avg_cost_usd": float(summary.avg_cost_usd),
        "total_cost_usd": float(summary.total_cost_usd),
        "overall_score": float(summary.overall_score) if summary.overall_score else None,
        "total_questions": summary.total_questions,
        "total_model_tests": summary.total_model_tests,
        "successful_evaluations": summary.successful_evaluations,
        "failed_evaluations": summary.failed_evaluations,
        "models_summary": summary.models_summary,
        "created_at": summary.created_at.isoformat()
    }


@router.get("/{evaluation_id}/metrics")
async def get_evaluation_metrics_endpoint(
    evaluation_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed metrics for all question-model combinations in an evaluation.
    Returns metrics grouped by model.
    """
    from src.db.models import QuestionMetrics, ModelResult

    # Get all metrics with model results
    metrics = db.query(QuestionMetrics, ModelResult).join(
        ModelResult,
        QuestionMetrics.model_result_id == ModelResult.id
    ).filter(
        QuestionMetrics.evaluation_id == UUID(evaluation_id)
    ).all()

    if not metrics:
        return {
            "evaluation_id": evaluation_id,
            "metrics_by_model": {},
            "total_metrics": 0
        }

    # Group by model
    metrics_by_model = {}

    for metric, result in metrics:
        model_key = f"{result.provider}/{result.model_name}"

        if model_key not in metrics_by_model:
            metrics_by_model[model_key] = {
                "model": result.model_name,
                "provider": result.provider,
                "questions": []
            }

        metrics_by_model[model_key]["questions"].append({
            "question_id": str(metric.question_id),
            "accuracy_score": float(metric.accuracy_score) if metric.accuracy_score else None,
            "faithfulness_score": float(metric.faithfulness_score) if metric.faithfulness_score else None,
            "reasoning_score": float(metric.reasoning_score) if metric.reasoning_score else None,
            "context_utilization_score": float(metric.context_utilization_score) if metric.context_utilization_score else None,
            "latency_ms": metric.latency_ms,
            "cost_usd": float(metric.cost_usd),
            "accuracy_explanation": metric.accuracy_explanation,
            "faithfulness_explanation": metric.faithfulness_explanation,
            "reasoning_explanation": metric.reasoning_explanation,
            "context_utilization_explanation": metric.context_utilization_explanation
        })

    return {
        "evaluation_id": evaluation_id,
        "metrics_by_model": metrics_by_model,
        "total_metrics": len(metrics)
    }
