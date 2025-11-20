import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  Shield,
  Brain,
  FileText,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Trophy,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { MetricChart } from '../components/MetricChart';
import { ModelLeaderboard, type ModelRanking } from '../components/ModelLeaderboard';
import { api } from '../services/api';
import type {
  EvaluationDetails,
  DetailedResult,
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
        api.getEvaluationMetricsSummary(id).catch(() => null),
        api.getEvaluationMetrics(id).catch(() => null),
      ]);
      setData(results);
      setMetricsSummary(summary);
      setMetricsByModel(metrics);
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

    Object.entries(metricsByModel.metrics_by_model).forEach(([modelKey, modelData]) => {
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
            <StatusBadge status={summary.status as any} />
          </div>
        </div>

        {/* 6 Metric Cards */}
        {metricsSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Overall Score"
              value={metricsSummary.overall_score}
              icon={Trophy}
              color="blue"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              subtitle="Weighted average of all metrics"
            />
            <MetricCard
              title="Accuracy"
              value={metricsSummary.avg_accuracy}
              icon={Target}
              color="green"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              subtitle="Semantic correctness"
            />
            <MetricCard
              title="Faithfulness"
              value={metricsSummary.avg_faithfulness}
              icon={Shield}
              color="purple"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              subtitle="No hallucination"
            />
            <MetricCard
              title="Reasoning"
              value={metricsSummary.avg_reasoning}
              icon={Brain}
              color="orange"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              subtitle="Logical flow quality"
            />
            <MetricCard
              title="Context Utilization"
              value={metricsSummary.avg_context_utilization}
              icon={FileText}
              color="blue"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              subtitle="RAG usage"
            />
            <MetricCard
              title="Average Latency"
              value={metricsSummary.avg_latency_ms}
              icon={Clock}
              color="gray"
              formatValue={(v) => `${v.toFixed(0)}ms`}
              subtitle="Response time"
            />
          </div>
        )}

        {/* Cost Card (separate row) */}
        {metricsSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              title="Total Cost"
              value={metricsSummary.total_cost_usd}
              icon={DollarSign}
              color="red"
              formatValue={(v) => `$${v.toFixed(4)}`}
              subtitle={`Average: $${metricsSummary.avg_cost_usd.toFixed(4)} per query`}
            />
          </div>
        )}

        {/* Model Leaderboard */}
        {rankings.length > 0 && (
          <ModelLeaderboard rankings={rankings} />
        )}

        {/* Metric Comparison Charts */}
        {metricsByModel && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricChart
              title="Accuracy Comparison"
              data={prepareChartData('accuracy')}
              metricName="Accuracy"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              color="#10b981"
              yAxisDomain={[0, 1]}
            />
            <MetricChart
              title="Faithfulness Comparison"
              data={prepareChartData('faithfulness')}
              metricName="Faithfulness"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              color="#8b5cf6"
              yAxisDomain={[0, 1]}
            />
            <MetricChart
              title="Reasoning Comparison"
              data={prepareChartData('reasoning')}
              metricName="Reasoning"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              color="#f59e0b"
              yAxisDomain={[0, 1]}
            />
            <MetricChart
              title="Context Utilization Comparison"
              data={prepareChartData('context_utilization')}
              metricName="Context Utilization"
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              color="#3b82f6"
              yAxisDomain={[0, 1]}
            />
            <MetricChart
              title="Latency Comparison"
              data={prepareChartData('latency')}
              metricName="Latency"
              formatValue={(v) => `${v.toFixed(0)}ms`}
              color="#6b7280"
              chartType="bar"
            />
            <MetricChart
              title="Cost Comparison"
              data={prepareChartData('cost')}
              metricName="Total Cost"
              formatValue={(v) => `$${v.toFixed(4)}`}
              color="#ef4444"
              chartType="bar"
            />
          </div>
        )}

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
