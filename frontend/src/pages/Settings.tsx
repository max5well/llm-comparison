import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Key, Save, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface ApiKeyField {
  provider: string;
  label: string;
  key: string;
  description: string;
  placeholder: string;
}

const API_KEY_FIELDS: ApiKeyField[] = [
  {
    provider: 'openai',
    label: 'OpenAI',
    key: 'OPENAI_API_KEY',
    description: 'Required for GPT models and OpenAI embeddings',
    placeholder: 'sk-...',
  },
  {
    provider: 'anthropic',
    label: 'Anthropic',
    key: 'ANTHROPIC_API_KEY',
    description: 'Required for Claude models',
    placeholder: 'sk-ant-...',
  },
  {
    provider: 'mistral',
    label: 'Mistral AI',
    key: 'MISTRAL_API_KEY',
    description: 'Required for Mistral models',
    placeholder: 'mistral-...',
  },
  {
    provider: 'together',
    label: 'Together AI',
    key: 'TOGETHER_API_KEY',
    description: 'Required for Together AI models',
    placeholder: 'together-...',
  },
  {
    provider: 'huggingface',
    label: 'Hugging Face',
    key: 'HUGGINGFACE_API_KEY',
    description: 'Required for Hugging Face Inference API',
    placeholder: 'hf_...',
  },
  {
    provider: 'voyage',
    label: 'Voyage AI',
    key: 'VOYAGE_API_KEY',
    description: 'Optional - for Voyage embeddings',
    placeholder: 'voyage-...',
  },
  {
    provider: 'cohere',
    label: 'Cohere',
    key: 'COHERE_API_KEY',
    description: 'Optional - for Cohere embeddings',
    placeholder: 'cohere-...',
  },
];

export const Settings: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [apiKeysStatus, setApiKeysStatus] = useState<Record<string, boolean>>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadApiKeysStatus();
  }, []);

  const loadApiKeysStatus = async () => {
    try {
      const status = await api.getApiKeysStatus();
      setApiKeysStatus(status);
    } catch (error) {
      console.error('Failed to load API keys status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (provider: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(provider)) {
        newSet.delete(provider);
      } else {
        newSet.add(provider);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      // In a real implementation, you would send this to the backend
      // For now, we'll show a message that users need to update the .env file
      alert(
        'API keys must be configured in the backend .env file.\n\n' +
        'Location: backend/.env\n\n' +
        'Add or update your API keys there and restart the backend server.'
      );

      setSaveSuccess(true);
      await loadApiKeysStatus();

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save API keys:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your API keys and preferences</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Configuration Note</p>
            <p className="text-blue-700 mt-1">
              API keys are currently configured in the backend <code className="bg-blue-100 px-1 py-0.5 rounded">.env</code> file.
              To add or update keys, edit <code className="bg-blue-100 px-1 py-0.5 rounded">backend/.env</code> and restart the backend server.
            </p>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Key className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">API Keys</h2>
              <p className="text-sm text-gray-600">Configure your LLM provider API keys</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {API_KEY_FIELDS.map((field) => {
                const hasKey = apiKeysStatus[field.provider];
                const isVisible = visibleKeys.has(field.provider);

                return (
                  <div key={field.provider} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <label className="font-medium text-gray-900">{field.label}</label>
                          {hasKey ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Configured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              Not Set
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{field.description}</p>
                      </div>
                    </div>

                    <div className="relative mt-3">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={apiKeys[field.provider] || ''}
                        onChange={(e) => setApiKeys({ ...apiKeys, [field.provider]: e.target.value })}
                        placeholder={hasKey ? '••••••••••••••••••••' : field.placeholder}
                        className="input pr-10"
                        disabled
                      />
                      <button
                        onClick={() => toggleVisibility(field.provider)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        type="button"
                      >
                        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Key: <code className="bg-gray-100 px-1 py-0.5 rounded">{field.key}</code>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save Button - Disabled for now since we're using .env */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Changes to API keys require backend restart to take effect
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Checking...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check size={18} className="mr-2" />
                    Status Checked
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Check Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="card bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">How to configure API keys</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Open the <code className="bg-gray-200 px-1 py-0.5 rounded">backend/.env</code> file in a text editor</li>
            <li>Add or update your API keys (e.g., <code className="bg-gray-200 px-1 py-0.5 rounded">OPENAI_API_KEY=sk-...</code>)</li>
            <li>Save the file</li>
            <li>Restart the backend server for changes to take effect</li>
          </ol>
          <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
            <p className="text-xs font-medium text-gray-700 mb-2">Where to get API keys:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com/api-keys</a></li>
              <li>• Anthropic: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a></li>
              <li>• Hugging Face: <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">huggingface.co/settings/tokens</a></li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};
