import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { EvaluationDetails } from '../types';

interface Rating {
  questionId: string;
  modelResultId: string;
  rating: number; // 1-5 stars
  feedback?: string;
}

const HumanRating: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<EvaluationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadEvaluationData();
    }
  }, [id]);

  const loadEvaluationData = async (retries = 10) => {
    if (!id) return;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const results = await api.getEvaluationDetails(id);
        if (results && results.detailed_results && results.detailed_results.length > 0) {
          setData(results);
          setLoading(false);
          return;
        } else {
          // Results exist but are empty, wait and retry
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
        console.error(`Failed to load evaluation data (attempt ${attempt + 1}/${retries}):`, errorMessage);
        
        if (attempt < retries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        } else {
          // Last attempt failed
          const message = errorMessage.includes('not yet available') 
            ? 'Evaluation results are still being processed. Please wait a moment and refresh the page.'
            : `Failed to load evaluation data: ${errorMessage}`;
          alert(message);
          setLoading(false);
        }
      }
    }
  };

  const handleRating = (questionId: string, modelResultId: string, rating: number) => {
    const key = `${questionId}-${modelResultId}`;
    setRatings(new Map(ratings.set(key, {
      questionId,
      modelResultId,
      rating,
    })));
  };

  const handleNext = () => {
    if (currentQuestionIndex < (data?.detailed_results.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;

    setSubmitting(true);
    try {
      // TODO: Save ratings to backend
      // For now, just navigate to results
      navigate(`/results/${id}`);
    } catch (error) {
      console.error('Failed to submit ratings:', error);
      alert('Failed to submit ratings');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  if (!data || !data.detailed_results || data.detailed_results.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">No evaluation data found</p>
        </div>
      </Layout>
    );
  }

  const currentQuestion = data.detailed_results[currentQuestionIndex];
  const totalQuestions = data.detailed_results.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  const allRated = currentQuestion.results.every(result => {
    const key = `${currentQuestion.question_id}-${result.model || result.provider}`;
    return ratings.has(key);
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rate LLM Outputs</h1>
          <p className="text-gray-600">
            Please rate the quality of each model's response to help improve our evaluation system.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{currentQuestion.question}</h2>
            {currentQuestion.expected_answer && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-1">Expected Answer:</p>
                <p className="text-sm text-green-800">{currentQuestion.expected_answer}</p>
              </div>
            )}
          </div>

          {/* Model Responses */}
          <div className="p-6 space-y-6">
            {currentQuestion.results.map((result, idx) => {
              const key = `${currentQuestion.question_id}-${result.model || result.provider}`;
              const rating = ratings.get(key);
              const modelKey = `${result.provider}:${result.model}`;

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-lg border-2 ${
                    rating ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{modelKey}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Latency: {result.latency_ms.toFixed(0)}ms</span>
                        <span>Cost: ${result.cost_usd.toFixed(6)}</span>
                      </div>
                    </div>
                    {rating && (
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={20}
                            className={star <= rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{result.answer}</p>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Rate this response:</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRating(currentQuestion.question_id, modelKey, star)}
                          className={`transition ${
                            rating && star <= rating.rating
                              ? 'text-yellow-400'
                              : 'text-gray-300 hover:text-yellow-300'
                          }`}
                        >
                          <Star
                            size={24}
                            className={rating && star <= rating.rating ? 'fill-current' : ''}
                          />
                        </button>
                      ))}
                    </div>
                    {rating && (
                      <span className="text-sm text-gray-600 ml-2">
                        {rating.rating === 5 ? 'Excellent' :
                         rating.rating === 4 ? 'Good' :
                         rating.rating === 3 ? 'Average' :
                         rating.rating === 2 ? 'Poor' : 'Very Poor'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>

          <div className="flex items-center space-x-3">
            {currentQuestionIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || !allRated}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
              >
                <span>{submitting ? 'Submitting...' : 'Submit & View Results'}</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!allRated}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
              >
                <span>Next Question</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(`/results/${id}`)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip rating and go directly to results
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default HumanRating;

