import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UploadCloud,
  Cpu,
  BarChart3,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

const featureHighlights = [
  {
    title: 'Upload any document',
    description: '26+ file types supported with fast chunking and embeddings.',
    icon: UploadCloud,
  },
  {
    title: 'Evaluate smarter',
    description: 'Compare 1,000+ LLMs with automated quality scoring.',
    icon: Cpu,
  },
  {
    title: 'Own the insights',
    description: 'Export analytics, cost trends, and audit-ready reports.',
    icon: BarChart3,
  },
];

const howItWorks = [
  {
    number: '1',
    title: 'Select models',
    body: 'Pick the LLMs you want to compare and configure prompts once.',
  },
  {
    number: '2',
    title: 'Run evaluations',
    body: 'Execute every question across all models with traceable logs.',
  },
  {
    number: '3',
    title: 'Share results',
    body: 'Export dashboards and collaborate with stakeholders easily.',
  },
];

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!terms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await api.signup({ email });
      setSuccess('Account created! Redirecting to the dashboard...');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Unable to create your account right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-16 left-10 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-28 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-25" />
      </div>

      <header className="relative z-10 border-b border-gray-200 bg-white/70 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Sparkles className="text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">LLM Compare</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            {['Features', 'How it Works', 'Security'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s/g, '-')}`} className="hover:text-primary-600">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col px-6 py-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3 text-sm font-semibold text-primary-600">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                <Check className="text-primary-600" />
              </div>
              Trusted by 500+ enterprise teams
            </div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Build your evaluation workspace, compare every model, and ship confidently.
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              Sign up in seconds, upload your data, and let LLM Compare generate side-by-side insights with automated
              judge scores, cost metrics, and collaboration tools for your entire team.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button className="flex items-center gap-2 px-6 py-3 text-lg font-semibold text-white bg-primary-600 rounded-2xl shadow-lg hover:bg-primary-700 transition">
                Get Started Free <ArrowRight size={18} />
              </button>
              <div className="text-sm text-gray-500">
                14-day free trial • No credit card required • Cancel anytime
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {featureHighlights.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="bg-white/90 border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-100 mb-3">
                      <Icon className="text-primary-600" size={24} />
                    </div>
                    <p className="font-semibold text-gray-900">{feature.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                <p className="text-sm text-gray-500">Start evaluating LLMs with enterprise-ready controls.</p>
              </div>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    placeholder="you@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    placeholder="Create a strong password"
                  />
                  <p className="text-xs text-gray-500">Must be at least 8 characters long.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Company (optional)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    placeholder="Your organization"
                  />
                </div>
                <label className="flex items-start gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I agree to the{' '}
                    <a href="#terms" className="text-primary-600">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#privacy" className="text-primary-600">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600 animate-pulse">{success}</p>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      Continue to dashboard
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-2xl text-lg font-semibold hover:bg-primary-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                >
                  {loading ? 'Creating account...' : 'Create account'}
                  <ArrowRight size={18} />
                </button>
              </form>
              <div className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 font-semibold hover:underline">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-5 py-3 border border-green-200 bg-green-50 rounded-2xl shadow-sm text-sm text-green-700">
                <ShieldCheck className="text-green-500" />
                GDPR compliant & enterprise secure
              </div>
            </div>
          </div>
        </div>

        <section id="how-it-works" className="mt-24 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">How it works</p>
            <h3 className="text-3xl font-bold text-gray-900">Three steps to data-driven model decisions</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((step) => (
              <div key={step.number} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 font-bold text-xl mb-4">
                  {step.number}
                </div>
                <h4 className="text-xl font-semibold text-gray-900">{step.title}</h4>
                <p className="text-sm text-gray-600 mt-2">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

