import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Dataset, ModelConfig } from '../types';
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
  });
  const [modelsToTest, setModelsToTest] = useState<ModelConfig[]>([
    { provider: 'openai', model: 'gpt-4o-mini' },
  ]);

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
      navigate(`/results/${evaluation.id}`);
    } catch (error) {
      console.error('Failed to create evaluation:', error);
      alert('Failed to create evaluation');
    } finally {
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
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Workspace
          </button>

          <div className="card text-center py-12">
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

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(`/workspaces/${workspaceId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Workspace
        </button>

        <div className="card">
          <h1 className="text-2xl font-bold mb-6">Create New Evaluation</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Evaluation Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input"
                placeholder="e.g., GPT-4 vs Claude 3.5"
                required
              />
            </div>

            <div>
              <label className="label">Test Dataset *</label>
              <select
                value={formData.dataset_id}
                onChange={(e) =>
                  setFormData({ ...formData, dataset_id: e.target.value })
                }
                className="input"
                required
              >
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.total_questions} questions)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="label mb-0">Models to Test *</label>
                <button
                  type="button"
                  onClick={addModel}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Add Model
                </button>
              </div>

              <div className="space-y-3">
                {modelsToTest.map((model, index) => (
                  <div key={index} className="flex gap-3">
                    <select
                      value={model.provider}
                      onChange={(e) =>
                        updateModel(index, 'provider', e.target.value)
                      }
                      className="input flex-1"
                    >
                      {LLM_PROVIDERS.map((provider) => (
                        <option key={provider.value} value={provider.value}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={model.model}
                      onChange={(e) => updateModel(index, 'model', e.target.value)}
                      className="input flex-1"
                    >
                      {MODEL_OPTIONS[model.provider]?.map((modelName) => (
                        <option key={modelName} value={modelName}>
                          {modelName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeModel(index)}
                      disabled={modelsToTest.length === 1}
                      className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) =>
                    setFormData({ ...formData, judge_model: e.target.value })
                  }
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

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The evaluation will compare all selected models
                on each question in the dataset. The judge model will evaluate and
                score the responses.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/workspaces/${workspaceId}`)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Creating...' : 'Create & Run Evaluation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};
