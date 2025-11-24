import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const GoogleDriveCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get code and state from URL params
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setError(`Google Drive connection failed: ${error}`);
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!code || !state) {
          setError('Invalid callback parameters');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Verify state matches what we stored
        const storedState = sessionStorage.getItem('google_drive_connect_state');
        if (state !== storedState) {
          setError('Invalid state parameter. Possible CSRF attack.');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Clear stored state
        sessionStorage.removeItem('google_drive_connect_state');

        // Exchange code for tokens and connect Drive
        await api.handleGoogleDriveConnectCallback(code, state);

        // Check if user was in the middle of creating a workspace
        const returnToCreate = sessionStorage.getItem('return_to_create_workspace');
        const pendingName = sessionStorage.getItem('pending_workspace_name');

        sessionStorage.removeItem('return_to_create_workspace');
        sessionStorage.removeItem('pending_workspace_name');

        if (returnToCreate === 'true') {
          // Return to workspace creation
          navigate('/workspaces/create', {
            state: { pendingWorkspaceName: pendingName }
          });
        } else {
          // Navigate to homepage with success message
          navigate('/', { state: { driveConnected: true } });
        }
      } catch (err: any) {
        console.error('Drive connection callback error:', err);
        setError(err.response?.data?.detail || 'Failed to connect Google Drive');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Connection Failed</h2>
            <p className="text-sm text-gray-600">{error}</p>
            <p className="text-xs text-gray-500">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md">
        <div className="text-center space-y-4">
          <LoadingSpinner size="large" />
          <h2 className="text-xl font-semibold text-gray-900">Connecting Google Drive</h2>
          <p className="text-sm text-gray-600">Please wait while we complete the connection...</p>
        </div>
      </div>
    </div>
  );
};
