import axios, { AxiosInstance } from 'axios';
import type {
  SignupRequest,
  SignupResponse,
  User,
  Workspace,
  CreateWorkspaceRequest,
  Document,
  Dataset,
  Evaluation,
  CreateEvaluationRequest,
  EvaluationSummary,
  EvaluationDetails,
} from '../types';

class ApiClient {
  private client: AxiosInstance;
  private userId: string | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load from localStorage
    this.userId = localStorage.getItem('user_id');
    this.apiKey = localStorage.getItem('api_key');
  }

  setAuth(userId: string, apiKey: string) {
    this.userId = userId;
    this.apiKey = apiKey;
    localStorage.setItem('user_id', userId);
    localStorage.setItem('api_key', apiKey);
  }

  clearAuth() {
    this.userId = null;
    this.apiKey = null;
    localStorage.removeItem('user_id');
    localStorage.removeItem('api_key');
  }

  isAuthenticated(): boolean {
    return !!this.userId && !!this.apiKey;
  }

  getUserId(): string | null {
    return this.userId;
  }

  // Auth endpoints
  async signup(data: SignupRequest): Promise<SignupResponse> {
    const response = await this.client.post<SignupResponse>('/auth/signup', data);
    // Store user_id and api_key
    this.setAuth(response.data.user_id, response.data.api_key);
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await this.client.get<User>(`/auth/me?user_id=${this.userId}`);
    return response.data;
  }

  // Workspace endpoints
  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await this.client.post<Workspace>(
      `/workspace/create?user_id=${this.userId}`,
      data
    );
    return response.data;
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const response = await this.client.get<Workspace[]>(
      `/workspace/list?user_id=${this.userId}`
    );
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const response = await this.client.get<Workspace>(`/workspace/${workspaceId}`);
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.client.delete(`/workspace/${workspaceId}`);
  }

  async uploadDocument(workspaceId: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<Document>(
      `/workspace/${workspaceId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async listDocuments(workspaceId: string): Promise<Document[]> {
    const response = await this.client.get<Document[]>(
      `/workspace/${workspaceId}/documents`
    );
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.client.delete(`/workspace/documents/${documentId}`);
  }

  async updateDocument(documentId: string, data: { filename: string }): Promise<void> {
    await this.client.patch(`/workspace/documents/${documentId}`, data);
  }

  async getWorkspaceStats(workspaceId: string): Promise<{
    total_documents: number;
    completed_documents: number;
    total_chunks: number;
    suggested_min_questions: number;
    suggested_max_questions: number;
  }> {
    const response = await this.client.get(`/workspace/${workspaceId}/stats`);
    return response.data;
  }

  // RAG endpoints
  async processDocument(documentId: string): Promise<void> {
    await this.client.post(`/rag/${documentId}/process`);
  }

  async queryRAG(
    workspaceId: string,
    query: string,
    topK: number = 5
  ): Promise<any> {
    const response = await this.client.post('/rag/query', {
      workspace_id: workspaceId,
      query,
      top_k: topK,
    });
    return response.data;
  }

  // Dataset endpoints
  async createDataset(
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      source?: string;
    }
  ): Promise<Dataset> {
    const response = await this.client.post<Dataset>('/evaluation/dataset/create', {
      workspace_id: workspaceId,
      ...data,
    });
    return response.data;
  }

  async addQuestionToDataset(
    datasetId: string,
    question: {
      question: string;
      expected_answer?: string | null;
      context?: string | null;
    }
  ): Promise<void> {
    await this.client.post(`/evaluation/dataset/${datasetId}/questions`, question);
  }

  async uploadDatasetJSONL(datasetId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    await this.client.post(
      `/evaluation/dataset/${datasetId}/upload-jsonl`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  async generateSyntheticDataset(params: {
    workspace_id: string;
    dataset_name: string;
    num_questions_per_chunk: number;
    include_answers: boolean;
    generation_model: string;
    generation_provider: string;
  }): Promise<Dataset> {
    const response = await this.client.post<Dataset>(
      '/evaluation/dataset/generate-synthetic',
      params
    );
    return response.data;
  }

  async listDatasets(workspaceId: string): Promise<Dataset[]> {
    const response = await this.client.get<Dataset[]>(
      `/evaluation/workspace/${workspaceId}/datasets`
    );
    return response.data;
  }

  async getDatasetQuestions(datasetId: string): Promise<TestQuestion[]> {
    const response = await this.client.get<TestQuestion[]>(
      `/evaluation/dataset/${datasetId}/questions`
    );
    return response.data;
  }

  // Evaluation endpoints
  async createEvaluation(data: CreateEvaluationRequest): Promise<Evaluation> {
    const response = await this.client.post<Evaluation>('/evaluation/create', data);
    return response.data;
  }

  async getEvaluation(evaluationId: string): Promise<Evaluation> {
    const response = await this.client.get<Evaluation>(`/evaluation/${evaluationId}`);
    return response.data;
  }

  async listEvaluations(workspaceId: string): Promise<Evaluation[]> {
    const response = await this.client.get<Evaluation[]>(
      `/evaluation/workspace/${workspaceId}/evaluations`
    );
    return response.data;
  }

  // Results endpoints
  async getEvaluationSummary(evaluationId: string): Promise<EvaluationSummary> {
    const response = await this.client.get<EvaluationSummary>(
      `/results/${evaluationId}/summary`
    );
    return response.data;
  }

  async getEvaluationDetails(evaluationId: string): Promise<EvaluationDetails> {
    const response = await this.client.get<EvaluationDetails>(
      `/results/${evaluationId}/detailed`
    );
    return response.data;
  }

  async getApiKeysStatus(): Promise<Record<string, boolean>> {
    const response = await this.client.get<Record<string, boolean>>(
      `/workspace/api-keys/status`
    );
    return response.data;
  }
}

export const api = new ApiClient();
