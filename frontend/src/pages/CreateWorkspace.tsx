import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { GoogleDrivePicker } from '../components/GoogleDrivePicker';
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
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [importedFromDrive, setImportedFromDrive] = useState<string[]>([]);
  const [tempWorkspaceId, setTempWorkspaceId] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState(false);
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
    if (currentStep === 1) {
      if (dataSource === 'upload' && files.length === 0) {
        alert('Please upload at least one document.');
        return;
      }
      if (dataSource === 'drive' && importedFromDrive.length === 0) {
        alert('Please select files from Google Drive.');
        return;
      }
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleOpenDrivePicker = async () => {
    // Check if user has connected Google Drive
    try {
      const driveStatus = await api.getGoogleDriveStatus();

      if (!driveStatus.is_connected) {
        // User hasn't connected Drive - prompt them to connect first
        if (confirm('You need to connect your Google Drive first. Would you like to connect now?')) {
          const { authorization_url, state } = await api.getGoogleDriveConnectUrl();

          // Store state for CSRF verification and return path
          sessionStorage.setItem('google_drive_connect_state', state);
          sessionStorage.setItem('return_to_create_workspace', 'true');
          if (formData.name) {
            sessionStorage.setItem('pending_workspace_name', formData.name);
          }

          // Redirect to Google OAuth
          window.location.href = authorization_url;
        }
        return;
      }
    } catch (error) {
      console.error('Failed to check Drive status:', error);
      alert('Failed to check Google Drive connection status');
      return;
    }

    // Drive is connected - proceed with workspace creation
    // If workspace doesn't exist yet, create it first
    if (!tempWorkspaceId) {
      if (!formData.name) {
        // Show modal to ask for workspace name instead of navigating away
        setShowNameModal(true);
        return;
      }

      setLoading(true);
      try {
        const workspace = await api.createWorkspace({
          ...formData,
          data_source: 'google_drive',
        });
        setTempWorkspaceId(workspace.id);
        setShowDrivePicker(true);
      } catch (error: any) {
        console.error('Failed to create workspace:', error);
        alert(error.response?.data?.detail || 'Failed to create workspace');
      } finally {
        setLoading(false);
      }
    } else {
      setShowDrivePicker(true);
    }
  };

  const handleNameModalSubmit = async () => {
    if (!formData.name) {
      return;
    }
    setShowNameModal(false);
    setLoading(true);
    try {
      const workspace = await api.createWorkspace({
        ...formData,
        data_source: 'google_drive',
      });
      setTempWorkspaceId(workspace.id);
      setShowDrivePicker(true);
    } catch (error: any) {
      console.error('Failed to create workspace:', error);
      alert(error.response?.data?.detail || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleDriveImport = (documentIds: string[]) => {
    setImportedFromDrive(documentIds);
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
      // If using Google Drive and workspace already exists, just navigate
      if (dataSource === 'drive' && tempWorkspaceId) {
        console.log('Navigating to existing Google Drive workspace:', tempWorkspaceId);
        navigate(`/workspaces/${tempWorkspaceId}`);
        return;
      }

      // Create workspace for upload flow
      console.log('Creating workspace with data:', formData);
      console.log('Files to upload:', files.length);

      const workspace = await api.createWorkspace({
        ...formData,
        data_source: 'manual',
      });

      console.log('Workspace created:', workspace.id);

      if (files.length > 0) {
        console.log('Uploading files...');
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`Uploading file ${i + 1}/${files.length}: ${file.name}`);
          try {
            await api.uploadDocument(workspace.id, file);
            console.log(`Successfully uploaded: ${file.name}`);
          } catch (uploadError: any) {
            console.error(`Failed to upload ${file.name}:`, uploadError);
            // Continue with other files even if one fails
          }
        }
        console.log('All files uploaded');
      }

      // Navigate to workspace detail page
      console.log('Navigating to workspace:', workspace.id);
      navigate(`/workspaces/${workspace.id}`);
    } catch (error: any) {
      console.error('Failed to create workspace:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create workspace';
      alert(`Error: ${errorMessage}`);
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
                      className={`flex flex-col gap-1 rounded-2xl border p-4 text-left text-sm ${
                        dataSource === 'drive'
                          ? 'border-blue-500 bg-blue-50 text-gray-900 shadow'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                      onClick={() => setDataSource('drive')}
                    >
                      <span className="text-lg font-semibold">Google Drive</span>
                      <span className="text-xs">Import from Drive</span>
                    </button>
                  </div>

                  {/* File Upload Area - only shown for upload source */}
                  {dataSource === 'upload' && (
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
                  )}

                  {/* Google Drive Picker Button - only shown for drive source */}
                  {dataSource === 'drive' && (
                    <button
                      onClick={handleOpenDrivePicker}
                      disabled={loading}
                      className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50 cursor-pointer hover:border-blue-500 transition-colors"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Database className="text-blue-500" size={32} />
                        <p className="text-sm text-gray-700 font-medium">
                          {importedFromDrive.length > 0
                            ? `${importedFromDrive.length} files imported from Google Drive`
                            : 'Select files from Google Drive'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {loading ? 'Loading...' : 'Click to open Google Drive picker'}
                        </p>
                      </div>
                    </button>
                  )}
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

      {/* Workspace Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Please provide a workspace name first.
            </h3>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter workspace name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && formData.name) {
                  handleNameModalSubmit();
                }
              }}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleNameModalSubmit}
                disabled={!formData.name || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Picker Modal */}
      {showDrivePicker && tempWorkspaceId && (
        <GoogleDrivePicker
          workspaceId={tempWorkspaceId}
          onClose={() => setShowDrivePicker(false)}
          onImport={handleDriveImport}
        />
      )}
    </Layout>
  );
};

