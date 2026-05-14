import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ConnectGithub } from './pages/ConnectGithub';
import { GithubCallback } from './pages/GithubCallback';
import { RepositoryPage } from './pages/Repository';
import { Settings } from './pages/Settings';
import { SummaryDetail } from './pages/SummaryDetail';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-300">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/connect" element={<ConnectGithub />} />
        <Route path="/github/callback" element={<GithubCallback />} />
        <Route path="/repositories/:id" element={<RepositoryPage />} />
        <Route path="/summaries/:id" element={<SummaryDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
