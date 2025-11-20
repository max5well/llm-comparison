import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Target,
  Shield,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Trophy,
  Download,
  Share2,
  Search,
  Filter,
  ChevronRight,
  ListChecks,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MetricChart } from '../components/MetricChart';
import { ModelLeaderboard, type ModelRanking } from '../components/ModelLeaderboard';
import { api } from '../services/api';
import type {
  EvaluationDetails,
  EvaluationMetricsSummary,
  EvaluationMetricsByModel,
} from '../types';

export const Results: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<EvaluationDetails | null>(null);
  const [metricsSummary, setMetricsSummary] = useState<EvaluationMetricsSummary | null>(null);
  const [metricsByModel, setMetricsByModel] = useState<EvaluationMetricsByModel | null>(null);
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
      const [results, summary, metrics] = await Promise.all([
        api.getEvaluationDetails(id),
        api.getEvaluationMetricsSummary(id).catch((err) => {
          console.log('Metrics summary not available:', err.response?.status, err.response?.data);
          return null;
        }),
        api.getEvaluationMetrics(id).catch((err) => {
          console.log('Metrics by model not available:', err.response?.status, err.response?.data);
          return null;
        }),
      ]);
      setData(results);
      setMetricsSummary(summary);
      setMetricsByModel(metrics);
      
      // Debug logging
      if (summary) {
        console.log('✅ Metrics summary loaded:', summary);
      } else {
        console.log('⚠️ No metrics summary available for this evaluation');
      }
      if (metrics) {
        console.log('✅ Metrics by model loaded:', metrics);
      } else {
        console.log('⚠️ No metrics by model available for this evaluation');
      }
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

  // Prepare data for new metrics display
  const prepareModelRankings = (): ModelRanking[] => {
    if (!metricsByModel || !metricsSummary) return [];

    const rankings: ModelRanking[] = [];
    let rank = 1;

    Object.entries(metricsByModel.metrics_by_model).forEach(([, modelData]) => {
      const questions = modelData.questions;
      const avgAccuracy = questions.reduce((sum, q) => sum + (q.accuracy_score || 0), 0) / questions.length;
      const avgFaithfulness = questions.reduce((sum, q) => sum + (q.faithfulness_score || 0), 0) / questions.length;
      const avgReasoning = questions.reduce((sum, q) => sum + (q.reasoning_score || 0), 0) / questions.length;
      const avgContextUtil = questions.reduce((sum, q) => sum + (q.context_utilization_score || 0), 0) / questions.length;
      const avgLatency = questions.reduce((sum, q) => sum + q.latency_ms, 0) / questions.length;
      const totalCost = questions.reduce((sum, q) => sum + q.cost_usd, 0);
      const overallScore = (avgAccuracy + avgFaithfulness + avgReasoning + avgContextUtil) / 4;

      rankings.push({
        rank: rank++,
        model: modelData.model,
        provider: modelData.provider,
        overallScore,
        accuracy: avgAccuracy,
        faithfulness: avgFaithfulness,
        reasoning: avgReasoning,
        contextUtilization: avgContextUtil,
        latencyMs: avgLatency,
        costUsd: totalCost,
      });
    });

    const sorted = rankings.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    // Reassign ranks after sorting
    return sorted.map((ranking, idx) => ({
      ...ranking,
      rank: idx + 1,
  }));
  };

  const rankings = prepareModelRankings();

  // Prepare chart data for each metric
  const prepareChartData = (metricKey: 'accuracy' | 'faithfulness' | 'reasoning' | 'context_utilization' | 'latency' | 'cost') => {
    if (!metricsByModel) return [];

    return Object.entries(metricsByModel.metrics_by_model).map(([modelKey, modelData]) => {
      const questions = modelData.questions;
      let value: number;

      if (metricKey === 'latency') {
        value = questions.reduce((sum, q) => sum + q.latency_ms, 0) / questions.length;
      } else if (metricKey === 'cost') {
        value = questions.reduce((sum, q) => sum + q.cost_usd, 0);
      } else {
        const scores = questions.map(q => q[`${metricKey}_score` as keyof typeof q] as number | null).filter(v => v !== null) as number[];
        value = scores.length > 0 ? scores.reduce((sum, v) => sum + v, 0) / scores.length : 0;
      }

      return {
        model: `${modelData.provider}: ${modelData.model}`,
        value,
      };
    });
  };

  // Format date and calculate duration
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return 'N/A';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const totalQueries = summary.total_questions * summary.models.length;
  const modelCount = summary.models.length;

  return (
    <Layout>
      {/* Header Section - Matching Mockup */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
        <div>
              {/* Breadcrumb */}
              <div className="flex items-center space-x-3 mb-2 text-sm">
          <button
                  onClick={() => navigate('/workspaces')}
                  className="text-gray-500 hover:text-gray-700"
          >
                  Workspaces
          </button>
                <ChevronRight size={12} className="text-gray-400" />
                <span className="text-gray-500">{summary.dataset_name}</span>
                <ChevronRight size={12} className="text-gray-400" />
                <span className="text-gray-900 font-medium">Evaluation Results</span>
              </div>
              <h1 className="text-3xl font-bold">Evaluation Results</h1>
              <p className="text-gray-600 mt-2">
                Comparing {modelCount} models across {summary.total_questions} questions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium flex items-center space-x-2">
                <Download size={16} />
                <span>Export JSONL</span>
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium flex items-center space-x-2">
                <Share2 size={16} />
                <span>Share Results</span>
              </button>
            </div>
          </div>
          {/* Status with time */}
          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 font-medium">
                {summary.status === 'completed' ? 'Completed' : summary.status}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Run on {formatDate(summary.completed_at || summary.created_at)}
            </span>
            {summary.completed_at && (
              <>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-500">
                  Duration: {calculateDuration(summary.created_at, summary.completed_at)}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Metrics Overview - 5 Cards in Single Row */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {!metricsSummary && summary.status === 'completed' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> This evaluation was created before the new metrics system. 
              Create a new evaluation to see detailed metrics.
            </p>
          </div>
        )}
        
        {metricsSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Accuracy */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Accuracy</span>
                <Target className="text-blue-500" size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {metricsSummary.avg_accuracy ? `${(metricsSummary.avg_accuracy * 100).toFixed(1)}%` : 'N/A'}
              </div>
              </div>

            {/* Faithfulness */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Faithfulness</span>
                <Shield className="text-purple-500" size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {metricsSummary.avg_faithfulness ? `${(metricsSummary.avg_faithfulness * 100).toFixed(1)}%` : 'N/A'}
                </div>
                </div>
            
            {/* Avg Latency */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Avg Latency</span>
                <Clock className="text-orange-500" size={18} />
                </div>
              <div className="text-2xl font-bold text-gray-900">
                {metricsSummary.avg_latency_ms < 1000 
                  ? `${metricsSummary.avg_latency_ms.toFixed(0)}ms`
                  : `${(metricsSummary.avg_latency_ms / 1000).toFixed(1)}s`}
              </div>
            </div>
            
            {/* Avg Cost */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg Cost</span>
                <DollarSign className="text-green-500" size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${metricsSummary.avg_cost_usd.toFixed(4)}
              </div>
        </div>

            {/* Total Queries */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Queries</span>
                <ListChecks className="text-indigo-500" size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalQueries}</div>
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <span>{summary.total_questions} questions × {modelCount} models</span>
              </div>
            </div>
          </div>
        )}
      </section>

        {/* Model Leaderboard */}
        {rankings.length > 0 && (
          <ModelLeaderboard rankings={rankings} />
        )}

      {/* Comparison Charts - 2 Column Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-8">
        {metricsByModel && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricChart
              title="Accuracy Comparison"
              data={prepareChartData('accuracy')}
              metricName="Accuracy"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              color="#3b82f6"
              yAxisDomain={[0, 1]}
            />
            <MetricChart
              title="Faithfulness Score"
              data={prepareChartData('faithfulness')}
              metricName="Faithfulness"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              color="#8b5cf6"
              yAxisDomain={[0, 1]}
            />
            <MetricChart
              title="Reasoning Score"
              data={prepareChartData('reasoning')}
              metricName="Reasoning"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              color="#f59e0b"
              yAxisDomain={[0, 1]}
            />
            <MetricChart
              title="Context Utilization"
              data={prepareChartData('context_utilization')}
              metricName="Context Utilization"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              color="#3b82f6"
              yAxisDomain={[0, 1]}
            />
            <MetricChart
              title="Average Latency"
              data={prepareChartData('latency')}
              metricName="Latency"
              formatValue={(v) => v < 1000 ? `${v.toFixed(0)}ms` : `${(v / 1000).toFixed(1)}s`}
              color="#6b7280"
              chartType="bar"
            />
            <MetricChart
              title="Cost per Query"
              data={prepareChartData('cost')}
              metricName="Cost"
              formatValue={(v) => `$${v.toFixed(4)}`}
              color="#ef4444"
              chartType="bar"
            />
          </div>
        )}
      </section>

      {/* Per-Question Analysis Section */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Per-Question Analysis</h3>
                <p className="text-sm text-gray-600">Detailed comparison for each evaluation question</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm flex items-center">
                  <Filter size={14} className="mr-2" />
                  Filter
                </button>
              </div>
            </div>
        </div>

          <div className="divide-y divide-gray-200">
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
      </section>
    </Layout>
  );
};
