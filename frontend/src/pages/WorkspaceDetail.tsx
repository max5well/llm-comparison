import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
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
  const [processing, setProcessing] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'datasets' | 'evaluations'>('documents');

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
        {/* Header card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Link
                to="/workspaces"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2 gap-2"
              >
                <ArrowLeft size={16} />
                Back to Workspaces
              </Link>
              <h1 className="text-3xl font-semibold text-gray-900">{workspace?.name}</h1>
              {workspace?.description && (
                <p className="text-gray-500 mt-2">{workspace.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-4 text-xs uppercase font-semibold">
                <span className="px-3 py-1 rounded-full border border-gray-200">{workspace?.embedding_provider}</span>
                <span className="px-3 py-1 rounded-full border border-gray-200">{workspace?.embedding_model}</span>
                <span className="px-3 py-1 rounded-full border border-gray-200">
                  Chunk: {workspace?.chunk_size} / {workspace?.chunk_overlap}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-5 py-2 rounded-2xl border border-gray-300 text-sm font-medium text-gray-700 hover:border-gray-400">
                Settings
              </button>
              <Link
                to={`/workspaces/${workspace?.id}/evaluations/new`}
                className="px-5 py-2 rounded-2xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Run Evaluation
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-8 px-6 pt-6">
            {['documents', 'datasets', 'evaluations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`pb-4 text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 border-b-2 border-transparent hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} (
                {tab === 'documents'
                  ? documentStats.total
                  : tab === 'datasets'
                  ? datasets.length
                  : evaluations.length}
                )
              </button>
            ))}
            <div className="flex-1" />
            <div className="px-4 py-1 rounded-xl bg-blue-50 text-blue-600 text-xs font-semibold">
              Last updated{' '}
              <span className="font-medium">
                {documents.length > 0
                  ? formatDistanceToNow(new Date(documents[0].created_at), { addSuffix: true })
                  : 'just now'}
              </span>
            </div>
          </div>
          <div className="px-6 pb-6">
            {activeTab === 'documents' && (
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
