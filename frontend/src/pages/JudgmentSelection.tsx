import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  EvaluationResponse,
  TestQuestionResponse,
  ModelResultResponse
} from '../types';

interface JudgmentSelectionProps {
  evaluation?: EvaluationResponse;
  questions?: TestQuestionResponse[];
  modelResults?: ModelResultResponse[];
}

const JudgmentSelection: React.FC<JudgmentSelectionProps> = ({
  evaluation,
  questions = [],
  modelResults = []
}) => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJudgment, setSelectedJudgment] = useState<string>('');
  const [evaluationData, setEvaluationData] = useState<EvaluationResponse | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!evaluation) {
      fetchEvaluationData();
    } else {
      setEvaluationData(evaluation);
    }
  }, [evaluation]);

  const fetchEvaluationData = async () => {
    if (!evaluationId) return;

    setIsLoading(true);
    try {
      const [evaluationRes, questionsRes, modelResultsRes] = await Promise.all([
        api.client.get(`/evaluation/${evaluationId}`),
        api.client.get(`/evaluation/dataset/${evaluationData?.dataset_id}/questions`),
        api.client.get(`/results/${evaluationId}/model-results`)
      ]);

      setEvaluationData(evaluationRes.data);
      // Note: questions and model results would need to be handled differently
    } catch (err) {
      setError('Failed to load evaluation data');
      console.error('Error fetching evaluation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJudgmentSubmit = async () => {
    if (!selectedJudgment) {
      setError('Please select a judgment method');
      return;
    }

    if (!evaluationId) return;

    setIsLoading(true);
    try {
      // Start the judging process
      await api.client.post(`/evaluation/${evaluationId}/judge`, {
        judgment_type: selectedJudgment
      });

      // Navigate to waiting page for judgment
      navigate(`/evaluation/${evaluationId}/judging`);
    } catch (err) {
      setError('Failed to start judgment process');
      console.error('Error starting judgment:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewResults = async () => {
    if (!evaluationId) return;
    navigate(`/results/${evaluationId}`);
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

  if (!evaluationData) {
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
            <button
              onClick={handleViewResults}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 font-medium transition-colors"
            >
              Skip to Results
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Evaluation Complete
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your evaluation has finished processing. Now choose how you'd like to judge the results.
          </p>
        </div>

        {/* Evaluation Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Evaluation Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {modelResults.length}
              </div>
              <div className="text-gray-600">Models Tested</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {questions.length}
              </div>
              <div className="text-gray-600">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {modelResults.reduce((acc, result) => acc + (result.response_count || 0), 0)}
              </div>
              <div className="text-gray-600">Total Responses</div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Evaluation Name:</span> {evaluationData.name}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Completed:</span> {new Date(evaluationData.completed_at || '').toLocaleString()}
            </div>
          </div>
        </div>

        {/* Judgment Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Select Judgment Method</h2>

          <div className="space-y-4">
            {/* Human Judgment */}
            <div
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                selectedJudgment === 'human'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedJudgment('human')}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedJudgment === 'human'
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedJudgment === 'human' && (
                      <i className="fas fa-check text-white text-xs"></i>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Judge as Human
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Review the model responses manually and provide your own quality assessments.
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <i className="fas fa-clock mr-2"></i>
                    Estimated time: 5-10 minutes per question
                  </div>
                </div>
              </div>
            </div>

            {/* LLM Judgment */}
            <div
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                selectedJudgment === 'llm'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedJudgment('llm')}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedJudgment === 'llm'
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedJudgment === 'llm' && (
                      <i className="fas fa-check text-white text-xs"></i>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Judge with LLM
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Use an AI model to automatically evaluate and score the responses.
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <i className="fas fa-clock mr-2"></i>
                    Estimated time: 1-2 minutes per question
                  </div>
                </div>
              </div>
            </div>

            {/* Both Methods */}
            <div
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                selectedJudgment === 'both'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedJudgment('both')}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedJudgment === 'both'
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedJudgment === 'both' && (
                      <i className="fas fa-check text-white text-xs"></i>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Human + LLM Judgment
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Get AI-powered insights first, then provide your own human assessment.
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <i className="fas fa-clock mr-2"></i>
                    Estimated time: 3-5 minutes per question
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={handleJudgmentSubmit}
              disabled={!selectedJudgment || isLoading}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedJudgment && !isLoading
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Starting Judgment...
                </>
              ) : (
                <>
                  <i className="fas fa-gavel mr-2"></i>
                  Start Judgment
                </>
              )}
            </button>

            <button
              onClick={handleViewResults}
              disabled={isLoading}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Skip Judgment
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How Judgment Works
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <i className="fas fa-info-circle mt-1 mr-3"></i>
              <span>For each question, you'll see responses from the tested models</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-info-circle mt-1 mr-3"></i>
              <span>Human judgment requires you to rate quality and provide feedback</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-info-circle mt-1 mr-3"></i>
              <span>LLM judgment uses automated scoring based on predefined criteria</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-info-circle mt-1 mr-3"></i>
              <span>Results will be available after judgment completion</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JudgmentSelection;