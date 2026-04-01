import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import PipelinePage from './pages/PipelinePage';
import AutomataPage from './pages/AutomataPage';
import DebugPage from './pages/DebugPage';
import TelemetryPage from './pages/TelemetryPage';
import ProjectsPage from './pages/ProjectsPage';
import DocsPage from './pages/DocsPage';
// Other pages will go here

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Route */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Cinematic Route */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/automata" element={<AutomataPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/telemetry" element={<TelemetryPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
