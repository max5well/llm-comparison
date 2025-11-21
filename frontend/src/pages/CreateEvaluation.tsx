import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ArrowRight, Play, X, Database, FileText, Calendar } from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Dataset, ModelConfig, TestQuestion } from '../types';
import {
  LLM_PROVIDERS,
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  MISTRAL_MODELS,
  TOGETHER_MODELS,
} from '../types';

const MODEL_OPTIONS: Record<string, readonly string[]> = {
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  mistral: MISTRAL_MODELS,
  together: TOGETHER_MODELS,
};

export const CreateEvaluation: React.FC = () => {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dataset_id: '',
    judge_provider: 'openai',
    judge_model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 512,
    top_k: 5,
    similarity: 0.75,
  });
  const [modelsToTest, setModelsToTest] = useState<ModelConfig[]>([
    { provider: 'openai', model: 'gpt-4o-mini' },
  ]);
  
  // Dataset review modal
  const [showDatasetReview, setShowDatasetReview] = useState(false);
  const [datasetDetails, setDatasetDetails] = useState<Dataset | null>(null);
  const [datasetQuestions, setDatasetQuestions] = useState<TestQuestion[]>([]);
  const [loadingDatasetReview, setLoadingDatasetReview] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadDatasets();
    }
  }, [workspaceId]);

  const loadDatasets = async () => {
    if (!workspaceId) return;

    try {
      const data = await api.listDatasets(workspaceId);
      setDatasets(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, dataset_id: data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDataset = async () => {
    if (!formData.dataset_id) return;
    
    setLoadingDatasetReview(true);
    setShowDatasetReview(true);
    try {
      const [dataset, questions] = await Promise.all([
        api.getDataset(formData.dataset_id),
        api.getDatasetQuestions(formData.dataset_id)
      ]);
      setDatasetDetails(dataset);
      setDatasetQuestions(questions);
    } catch (error) {
      console.error('Failed to load dataset details:', error);
      setDatasetDetails(null);
      setDatasetQuestions([]);
    } finally {
      setLoadingDatasetReview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setSubmitting(true);
    try {
      const evaluation = await api.createEvaluation({
        workspace_id: workspaceId,
        dataset_id: formData.dataset_id,
        name: formData.name,
        models_to_test: modelsToTest,
        judge_model: formData.judge_model,
        judge_provider: formData.judge_provider,
      });
      
      // Redirect to waiting page which will poll for completion
      navigate(`/evaluations/${evaluation.id}/waiting`);
    } catch (error) {
      console.error('Failed to create evaluation:', error);
      alert('Failed to create evaluation');
      setSubmitting(false);
    }
  };

  const addModel = () => {
    setModelsToTest([...modelsToTest, { provider: 'openai', model: 'gpt-4o-mini' }]);
  };

  const removeModel = (index: number) => {
    if (modelsToTest.length > 1) {
      setModelsToTest(modelsToTest.filter((_, i) => i !== index));
    }
  };

  const updateModel = (
    index: number,
    field: 'provider' | 'model',
    value: string
  ) => {
    const updated = [...modelsToTest];
    if (field === 'provider') {
      updated[index] = {
        provider: value,
        model: MODEL_OPTIONS[value][0],
      };
    } else {
      updated[index] = { ...updated[index], model: value };
    }
    setModelsToTest(updated);
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  if (datasets.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-6 inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Workspace
          </button>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No datasets available
            </h3>
            <p className="text-gray-600 mb-6">
              Create a test dataset before running an evaluation
            </p>
            <button
              onClick={() => navigate(`/workspaces/${workspaceId}/datasets/new`)}
              className="btn-primary"
            >
              Create Dataset
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedDataset = datasets.find((dataset) => dataset.id === formData.dataset_id);
  const datasetName = selectedDataset?.name || 'Select a dataset';
  const totalQuestions = selectedDataset?.total_questions || 0;
  const estimatedCost = (totalQuestions * modelsToTest.length) * 0.0002;
  const estimatedTime = Math.max(1, Math.ceil(totalQuestions * 0.03));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(`/workspaces/${workspaceId}`)}
          className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Workspace
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Evaluation</h1>
          <p className="text-sm text-gray-600 mt-2">
            Use the mockup workflow to configure datasets, models, and judge preferences.
          </p>
            </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <form
            id="evaluation-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Dataset Selection */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
            <div>
                  <h2 className="text-xl font-semibold text-gray-900">Select Dataset</h2>
                  <p className="text-sm text-gray-500">
                    Choose the dataset to evaluate on this run.
                  </p>
                </div>
                <span className="text-xs text-gray-500">{datasets.length} datasets</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {datasets.map((dataset) => (
                  <article
                    key={dataset.id}
                    onClick={() => setFormData({ ...formData, dataset_id: dataset.id })}
                    className={`border rounded-2xl p-5 cursor-pointer transition ${
                      formData.dataset_id === dataset.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{dataset.name}</h3>
                      <span className="text-xs text-gray-500">{dataset.total_questions} qs</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {dataset.description || 'Generated dataset'}
                    </p>
                    <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                      <span>Owner</span>
                      <span>•</span>
                      <span>Created {new Date(dataset.created_at).toLocaleDateString()}</span>
                    </div>
                  </article>
                ))}
            </div>
            </section>

            {/* Model Selection */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
            <div>
                  <h2 className="text-xl font-semibold text-gray-900">Models to Compare</h2>
                  <p className="text-sm text-gray-500">
                    Add multiple LLMs to compare side-by-side.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addModel}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm rounded-full text-primary-600 hover:border-primary-400 transition"
                >
                  <Plus size={14} />
                  Add Model
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {modelsToTest.map((model, index) => (
                  <div
                    key={`${model.provider}-${model.model}-${index}`}
                    className="border rounded-2xl border-gray-200 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 uppercase tracking-wider">
                        Model {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeModel(index)}
                        disabled={modelsToTest.length === 1}
                        className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="text-xs font-semibold text-gray-600">Provider</label>
                    <select
                      value={model.provider}
                        onChange={(e) => updateModel(index, 'provider', e.target.value)}
                        className="input text-sm"
                    >
                      {LLM_PROVIDERS.map((provider) => (
                        <option key={provider.value} value={provider.value}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="text-xs font-semibold text-gray-600">Model</label>
                    <select
                      value={model.model}
                      onChange={(e) => updateModel(index, 'model', e.target.value)}
                        className="input text-sm"
                    >
                      {MODEL_OPTIONS[model.provider]?.map((modelName) => (
                        <option key={modelName} value={modelName}>
                          {modelName}
                        </option>
                      ))}
                    </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Judge Settings */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Judge Model</h2>
                  <p className="text-sm text-gray-500">
                    This model evaluates answer quality for each response.
                  </p>
                </div>
                <span className="text-xs text-gray-500">{formData.judge_provider}</span>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Judge Provider *</label>
                <select
                  value={formData.judge_provider}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      judge_provider: e.target.value,
                      judge_model: MODEL_OPTIONS[e.target.value][0],
                    })
                  }
                  className="input"
                >
                  {LLM_PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Judge Model *</label>
                <select
                  value={formData.judge_model}
                    onChange={(e) => setFormData({ ...formData, judge_model: e.target.value })}
                  className="input"
                >
                  {MODEL_OPTIONS[formData.judge_provider]?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            </section>

            {/* Evaluation Settings */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Evaluation Settings</h2>
                <p className="text-sm text-gray-500">
                  Tune temperature, token limits, and retrieval sensitivity.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Sampling Temperature ({formData.temperature.toFixed(1)})</span>
                    <span className="text-xs text-gray-500">0.0 - 1.0</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Max Tokens ({formData.max_tokens})</label>
                  <input
                    type="number"
                    min={128}
                    max={2048}
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: Number(e.target.value) })}
                    className="input mt-2"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Top K Documents ({formData.top_k})</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formData.top_k}
                      onChange={(e) => setFormData({ ...formData, top_k: Number(e.target.value) })}
                      className="input mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Similarity Threshold ({formData.similarity.toFixed(2)})</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={formData.similarity}
                      onChange={(e) => setFormData({ ...formData, similarity: parseFloat(e.target.value) })}
                      className="w-full mt-2"
                    />
                  </div>
                </div>
              </div>
            </section>
          </form>

          {/* Summary Card */}
          <aside className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Summary</p>
                <h3 className="text-xl font-semibold text-gray-900">Evaluation Overview</h3>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Dataset</dt>
                  <dd className="font-medium text-gray-900">{datasetName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Total Questions</dt>
                  <dd className="font-medium text-gray-900">{totalQuestions}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Models</dt>
                  <dd className="font-medium text-gray-900">{modelsToTest.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Judge</dt>
                  <dd className="font-medium text-gray-900">{formData.judge_model}</dd>
                </div>
              </dl>
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Est. Cost</span>
                  <span className="font-semibold text-gray-900">${estimatedCost.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Est. Time</span>
                  <span className="font-semibold text-gray-900">{estimatedTime} min</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Questions / Model</span>
                  <span className="font-semibold text-gray-900">{totalQuestions}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Configured for {modelsToTest.length} models and {formData.top_k} docs per request.</p>
                <button
                  type="button"
                  onClick={handleReviewDataset}
                  disabled={!formData.dataset_id}
                  className="w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium border border-blue-100 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Review dataset
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Actions</p>
              <div className="mt-3 space-y-2">
                <button className="w-full px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition flex items-center justify-between">
                  Save as draft
                  <ArrowRight size={16} />
                </button>
              <button
                  type="submit"
                  form="evaluation-form"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-between"
                >
                  <span>{submitting ? 'Creating...' : 'Create & Run Evaluation'}</span>
                  <Play size={18} />
              </button>
              </div>
            </div>
          </aside>
        </div>
            </div>

      {/* Dataset Review Modal */}
      {showDatasetReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Dataset Review</h2>
              <button
                onClick={() => {
                  setShowDatasetReview(false);
                  setDatasetDetails(null);
                  setDatasetQuestions([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDatasetReview ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : datasetDetails ? (
                <div className="space-y-6">
                  {/* Dataset Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Database size={20} className="text-blue-500" />
                      {datasetDetails.name}
                    </h3>
                    {datasetDetails.description && (
                      <p className="text-sm text-gray-600 mb-4">{datasetDetails.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText size={16} className="text-gray-400" />
                        <span><strong>{datasetQuestions.length}</strong> questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        <span>Created {new Date(datasetDetails.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sample Questions */}
                  {datasetQuestions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        Sample Questions ({Math.min(5, datasetQuestions.length)} of {datasetQuestions.length})
                      </h4>
                      <div className="space-y-3">
                        {datasetQuestions.slice(0, 5).map((q, index) => (
                          <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                {index + 1}
                              </div>
                              <div className="flex-1 space-y-2">
                                <p className="text-sm font-medium text-gray-900">{q.question}</p>
                                {q.expected_answer && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Expected Answer: </span>
                                    <span>{q.expected_answer}</span>
                                  </div>
                                )}
                                {q.context && (
                                  <div className="text-xs text-blue-600 flex items-center gap-1">
                                    <FileText size={12} />
                                    <span className="font-medium">{q.context}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {datasetQuestions.length > 5 && (
                        <p className="text-xs text-gray-500 mt-3 text-center">
                          ... and {datasetQuestions.length - 5} more questions
                        </p>
                      )}
                    </div>
                  )}

                  {datasetQuestions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Database size={48} className="mx-auto mb-3 text-gray-300" />
                      <p>No questions found in this dataset.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Failed to load dataset details.</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDatasetReview(false);
                  setDatasetDetails(null);
                  setDatasetQuestions([]);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
