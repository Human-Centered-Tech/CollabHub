import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SummaryCard } from './Dashboard';

interface RepoRow {
  id: string;
  fullName: string;
  enabled: boolean;
  private: boolean;
}

interface PRRow {
  pullRequest: {
    id: string;
    number: number;
    title: string;
    authorLogin: string;
    authorAvatarUrl: string;
    htmlUrl: string;
    state: string;
    updatedAt: string;
  };
  summary: any;
}

export function RepositoryPage() {
  const { id } = useParams<{ id: string }>();
  const [repo, setRepo] = useState<RepoRow | null>(null);
  const [rows, setRows] = useState<PRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      const [repos, summaries] = await Promise.all([
        api<RepoRow[]>('/github/repositories'),
        api<PRRow[]>(`/summaries/repository/${id}`),
      ]);
      setRepo(repos.find((r) => r.id === id) ?? null);
      setRows(summaries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggle() {
    if (!repo) return;
    try {
      const updated = await api<RepoRow>(`/github/repositories/${repo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !repo.enabled }),
      });
      setRepo(updated);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-ink-300">Loading…</p>;
  if (!repo) return <p className="text-ink-300">Repository not found.</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{repo.fullName}</h2>
          <p className="text-sm text-ink-300">
            {repo.private ? 'Private repo' : 'Public repo'} ·{' '}
            {repo.enabled ? 'summaries enabled' : 'summaries paused'}
          </p>
        </div>
        <button onClick={toggle} className="btn-ghost">
          {repo.enabled ? 'Pause summaries' : 'Resume summaries'}
        </button>
      </header>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      {rows.length === 0 ? (
        <div className="card text-ink-300">
          No PRs yet. CollabHub generates a summary whenever a PR is opened,
          marked ready for review, or updated.
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <SummaryCard key={row.pullRequest.id} row={row as any} />
          ))}
        </ul>
      )}
    </div>
  );
}
