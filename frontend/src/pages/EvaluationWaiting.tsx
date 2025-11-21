import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import type { Evaluation } from '../types';

export const EvaluationWaiting: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    if (id) {
      pollEvaluationStatus();
    }
  }, [id]);

  const pollEvaluationStatus = async () => {
    if (!id) return;

    let verificationAttempts = 0;
    const maxVerificationAttempts = 5;

    const interval = setInterval(async () => {
      try {
        const status = await api.getEvaluation(id);
        setEvaluation(status);

        if (status.status === 'completed') {
          // Verify that detailed results are available before redirecting
          try {
            await api.getEvaluationDetails(id);
            clearInterval(interval);
            // Data is ready, redirect to human rating page
            navigate(`/evaluations/${id}/rating`);
          } catch (error) {
            // Results not ready yet, keep waiting
            verificationAttempts++;
            if (verificationAttempts >= maxVerificationAttempts) {
              clearInterval(interval);
              // After max attempts, redirect anyway - HumanRating will retry
              navigate(`/evaluations/${id}/rating`);
            }
          }
        } else if (status.status === 'failed') {
          clearInterval(interval);
          alert('Evaluation failed. Please try again.');
          navigate(-1);
        }
      } catch (error) {
        console.error('Failed to poll evaluation status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  };

  const progress = evaluation?.progress || 0;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="mb-8">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Running Evaluation</h1>
          <p className="text-gray-600">
            Your evaluation is being processed. This may take a few minutes.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {evaluation && (
            <div className="text-sm text-gray-600">
              <p>
                Status: {evaluation.status}
                {evaluation.progress !== undefined && (
                  <> • {evaluation.progress}% complete</>
                )}
              </p>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500">
          Please wait while we evaluate all models...
        </p>
      </div>
    </Layout>
  );
};

