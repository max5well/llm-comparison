from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from uuid import UUID

from src.db.models import (
    User, Workspace, Document, Chunk, TestDataset, TestQuestion,
    Evaluation, ModelResult, JudgeResult, EvaluationMetrics
)


# User queries
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_api_key(db: Session, api_key: str) -> Optional[User]:
    return db.query(User).filter(User.api_key == api_key, User.is_active == True).first()


def create_user(db: Session, email: str, api_key: str, api_key_hash: str) -> User:
    user = User(email=email, api_key=api_key, api_key_hash=api_key_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# Workspace queries
def get_workspace(db: Session, workspace_id: UUID) -> Optional[Workspace]:
    return db.query(Workspace).filter(Workspace.id == workspace_id).first()


def get_user_workspaces(db: Session, user_id: UUID) -> List[Workspace]:
    return db.query(Workspace).filter(Workspace.user_id == user_id).all()


def create_workspace(db: Session, user_id: UUID, name: str, embedding_model: str,
                     embedding_provider: str, **kwargs) -> Workspace:
    workspace = Workspace(
        user_id=user_id,
        name=name,
        embedding_model=embedding_model,
        embedding_provider=embedding_provider,
        **kwargs
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


def delete_workspace(db: Session, workspace_id: UUID) -> bool:
    workspace = get_workspace(db, workspace_id)
    if workspace:
        db.delete(workspace)
        db.commit()
        return True
    return False


# Document queries
def get_document(db: Session, document_id: UUID) -> Optional[Document]:
    return db.query(Document).filter(Document.id == document_id).first()


def get_workspace_documents(db: Session, workspace_id: UUID) -> List[Document]:
    return db.query(Document).filter(Document.workspace_id == workspace_id).all()


def create_document(db: Session, workspace_id: UUID, filename: str, file_path: str,
                    file_type: str, **kwargs) -> Document:
    document = Document(
        workspace_id=workspace_id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        **kwargs
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def update_document_status(db: Session, document_id: UUID, status: str,
                          error_message: Optional[str] = None) -> Optional[Document]:
    document = get_document(db, document_id)
    if document:
        document.processing_status = status
        if error_message:
            document.error_message = error_message
        db.commit()
        db.refresh(document)
    return document


# Chunk queries
def create_chunk(db: Session, document_id: UUID, workspace_id: UUID, chunk_index: int,
                content: str, **kwargs) -> Chunk:
    chunk = Chunk(
        document_id=document_id,
        workspace_id=workspace_id,
        chunk_index=chunk_index,
        content=content,
        **kwargs
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    return chunk


def get_document_chunks(db: Session, document_id: UUID) -> List[Chunk]:
    return db.query(Chunk).filter(Chunk.document_id == document_id).order_by(Chunk.chunk_index).all()


# Test dataset queries
def create_test_dataset(db: Session, workspace_id: UUID, name: str, source: str,
                       **kwargs) -> TestDataset:
    dataset = TestDataset(
        workspace_id=workspace_id,
        name=name,
        source=source,
        **kwargs
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def get_test_dataset(db: Session, dataset_id: UUID) -> Optional[TestDataset]:
    return db.query(TestDataset).filter(TestDataset.id == dataset_id).first()


def get_workspace_datasets(db: Session, workspace_id: UUID) -> List[TestDataset]:
    return db.query(TestDataset).filter(TestDataset.workspace_id == workspace_id).all()


# Test question queries
def create_test_question(db: Session, dataset_id: UUID, question: str,
                        expected_answer: Optional[str] = None, **kwargs) -> TestQuestion:
    test_question = TestQuestion(
        dataset_id=dataset_id,
        question=question,
        expected_answer=expected_answer,
        **kwargs
    )
    db.add(test_question)
    db.commit()
    db.refresh(test_question)
    return test_question


def get_dataset_questions(db: Session, dataset_id: UUID) -> List[TestQuestion]:
    return db.query(TestQuestion).filter(TestQuestion.dataset_id == dataset_id).all()


# Evaluation queries
def create_evaluation(db: Session, workspace_id: UUID, dataset_id: UUID, name: str,
                     models_tested: List[str], **kwargs) -> Evaluation:
    evaluation = Evaluation(
        workspace_id=workspace_id,
        dataset_id=dataset_id,
        name=name,
        models_tested=models_tested,
        **kwargs
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return evaluation


def get_evaluation(db: Session, evaluation_id: UUID) -> Optional[Evaluation]:
    return db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()


def get_workspace_evaluations(db: Session, workspace_id: UUID) -> List[Evaluation]:
    return db.query(Evaluation).filter(Evaluation.workspace_id == workspace_id).all()


def update_evaluation_status(db: Session, evaluation_id: UUID, status: str,
                            **kwargs) -> Optional[Evaluation]:
    evaluation = get_evaluation(db, evaluation_id)
    if evaluation:
        evaluation.status = status
        for key, value in kwargs.items():
            setattr(evaluation, key, value)
        db.commit()
        db.refresh(evaluation)
    return evaluation


# Model result queries
def create_model_result(db: Session, evaluation_id: UUID, question_id: UUID,
                       model_name: str, provider: str, answer: str, **kwargs) -> ModelResult:
    result = ModelResult(
        evaluation_id=evaluation_id,
        question_id=question_id,
        model_name=model_name,
        provider=provider,
        answer=answer,
        **kwargs
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def get_evaluation_results(db: Session, evaluation_id: UUID) -> List[ModelResult]:
    return db.query(ModelResult).filter(ModelResult.evaluation_id == evaluation_id).all()


# Judge result queries
def create_judge_result(db: Session, evaluation_id: UUID, question_id: UUID,
                       model_a_result_id: UUID, model_b_result_id: UUID,
                       judge_model: str, judge_provider: str, **kwargs) -> JudgeResult:
    result = JudgeResult(
        evaluation_id=evaluation_id,
        question_id=question_id,
        model_a_result_id=model_a_result_id,
        model_b_result_id=model_b_result_id,
        judge_model=judge_model,
        judge_provider=judge_provider,
        **kwargs
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def get_evaluation_judge_results(db: Session, evaluation_id: UUID) -> List[JudgeResult]:
    return db.query(JudgeResult).filter(JudgeResult.evaluation_id == evaluation_id).all()


# Metrics queries
def create_or_update_metrics(db: Session, evaluation_id: UUID, model_name: str,
                            **metrics) -> EvaluationMetrics:
    existing = db.query(EvaluationMetrics).filter(
        EvaluationMetrics.evaluation_id == evaluation_id,
        EvaluationMetrics.model_name == model_name
    ).first()

    if existing:
        for key, value in metrics.items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_metrics = EvaluationMetrics(
            evaluation_id=evaluation_id,
            model_name=model_name,
            **metrics
        )
        db.add(new_metrics)
        db.commit()
        db.refresh(new_metrics)
        return new_metrics


def get_evaluation_metrics(db: Session, evaluation_id: UUID) -> List[EvaluationMetrics]:
    return db.query(EvaluationMetrics).filter(
        EvaluationMetrics.evaluation_id == evaluation_id
    ).all()
