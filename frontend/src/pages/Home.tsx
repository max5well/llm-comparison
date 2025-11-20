import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  BarChart3,
  Cloud,
  Play,
  Rocket,
  Mail,
  Check,
  Upload,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';

const quickActions = [
  {
    title: 'Create New Workspace',
    description: 'Upload documents and set up your first workspace.',
    icon: Plus,
    button: 'Start Creating',
    href: '/workspaces/new',
  },
  {
    title: 'Connect Google Drive',
    description: 'Import docs directly from Google Drive (coming soon).',
    icon: Cloud,
    button: 'Connect Now',
    href: '/login',
  },
  {
    title: 'View Latest Results',
    description: 'Review your recent LLM comparisons after logging in.',
    icon: BarChart3,
    button: 'View Results',
    href: '/results',
  },
];

const stats = [
  { label: 'Supported LLMs', value: '1,247', color: 'from-blue-50 to-blue-100' },
  { label: 'Embedding Options', value: '156', color: 'from-purple-50 to-pink-50' },
  { label: 'File Formats', value: '26+', color: 'from-green-50 to-emerald-50' },
];

export const Home: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.signup({ email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to sign you up right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl border border-gray-200 p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Rocket size={24} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  LLM Compare
                </span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900">
                Welcome back! Ready to evaluate LLMs on your data?
              </h1>
              <p className="text-gray-600 text-lg">
                Create a workspace, compare multiple LLMs, and track metrics after you sign up and confirm your email.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition">
                  <Plus size={18} className="inline mr-2" />
                  Sign Up
                </button>
                <Link
                  to="/login"
                  className="px-6 py-3 bg-white border border-gray-200 rounded-full font-medium text-gray-700 hover:bg-gray-50 transition inline-flex items-center gap-2"
                >
                  <Play size={18} /> Quick Tour
                </Link>
              </div>
            </div>
            <div className="w-full lg:w-1/3">
              <form onSubmit={handleSignup} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Join the waitlist</h3>
                <p className="text-xs text-gray-500">
                  Enter your email and confirm via the link we send. After that you can log in and access the full app.
                </p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 input text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Mail size={16} /> {loading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
                {submitted && (
                  <p className="text-xs text-green-600">
                    Check your inbox for a confirmation link to unlock the app.
                  </p>
                )}
                {error && (
                  <p className="text-xs text-red-600">
                    {error}
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.href}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm transition hover:border-blue-200"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <action.icon className="text-blue-600" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                <div className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1">
                  {action.button} <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {stats.map((entry) => (
            <div
              key={entry.label}
              className={`bg-gradient-to-br ${entry.color} rounded-2xl p-5 shadow-sm`}
            >
              <p className="text-xs text-gray-600 uppercase tracking-wide">{entry.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{entry.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Platform Capabilities</h2>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Overview</span>
            </div>
            <p className="text-sm text-gray-600">
              Build RAG pipelines with multi-LLM support, flexible embeddings, and detailed metrics tracking.
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm text-gray-600">
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium text-gray-500">LLMs</span>
                <span className="text-lg font-semibold text-gray-900">1,247</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium text-gray-500">Embeddings</span>
                <span className="text-lg font-semibold text-gray-900">156</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium text-gray-500">Formats</span>
                <span className="text-lg font-semibold text-gray-900">26+</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                  <Play size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Created a new workspace</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                  <Check size={16} className="text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Completed evaluation run</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                  <Upload size={16} className="text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Uploaded 12 documents</p>
                  <p className="text-xs text-gray-500">3 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};
