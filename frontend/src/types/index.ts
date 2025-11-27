// User & Auth Types
export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface SignupRequest {
  email: string;
}

export interface SignupResponse {
  user_id: string;
  email: string;
  api_key: string;
  message: string;
}

// Workspace Types
export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  embedding_model: string;
  embedding_provider: string;
  chunk_size: number;
  chunk_overlap: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  embedding_model?: string;
  embedding_provider?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  data_source?: 'manual' | 'google_drive';
}

// Document Types
export interface Document {
  id: string;
  workspace_id: string;
  filename: string;
  file_type: string;
  file_size_bytes?: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  total_chunks: number;
  error_message?: string;
  created_at: string;
}

// Dataset Types
export interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  total_questions: number;
  created_at: string;
}

export interface TestQuestion {
  id: string;
  dataset_id: string;
  question: string;
  expected_answer?: string;
  context?: string;
  created_at: string;
}

// Evaluation Types
export interface ModelConfig {
  model: string;
  provider: string;
}

export interface Evaluation {
  id: string;
  workspace_id: string;
  dataset_id: string;
  name: string;
  models_to_test: ModelConfig[];
  judge_model: string;
  judge_provider: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  created_at: string;
  completed_at?: string;
}

export interface CreateEvaluationRequest {
  workspace_id: string;
  dataset_id: string;
  name: string;
  models_to_test: ModelConfig[];
  judge_model: string;
  judge_provider: string;
}

// Results Types
export interface ModelMetrics {
  model: string;
  provider: string;
  avg_latency_ms: number;
  median_latency_ms: number;
  p95_latency_ms: number;
  total_cost_usd: number;
  avg_cost_per_query_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  error_count: number;
  error_rate: number;
  win_rate?: number;
  avg_score?: number;
  criteria_scores?: {
    correctness: number;
    relevance: number;
    completeness: number;
    clarity: number;
    conciseness: number;
  };
}

export interface EvaluationSummary {
  evaluation_id: string;
  evaluation_name: string;
  dataset_name: string;
  total_questions: number;
  status: string;
  created_at: string;
  completed_at?: string;
  models: ModelMetrics[];
}

export interface DetailedResult {
  question_id: string;
  question: string;
  expected_answer?: string;
  results: Array<{
    model: string;
    provider: string;
    answer: string;
    latency_ms: number;
    cost_usd: number;
    input_tokens: number;
    output_tokens: number;
    score?: number;
    winner?: boolean;
    judgment?: string;
  }>;
}

export interface EvaluationDetails {
  summary: EvaluationSummary;
  detailed_results: DetailedResult[];
}

// New Evaluation Metrics Types
export interface QuestionMetric {
  question_id: string;
  accuracy_score: number | null;
  faithfulness_score: number | null;
  reasoning_score: number | null;
  context_utilization_score: number | null;
  latency_ms: number;
  cost_usd: number;
  accuracy_explanation?: string;
  faithfulness_explanation?: string;
  reasoning_explanation?: string;
  context_utilization_explanation?: string;
}

export interface EvaluationMetricsSummary {
  evaluation_id: string;
  avg_accuracy: number | null;
  avg_faithfulness: number | null;
  avg_reasoning: number | null;
  avg_context_utilization: number | null;
  avg_latency_ms: number;
  avg_cost_usd: number;
  total_cost_usd: number;
  overall_score: number | null;
  total_questions: number;
  total_model_tests: number;
  successful_evaluations: number;
  failed_evaluations: number;
  models_summary: Record<string, {
    model: string;
    provider: string;
  }>;
  created_at: string;
}

export interface EvaluationMetricsByModel {
  evaluation_id: string;
  metrics_by_model: Record<string, {
    model: string;
    provider: string;
    questions: QuestionMetric[];
  }>;
  total_metrics: number;
}

// Provider Options
export const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'together', label: 'Together AI' },
  { value: 'huggingface', label: 'Hugging Face' },
] as const;

export const EMBEDDING_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'voyage', label: 'Voyage AI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'bge', label: 'BGE (Local)' },
] as const;

export const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
] as const;

export const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
] as const;

export const MISTRAL_MODELS = [
  'mistral-large-latest',
  'mistral-medium-latest',
  'mistral-small-latest',
] as const;

