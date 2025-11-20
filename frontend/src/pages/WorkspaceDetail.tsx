import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  PlayCircle,
  Database,
  BarChart3,
  RefreshCw,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Workspace, Document, Dataset, Evaluation } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const WorkspaceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'datasets' | 'evaluations'>('documents');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingFilename, setEditingFilename] = useState('');

  useEffect(() => {
    if (id) {
      loadWorkspaceData();
    }
  }, [id]);

  // Auto-refresh documents when there are processing documents
  useEffect(() => {
    if (!id) return;

    const processingDocs = documents.filter(
      doc => doc.processing_status === 'processing' || doc.processing_status === 'pending'
    );

    if (processingDocs.length === 0) return;

    // Poll every 2 seconds when documents are processing
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
      // Load workspace first
      const workspaceData = await api.getWorkspace(id);
      setWorkspace(workspaceData);

      // Load other data independently so one failure doesn't break everything
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
        setEvaluations(evaluationsData);
      } catch (error) {
        console.error('Failed to load evaluations:', error);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    setUploading(true);
    const uploadedDocs: Document[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        try {
          const document = await api.uploadDocument(id, files[i]);
          uploadedDocs.push(document);
          successCount++;
        } catch (error) {
          console.error(`Failed to upload ${files[i].name}:`, error);
          failCount++;
        }
      }

      // Update documents list with successfully uploaded files
      if (uploadedDocs.length > 0) {
        setDocuments([...documents, ...uploadedDocs]);
      }

      // Show summary message
      if (files.length === 1) {
        if (successCount > 0) {
          alert('Document uploaded successfully!');
        } else {
          alert('Failed to upload document');
        }
      } else {
        alert(`Uploaded ${successCount} of ${files.length} files successfully${failCount > 0 ? `. ${failCount} failed.` : '.'}`);
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleProcessDocument = async (documentId: string) => {
    setProcessing(documentId);
    try {
      await api.processDocument(documentId);
      // Reload documents to get updated status
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

  const handleProcessAllPending = async () => {
    const pendingDocs = documents.filter(doc => doc.processing_status === 'pending');
    if (pendingDocs.length === 0) {
      alert('No pending documents to process');
      return;
    }

    if (!confirm(`Process ${pendingDocs.length} pending document(s)?`)) {
      return;
    }

    setBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const doc of pendingDocs) {
        try {
          await api.processDocument(doc.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to process ${doc.filename}:`, error);
          failCount++;
        }
      }

      // Reload documents
      if (id) {
        const documentsData = await api.listDocuments(id);
        setDocuments(documentsData);
      }

      if (failCount === 0) {
        alert(`Successfully started processing ${successCount} document(s)`);
      } else {
        alert(`Started processing ${successCount} document(s). ${failCount} failed.`);
      }
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(d => d.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.size === 0) {
      alert('No documents selected');
      return;
    }

    if (!confirm(`Delete ${selectedDocuments.size} selected document(s)? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const docId of selectedDocuments) {
        try {
          await api.deleteDocument(docId);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete document ${docId}:`, error);
          failCount++;
        }
      }

      // Reload documents
      if (id) {
        const documentsData = await api.listDocuments(id);
        setDocuments(documentsData);
      }

      setSelectedDocuments(new Set());

      if (failCount === 0) {
        alert(`Successfully deleted ${successCount} document(s)`);
      } else {
        alert(`Deleted ${successCount} document(s). ${failCount} failed.`);
      }
    } finally {
      setDeleting(false);
    }
  };

  const startEditingDocument = (doc: Document) => {
    setEditingDocId(doc.id);
    setEditingFilename(doc.filename);
  };

  const cancelEditingDocument = () => {
    setEditingDocId(null);
    setEditingFilename('');
  };

  const saveDocumentName = async (docId: string) => {
    if (!editingFilename.trim()) {
      alert('Filename cannot be empty');
      return;
    }

    try {
      await api.updateDocument(docId, { filename: editingFilename });

      // Update local state
      setDocuments(documents.map(d =>
        d.id === docId ? { ...d, filename: editingFilename } : d
      ));

      setEditingDocId(null);
      setEditingFilename('');
    } catch (error) {
      console.error('Failed to update document name:', error);
      alert('Failed to update document name');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'badge-warning',
      processing: 'badge-info',
      completed: 'badge-success',
      failed: 'badge-error',
    };
    return badges[status as keyof typeof badges] || 'badge-info';
  };

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/workspaces')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Workspaces
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
              {workspace.description && (
                <p className="text-gray-600 mt-2">{workspace.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="badge badge-info">{workspace.embedding_provider}</span>
                <span className="badge badge-info">{workspace.embedding_model}</span>
                <span className="badge badge-info">
                  Chunk: {workspace.chunk_size} / {workspace.chunk_overlap}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8">
            {['documents', 'datasets', 'evaluations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({
                  tab === 'documents' ? documents.length :
                  tab === 'datasets' ? datasets.length :
                  evaluations.length
                })
              </button>
            ))}
          </div>
        </div>

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Processing Progress Indicator */}
            {documents.filter(d => d.processing_status === 'processing' || d.processing_status === 'pending').length > 0 && (
              <div className="card bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <RefreshCw className="animate-spin text-blue-600" size={20} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        Processing {documents.filter(d => d.processing_status === 'processing' || d.processing_status === 'pending').length} of {documents.length} documents
                      </span>
                      <span className="text-xs text-blue-700">
                        {Math.round((documents.filter(d => d.processing_status === 'completed').length / documents.length) * 100)}% complete
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(documents.filter(d => d.processing_status === 'completed').length / documents.length) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">Documents</h2>
                {documents.length > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.size === documents.length && documents.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-gray-600">
                      Select All {selectedDocuments.size > 0 && `(${selectedDocuments.size})`}
                    </span>
                  </label>
                )}
              </div>
              <div className="flex gap-3">
                {selectedDocuments.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={deleting}
                    className="btn-secondary text-red-600 hover:bg-red-50"
                  >
                    {deleting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Trash2 size={18} className="inline mr-2" />
                        Delete ({selectedDocuments.size})
                      </>
                    )}
                  </button>
                )}
                {documents.filter(d => d.processing_status === 'pending').length > 0 && (
                  <button
                    onClick={handleProcessAllPending}
                    disabled={bulkProcessing}
                    className="btn-secondary"
                  >
                    {bulkProcessing ? (
                      <>
                        <LoadingSpinner size="sm" className="inline mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <PlayCircle size={18} className="inline mr-2" />
                        Process All Pending ({documents.filter(d => d.processing_status === 'pending').length})
                      </>
                    )}
                  </button>
                )}
                <label className="btn-primary cursor-pointer">
                  <Upload size={20} className="inline mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Documents'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt,.md,.markdown,.html,.htm,.csv,.xlsx,.xls,.json,.py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.h,.cs,.go,.rb,.php,.swift,.kt,.rs,.sql,.sh,.bash,.yaml,.yml,.xml,.css,.scss,.less"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    multiple
                  />
                </label>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="card text-center py-12">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No documents yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Upload documents to start building your RAG index
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="card flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText size={20} className="text-gray-400" />
                          {editingDocId === doc.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingFilename}
                                onChange={(e) => setEditingFilename(e.target.value)}
                                className="input flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveDocumentName(doc.id);
                                  if (e.key === 'Escape') cancelEditingDocument();
                                }}
                              />
                              <button
                                onClick={() => saveDocumentName(doc.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Save"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={cancelEditingDocument}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-semibold">{doc.filename}</h3>
                              <button
                                onClick={() => startEditingDocument(doc)}
                                className="p-1 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                                title="Edit filename"
                              >
                                <Edit2 size={16} />
                              </button>
                            </>
                          )}
                          <span className={`badge ${getStatusBadge(doc.processing_status)}`}>
                            {doc.processing_status}
                          </span>
                        </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Type: {doc.file_type.toUpperCase()}</span>
                        {doc.file_size_bytes && (
                          <span>
                            Size: {(doc.file_size_bytes / 1024).toFixed(0)} KB
                          </span>
                        )}
                        {doc.total_chunks > 0 && (
                          <span>Chunks: {doc.total_chunks}</span>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(doc.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                        {doc.processing_status === 'failed' && doc.error_message && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <strong>Error:</strong> {doc.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                    {doc.processing_status === 'pending' && (
                      <button
                        onClick={() => handleProcessDocument(doc.id)}
                        disabled={processing === doc.id}
                        className="btn-primary"
                      >
                        {processing === doc.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <PlayCircle size={18} className="inline mr-2" />
                            Process
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Datasets Tab */}
        {activeTab === 'datasets' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Test Datasets</h2>
              <Link to={`/workspaces/${id}/datasets/new`} className="btn-primary">
                <Database size={20} className="inline mr-2" />
                Create Dataset
              </Link>
            </div>

            {datasets.length === 0 ? (
              <div className="card text-center py-12">
                <Database className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No datasets yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create test datasets to evaluate your RAG system
                </p>
                <Link to={`/workspaces/${id}/datasets/new`} className="btn-primary">
                  Create Dataset
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {datasets.map((dataset) => (
                  <Link
                    key={dataset.id}
                    to={`/datasets/${dataset.id}`}
                    className="card hover:shadow-md transition-shadow block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{dataset.name}</h3>
                        {dataset.description && (
                          <p className="text-gray-600 text-sm mb-2">
                            {dataset.description}
                          </p>
                        )}
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>{dataset.total_questions} questions</span>
                          <span>
                            Created{' '}
                            {formatDistanceToNow(new Date(dataset.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Evaluations Tab */}
        {activeTab === 'evaluations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Evaluations</h2>
              <Link to={`/workspaces/${id}/evaluations/new`} className="btn-primary">
                <BarChart3 size={20} className="inline mr-2" />
                New Evaluation
              </Link>
            </div>

            {evaluations.length === 0 ? (
              <div className="card text-center py-12">
                <BarChart3 className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No evaluations yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Run evaluations to compare LLM performance
                </p>
                <Link to={`/workspaces/${id}/evaluations/new`} className="btn-primary">
                  New Evaluation
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {evaluations.map((evaluation) => (
                  <Link
                    key={evaluation.id}
                    to={`/results/${evaluation.id}`}
                    className="card hover:shadow-md transition-shadow block"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{evaluation.name}</h3>
                          <span className={`badge ${getStatusBadge(evaluation.status)}`}>
                            {evaluation.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {evaluation.models_to_test.map((model, idx) => (
                            <span key={idx} className="badge badge-info">
                              {model.provider}: {model.model}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600">
                          Judge: {evaluation.judge_provider} - {evaluation.judge_model}
                          {' • '}
                          Created{' '}
                          {formatDistanceToNow(new Date(evaluation.created_at), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
