from sqlalchemy import Column, String, Integer, Boolean, TIMESTAMP, Text, DECIMAL, BIGINT, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    api_key = Column(String(255), unique=True, nullable=False, index=True)
    api_key_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    data_source = Column(String(50), default="manual")
    embedding_model = Column(String(100), nullable=False)
    embedding_provider = Column(String(50), nullable=False)
    vector_collection_id = Column(String(255), index=True)
    chunk_size = Column(Integer, default=1000)
    chunk_overlap = Column(Integer, default=200)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size_bytes = Column(BIGINT)
    content_hash = Column(String(64))
    processing_status = Column(String(50), default="pending", index=True)
    error_message = Column(Text)
    total_chunks = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer)
    vector_id = Column(String(255), index=True)
    chunk_item_metadata = Column(JSON)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class TestDataset(Base):
    __tablename__ = "test_datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    source = Column(String(50), nullable=False)
    generation_model = Column(String(100))
    total_questions = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("test_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    expected_answer = Column(Text)
    context = Column(Text)
    item_metadata = Column(JSON)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("test_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    models_tested = Column(JSON)
    judge_model = Column(String(100))
    judge_provider = Column(String(50))
    status = Column(String(50), default="pending", index=True)
    progress = Column(Integer, default=0)
    total_questions = Column(Integer)
    completed_questions = Column(Integer, default=0)
    error_message = Column(Text)
    started_at = Column(TIMESTAMP(timezone=True))
    completed_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class ModelResult(Base):
    __tablename__ = "model_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id = Column(UUID(as_uuid=True), ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("test_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    answer = Column(Text, nullable=False)
    retrieved_chunks = Column(JSON)
    prompt_used = Column(Text)
    tokens_in = Column(Integer)
    tokens_out = Column(Integer)
    latency_ms = Column(Integer)
    cost_usd = Column(DECIMAL(10, 6))
    error_message = Column(Text)
    item_metadata = Column(JSON)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class JudgeResult(Base):
    __tablename__ = "judge_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id = Column(UUID(as_uuid=True), ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("test_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_a_result_id = Column(UUID(as_uuid=True), ForeignKey("model_results.id", ondelete="CASCADE"), nullable=False)
    model_b_result_id = Column(UUID(as_uuid=True), ForeignKey("model_results.id", ondelete="CASCADE"), nullable=False)
    judge_model = Column(String(100), nullable=False)
    judge_provider = Column(String(50), nullable=False)
    winner = Column(String(50), index=True)
    score_a = Column(DECIMAL(4, 2))
    score_b = Column(DECIMAL(4, 2))
    reasoning = Column(Text)
    judge_prompt = Column(Text)
    judge_response = Column(Text)
    confidence = Column(DECIMAL(4, 2))
    criteria_scores = Column(JSON)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class UserJudgment(Base):
    __tablename__ = "user_judgments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id = Column(UUID(as_uuid=True), ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("test_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_a_result_id = Column(UUID(as_uuid=True), ForeignKey("model_results.id", ondelete="CASCADE"), nullable=False)
    model_b_result_id = Column(UUID(as_uuid=True), ForeignKey("model_results.id", ondelete="CASCADE"), nullable=False)
    winner = Column(String(50), index=True)  # 'model_a', 'model_b', 'tie', 'both_bad'
    user_preferred_answer = Column(Text)
    feedback_notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class EvaluationMetrics(Base):
    __tablename__ = "evaluation_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id = Column(UUID(as_uuid=True), ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    total_questions = Column(Integer)
    avg_latency_ms = Column(Integer)
    total_cost_usd = Column(DECIMAL(10, 6))
    avg_tokens_in = Column(Integer)
    avg_tokens_out = Column(Integer)
    win_rate = Column(DECIMAL(5, 2))
    tie_rate = Column(DECIMAL(5, 2))
    loss_rate = Column(DECIMAL(5, 2))
    avg_score = Column(DECIMAL(4, 2))
    metrics_breakdown = Column(JSON)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class ProviderAPIKey(Base):
    __tablename__ = "provider_api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # openai, anthropic, mistral, etc.
    api_key_encrypted = Column(Text, nullable=False)  # Encrypted API key
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
