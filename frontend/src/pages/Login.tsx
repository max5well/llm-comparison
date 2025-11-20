import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Key } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">L</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LLM Compare</h1>
          <p className="text-gray-600">
            Compare LLM performance on RAG tasks
          </p>
        </div>

        {!showApiKey ? (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Get Started</h2>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
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
                className="btn-primary w-full"
              >
                {loading ? 'Creating Account...' : 'Create Account & Get API Key'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                By creating an account, you'll receive an API key that you can use
                to access the platform.
              </p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="text-green-600" size={24} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Account Created!</h2>
              <p className="text-gray-600">
                Save your API key - you won't be able to see it again
              </p>
            </div>

            <div className="mb-6">
              <label className="label">Your API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="input font-mono text-sm"
                />
                <button
                  onClick={handleCopyApiKey}
                  className="btn-secondary whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Store this API key securely. You'll need it
                to authenticate API requests.
              </p>
            </div>

            <button onClick={handleContinue} className="btn-primary w-full">
              Continue to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
