import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import {
  ArrowLeft,
  ArrowRight,
  CloudUpload,
  Database,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { EMBEDDING_PROVIDERS, EMBEDDING_MODELS } from '../types';

const flowSteps = [
  { label: 'Data Source', description: 'Connect or upload files' },
  { label: 'Chunking Settings', description: 'Configure embeddings' },
  { label: 'Review & Create', description: 'Confirm workspace' },
];

const supportedFormats = [
  '.pdf', '.docx', '.doc', '.pptx', '.txt', '.md', '.html', '.csv', '.xlsx', '.json',
  '.py', '.js', '.ts', '.java', '.cpp', '.go', '.rb', '.php', '.swift',
  '.yaml', '.xml', '.css', '.rtf', '.odt', '+20 more'
];

export const CreateWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    embedding_provider: 'openai',
    embedding_model: 'text-embedding-3-small',
    chunk_size: 1024,
    chunk_overlap: 200,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [dataSource, setDataSource] = useState<'upload' | 'drive'>('upload');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chunkLabel = `${formData.chunk_size} tokens`;
  const formattedSize = files.length
    ? `${(files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(1)} MB`
    : '0.0 MB';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const incoming = Array.from(event.target.files);
    setFiles((prev) => [...prev, ...incoming]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleContinue = () => {
    if (currentStep === 1 && dataSource === 'upload' && files.length === 0) {
      alert('Please upload at least one document.');
      return;
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      alert('Please provide a workspace name.');
      return;
    }
    setLoading(true);
    try {
      const workspace = await api.createWorkspace({
        ...formData,
        data_source: 'manual',
      });
      if (files.length > 0) {
        for (const file of files) {
          await api.uploadDocument(workspace.id, file);
        }
      }
      navigate(`/workspaces/${workspace.id}`);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <header>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400 mb-2">Create Workspace</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-1">Build a RAG workspace in a few guided steps</h1>
            <p className="text-gray-600">Upload documents, configure embeddings, and confirm your setup.</p>
          </header>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-gray-500">
              {flowSteps.map((step, index) => (
                <React.Fragment key={step.label}>
                  <div
                    className={`flex items-center gap-3 rounded-full px-4 py-2 ${
                      currentStep === index + 1
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <span>{index + 1}</span>
                    <div className="text-left">
                      <div>{step.label}</div>
                      <div className="text-xs">{step.description}</div>
                    </div>
                  </div>
                  {index < flowSteps.length - 1 && <div className="w-6 h-px bg-gray-200" />}
                </React.Fragment>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <CloudUpload className="text-blue-600" />
                    Select Data Source
                  </div>
                  <p className="text-sm text-gray-500">Choose how to add documents to your workspace.</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <button
                      className={`flex flex-col gap-1 rounded-2xl border p-4 text-left text-sm ${
                        dataSource === 'upload'
                          ? 'border-blue-500 bg-blue-50 text-gray-900 shadow'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                      onClick={() => setDataSource('upload')}
                    >
                      <span className="text-lg font-semibold">Upload files</span>
                      <span className="text-xs">Batch upload (26+ formats)</span>
                    </button>
                    <button
                      className="flex flex-col gap-1 rounded-2xl border border-gray-200 p-4 text-left text-sm bg-white text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      <span className="text-lg font-semibold">Google Drive</span>
                      <span className="text-xs">Coming soon</span>
                    </button>
                  </div>
                    <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50 cursor-pointer hover:border-blue-500">
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        accept=".pdf,.docx,.doc,.txt,.md,.markdown,.text,.html,.htm,.csv,.xlsx,.xls,.json,.pptx,.ppt,.rtf,.odt,.py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.h,.cs,.go,.rb,.php,.swift,.kt,.rs,.sql,.sh,.bash,.yaml,.yml,.xml,.css,.scss,.less"
                      />
                      <div className="flex flex-col items-center gap-2">
                      <CloudUpload className="text-blue-500" size={32} />
                      <p className="text-sm text-gray-500">Drag & drop files or browse</p>
                      <p className="text-xs text-gray-400">
                        {files.length} files selected · {formattedSize}
                      </p>
                    </div>
                  </label>
                  <div className="mt-8 p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <Info className="text-blue-500 mt-0.5" size={16} />
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Supported File Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {supportedFormats.map((format) => (
                            <span key={format} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">
                              {format}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Database className="text-blue-600" />
                    Chunking Settings
                  </div>
                  <p className="text-sm text-gray-500">Fine-tune how your documents are chunked and embedded.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="flex justify-between text-sm text-gray-600">
                        <span>Chunk size</span>
                        <span className="font-semibold text-gray-900">{formData.chunk_size}</span>
                      </label>
                      <input
                        type="range"
                        min={256}
                        max={2048}
                        step={64}
                        value={formData.chunk_size}
                        onChange={(e) => setFormData({ ...formData, chunk_size: Number(e.target.value) })}
                        className="w-full mt-2"
                      />
                      <p className="text-xs text-gray-400">Max tokens in a chunk (e.g., 1024 ≈ 750 words).</p>
                    </div>
                    <div>
                      <label className="flex justify-between text-sm text-gray-600">
                        <span>Chunk overlap</span>
                        <span className="font-semibold text-gray-900">{formData.chunk_overlap}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={512}
                        step={16}
                        value={formData.chunk_overlap}
                        onChange={(e) => setFormData({ ...formData, chunk_overlap: Number(e.target.value) })}
                        className="w-full mt-2"
                      />
                      <p className="text-xs text-gray-400">Tokens overlapping to retain context.</p>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm text-gray-700">Embedding provider</label>
                      <select
                        value={formData.embedding_provider}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            embedding_provider: e.target.value,
                            embedding_model: EMBEDDING_MODELS[e.target.value][0],
                          })
                        }
                        className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        {EMBEDDING_PROVIDERS.map((provider) => (
                          <option key={provider.value} value={provider.value}>
                            {provider.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Embedding model</label>
                      <select
                        value={formData.embedding_model}
                        onChange={(e) => setFormData({ ...formData, embedding_model: e.target.value })}
                        className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        {EMBEDDING_MODELS[formData.embedding_provider]?.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <ShieldCheck className="text-blue-600" />
                    Review & Create
                  </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Workspace name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="Give your workspace a name"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 mt-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Add a name so we can save and identify your workspace.</p>
                </div>
                  <p className="text-sm text-gray-500">Confirm your settings before launching.</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Workspace name</span>
                      <span className="font-semibold text-gray-900">{formData.name || 'Untitled workspace'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Description</span>
                      <span className="font-semibold text-gray-900">{formData.description || 'No description yet'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Data source</span>
                      <span className="font-semibold text-gray-900">
                        {files.length > 0 ? `${files.length} file(s)` : 'No files uploaded'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Chunk size</span>
                      <span className="font-semibold text-gray-900">{chunkLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Chunk overlap</span>
                      <span className="font-semibold text-gray-900">{formData.chunk_overlap}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Embedding model</span>
                      <span className="font-semibold text-gray-900">{formData.embedding_model}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="px-5 py-3 rounded-2xl border border-gray-300 text-sm font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50"
                >
                  <ArrowLeft className="inline mr-1" />
                  Back
                </button>
                {currentStep < 3 ? (
                  <button
                    onClick={handleContinue}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold flex items-center gap-2 hover:bg-blue-700"
                  >
                    Continue
                    <ArrowRight />
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold flex items-center gap-2 hover:bg-blue-700"
                  >
                    {loading ? 'Creating...' : 'Create workspace'}
                    <ArrowRight />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

