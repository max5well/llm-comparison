-- Migration: Add question metrics and evaluation summary tables
-- Created: 2024-12-20
-- Description: Adds tables for storing per-question LLM judge metrics and evaluation summaries

-- Create question_metrics table for storing per-question metrics
CREATE TABLE IF NOT EXISTS question_metrics (
    id TEXT PRIMARY KEY,
    model_result_id TEXT NOT NULL,
    evaluation_id TEXT NOT NULL,
    question_id TEXT NOT NULL,

    -- LLM Judge Metrics (0-1 scores, stored as DECIMAL for precision)
    accuracy_score DECIMAL(4, 3),
    faithfulness_score DECIMAL(4, 3),
    reasoning_score DECIMAL(4, 3),
    context_utilization_score DECIMAL(4, 3),

    -- Automated Metrics (duplicated from model_results for convenience)
    latency_ms INTEGER,
    cost_usd DECIMAL(10, 6),

    -- LLM Judge Explanations
    accuracy_explanation TEXT,
    faithfulness_explanation TEXT,
    reasoning_explanation TEXT,
    context_utilization_explanation TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (model_result_id) REFERENCES model_results(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE
);

-- Create evaluation_summaries table for aggregate metrics
CREATE TABLE IF NOT EXISTS evaluation_summaries (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL UNIQUE,

    -- Average LLM Judge Metrics across all models and questions
    avg_accuracy DECIMAL(4, 3),
    avg_faithfulness DECIMAL(4, 3),
    avg_reasoning DECIMAL(4, 3),
    avg_context_utilization DECIMAL(4, 3),

    -- Average Automated Metrics
    avg_latency_ms INTEGER,
    avg_cost_usd DECIMAL(10, 6),
    total_cost_usd DECIMAL(10, 4),

    -- Overall Score (weighted combination)
    overall_score DECIMAL(5, 2),

    -- Counts
    total_questions INTEGER NOT NULL,
    total_model_tests INTEGER NOT NULL,
    successful_evaluations INTEGER DEFAULT 0,
    failed_evaluations INTEGER DEFAULT 0,

    -- Model-specific summary (JSON)
    models_summary TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_metrics_model_result ON question_metrics(model_result_id);
CREATE INDEX IF NOT EXISTS idx_question_metrics_evaluation ON question_metrics(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_question_metrics_question ON question_metrics(question_id);
CREATE INDEX IF NOT EXISTS idx_summary_evaluation_id ON evaluation_summaries(evaluation_id);
