import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, Sparkles, Search, Edit2, Check, Database, AlertCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import { LLM_PROVIDERS, LLM_MODELS } from '../types';
import { ModelSearchDropdown } from '../components/ModelSearchDropdown';

interface Question {
  id: string;
  question: string;
  expected_answer: string;
  context: string;
  editing?: boolean;
}

type CreationMethod = 'manual' | 'ai' | 'upload';

export const CreateDataset: React.FC = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [method, setMethod] = useState<CreationMethod>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Dataset info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // AI Generation
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [numQuestions, setNumQuestions] = useState(10);
  const [workspaceStats, setWorkspaceStats] = useState<{
    total_chunks: number;
    suggested_min_questions: number;
    suggested_max_questions: number;
  } | null>(null);
  const [apiKeysStatus, setApiKeysStatus] = useState<Record<string, boolean>>({});

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredQuestions = questions.filter(q =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.expected_answer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch workspace stats and API keys status on mount
  useEffect(() => {
    const fetchStats = async () => {
      if (workspaceId) {
        try {
          const stats = await api.getWorkspaceStats(workspaceId);
          setWorkspaceStats(stats);
        } catch (error) {
          console.error('Failed to fetch workspace stats:', error);
        }
      }
    };

    const fetchApiKeys = async () => {
      try {
        const keys = await api.getApiKeysStatus();
        setApiKeysStatus(keys);
      } catch (error) {
        console.error('Failed to fetch API keys status:', error);
      }
    };

    fetchStats();
    fetchApiKeys();
  }, [workspaceId]);

  const addQuestion = () => {
    const newQ: Question = {
      id: Date.now().toString(),
      question: '',
      expected_answer: '',
      context: '',
      editing: true
    };
    setQuestions([newQ, ...questions]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const removeSelected = () => {
    setQuestions(questions.filter(q => !selectedIds.has(q.id)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const handleGenerateAI = async () => {
    if (!workspaceId) return;

    setGeneratingAI(true);
    setGenerationProgress('Starting AI generation...');
    try {
      const dataset = await api.generateSyntheticDataset({
        workspace_id: workspaceId,
        dataset_name: name || 'AI Generated Dataset',
        num_questions_per_chunk: numQuestions,
        include_answers: true,
        generation_model: aiModel,
        generation_provider: aiProvider
      });

      setGenerationProgress('Generating questions from your documents...');

      // Poll for generated questions (background task may take time)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      let fetchedQuestions: any[] = [];

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        setGenerationProgress(`Waiting for AI to generate questions...`);
        try {
          const datasetQuestions = await api.getDatasetQuestions(dataset.id);
          if (datasetQuestions.length > 0) {
            fetchedQuestions = datasetQuestions;
            setGenerationProgress(`Successfully generated ${fetchedQuestions.length} questions!`);
            break;
          }
        } catch (error) {
          console.error('Error fetching questions:', error);
        }
        attempts++;
      }

      if (fetchedQuestions.length > 0) {
        // Limit to the requested number of questions
        const limitedQuestions = fetchedQuestions.slice(0, numQuestions);

        const generatedQuestions: Question[] = limitedQuestions.map((q, i) => ({
          id: q.id || (Date.now() + i + ''),
          question: q.question,
          expected_answer: q.expected_answer || '',
          context: q.context || '',  // Context should now be filename from backend
          editing: false
        }));

        setQuestions([...generatedQuestions, ...questions]);
        alert(`Successfully generated ${limitedQuestions.length} questions!`);
      } else {
        alert('Questions are being generated in the background. Please check back in a moment.');
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setGeneratingAI(false);
      setGenerationProgress('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const text = await file.text();
      let parsedQuestions: Question[] = [];

      // Handle JSONL format
      if (file.name.endsWith('.jsonl')) {
        const lines = text.trim().split('\n');
        parsedQuestions = lines.map((line, index) => {
          const data = JSON.parse(line);
          return {
            id: Date.now() + index + '',
            question: data.question || '',
            expected_answer: data.expected_answer || data.answer || '',
            context: data.context || '',
            editing: false
          };
        });
      }
      // Handle CSV format
      else if (file.name.endsWith('.csv')) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        parsedQuestions = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const questionIndex = headers.indexOf('question');
          const answerIndex = headers.findIndex(h => h.includes('answer'));
          const contextIndex = headers.indexOf('context');

          return {
            id: Date.now() + index + '',
            question: questionIndex >= 0 ? values[questionIndex] : '',
            expected_answer: answerIndex >= 0 ? values[answerIndex] : '',
            context: contextIndex >= 0 ? values[contextIndex] : '',
            editing: false
          };
        });
      }
      // Handle JSON format
      else if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        const questionsArray = Array.isArray(data) ? data : data.questions || [];

        parsedQuestions = questionsArray.map((item: any, index: number) => ({
          id: Date.now() + index + '',
          question: item.question || '',
          expected_answer: item.expected_answer || item.answer || '',
          context: item.context || '',
          editing: false
        }));
      }

      if (parsedQuestions.length > 0) {
        setQuestions([...parsedQuestions, ...questions]);
        alert(`Successfully imported ${parsedQuestions.length} questions!`);
      } else {
        alert('No valid questions found in the file.');
      }
    } catch (error) {
      console.error('Failed to parse file:', error);
      alert('Failed to parse file. Please ensure it is in the correct format (JSONL, CSV, or JSON).');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceId) return;

    if (!name.trim()) {
      alert('Please enter a dataset name');
      return;
    }

    const validQuestions = questions.filter(q => q.question.trim());
    if (validQuestions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setLoading(true);
    try {
      const dataset = await api.createDataset(workspaceId, {
        name: name.trim(),
        description: description.trim(),
        source: method
      });

      for (const q of validQuestions) {
        await api.addQuestionToDataset(dataset.id, {
          question: q.question.trim(),
          expected_answer: q.expected_answer?.trim() || null,
          context: q.context?.trim() || null
        });
      }

      navigate(`/datasets/${dataset.id}`);
    } catch (error: any) {
      console.error('Failed to create dataset:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      alert(`Failed to create dataset: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(`/workspaces/${workspaceId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Workspace
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Test Dataset</h1>
          <p className="text-gray-600 mt-2">
            Create a dataset of test questions to evaluate your LLM responses
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dataset Info */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Dataset Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Dataset Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="e.g., Customer Support Q&A"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  placeholder="Brief description..."
                />
              </div>
            </div>
          </div>

          {/* Creation Method */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Creation Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setMethod('manual')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  method === 'manual'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Plus className={`w-6 h-6 mb-2 ${method === 'manual' ? 'text-blue-600' : 'text-gray-600'}`} />
                <h3 className="font-semibold text-gray-900">Manual Entry</h3>
                <p className="text-sm text-gray-600 mt-1">Add questions one by one</p>
              </button>

              <button
                type="button"
                onClick={() => setMethod('ai')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  method === 'ai'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Sparkles className={`w-6 h-6 mb-2 ${method === 'ai' ? 'text-blue-600' : 'text-gray-600'}`} />
                <h3 className="font-semibold text-gray-900">AI Generated</h3>
                <p className="text-sm text-gray-600 mt-1">Generate from documents</p>
              </button>

              <button
                type="button"
                onClick={() => setMethod('upload')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  method === 'upload'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className={`w-6 h-6 mb-2 ${method === 'upload' ? 'text-blue-600' : 'text-gray-600'}`} />
                <h3 className="font-semibold text-gray-900">Upload File</h3>
                <p className="text-sm text-gray-600 mt-1">Import from CSV/JSON</p>
              </button>
            </div>

            {/* AI Generation Options */}
            {method === 'ai' && (
              <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-gray-900">AI Generation Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">AI Provider</label>
                    <select
                      value={aiProvider}
                      onChange={(e) => {
                        setAiProvider(e.target.value);
                        setAiModel(LLM_MODELS[e.target.value][0]);
                      }}
                      className="input"
                    >
                      {LLM_PROVIDERS.filter(provider => apiKeysStatus[provider.value]).map(provider => (
                        <option key={provider.value} value={provider.value}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                    {LLM_PROVIDERS.filter(p => apiKeysStatus[p.value]).length === 0 && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                        <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">No API Keys Configured</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Please add at least one provider API key in Settings to generate questions with AI.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label">AI Model</label>
                    {aiProvider === 'huggingface' ? (
                      <div className="space-y-2">
                        <ModelSearchDropdown
                          value={aiModel}
                          onChange={setAiModel}
                          models={LLM_MODELS[aiProvider] || []}
                          placeholder="Search for a Hugging Face model..."
                        />
                        <p className="text-xs text-gray-500">
                          💡 Type to search from 50+ popular models, or enter any custom model ID from{' '}
                          <a href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            huggingface.co/models
                          </a>
                        </p>
                      </div>
                    ) : (
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="input"
                      >
                        {LLM_MODELS[aiProvider]?.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="label">Number of Questions</label>
                    <input
                      type="number"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      className="input"
                      min={1}
                      max={100}
                    />
                    {workspaceStats && workspaceStats.total_chunks > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        Based on {workspaceStats.total_chunks} chunks, we suggest {workspaceStats.suggested_min_questions}-{workspaceStats.suggested_max_questions} questions
                      </p>
                    )}
                    {workspaceStats && workspaceStats.total_chunks === 0 && (
                      <p className="text-sm text-amber-600 mt-1">
                        No processed documents found. Upload and process documents first.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                  className="btn-primary w-full"
                >
                  <Sparkles size={16} className="inline mr-2" />
                  {generatingAI ? 'Generating...' : `Generate ${numQuestions} Questions`}
                </button>
                {generatingAI && generationProgress && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                      <p className="text-sm text-blue-900">{generationProgress}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* File Upload Options */}
            {method === 'upload' && (
              <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h3 className="font-semibold text-gray-900">Upload File</h3>
                <p className="text-sm text-gray-600">
                  Upload a file containing your test questions. Supported formats:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li><strong>JSONL:</strong> One JSON object per line with "question", "expected_answer" (optional), and "context" (optional)</li>
                  <li><strong>CSV:</strong> Columns: question, expected_answer (optional), context (optional)</li>
                  <li><strong>JSON:</strong> Array of objects or an object with "questions" array</li>
                </ul>
                <div className="mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jsonl,.json,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="btn-primary w-full"
                  >
                    <Upload size={16} className="inline mr-2" />
                    {uploadingFile ? 'Uploading...' : 'Choose File'}
                  </button>
                </div>
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Example JSONL format:</p>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
{`{"question": "What is RAG?", "expected_answer": "Retrieval-Augmented Generation"}
{"question": "How does it work?", "expected_answer": "Combines retrieval with generation"}`}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Questions Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Questions ({questions.length})
              </h2>
              <div className="flex gap-2">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={removeSelected}
                    className="btn-danger text-sm"
                  >
                    <Trash2 size={16} className="inline mr-1" />
                    Delete ({selectedIds.size})
                  </button>
                )}
                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn-primary text-sm"
                >
                  <Plus size={16} className="inline mr-1" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Search */}
            {questions.length > 5 && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                    placeholder="Search questions..."
                  />
                </div>
              </div>
            )}

            {/* Table */}
            {questions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="w-12">#</th>
                      <th>Question</th>
                      <th>Expected Answer</th>
                      <th>Context/Reference</th>
                      <th className="w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((q, index) => (
                      <tr key={q.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(q.id)}
                            onChange={() => toggleSelect(q.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="text-gray-500">{index + 1}</td>
                        <td>
                          {q.editing ? (
                            <textarea
                              value={q.question}
                              onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                              className="input text-sm"
                              rows={2}
                              placeholder="Enter question..."
                              autoFocus
                            />
                          ) : (
                            <div className="text-sm">{q.question || <span className="text-gray-400">Empty</span>}</div>
                          )}
                        </td>
                        <td>
                          {q.editing ? (
                            <textarea
                              value={q.expected_answer}
                              onChange={(e) => updateQuestion(q.id, { expected_answer: e.target.value })}
                              className="input text-sm"
                              rows={2}
                              placeholder="Expected answer (optional)..."
                            />
                          ) : (
                            <div className="text-sm text-gray-600">{q.expected_answer || <span className="text-gray-400">None</span>}</div>
                          )}
                        </td>
                        <td>
                          {q.editing ? (
                            <textarea
                              value={q.context || ''}
                              onChange={(e) => updateQuestion(q.id, { context: e.target.value })}
                              className="input text-sm"
                              rows={2}
                              placeholder="Context/reference (optional)..."
                            />
                          ) : (
                            <div className="text-sm text-gray-600">
                              {q.context ? (
                                <span title={q.context}>{q.context}</span>
                              ) : (
                                <span className="text-gray-400">None</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            {q.editing ? (
                              <button
                                type="button"
                                onClick={() => updateQuestion(q.id, { editing: false })}
                                className="text-green-600 hover:text-green-700"
                                title="Save"
                              >
                                <Check size={18} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateQuestion(q.id, { editing: true })}
                                className="text-blue-600 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeQuestion(q.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Database className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-600">No questions yet. Add your first question above!</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/workspaces/${workspaceId}`)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || questions.length === 0}
              className="btn-primary flex-1"
            >
              {loading ? 'Creating Dataset...' : `Create Dataset (${questions.length} questions)`}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
