import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Upload, Settings, CheckCircle, Database, FileText, DollarSign } from 'lucide-react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import { EMBEDDING_PROVIDERS, EMBEDDING_MODELS } from '../types';

type Step = 1 | 2 | 3 | 4;
type DataSource = 'google-drive' | 'upload' | null;

interface WorkspaceFormData {
  name: string;
  description: string;
  data_source: string;
  embedding_provider: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
}

interface EmbeddingStats {
  filesSelected: number;
  estimatedChunks: number;
  estimatedCost: number;
  estimatedTimeMinutes: number;
}

export const CreateWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EmbeddingStats>({
    filesSelected: 0,
    estimatedChunks: 0,
    estimatedCost: 0,
    estimatedTimeMinutes: 0,
  });

  const [formData, setFormData] = useState<WorkspaceFormData>({
    name: '',
    description: '',
    data_source: 'manual',
    embedding_provider: 'openai',
    embedding_model: 'text-embedding-3-small',
    chunk_size: 1000,
    chunk_overlap: 200,
  });

  const calculateStats = (files: File[]) => {
    // Rough estimates: 1 page ≈ 500 tokens, cost varies by model
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const estimatedTokens = Math.ceil(totalSize / 4); // rough estimate: 4 bytes per token
    const estimatedChunks = Math.ceil(estimatedTokens / formData.chunk_size);

    // Cost estimation based on embedding model (per 1M tokens)
    const costPer1M: Record<string, number> = {
      'text-embedding-3-small': 0.02,
      'text-embedding-3-large': 0.13,
      'text-embedding-ada-002': 0.10,
    };

    const costRate = costPer1M[formData.embedding_model] || 0.02;
    const estimatedCost = (estimatedTokens / 1000000) * costRate;

    // Estimate processing time: ~1000 tokens/second for embedding, ~500 tokens/second for document parsing
    const processingSeconds = (estimatedTokens / 500) + (estimatedChunks * 0.5); // parsing + embedding overhead
    const estimatedTimeMinutes = Math.ceil(processingSeconds / 60);

    setStats({
      filesSelected: files.length,
      estimatedChunks,
      estimatedCost,
      estimatedTimeMinutes,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    calculateStats(files);
  };

  const handleGoogleDriveConnect = () => {
    // TODO: Implement Google OAuth flow
    alert('Google Drive integration coming soon! For now, please use file upload.');
  };

  const handleContinue = () => {
    if (currentStep === 1 && !dataSource) {
      alert('Please select a data source');
      return;
    }
    if (currentStep === 1 && dataSource === 'upload' && selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('Please enter a workspace name');
      return;
    }

    setLoading(true);
    try {
      // Create workspace
      const workspace = await api.createWorkspace({
        ...formData,
        data_source: dataSource === 'google-drive' ? 'google_drive' : 'manual',
      });

      // Upload files if manual upload
      if (dataSource === 'upload' && selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          await api.uploadDocument(workspace.id, file);
        }
      }

      navigate(`/workspaces/${workspace.id}`);
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert('Failed to create workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    return (currentStep / 4) * 100;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create RAG Workspace</h1>
          <p className="text-gray-600 mt-2">Set up your document collection and configure RAG parameters</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep}: {
                currentStep === 1 ? 'Data Source' :
                currentStep === 2 ? 'Embedding Configuration' :
                currentStep === 3 ? 'Workspace Details' :
                'Review & Create'
              }
            </span>
            <span className="text-sm font-medium text-gray-700">{Math.round(getStepProgress())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getStepProgress()}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Connect your documents</p>
        </div>

        {/* Steps Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-h-[500px]">
          {/* Step 1: Data Source */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Google Drive Option */}
                <div
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    dataSource === 'google-drive'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setDataSource('google-drive')}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`p-4 rounded-full ${
                      dataSource === 'google-drive' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Cloud className={`w-8 h-8 ${
                        dataSource === 'google-drive' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Google Drive</h3>
                      <p className="text-sm text-gray-500 mt-1">Connect to your Google Drive account</p>
                    </div>
                    {dataSource === 'google-drive' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGoogleDriveConnect();
                        }}
                        className="btn-secondary w-full"
                      >
                        Connect Google Drive
                      </button>
                    )}
                    <p className="text-xs text-amber-600 font-medium">Coming soon</p>
                  </div>
                </div>

                {/* Upload Files Option */}
                <div
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    dataSource === 'upload'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setDataSource('upload')}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`p-4 rounded-full ${
                      dataSource === 'upload' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Upload className={`w-8 h-8 ${
                        dataSource === 'upload' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
                      <p className="text-sm text-gray-500 mt-1">Upload documents, code, spreadsheets & more</p>
                    </div>
                    {dataSource === 'upload' && (
                      <div className="w-full">
                        <label className="btn-secondary w-full cursor-pointer block">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.txt,.docx,.html,.htm,.csv,.xlsx,.xls,.md,.markdown,.json,.xml,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.cs,.rb,.go,.rs,.php,.sh,.yaml,.yml"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          Select files
                        </label>
                        {selectedFiles.length > 0 && (
                          <p className="text-sm text-gray-600 mt-2">
                            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div className="mt-6 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Selected Files
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Embedding Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Embedding Configuration
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure how your documents will be processed and embedded
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Embedding Provider *</label>
                  <select
                    value={formData.embedding_provider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      setFormData({
                        ...formData,
                        embedding_provider: provider,
                        embedding_model: EMBEDDING_MODELS[provider][0],
                      });
                      if (selectedFiles.length > 0) {
                        calculateStats(selectedFiles);
                      }
                    }}
                    className="input"
                  >
                    {EMBEDDING_PROVIDERS.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Embedding Model *</label>
                  <select
                    value={formData.embedding_model}
                    onChange={(e) => {
                      setFormData({ ...formData, embedding_model: e.target.value });
                      if (selectedFiles.length > 0) {
                        calculateStats(selectedFiles);
                      }
                    }}
                    className="input"
                  >
                    {EMBEDDING_MODELS[formData.embedding_provider]?.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Chunk Size (tokens) *</label>
                  <input
                    type="number"
                    value={formData.chunk_size}
                    onChange={(e) => {
                      setFormData({ ...formData, chunk_size: parseInt(e.target.value) });
                      if (selectedFiles.length > 0) {
                        calculateStats(selectedFiles);
                      }
                    }}
                    className="input"
                    min={100}
                    max={4000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    500-800 for precision, 1000-1500 for context
                  </p>
                </div>

                <div>
                  <label className="label">Chunk Overlap (tokens) *</label>
                  <input
                    type="number"
                    value={formData.chunk_overlap}
                    onChange={(e) => setFormData({ ...formData, chunk_overlap: parseInt(e.target.value) })}
                    className="input"
                    min={0}
                    max={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Typically 10-20% of chunk size
                  </p>
                </div>
              </div>

              {/* Embedding Stats */}
              {selectedFiles.length > 0 && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Database className="w-4 h-4 mr-2" />
                    Estimated Embedding Stats
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.filesSelected}</p>
                      <p className="text-xs text-gray-600 mt-1">Files Selected</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.estimatedChunks.toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-1">Estimated Chunks</p>
                    </div>
                    <div className="text-center flex flex-col items-center">
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-600">{stats.estimatedCost.toFixed(4)}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Estimated Cost (USD)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.estimatedTimeMinutes}</p>
                      <p className="text-xs text-gray-600 mt-1">Est. Time (min)</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    Note: These are rough estimates based on file sizes. Actual values may vary.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Workspace Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Workspace Details</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Give your workspace a name and description
                </p>
              </div>

              <div>
                <label className="label">Workspace Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Customer Support Documentation"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="Brief description of this workspace and its purpose..."
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Review & Create
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Review your configuration before creating the workspace
                </p>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Workspace Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Name:</dt>
                      <dd className="text-gray-900 font-medium">{formData.name || 'Not set'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Description:</dt>
                      <dd className="text-gray-900">{formData.description || 'None'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Data Source:</dt>
                      <dd className="text-gray-900 capitalize">{dataSource?.replace('-', ' ') || 'None'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Embedding Configuration</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Provider:</dt>
                      <dd className="text-gray-900 capitalize">{formData.embedding_provider}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Model:</dt>
                      <dd className="text-gray-900">{formData.embedding_model}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Chunk Size:</dt>
                      <dd className="text-gray-900">{formData.chunk_size} tokens</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Chunk Overlap:</dt>
                      <dd className="text-gray-900">{formData.chunk_overlap} tokens</dd>
                    </div>
                  </dl>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Files to Upload</h4>
                    <p className="text-sm text-gray-600">{selectedFiles.length} file(s) selected</p>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{stats.filesSelected}</p>
                        <p className="text-xs text-gray-600">Files</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">{stats.estimatedChunks.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Est. Chunks</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">${stats.estimatedCost.toFixed(4)}</p>
                        <p className="text-xs text-gray-600">Est. Cost</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={currentStep === 1 ? () => navigate('/workspaces') : handleBack}
            className="btn-secondary px-6"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleContinue}
              className="btn-primary px-8"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.name}
              className="btn-primary px-8"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};
