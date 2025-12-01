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
    create_test_question, get_test_question, get_dataset_questions, create_evaluation,
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
    metadata: Optional[Dict[str, Any]]


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


@router.get("/dataset/{dataset_id}", response_model=TestDatasetResponse)
async def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a single dataset by ID.
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
            metadata=q.item_metadata
        )
        for q in questions
    ]


@router.post("/dataset/{dataset_id}/questions")
async def add_question_to_dataset(
    dataset_id: str,
    request: dict,  # Expecting {question, expected_answer?, context?}
    db: Session = Depends(get_db)
):
    """
    Add a single question to an existing dataset.
    """
    dataset = get_test_dataset(db, UUID(dataset_id))

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Create the question
    question = create_test_question(
        db=db,
        dataset_id=UUID(dataset_id),
        question=request.get('question', ''),
        expected_answer=request.get('expected_answer'),
        context=request.get('context')
    )

    # Update dataset total questions count
    dataset.total_questions = len(get_dataset_questions(db, UUID(dataset_id)))
    db.commit()

    return {"success": True, "question_id": str(question.id)}


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
        request.generation_provider
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
    generation_provider: str
):
    """Background task to generate synthetic questions."""
    from src.db.database import SessionLocal
    db = SessionLocal()
    try:
        # Get workspace and documents
        workspace = get_workspace(db, workspace_id)
        from src.db.queries import get_workspace_documents, get_document_chunks

        documents = get_workspace_documents(db, workspace_id)

        # Collect all chunks
        all_chunks = []
        for doc in documents:
            chunks = get_document_chunks(db, doc.id)
            all_chunks.extend([chunk.content for chunk in chunks[:10]])  # Limit per doc

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
            include_answers=include_answers
        )

        # Save to database
        for q in questions:
            create_test_question(
                db=db,
                dataset_id=dataset_id,
                question=q.question,
                expected_answer=q.expected_answer,
                context=q.context,
                metadata=q.metadata
            )

        # Update dataset
        dataset = get_test_dataset(db, dataset_id)
        dataset.total_questions = len(questions)
        db.commit()

    except Exception as e:
        print(f"Error generating synthetic questions: {str(e)}")
    finally:
        db.close()


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
        request.judge_provider
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
    judge_provider: str
):
    """
    Background task to run evaluation.

    This will be a simplified version. Full implementation would be more complex.
    """
    from src.db.database import SessionLocal
    db = SessionLocal()
    try:
        print(f"\n=== Starting evaluation {evaluation_id} ===")

        # Update status
        print("Step 1: Updating evaluation status to 'running'")
        update_evaluation_status(db, evaluation_id, "running", started_at=datetime.utcnow())

        # Get evaluation details
        print("Step 2: Fetching evaluation, questions, and workspace")
        evaluation = get_evaluation(db, evaluation_id)
        questions = get_dataset_questions(db, evaluation.dataset_id)
        workspace = get_workspace(db, evaluation.workspace_id)
        print(f"Found {len(questions)} questions to evaluate")

        # Initialize RAG index
        print(f"Step 3: Initializing RAG index with collection: {workspace.vector_collection_id}")
        try:
            rag_index = RAGIndex(
                collection_name=workspace.vector_collection_id,
                embedding_provider=workspace.embedding_provider,
                embedding_model=workspace.embedding_model
            )
            print("RAG index initialized successfully")
        except Exception as e:
            print(f"ERROR initializing RAG index: {str(e)}")
            raise Exception(f"Failed to initialize RAG index: {str(e)}")

        # Initialize judge
        print(f"Step 4: Initializing judge with provider={judge_provider}, model={judge_model}")
        try:
            judge = LLMJudge(provider=judge_provider, model=judge_model)
            print("Judge initialized successfully")
        except Exception as e:
            print(f"ERROR initializing judge: {str(e)}")
            raise Exception(f"Failed to initialize judge: {str(e)}")

        # Process each question
        print(f"\nStep 5: Processing {len(questions)} questions")
        for idx, question in enumerate(questions):
            print(f"\n--- Question {idx + 1}/{len(questions)}: {question.question[:50]}... ---")

            # Retrieve context
            try:
                print(f"  5.{idx}.1: Querying RAG index")
                results = await rag_index.query(question.question, top_k=5)
                context = "\n\n".join(results['documents'])
                print(f"  Retrieved {len(results['documents'])} chunks")
            except Exception as e:
                print(f"  ERROR querying RAG index: {str(e)}")
                raise Exception(f"Failed to query RAG index for question {idx + 1}: {str(e)}")

            # Get answers from each model
            model_responses = []
            for model_idx, model_config in enumerate(models_to_test):
                print(f"  5.{idx}.{model_idx + 2}: Testing model {model_config['provider']}:{model_config['model']}")
                start_time = time.time()

                try:
                    # Create prompt
                    prompt = f"""Answer the following question based on the provided context.

Context:
{context}

Question: {question.question}

Answer:"""

                    print(f"    Getting LLM provider: {model_config['provider']}")
                    llm = get_llm_provider(model_config['provider'])
                    messages = [LLMMessage(role="user", content=prompt)]

                    print(f"    Calling LLM.generate()")
                    response = await llm.generate(
                        messages=messages,
                        model=model_config['model'],
                        temperature=0.7
                    )

                    latency_ms = int((time.time() - start_time) * 1000)
                    print(f"    Response received in {latency_ms}ms")

                    # Store result
                    print(f"    Storing model result in database")
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

                    model_responses.append(result)
                    print(f"    Model result saved successfully")

                except Exception as e:
                    print(f"    ERROR with model {model_config['provider']}:{model_config['model']}: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    raise Exception(f"Failed to get response from {model_config['provider']}:{model_config['model']}: {str(e)}")

            # Compare pairs with judge (if 2 models)
            if len(model_responses) == 2:
                print(f"  5.{idx}.judge: Running judge comparison")
                try:
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
                    print(f"  Judge result saved successfully")
                except Exception as e:
                    print(f"  ERROR in judge comparison: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    raise Exception(f"Failed to run judge for question {idx + 1}: {str(e)}")

            # Update progress
            completed = idx + 1
            progress = int((completed / len(questions)) * 100)
            print(f"  Progress: {progress}% ({completed}/{len(questions)} completed)")
            update_evaluation_status(
                db, evaluation_id, "running",
                completed_questions=completed,
                progress=progress
            )

        # Mark as completed
        print("\nStep 6: Marking evaluation as completed")
        update_evaluation_status(
            db, evaluation_id, "completed",
            completed_at=datetime.utcnow(),
            progress=100
        )
        print(f"=== Evaluation {evaluation_id} completed successfully ===\n")

    except Exception as e:
        error_msg = str(e)
        print(f"\n!!! EVALUATION FAILED !!!")
        print(f"Error: {error_msg}")
        import traceback
        traceback.print_exc()

        update_evaluation_status(
            db, evaluation_id, "failed",
            error_message=error_msg
        )
        print(f"Error running evaluation: {error_msg}")
    finally:
        db.close()


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


@router.post("/{evaluation_id}/judge")
async def start_judgment(
    evaluation_id: str,
    request: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Start judgment process for a completed evaluation.
    """
    try:
        evaluation_uuid = UUID(evaluation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evaluation ID format")

    # Check if evaluation exists and is completed
    evaluation = get_evaluation(db, evaluation_uuid)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    if evaluation.status != "completed":
        raise HTTPException(status_code=400, detail="Evaluation must be completed before judgment")

    # Get judgment type
    judgment_type = request.get("judgment_type")
    if not judgment_type or judgment_type not in ["human", "llm", "both"]:
        raise HTTPException(status_code=400, detail="Invalid judgment type. Must be 'human', 'llm', or 'both'")

    # Update evaluation status
    evaluation.status = "judging"
    evaluation.judgment_type = judgment_type
    db.commit()

    # Start judgment in background
    background_tasks.add_task(run_judgment_background, evaluation_id, judgment_type)

    return {"message": f"Judgment process started with type: {judgment_type}"}


async def run_judgment_background(
    evaluation_id: str,
    judgment_type: str
):
    """
    Background task to run judgment process.
    """
    from src.core.config import settings
    from src.db.database import SessionLocal
    from src.core.llm_judge import LLMJudge
    from src.core.llm_providers import get_llm_provider
    from src.api.results import create_judgment_result

    print(f"\n=== Starting judgment for evaluation {evaluation_id} with type: {judgment_type} ===")

    db = SessionLocal()
    try:
        # Get evaluation details
        evaluation = get_evaluation(db, UUID(evaluation_id))
        if not evaluation:
            print(f"Evaluation {evaluation_id} not found")
            return

        # Get model results
        model_results = get_evaluation_results(db, UUID(evaluation_id))

        if judgment_type in ["llm", "both"]:
            # Use LLM judge for automatic evaluation
            print("Step 1: Initializing LLM judge")
            judge_provider = "openai"  # Default judge provider
            judge_model = "gpt-4o-mini"  # Default judge model

            try:
                judge = LLMJudge(provider=judge_provider, model=judge_model)

                print(f"Step 2: Processing {len(model_results)} model results with LLM judge")

                for i, model_result in enumerate(model_results):
                    print(f"Processing result {i+1}/{len(model_results)} for model {model_result.model_name}")

                    try:
                        # Get the question for this model result
                        question = get_test_question(db, model_result.question_id)
                        if not question:
                            print(f"Question {model_result.question_id} not found for result {model_result.id}")
                            continue

                        # Create judge result using evaluate_single_answer
                        judge_result = await judge.evaluate_single_answer(
                            question=question.question,
                            answer=model_result.answer,  # Use model_result.answer instead of response
                            context=None,  # Context not directly available in model result
                            reference_answer=None  # No ground truth for RAG evaluation
                        )

                        # Store judgment result in model result metadata
                        if model_result.item_metadata is None:
                            model_result.item_metadata = {}

                        model_result.item_metadata.update({
                            "judgment": {
                                "judge_model": judge_model,
                                "judge_provider": judge_provider,
                                "judge_response": judge_result.get("reasoning", ""),
                                "score": judge_result.get("overall_score", 0),
                                "criteria_scores": judge_result.get("criteria_scores", {}),
                                "feedback": judge_result.get("feedback", "")
                            }
                        })

                        db.commit()
                        db.refresh(model_result)

                        print(f"Completed judgment for result {model_result.id}")

                    except Exception as e:
                        print(f"Error judging result {model_result.id}: {str(e)}")
                        continue

                print("Step 3: LLM judgment completed")

            except Exception as e:
                print(f"Error in LLM judgment: {str(e)}")

        if judgment_type in ["human", "both"]:
            # Human judgment would require additional implementation
            print(f"Human judgment requested - would need frontend implementation")
            # For now, we'll create placeholder results
            for model_result in model_results:
                try:
                    # Store placeholder judgment in model result metadata
                    if model_result.item_metadata is None:
                        model_result.item_metadata = {}

                    model_result.item_metadata.update({
                        "judgment": {
                            "judge_model": "human",
                            "judge_provider": "human",
                            "judge_response": "Human judgment pending",
                            "score": 0.0,
                            "criteria_scores": {},
                            "feedback": "Human judgment not yet implemented - requires frontend interface"
                        }
                    })

                    db.commit()
                    db.refresh(model_result)
                except Exception as e:
                    print(f"Error creating placeholder human judgment: {str(e)}")
                    continue

        # Update evaluation status
        evaluation.status = "completed"
        evaluation.completed_at = datetime.utcnow()
        db.commit()

        print(f"=== Judgment process completed for evaluation {evaluation_id} ===")

    except Exception as e:
        print(f"Error in judgment background task: {str(e)}")
        # Update evaluation status to failed
        evaluation.status = "failed"
        db.commit()
    finally:
        db.close()
