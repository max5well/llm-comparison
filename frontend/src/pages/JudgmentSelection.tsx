import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Evaluation, Question, ModelResult } from '../types';

const JudgmentSelection: React.FC = () => {
  // Debug logging at component render
  console.log('JudgmentSelection component rendering...');
  console.log('Full URL:', window.location.href);
  console.log('Pathname:', window.location.pathname);

  const { id: evaluationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJudgment, setSelectedJudgment] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Evaluation data
  const [evaluationData, setEvaluationData] = useState<Evaluation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modelResults, setModelResults] = useState<ModelResult[]>([]);

  // Log params immediately after getting them
  console.log('useParams result on render:', { evaluationId });

  useEffect(() => {
    // Debug logging
    console.log('JudgmentSelection useEffect triggered');
    console.log('Current URL:', window.location.pathname);
    console.log('useParams result:', { evaluationId });
    console.log('URL search params:', window.location.search);

    if (!evaluationId) {
      console.error('No evaluationId found in URL params');
      setError('No evaluation ID provided');
      return;
    }

    const loadEvaluationData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Load evaluation details
        const evaluation = await api.getEvaluation(evaluationId);
        console.log('Loaded evaluation data:', evaluation);
        setEvaluationData(evaluation);

        // Check if dataset_id exists
        if (!evaluation.dataset_id) {
          console.error('No dataset_id found in evaluation data');
          setError('Evaluation data is missing dataset information');
          setIsLoading(false);
          return;
        }

        console.log('Loading questions for dataset_id:', evaluation.dataset_id);

        // Load evaluation results and questions
        const [details, questionsData] = await Promise.all([
          api.getEvaluationDetails(evaluationId),
          api.getDatasetQuestions(evaluation.dataset_id).catch(err => {
            console.error('Error loading dataset questions:', err);
            throw err;
          })
        ]);

        console.log('Loaded questions data:', questionsData);
        setQuestions(questionsData);
        setModelResults(details.model_results || []);

      } catch (err: any) {
        console.error('Error loading evaluation data:', err);
        setError(`Failed to load evaluation: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvaluationData();
  }, [evaluationId]);

  const handleJudgmentSubmit = async () => {
    if (!selectedJudgment || !evaluationId) return;

    setIsLoading(true);
    try {
      // Start judgment process
      const response = await api.startJudgment(evaluationId, {
        judgment_type: selectedJudgment
      });

      // Navigate based on judgment type and response status
      if (selectedJudgment === 'human' || selectedJudgment === 'both') {
        // For human judgment, navigate to human rating page
        navigate(`/evaluations/${evaluationId}/human-rating`);
      } else {
        // For LLM-only judgment, go directly to results
        navigate(`/evaluations/${evaluationId}/results`);
      }
    } catch (err: any) {
      console.error('Error starting judgment:', err);
      setError(`Failed to start judgment: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewResults = () => {
    if (evaluationId) {
      navigate(`/evaluations/${evaluationId}/results`);
    }
  };

  if (isLoading && !evaluationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evaluation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-gray-600 mr-4"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Judgment Selection</h1>
            </div>
            <button
              onClick={handleViewResults}
              className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
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
              <div className="text-3xl font-bold text-blue-600">
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
              <span className="font-medium">Evaluation Name:</span> {evaluationData?.name}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Completed:</span> {new Date(evaluationData?.completed_at || '').toLocaleString()}
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedJudgment('human')}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedJudgment === 'human'
                      ? 'border-blue-500 bg-blue-500'
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedJudgment('llm')}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedJudgment === 'llm'
                      ? 'border-blue-500 bg-blue-500'
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedJudgment('both')}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedJudgment === 'both'
                      ? 'border-blue-500 bg-blue-500'
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
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
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