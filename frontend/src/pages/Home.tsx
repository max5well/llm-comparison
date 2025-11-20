import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, BarChart3, FileText, Zap, Rocket, Play, ArrowRight, Brain, Layers, FileLines, Check, Upload, Settings } from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Workspace } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const Home: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const data = await api.listWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section - Matching Mockup */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
                <p className="text-lg text-gray-600 mb-6">
                  Ready to evaluate LLMs on your data? Create a new workspace or continue with existing ones.
                </p>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/workspaces/new"
                    className="px-6 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition shadow-lg"
                  >
                    <Plus size={18} className="inline mr-2" />
                    Create Workspace
                  </Link>
                  <button className="px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:border-gray-300 transition">
                    <Play size={18} className="inline mr-2" />
                    Quick Tour
                  </button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center">
                  <Rocket className="text-white" size={48} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/workspaces/new"
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-200 hover:shadow-lg transition cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Plus className="text-blue-500" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create New Workspace</h3>
              <p className="text-gray-600 text-sm mb-4">
                Upload documents and set up a new RAG evaluation workspace
              </p>
              <div className="flex items-center text-blue-500 text-sm font-medium">
                Start Creating <ArrowRight size={14} className="ml-2" />
              </div>
            </Link>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-200 hover:shadow-lg transition cursor-pointer">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="text-green-500" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Google Drive</h3>
              <p className="text-gray-600 text-sm mb-4">
                Import documents directly from your Google Drive account
              </p>
              <div className="flex items-center text-green-500 text-sm font-medium">
                Connect Now <ArrowRight size={14} className="ml-2" />
              </div>
            </div>

            <Link
              to="/results"
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-200 hover:shadow-lg transition cursor-pointer"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="text-purple-500" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">View Latest Results</h3>
              <p className="text-gray-600 text-sm mb-4">
                Check your most recent LLM comparison evaluations
              </p>
              <div className="flex items-center text-purple-500 text-sm font-medium">
                View Results <ArrowRight size={14} className="ml-2" />
              </div>
            </Link>
          </div>
        </section>

        {/* Recent Workspaces */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recent Workspaces</h2>
            <Link
              to="/workspaces"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : workspaces.length === 0 ? (
            <div className="card text-center py-12">
              <FolderOpen className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No workspaces yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first workspace to get started
              </p>
              <Link to="/workspaces/new" className="btn-primary">
                <Plus size={20} className="inline mr-2" />
                Create Workspace
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.slice(0, 6).map((workspace) => (
                <Link
                  key={workspace.id}
                  to={`/workspaces/${workspace.id}`}
                  className="card hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-lg mb-2">{workspace.name}</h3>
                  {workspace.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="badge badge-info">
                      {workspace.embedding_provider}
                    </span>
                    <span className="badge badge-info">
                      {workspace.embedding_model}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Platform Capabilities */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Platform Capabilities</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LLM Providers */}
            <div className="card">
              <p className="text-sm font-medium text-gray-600 mb-4">Supported LLM Providers</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2 shadow-sm">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">OpenAI</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2 shadow-sm">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Anthropic</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2 shadow-sm">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Mistral</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2 shadow-sm">
                    <span className="text-2xl">🔗</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Together</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-colors col-span-2">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2 shadow-sm">
                    <span className="text-2xl">🤗</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Hugging Face</span>
                  <span className="text-xs text-gray-500">100,000+ models</span>
                </div>
              </div>
            </div>

            {/* Embedding Models */}
            <div className="card">
              <p className="text-sm font-medium text-gray-600 mb-4">Embedding Models</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-sm">
                    <span className="text-sm">🔢</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">text-embedding-3-small</p>
                    <p className="text-xs text-gray-500">OpenAI</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-sm">
                    <span className="text-sm">🚀</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">voyage-large-2</p>
                    <p className="text-xs text-gray-500">Voyage AI</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-sm">
                    <span className="text-sm">✨</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">embed-english-v3.0</p>
                    <p className="text-xs text-gray-500">Cohere</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-sm">
                    <span className="text-sm">💻</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">BAAI/bge-large-en</p>
                    <p className="text-xs text-gray-500">BGE (Local)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* File Types */}
            <div className="card">
              <p className="text-sm font-medium text-gray-600 mb-4">Supported File Types</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <FileText className="w-6 h-6 text-red-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">PDF</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">DOCX</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <FileText className="w-6 h-6 text-gray-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">TXT</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <FileText className="w-6 h-6 text-orange-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">HTML</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                  <FileText className="w-6 h-6 text-purple-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">MD</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <FileText className="w-6 h-6 text-green-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">CSV</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors">
                  <FileText className="w-6 h-6 text-teal-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">XLSX</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <FileText className="w-6 h-6 text-yellow-700 mb-1" />
                  <span className="text-xs font-medium text-gray-700">PY</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  <FileText className="w-6 h-6 text-indigo-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">+22</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Workspaces */}
          <div className="card bg-gradient-to-r from-primary-50 to-primary-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Workspaces Created</p>
                <p className="text-4xl font-bold text-primary-700">{workspaces.length}</p>
              </div>
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <FolderOpen className="w-8 h-8 text-primary-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
