import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Key, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.signup({ email });
      setApiKey(response.api_key);
      setShowApiKey(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (apiKey) {
      // Extract user_id from the response (stored during signup)
      const userId = localStorage.getItem('user_id');
      if (userId) {
        navigate('/');
      }
    }
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl items-center justify-center mx-auto shadow-lg">
            <span className="text-white font-bold text-3xl">L</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LLM Compare</h1>
          <p className="text-sm text-gray-600">
            Compare LLM performance on RAG tasks with automated evaluation and insightful metrics.
          </p>
        </div>

        {!showApiKey ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Create Account</h2>
            <p className="text-sm text-gray-500">
              Enter your email to create an account and receive your API key.
            </p>

            {/* Email Signup Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Account...' : 'Create Account & Get API Key'}
              </button>
            </form>

            <div className="pt-4 border-t border-gray-100 text-xs text-gray-500">
              By signing up you agree to the platform terms and will receive an API key via email.
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Key className="text-green-600" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Account Created!</h2>
              <p className="text-sm text-gray-600">
                Save this API key — it&apos;s only displayed once.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Your API Key</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="input font-mono text-sm"
                />
                <button
                  onClick={handleCopyApiKey}
                  className="btn-secondary whitespace-nowrap text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <strong>Important:</strong> Store this key securely, it&apos;s required for API calls.
            </div>

            <button
              onClick={handleContinue}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continue to Dashboard
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
