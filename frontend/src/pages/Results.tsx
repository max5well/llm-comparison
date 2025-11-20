import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  DollarSign,
  Zap,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { EvaluationDetails, DetailedResult } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

export const Results: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<EvaluationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      loadResults();
    }
  }, [id]);

  const loadResults = async () => {
    if (!id) return;

    try {
      const results = await api.getEvaluationDetails(id);
      setData(results);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Results not found</p>
        </div>
      </Layout>
    );
  }

  const { summary, detailed_results } = data;

  // Prepare chart data
  const performanceData = summary.models.map((model) => ({
    name: `${model.provider}: ${model.model}`,
    'Avg Latency (ms)': model.avg_latency_ms,
    'Cost per Query ($)': model.avg_cost_per_query_usd * 1000, // Scale for visibility
    'Win Rate (%)': model.win_rate || 0,
  }));

  const criteriaData = summary.models[0]?.criteria_scores
    ? Object.keys(summary.models[0].criteria_scores).map((criterion) => {
        const dataPoint: any = { criterion: criterion.charAt(0).toUpperCase() + criterion.slice(1) };
        summary.models.forEach((model) => {
          const modelName = `${model.provider}: ${model.model}`;
          dataPoint[modelName] = model.criteria_scores?.[criterion as keyof typeof model.criteria_scores] || 0;
        });
        return dataPoint;
      })
    : [];

  return (
    <Layout>
      <div className="space-y-8">
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
              <h1 className="text-3xl font-bold text-gray-900">
                {summary.evaluation_name}
              </h1>
              <p className="text-gray-600 mt-2">
                Dataset: {summary.dataset_name} • {summary.total_questions}{' '}
                questions
              </p>
            </div>
            <span
              className={`badge ${
                summary.status === 'completed'
                  ? 'badge-success'
                  : summary.status === 'failed'
                  ? 'badge-error'
                  : 'badge-warning'
              }`}
            >
              {summary.status}
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.models.map((model) => (
            <div key={`${model.provider}-${model.model}`} className="card">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="text-primary-600" size={20} />
                <h3 className="font-semibold truncate">
                  {model.provider}: {model.model}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Win Rate</span>
                  <span className="font-semibold">
                    {((model.win_rate || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Score</span>
                  <span className="font-semibold">
                    {(model.avg_score || 0).toFixed(2)}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Latency</span>
                  <span className="font-semibold">
                    {model.avg_latency_ms.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Cost</span>
                  <span className="font-semibold">
                    ${model.total_cost_usd.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Win Rate (%)" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {criteriaData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Quality Criteria</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={criteriaData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criterion" />
                  <PolarRadiusAxis domain={[0, 10]} />
                  {summary.models.map((model, idx) => (
                    <Radar
                      key={`${model.provider}-${model.model}`}
                      name={`${model.provider}: ${model.model}`}
                      dataKey={`${model.provider}: ${model.model}`}
                      stroke={['#0ea5e9', '#f59e0b', '#10b981', '#ef4444'][idx]}
                      fill={['#0ea5e9', '#f59e0b', '#10b981', '#ef4444'][idx]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed Results */}
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Detailed Results</h3>

          <div className="space-y-3">
            {detailed_results.map((result) => (
              <div key={result.question_id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleQuestion(result.question_id)}
                  className="w-full px-4 py-3 flex justify-between items-start text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">
                      {result.question}
                    </p>
                    {result.expected_answer && (
                      <p className="text-sm text-gray-600">
                        Expected: {result.expected_answer}
                      </p>
                    )}
                  </div>
                  {expandedQuestions.has(result.question_id) ? (
                    <ChevronUp className="text-gray-400 flex-shrink-0 ml-2" size={20} />
                  ) : (
                    <ChevronDown className="text-gray-400 flex-shrink-0 ml-2" size={20} />
                  )}
                </button>

                {expandedQuestions.has(result.question_id) && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
                    {result.results.map((modelResult, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg ${
                          modelResult.winner ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {modelResult.provider}: {modelResult.model}
                            </span>
                            {modelResult.winner && (
                              <Trophy className="text-green-600" size={16} />
                            )}
                          </div>
                          {modelResult.score !== undefined && (
                            <span className="badge badge-info">
                              Score: {modelResult.score.toFixed(1)}/10
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3">{modelResult.answer}</p>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {modelResult.latency_ms.toFixed(0)}ms
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign size={14} />
                            ${modelResult.cost_usd.toFixed(6)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap size={14} />
                            {modelResult.input_tokens + modelResult.output_tokens} tokens
                          </span>
                        </div>

                        {modelResult.judgment && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600 italic">
                              {modelResult.judgment}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
