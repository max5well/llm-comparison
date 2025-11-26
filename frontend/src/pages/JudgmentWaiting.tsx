import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { EvaluationResponse } from '../types';

const JudgmentWaiting: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (evaluationId) {
      fetchEvaluationData();
    }
  }, [evaluationId]);

  const fetchEvaluationData = async () => {
    if (!evaluationId) return;

    setIsLoading(true);
    try {
      const response = await api.get(`/evaluation/${evaluationId}`);
      setEvaluation(response.data);

      // Check if judgment is complete
      const judgmentResponse = await api.get(`/evaluation/${evaluationId}/judgment-status`);
      if (judgmentResponse.data.status === 'completed') {
        navigate(`/results/${evaluationId}`);
      }
    } catch (err) {
      setError('Failed to load evaluation data');
      console.error('Error fetching evaluation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for judgment completion
  useEffect(() => {
    if (!evaluationId || !evaluation) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/evaluation/${evaluationId}/judgment-status`);
        if (response.data.status === 'completed') {
          clearInterval(interval);
          navigate(`/results/${evaluationId}`);
        }
      } catch (err) {
        console.error('Error checking judgment status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [evaluationId, evaluation, navigate]);

  const handleSkipJudgment = () => {
    if (evaluationId) {
      navigate(`/results/${evaluationId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 text-lg font-semibold mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchEvaluationData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-layer-group text-white text-lg"></i>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">LLM Compare</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Judgment in Progress
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're currently evaluating the model responses. This may take a few minutes to complete.
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-primary-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-gavel text-2xl text-primary-600"></i>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Analyzing Responses
              </h2>

              <div className="max-w-md mx-auto space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Processing question:</span>
                  <span className="font-medium text-gray-900">1 of 10</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                </div>

                <div className="text-sm text-gray-500">
                  Estimated time remaining: 2-3 minutes
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            What's Happening Now
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <i className="fas fa-check-circle mt-1 mr-3"></i>
              <span>AI models are being evaluated for response quality and accuracy</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle mt-1 mr-3"></i>
              <span>Scoring is based on relevance, coherence, and factual correctness</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle mt-1 mr-3"></i>
              <span>You'll be redirected to results when judgment is complete</span>
            </li>
          </ul>
        </div>

        {/* Skip Option */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSkipJudgment}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Skip to Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default JudgmentWaiting;