export const TOGETHER_MODELS = [
  'meta-llama/Llama-3-70b-chat-hf',
  'meta-llama/Llama-3-8b-chat-hf',
  'mistralai/Mixtral-8x7B-Instruct-v0.1',
] as const;

export const HUGGINGFACE_MODELS = [
  // Meta Llama models
  'meta-llama/Llama-3.1-8B-Instruct',
  'meta-llama/Llama-3.1-70B-Instruct',
  'meta-llama/Llama-3.1-405B-Instruct',
  'meta-llama/Llama-3-8b-chat-hf',
  'meta-llama/Llama-3-70b-chat-hf',
  'meta-llama/Llama-2-7b-chat-hf',
  'meta-llama/Llama-2-13b-chat-hf',
  'meta-llama/Llama-2-70b-chat-hf',

  // Mistral models
  'mistralai/Mistral-7B-Instruct-v0.3',
  'mistralai/Mistral-7B-Instruct-v0.2',
  'mistralai/Mixtral-8x7B-Instruct-v0.1',
  'mistralai/Mixtral-8x22B-Instruct-v0.1',

  // Microsoft models
  'microsoft/phi-2',
  'microsoft/phi-3-mini-4k-instruct',
  'microsoft/Phi-3-medium-4k-instruct',

  // Google models
  'google/flan-t5-xxl',
  'google/flan-t5-xl',
  'google/flan-t5-large',
  'google/gemma-7b-it',
  'google/gemma-2b-it',

  // Falcon models
  'tiiuae/falcon-7b-instruct',
  'tiiuae/falcon-40b-instruct',

  // Zephyr models
  'HuggingFaceH4/zephyr-7b-beta',
  'HuggingFaceH4/zephyr-7b-alpha',

  // Qwen models
  'Qwen/Qwen2-7B-Instruct',
  'Qwen/Qwen2-72B-Instruct',
  'Qwen/Qwen1.5-7B-Chat',

  // DeepSeek models
  'deepseek-ai/deepseek-coder-6.7b-instruct',
  'deepseek-ai/deepseek-coder-33b-instruct',
  'deepseek-ai/deepseek-llm-7b-chat',
  'deepseek-ai/deepseek-llm-67b-chat',
  'deepseek-ai/DeepSeek-V2-Chat',

  // Yi models
  '01-ai/Yi-34B-Chat',
  '01-ai/Yi-6B-Chat',

  // WizardLM models
  'WizardLM/WizardLM-13B-V1.2',
  'WizardLM/WizardCoder-15B-V1.0',

  // Vicuna models
  'lmsys/vicuna-13b-v1.5',
  'lmsys/vicuna-7b-v1.5',

  // OpenChat
  'openchat/openchat-3.5',

  // StableLM
  'stabilityai/stablelm-tuned-alpha-7b',
  'stabilityai/stablelm-zephyr-3b',

  // Nous Hermes
  'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
  'NousResearch/Hermes-2-Pro-Llama-3-8B',
] as const;

export const EMBEDDING_MODELS: Record<string, string[]> = {
  openai: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
  voyage: ['voyage-2', 'voyage-large-2'],
  cohere: ['embed-english-v3.0', 'embed-multilingual-v3.0'],
  bge: ['BAAI/bge-small-en-v1.5', 'BAAI/bge-base-en-v1.5', 'BAAI/bge-large-en-v1.5'],
};

// Combined LLM Models mapping for easy access
export const LLM_MODELS: Record<string, string[]> = {
  openai: [...OPENAI_MODELS],
  anthropic: [...ANTHROPIC_MODELS],
  mistral: [...MISTRAL_MODELS],
  together: [...TOGETHER_MODELS],
  huggingface: [...HUGGINGFACE_MODELS],
};

// Response Types for API calls
export interface EvaluationResponse {
  id: string;
  workspace_id: string;
  dataset_id: string;
  name: string;
  models_to_test: ModelConfig[];
  judge_model: string;
  judge_provider: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  created_at: string;
  completed_at?: string;
}

export interface TestQuestionResponse {
  id: string;
  dataset_id: string;
  question: string;
  expected_answer?: string;
  context?: string;
  created_at: string;
}

export interface ModelResultResponse {
  id: string;
  evaluation_id: string;
  model: string;
  provider: string;
  question_id: string;
  answer: string;
  latency_ms: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  error?: string;
  response_count?: number;
  created_at: string;
}
