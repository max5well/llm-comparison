import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './services/api';

// Pages
import { Login } from './pages/Login';
import { GoogleCallback } from './pages/GoogleCallback';
import { GoogleDriveCallback } from './pages/GoogleDriveCallback';
import { Home } from './pages/Home';
import { Workspaces } from './pages/Workspaces';
import { CreateWorkspace } from './pages/CreateWorkspace';
import { WorkspaceDetail } from './pages/WorkspaceDetail';
import { CreateDataset } from './pages/CreateDataset';
import { DatasetDetail } from './pages/DatasetDetail';
import { CreateEvaluation } from './pages/CreateEvaluation';
import { Results } from './pages/Results';
import { Settings } from './pages/Settings';
import { DashboardHome } from './pages/DashboardHome';
import { EvaluationWaiting } from './pages/EvaluationWaiting';
import { HumanRating } from './pages/HumanRating';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!api.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/auth/google/drive/callback" element={<GoogleDriveCallback />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspaces"
          element={
            <ProtectedRoute>
              <Workspaces />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspaces/new"
          element={
            <ProtectedRoute>
              <CreateWorkspace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspaces/:id"
          element={
            <ProtectedRoute>
              <WorkspaceDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspaces/:id/datasets/new"
          element={
            <ProtectedRoute>
              <CreateDataset />
            </ProtectedRoute>
          }
        />

        <Route
          path="/datasets/:id"
          element={
            <ProtectedRoute>
              <DatasetDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspaces/:id/evaluations/new"
          element={
            <ProtectedRoute>
              <CreateEvaluation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/evaluations/:id/waiting"
          element={
            <ProtectedRoute>
              <EvaluationWaiting />
            </ProtectedRoute>
          }
        />

        <Route
          path="/evaluations/:id/rating"
          element={
            <ProtectedRoute>
              <HumanRating />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results/:id"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
