import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Download } from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Dataset } from '../types';

interface TestQuestion {
  id: string;
  question: string;
  expected_answer?: string | null;
  context?: string | null;
}

export const DatasetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadDataset();
    }
  }, [id]);

  const loadDataset = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Load dataset and questions in parallel
      const [datasetData, questionsData] = await Promise.all([
        api.getDataset(id),
        api.getDatasetQuestions(id)
      ]);

      setDataset(datasetData);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Failed to load dataset:', error);
      alert('Failed to load dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      // You'll need to implement this API method
      // await api.deleteDataset(id);
      alert('Dataset deletion not yet implemented');
      // navigate(-1);
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      alert('Failed to delete dataset');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    // Export questions as JSONL
    const jsonl = questions
      .map((q) => JSON.stringify({
        question: q.question,
        expected_answer: q.expected_answer,
        context: q.context,
      }))
      .join('\n');

    const blob = new Blob([jsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-${id}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  if (!dataset) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Dataset not found</p>
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
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dataset.name}</h1>
              <p className="text-gray-600 mt-2">{questions.length} questions</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="btn-secondary"
                disabled={questions.length === 0}
              >
                <Download size={18} className="inline mr-2" />
                Export JSONL
              </button>
              <button
                onClick={() => {
                  // Navigate to create evaluation page with this dataset
                  if (dataset.workspace_id) {
                    navigate(`/workspaces/${dataset.workspace_id}/evaluations/new?dataset_id=${id}`);
                  } else {
                    alert('Workspace ID not found. Please navigate from a workspace.');
                  }
                }}
                className="btn-primary"
                disabled={questions.length === 0}
              >
                Start Evaluation
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-secondary text-red-600 hover:bg-red-50"
              >
                {deleting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Trash2 size={18} className="inline mr-2" />
                    Delete Dataset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No questions in this dataset yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{question.question}</h3>

                    {question.expected_answer && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-xs font-medium text-green-900 mb-1">Expected Answer:</p>
                        <p className="text-sm text-green-800">{question.expected_answer}</p>
                      </div>
                    )}

                    {question.context && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-xs font-medium text-blue-900 mb-1">Context/Reference:</p>
                        <p className="text-sm text-blue-800">
                          {/* Show only filename if context looks like a filename (short, no line breaks, has extension) */}
                          {/* Otherwise show just the filename part if it contains a path */}
                          {(() => {
                            const context = question.context || '';
                            // Check if it's a simple filename (short, no line breaks, has extension)
                            if (context.length < 200 && !context.includes('\n') && 
                                (context.includes('.pdf') || context.includes('.docx') || 
                                 context.includes('.txt') || context.includes('.xlsx') ||
                                 context.includes('.pptx') || context.includes('.json') ||
                                 context.includes('.csv') || context.includes('.html'))) {
                              // Extract just the filename from path if present
                              const filename = context.split('/').pop() || context.split('\\').pop() || context;
                              return filename;
                            }
                            // If it's long content, show just a message indicating filename is in dataset
                            if (context.length > 200 || context.includes('\n')) {
                              // Try to extract filename from the beginning if it's a path
                              const firstLine = context.split('\n')[0];
                              if (firstLine.includes('/') || firstLine.includes('\\')) {
                                const filename = firstLine.split('/').pop()?.split('\\').pop() || firstLine;
                                if (filename.length < 100) {
                                  return filename;
                                }
                              }
                              return <span className="text-gray-500 italic">Document reference available in dataset</span>;
                            }
                            // For short content that doesn't look like a filename, show as-is
                            return context;
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
