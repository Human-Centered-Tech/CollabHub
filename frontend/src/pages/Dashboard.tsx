import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PrStateBadge,
  StatusBadge,
  PrSummary,
} from '../components/SummaryBits';

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
    merged: boolean;
    mergedAt?: string | null;
    repository?: { id: string; fullName: string };
    updatedAt: string;
  };
  summary: PrSummary | null;
}

export function Dashboard() {
  const [repos, setRepos] = useState<RepoRow[]>([]);
  const [recent, setRecent] = useState<PRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [r, s] = await Promise.all([
        api<RepoRow[]>('/github/repositories'),
        api<PRRow[]>('/summaries/recent?limit=10'),
      ]);
      setRepos(r);
      setRecent(s);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return <p className="text-ink-300">Loading…</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Connected repositories</h2>
          <Link to="/connect" className="btn-ghost">
            + Connect repo
          </Link>
        </div>
        {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}
        {repos.length === 0 ? (
          <div className="card text-center">
            <p className="text-ink-300">
              You haven't connected any repositories yet.
            </p>
            <Link to="/connect" className="btn-primary mt-4 inline-flex">
              Connect GitHub
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {repos.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/repositories/${r.id}`}
                  className="card flex items-center justify-between hover:border-ink-600"
                >
                  <div>
                    <div className="font-medium">{r.fullName}</div>
                    <div className="mt-1 flex gap-2 text-xs text-ink-300">
                      {r.private ? (
                        <span className="badge bg-ink-800">private</span>
                      ) : (
                        <span className="badge bg-ink-800">public</span>
                      )}
                      {r.enabled ? (
                        <span className="badge bg-emerald-900/40 text-emerald-200">
                          summaries on
                        </span>
                      ) : (
                        <span className="badge bg-ink-800 text-ink-300">
                          paused
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-ink-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Recent PR summaries</h2>
        {recent.length === 0 ? (
          <p className="text-ink-300">
            No PR activity yet. Open or update a PR on a connected repo to get
            an automatic summary.
          </p>
        ) : (
          <ul className="space-y-4">
            {recent.map((row) => (
              <SummaryCard key={row.pullRequest.id} row={row} showRepo />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function SummaryCard({
  row,
  showRepo,
}: {
  row: PRRow;
  showRepo?: boolean;
}) {
  const { pullRequest: pr, summary } = row;

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            {showRepo && pr.repository && (
              <span className="text-xs text-ink-300">
                {pr.repository.fullName}
              </span>
            )}
            <span className="font-medium">
              #{pr.number} {pr.title}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-300">
            {pr.authorAvatarUrl && (
              <img
                src={pr.authorAvatarUrl}
                alt=""
                className="h-4 w-4 rounded-full"
              />
            )}
            <span>@{pr.authorLogin}</span>
            <span>·</span>
            <span>{new Date(pr.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PrStateBadge pr={pr} />
          <StatusBadge status={summary?.status ?? 'pending'} />
        </div>
      </div>
      {summary?.status === 'ready' && summary.overview && (
        <p className="mt-3 line-clamp-2 text-sm text-ink-200">
          {summary.overview}
        </p>
      )}
      {summary?.status === 'pending' && (
        <p className="mt-2 text-sm text-ink-300">Generating summary…</p>
      )}
      {summary?.status === 'failed' && (
        <p className="mt-2 text-sm text-rose-300">
          Summary failed — open for details.
        </p>
      )}
    </>
  );

  return (
    <li>
      {summary ? (
        <Link
          to={`/summaries/${summary.id}`}
          className="card block transition-colors hover:border-ink-600"
        >
          {body}
        </Link>
      ) : (
        <div className="card">{body}</div>
      )}
    </li>
  );
}
