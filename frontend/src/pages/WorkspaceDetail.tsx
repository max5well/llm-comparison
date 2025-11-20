import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  PlayCircle,
  Settings,
  RefreshCw,
  Trash2,
  Edit2,
  Check,
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
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
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
        setEvaluations(evaluationsData || []);
      } catch (error) {
        console.error('Failed to load evaluations:', error);
        setEvaluations([]); // Set empty array on error to prevent white screen
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
      // no extra state
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

  const documentStats = {
    total: documents.length,
    pending: documents.filter(doc => doc.processing_status === 'pending').length,
    processing: documents.filter(doc => doc.processing_status === 'processing').length,
    completed: documents.filter(doc => doc.processing_status === 'completed').length,
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
              <div className="space-y-5">
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No documents yet. Upload to begin.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((document) => (
                      <div
                        key={document.id}
                        className="bg-gray-50 rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                              <FileText className="text-blue-500" size={24} />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{document.filename}</h3>
                              <p className="text-sm text-gray-500">
                                {document.processing_status} • {document.total_chunks} chunks
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge ${getStatusBadge(document.processing_status)}`}>
                            {document.processing_status}
                          </span>
                          <button
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
                            onClick={() => handleProcessDocument(document.id)}
                            disabled={processing === document.id}
                          >
                            {processing === document.id ? 'Processing...' : 'Process'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'datasets' && (
              <div className="space-y-4">
                {datasets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No datasets yet. Create one to evaluate models.</p>
                  </div>
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
                          <span className="text-xs text-gray-500">
                            {new Date(dataset.created_at).toLocaleDateString()}
                          </span>
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
                  <div className="text-center py-12">
                    <p className="text-gray-600">No evaluations yet. Schedule one to compare models.</p>
                  </div>
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
                        <div className="flex justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900">
                                {evaluation.name || 'Untitled Evaluation'}
                              </h3>
                              <span className={`badge ${getStatusBadge(evaluation.status || 'pending')}`}>
                                {evaluation.status || 'pending'}
                              </span>
                            </div>
                            {evaluation.models_to_test && evaluation.models_to_test.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {evaluation.models_to_test.map((model, idx) => (
                                  <span key={idx} className="badge badge-info text-xs">
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
                          <div className="text-right text-sm text-gray-500">
                            {evaluation.total_questions && <div>{evaluation.total_questions} questions</div>}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
