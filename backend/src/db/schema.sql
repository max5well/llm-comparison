-- LLM Compare Platform Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_api_key ON users(api_key);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'google_drive', etc.
    embedding_model VARCHAR(100) NOT NULL,
    embedding_provider VARCHAR(50) NOT NULL,
    vector_collection_id VARCHAR(255),
    chunk_size INTEGER DEFAULT 1000,
    chunk_overlap INTEGER DEFAULT 200,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_workspaces_vector_collection ON workspaces(vector_collection_id);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT,
    content_hash VARCHAR(64),
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    total_chunks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX idx_documents_status ON documents(processing_status);

-- Chunks table
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    vector_id VARCHAR(255), -- ID in vector store
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_workspace_id ON chunks(workspace_id);
CREATE INDEX idx_chunks_vector_id ON chunks(vector_id);

-- Test datasets table
CREATE TABLE IF NOT EXISTS test_datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(50) NOT NULL, -- 'synthetic', 'uploaded', 'manual'
    generation_model VARCHAR(100), -- if synthetic
    total_questions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_datasets_workspace_id ON test_datasets(workspace_id);

-- Test questions table
CREATE TABLE IF NOT EXISTS test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES test_datasets(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    expected_answer TEXT,
    context TEXT, -- chunk or document it was generated from
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_questions_dataset_id ON test_questions(dataset_id);

-- Evaluations table (comparison runs)
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL REFERENCES test_datasets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    models_tested TEXT[], -- array of model names
    judge_model VARCHAR(100),
    judge_provider VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    progress INTEGER DEFAULT 0, -- percentage
    total_questions INTEGER,
    completed_questions INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evaluations_workspace_id ON evaluations(workspace_id);
CREATE INDEX idx_evaluations_dataset_id ON evaluations(dataset_id);
CREATE INDEX idx_evaluations_status ON evaluations(status);

-- Model results table (answers for each question)
CREATE TABLE IF NOT EXISTS model_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    answer TEXT NOT NULL,
    retrieved_chunks JSONB, -- array of chunk IDs and content
    prompt_used TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    latency_ms INTEGER,
    cost_usd DECIMAL(10, 6),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_model_results_evaluation_id ON model_results(evaluation_id);
CREATE INDEX idx_model_results_question_id ON model_results(question_id);
CREATE INDEX idx_model_results_model_name ON model_results(model_name);

-- Judge results table (comparison evaluations)
CREATE TABLE IF NOT EXISTS judge_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
    model_a_result_id UUID NOT NULL REFERENCES model_results(id) ON DELETE CASCADE,
    model_b_result_id UUID NOT NULL REFERENCES model_results(id) ON DELETE CASCADE,
    judge_model VARCHAR(100) NOT NULL,
    judge_provider VARCHAR(50) NOT NULL,
    winner VARCHAR(50), -- 'model_a', 'model_b', 'tie'
    score_a DECIMAL(4, 2),
    score_b DECIMAL(4, 2),
    reasoning TEXT,
    judge_prompt TEXT,
    judge_response TEXT,
    confidence DECIMAL(4, 2),
    criteria_scores JSONB, -- breakdown by criteria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_judge_results_evaluation_id ON judge_results(evaluation_id);
CREATE INDEX idx_judge_results_question_id ON judge_results(question_id);
CREATE INDEX idx_judge_results_winner ON judge_results(winner);

-- Metrics aggregation table
CREATE TABLE IF NOT EXISTS evaluation_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    total_questions INTEGER,
    avg_latency_ms INTEGER,
    total_cost_usd DECIMAL(10, 6),
    avg_tokens_in INTEGER,
    avg_tokens_out INTEGER,
    win_rate DECIMAL(5, 2), -- percentage
    tie_rate DECIMAL(5, 2),
    loss_rate DECIMAL(5, 2),
    avg_score DECIMAL(4, 2),
    metrics_breakdown JSONB, -- detailed metrics by category
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(evaluation_id, model_name)
);

CREATE INDEX idx_evaluation_metrics_evaluation_id ON evaluation_metrics(evaluation_id);
CREATE INDEX idx_evaluation_metrics_model_name ON evaluation_metrics(model_name);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_datasets_updated_at BEFORE UPDATE ON test_datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_metrics_updated_at BEFORE UPDATE ON evaluation_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
