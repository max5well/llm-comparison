import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api } from '../services/api';
import type { Workspace } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const Workspaces: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const data = await api.listWorkspaces();
      setWorkspaces(data || []);
    } catch (error: any) {
      console.error('Failed to load workspaces:', error);
      // Check if user is authenticated
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        console.error('No user_id found. User may not be logged in.');
        // Redirect to login if not authenticated
        window.location.href = '/login';
        return;
      }
      // Show error to user without blocking
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load workspaces';
      console.error('Workspaces error:', errorMessage);
      setWorkspaces([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this workspace?')) return;

    setDeleting(id);
    try {
      await api.deleteWorkspace(id);
      setWorkspaces(workspaces.filter((w) => w.id !== id));
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert('Failed to delete workspace');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="py-12" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workspaces</h1>
            <p className="text-gray-600 mt-1">
              Manage your RAG evaluation workspaces
            </p>
          </div>
          <Link to="/workspaces/new" className="btn-primary">
            <Plus size={20} className="inline mr-2" />
            New Workspace
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <div className="card text-center py-16">
            <FolderOpen className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No workspaces yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first workspace to start comparing LLMs
            </p>
            <Link to="/workspaces/new" className="btn-primary">
              <Plus size={20} className="inline mr-2" />
              Create Workspace
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                to={`/workspaces/${workspace.id}`}
                className="card hover:shadow-md transition-shadow flex items-center justify-between group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {workspace.name}
                    </h3>
                    <ChevronRight
                      size={20}
                      className="text-gray-400 group-hover:text-primary-600 transition-colors"
                    />
                  </div>
                  {workspace.description && (
                    <p className="text-gray-600 text-sm mb-3">
                      {workspace.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-info">
                      {workspace.embedding_provider}
                    </span>
                    <span className="badge badge-info">
                      {workspace.embedding_model}
                    </span>
                    <span className="badge badge-info">
                      Chunk: {workspace.chunk_size} / {workspace.chunk_overlap}
                    </span>
                    <span className="text-xs text-gray-500">
                      Created {formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(workspace.id, e)}
                  disabled={deleting === workspace.id}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {deleting === workspace.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 size={20} />
                  )}
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
