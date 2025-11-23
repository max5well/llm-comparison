import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Search, Trash2, X, Database, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Workspace, Document, Dataset, Evaluation } from '../types';
import { EMBEDDING_PROVIDERS, EMBEDDING_MODELS } from '../types';
import { formatDistanceToNow } from 'date-fns';

const statusPillStyles: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
  processing: 'bg-blue-50 text-blue-700 border border-blue-100',
  completed: 'bg-green-50 text-green-700 border border-green-100',
  failed: 'bg-red-50 text-red-700 border border-red-100',
};

const getStatusPill = (status: string) => statusPillStyles[status] || 'bg-gray-100 text-gray-500 border border-gray-200';

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 MB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const WorkspaceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [processingAllFiles, setProcessingAllFiles] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [chunksModalOpen, setChunksModalOpen] = useState(false);
  const [chunks, setChunks] = useState<any[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'datasets' | 'evaluations'>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    fileType: '',
    minSize: '',
    maxSize: '',
    status: '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    chunk_size: 1000,
    chunk_overlap: 200,
    embedding_provider: 'openai',
    embedding_model: 'text-embedding-3-small',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadWorkspaceData();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // Don't auto-poll, let user manually trigger processing
    // const processingDocs = documents.filter(
    //   doc => doc.processing_status === 'processing' || doc.processing_status === 'pending'
    // );

    // if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const documentsData = await api.listDocuments(id);
        setDocuments(documentsData);
      } catch (error) {
        console.error('Failed to refresh documents:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, documents]);

  const loadWorkspaceData = async () => {
    if (!id) return;

    try {
      const workspaceData = await api.getWorkspace(id);
      setWorkspace(workspaceData);
      setSettingsForm({
        chunk_size: workspaceData.chunk_size,
        chunk_overlap: workspaceData.chunk_overlap,
        embedding_provider: workspaceData.embedding_provider,
        embedding_model: workspaceData.embedding_model,
      });

      try {
        const documentsData = await api.listDocuments(id);
        setDocuments(documentsData);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }

      try {
        const datasetsData = await api.listDatasets(id);
        setDatasets(datasetsData);
      } catch (error) {
        console.error('Failed to load datasets:', error);
      }

      try {
        const evaluationsData = await api.listEvaluations(id);
        setEvaluations(evaluationsData || []);
      } catch (error) {
        console.error('Failed to load evaluations:', error);
        setEvaluations([]);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessDocument = async (documentId: string) => {
    setProcessing(documentId);
    try {
      await api.processDocument(documentId);
      if (id) {
        const documentsData = await api.listDocuments(id);
        setDocuments(documentsData);
      }
    } catch (error) {
      console.error('Failed to process document:', error);
      alert('Failed to process document');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessAllFiles = async () => {
    const pendingDocs = documents.filter(
      doc => doc.processing_status === 'pending'
    );
    
    if (pendingDocs.length === 0) return;

    setProcessingAllFiles(true);
    try {
      // Process all pending documents
      await Promise.all(
        pendingDocs.map(doc => api.processDocument(doc.id))
      );
      // Poll for status updates
      if (id) {
        setTimeout(async () => {
          const documentsData = await api.listDocuments(id);
          setDocuments(documentsData);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to process files:', error);
      alert('Failed to process some files. Please try again.');
    } finally {
      setProcessingAllFiles(false);
    }
  };

  const handleViewChunks = async (documentId: string) => {
    setSelectedDocumentId(documentId);
    setLoadingChunks(true);
    setChunksModalOpen(true);
    try {
      const documentChunks = await api.getDocumentChunks(documentId);
      setChunks(documentChunks);
        } catch (error) {
      console.error('Failed to load chunks:', error);
      alert('Failed to load chunks');
      setChunksModalOpen(false);
    } finally {
      setLoadingChunks(false);
    }
  };

  const pendingDocuments = documents.filter(
    doc => doc.processing_status === 'pending'
  );

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteDocument(documentId);
      if (id) {
        const documentsData = await api.listDocuments(id);
        setDocuments(documentsData);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const handleUploadDocuments = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !event.target.files) return;
    const files = Array.from(event.target.files);
    try {
      for (const file of files) {
        await api.uploadDocument(id, file);
      }
      const documentsData = await api.listDocuments(id);
      setDocuments(documentsData);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload documents:', error);
      alert('Failed to upload documents');
    }
  };

  const handleSaveSettings = async () => {
    if (!id || !workspace) return;
    
    // Check if chunking or embedding settings changed
    const chunkingChanged = 
      settingsForm.chunk_size !== workspace.chunk_size ||
      settingsForm.chunk_overlap !== workspace.chunk_overlap;
    const embeddingChanged = 
      settingsForm.embedding_provider !== workspace.embedding_provider ||
      settingsForm.embedding_model !== workspace.embedding_model;
    
    if (chunkingChanged || embeddingChanged) {
      const completedCount = documents.filter(doc => doc.processing_status === 'completed').length;
      if (completedCount > 0) {
        // Show confirmation modal instead of browser confirm
        setConfirmModalConfig({
          title: 'Reprocess Documents?',
          message: `Changing these settings will reprocess all ${completedCount} completed document(s). This may take some time. Do you want to continue?`,
          onConfirm: async () => {
            setShowConfirmModal(false);
            await saveSettingsAndReprocess();
          },
          onCancel: () => {
            setShowConfirmModal(false);
            setConfirmModalConfig(null);
          }
        });
        setShowConfirmModal(true);
      return;
    }
    }
    
    // No reprocessing needed, just save
    await saveSettingsAndReprocess();
  };

  const saveSettingsAndReprocess = async () => {
    if (!id || !workspace) return;
    
    setSavingSettings(true);
    try {
      const updated = await api.updateWorkspace(id, settingsForm);
      setWorkspace(updated);
      setShowSettings(false);
      
      // Reload documents to show updated status
      if (id) {
        setTimeout(async () => {
          try {
        const documentsData = await api.listDocuments(id);
        setDocuments(documentsData);
          } catch (error) {
            console.error('Failed to reload documents:', error);
          }
        }, 1000);
      }
      
      // Show success message
      const chunkingChanged = 
        settingsForm.chunk_size !== workspace.chunk_size ||
        settingsForm.chunk_overlap !== workspace.chunk_overlap;
      const embeddingChanged = 
        settingsForm.embedding_provider !== workspace.embedding_provider ||
        settingsForm.embedding_model !== workspace.embedding_model;
      
      if (chunkingChanged || embeddingChanged) {
        setSuccessMessage('Settings saved! All documents are being reprocessed with the new settings.');
      } else {
        setSuccessMessage('Settings saved successfully!');
      }
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 5000);
    } catch (error: any) {
      console.error('Failed to update workspace:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      setConfirmModalConfig({
        title: 'Error',
        message: `Failed to update workspace settings: ${errorMessage}`,
        onConfirm: () => {
          setShowConfirmModal(false);
          setConfirmModalConfig(null);
      }
      });
      setShowConfirmModal(true);
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    // Search filter
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // File type filter
    if (filterOptions.fileType) {
      const fileExt = doc.filename.split('.').pop()?.toLowerCase() || '';
      if (fileExt !== filterOptions.fileType.toLowerCase()) return false;
    }

    // File size filters
    if (filterOptions.minSize) {
      const minBytes = parseFloat(filterOptions.minSize) * 1024 * 1024; // Convert MB to bytes
      if ((doc.file_size_bytes || 0) < minBytes) return false;
    }
    if (filterOptions.maxSize) {
      const maxBytes = parseFloat(filterOptions.maxSize) * 1024 * 1024; // Convert MB to bytes
      if ((doc.file_size_bytes || 0) > maxBytes) return false;
    }

    // Status filter
    if (filterOptions.status && doc.processing_status !== filterOptions.status) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilterOptions({
      fileType: '',
      minSize: '',
      maxSize: '',
      status: '',
    });
  };

  const hasActiveFilters = filterOptions.fileType || filterOptions.minSize || filterOptions.maxSize || filterOptions.status;

  const documentStats = {
    total: documents.length,
    pending: documents.filter(doc => doc.processing_status === 'pending').length,
    processing: documents.filter(doc => doc.processing_status === 'processing').length,
    completed: documents.filter(doc => doc.processing_status === 'completed').length,
    failed: documents.filter(doc => doc.processing_status === 'failed').length,
    };

  const totalChunks = documents.reduce((sum, doc) => sum + (doc.total_chunks || 0), 0);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  if (!workspace) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Workspace not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <section className="bg-white border border-gray-200 rounded-3xl shadow-lg p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <Link to="/workspaces" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft size={16} />
                Back to Workspaces
              </Link>
              <h1 className="text-4xl font-bold text-gray-900">{workspace.name}</h1>
              <p className="text-sm text-gray-500">
                Created {workspace.created_at ? formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true }) : 'recently'}
                {' • '}
                Last updated {workspace.updated_at ? formatDistanceToNow(new Date(workspace.updated_at), { addSuffix: true }) : 'recently'}
              </p>
            </div>
            <div className="flex items-center gap-3">
          <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400"
          >
                Settings
          </button>
              <Link
                to={`/workspaces/${workspace.id}/datasets/new`}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600"
              >
                Create Dataset
              </Link>
              </div>
            </div>
          {workspace.description && <p className="text-gray-600">{workspace.description}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Active
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
              {documents.length} Documents
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">
              {workspace.embedding_provider} {workspace.embedding_model}
            </span>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-3xl shadow-sm">
          <div className="flex flex-wrap items-center gap-4 px-6 pt-6">
            {['documents', 'datasets', 'evaluations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-4 py-3 rounded-full border text-sm flex items-center gap-2 ${activeTab === tab
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow'
                  : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'}`}
              >
                {tab === 'documents' && <FileText size={14} />}
                {tab === 'datasets' && <Database size={14} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}{' '}
                <span className="text-xs font-normal text-gray-400">
                  (
                  {tab === 'documents'
                    ? documentStats.total
                    : tab === 'datasets'
                    ? datasets.length
                    : evaluations.length}
                  )
                </span>
              </button>
            ))}
            <div className="flex-1" />
            <div className="px-4 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
              Last updated{' '}
              <span className="font-medium">
                {documents.length > 0
                  ? formatDistanceToNow(new Date(documents[0].created_at), { addSuffix: true })
                  : 'just now'}
                      </span>
                    </div>
                    </div>
          <div className="border-t border-gray-100 px-6 py-6 space-y-6">
            {activeTab === 'documents' && (
              <>
                <div className="flex flex-wrap gap-4">
                  <div className="relative flex-1 min-w-[220px]">
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Search size={16} />
              </div>
                  </div>
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className={`px-4 py-2 border rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                      hasActiveFilters
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-blue-200 hover:text-gray-900'
                    }`}
                  >
                    <Search size={14} />
                    Filter
                    {hasActiveFilters && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-200 text-blue-700 rounded-full text-xs">
                        Active
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleProcessAllFiles}
                    disabled={processingAllFiles || pendingDocuments.length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {processingAllFiles ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        Process Files ({pendingDocuments.length})
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleUploadDocuments}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Upload Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.txt,.md,.markdown,.text,.html,.htm,.csv,.xlsx,.xls,.json,.pptx,.ppt,.rtf,.odt,.py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.h,.cs,.go,.rb,.php,.swift,.kt,.rs,.sql,.sh,.bash,.yaml,.yml,.xml,.css,.scss,.less"
                  />
            </div>

                <div className="space-y-4">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-12 text-gray-600">
                      {searchQuery ? 'No documents match your search.' : 'No documents yet. Upload to begin.'}
              </div>
            ) : (
                    filteredDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="text-red-500" size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1 truncate">{document.filename}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>{formatFileSize(document.file_size_bytes)}</span>
                                <span>•</span>
                              <button
                                  onClick={() => document.processing_status === 'completed' && document.total_chunks > 0 ? handleViewChunks(document.id) : null}
                                  className={`${document.processing_status === 'completed' && document.total_chunks > 0 ? 'hover:text-blue-600 cursor-pointer underline' : ''}`}
                                  disabled={document.processing_status !== 'completed' || document.total_chunks === 0}
                                >
                                  {document.total_chunks} {document.total_chunks === 1 ? 'chunk' : 'chunks'}
                              </button>
                                <span>•</span>
                                <span>Uploaded {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
                            </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 ${getStatusPill(document.processing_status)}`}>
                              {document.processing_status === 'processing' && (
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                              )}
                              {document.processing_status === 'completed' && (
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                              )}
                              {document.processing_status === 'failed' && (
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                              )}
                              {document.processing_status.charAt(0).toUpperCase() + document.processing_status.slice(1)}
                            </span>
                              <button
                              onClick={() => handleDeleteDocument(document.id)}
                              className="w-8 h-8 rounded-lg hover:bg-gray-100 transition flex items-center justify-center text-gray-400 hover:text-red-600"
                              title="Delete document"
                              >
                              <Trash2 size={16} />
                              </button>
                        </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                document.processing_status === 'completed'
                                  ? 'bg-green-500'
                                  : document.processing_status === 'processing'
                                  ? 'bg-blue-500 animate-pulse'
                                  : document.processing_status === 'failed'
                                  ? 'bg-red-500'
                                  : 'bg-gray-400'
                              }`}
                              style={{
                                width:
                                  document.processing_status === 'completed'
                                    ? '100%'
                                    : document.processing_status === 'processing'
                                    ? '67%'
                                    : document.processing_status === 'failed'
                                    ? '100%'
                                    : '0%',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {document.processing_status === 'completed' ? '100%' :
                             document.processing_status === 'processing' ? '67%' :
                             document.processing_status === 'failed' ? 'Failed' : '0%'}
                        </span>
                      </div>
                        {document.processing_status === 'failed' && document.error_message && (
                          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                              <span className="text-red-600 text-sm">⚠</span>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-red-900 mb-1">Embedding Failed</div>
                                <div className="text-xs text-red-700">{document.error_message}</div>
                          </div>
                      </div>
                    </div>
                    )}
                  </div>
                    ))
            )}
          </div>
              </>
        )}

        {activeTab === 'datasets' && (
          <div className="space-y-4">
            {datasets.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">No datasets yet. Create one to evaluate models.</div>
            ) : (
                  <div className="grid gap-4">
                {datasets.map((dataset) => (
                  <Link
                    key={dataset.id}
                    to={`/datasets/${dataset.id}`}
                        className="block bg-gray-50 rounded-2xl border border-gray-200 p-5 hover:border-blue-200 transition"
                  >
                        <div className="flex justify-between items-center">
                      <div>
                            <h3 className="text-lg font-semibold text-gray-900">{dataset.name}</h3>
                            <p className="text-sm text-gray-500">{dataset.total_questions} questions</p>
                        </div>
                          <span className="text-xs text-gray-500">{new Date(dataset.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'evaluations' && (
          <div className="space-y-4">
                {(!evaluations || evaluations.length === 0) && (
                  <div className="text-center py-12 text-gray-600">No evaluations yet. Schedule one to compare models.</div>
                )}
              <div className="space-y-3">
                  {evaluations.map((evaluation) => {
                    if (!evaluation) return null;
                    return (
                  <Link
                    key={evaluation.id}
                    to={`/results/${evaluation.id}`}
                        className="block bg-gray-50 rounded-2xl border border-gray-200 p-5 hover:border-blue-200 transition"
                  >
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap justify-between gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {evaluation.name || 'Untitled Evaluation'}
                            </h3>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusPill(evaluation.status || 'pending')}`}>
                              {evaluation.status || 'pending'}
                          </span>
                        </div>
                          {evaluation.models_to_test && evaluation.models_to_test.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                          {evaluation.models_to_test.map((model, idx) => (
                                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                              {model.provider}: {model.model}
                            </span>
                          ))}
                        </div>
                          )}
                          <div className="text-sm text-gray-500">
                            {evaluation.judge_provider && evaluation.judge_model && (
                              <>
                          Judge: {evaluation.judge_provider} - {evaluation.judge_model}
                          {' • '}
                              </>
                            )}
                            {evaluation.created_at
                              ? formatDistanceToNow(new Date(evaluation.created_at), { addSuffix: true })
                              : 'No timestamp'}
                          </div>
                        </div>
                      </Link>
                    );
                          })}
                        </div>
                      </div>
            )}
                    </div>
        </section>

        <section className="grid gap-6 md:grid-cols-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="text-blue-600" size={20} />
              </div>
              <span className="text-xs text-green-500">↗</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{documentStats.total}</div>
            <div className="text-sm text-gray-500">Total Documents</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <span className="text-xs text-green-500">↗</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{documentStats.completed}</div>
            <div className="text-sm text-gray-500">Successfully Embedded</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Database className="text-purple-600" size={20} />
              </div>
              <span className="text-xs text-gray-400">~</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{totalChunks}</div>
            <div className="text-sm text-gray-500">Total Chunks</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-xl">⚠</span>
              </div>
              <span className="text-xs text-red-500">↘</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{documentStats.failed}</div>
            <div className="text-sm text-gray-500">Failed Documents</div>
          </div>
        </section>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Workspace Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chunk Size</label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Chunk Size</span>
                    <span className="font-semibold text-gray-900">{settingsForm.chunk_size} tokens</span>
                  </div>
                  <input
                    type="range"
                    min={256}
                    max={2048}
                    step={64}
                    value={settingsForm.chunk_size}
                    onChange={(e) => setSettingsForm({ ...settingsForm, chunk_size: Number(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400">The maximum number of tokens in a chunk (e.g., 1024 tokens ~ 750 words).</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chunk Overlap</label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Chunk Overlap</span>
                    <span className="font-semibold text-gray-900">{settingsForm.chunk_overlap} tokens</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={512}
                    step={16}
                    value={settingsForm.chunk_overlap}
                    onChange={(e) => setSettingsForm({ ...settingsForm, chunk_overlap: Number(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400">The number of tokens to overlap between chunks to maintain context.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Embedding Provider</label>
                <select
                  value={settingsForm.embedding_provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    setSettingsForm({
                      ...settingsForm,
                      embedding_provider: provider,
                      embedding_model: EMBEDDING_MODELS[provider]?.[0] || settingsForm.embedding_model,
                    });
                  }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {EMBEDDING_PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Embedding Model</label>
                <select
                  value={settingsForm.embedding_model}
                  onChange={(e) => setSettingsForm({ ...settingsForm, embedding_model: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {EMBEDDING_MODELS[settingsForm.embedding_provider]?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSettings(false)}
                className="px-5 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
              </div>
            )}

      {/* Chunks Modal */}
      {chunksModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Document Chunks
              </h2>
              <button
                onClick={() => {
                  setChunksModalOpen(false);
                  setChunks([]);
                  setSelectedDocumentId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <XCircle size={24} className="text-gray-500" />
              </button>
          </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingChunks ? (
                <div className="text-center py-12">
                  <LoadingSpinner />
                </div>
              ) : chunks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No chunks found
                </div>
              ) : (
                <div className="space-y-4">
                  {chunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                          Chunk {chunk.chunk_index + 1} of {chunks.length}
                        </span>
                        {chunk.token_count && (
                          <span className="text-xs text-gray-500">
                            {chunk.token_count} tokens
                          </span>
        )}
      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmModalConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {confirmModalConfig.title === 'Error' ? (
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="text-red-600" size={20} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="text-blue-600" size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {confirmModalConfig.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {confirmModalConfig.message}
                  </p>
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowConfirmModal(false);
                        if (confirmModalConfig.onCancel) {
                          confirmModalConfig.onCancel();
                        }
                        setConfirmModalConfig(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (confirmModalConfig.onConfirm) {
                          confirmModalConfig.onConfirm();
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
                    >
                      {confirmModalConfig.title === 'Error' ? 'OK' : 'Continue'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Filter Documents</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* File Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File Type</label>
                <select
                  value={filterOptions.fileType}
                  onChange={(e) => setFilterOptions({ ...filterOptions, fileType: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="doc">DOC</option>
                  <option value="pptx">PPTX</option>
                  <option value="ppt">PPT</option>
                  <option value="txt">TXT</option>
                  <option value="md">MD</option>
                  <option value="html">HTML</option>
                  <option value="csv">CSV</option>
                  <option value="xlsx">XLSX</option>
                  <option value="json">JSON</option>
                  <option value="py">Python</option>
                  <option value="js">JavaScript</option>
                  <option value="ts">TypeScript</option>
                </select>
              </div>

              {/* File Size Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Size (MB)</label>
                  <input
                    type="number"
                    value={filterOptions.minSize}
                    onChange={(e) => setFilterOptions({ ...filterOptions, minSize: e.target.value })}
                    placeholder="0"
                    step="0.1"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Size (MB)</label>
                  <input
                    type="number"
                    value={filterOptions.maxSize}
                    onChange={(e) => setFilterOptions({ ...filterOptions, maxSize: e.target.value })}
                    placeholder="No limit"
                    step="0.1"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterOptions.status}
                  onChange={(e) => setFilterOptions({ ...filterOptions, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 flex items-center space-x-3 min-w-[300px]">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={18} />
              </div>
            </div>
            <p className="text-sm text-gray-800 flex-1">{successMessage}</p>
            <button
              onClick={() => setShowSuccessAlert(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};
