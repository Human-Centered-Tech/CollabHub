import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

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
    repository?: { id: string; fullName: string };
    updatedAt: string;
  };
  summary: {
    id: string;
    status: 'pending' | 'ready' | 'failed';
    overview?: string;
    pros?: string[];
    cons?: string[];
    watchOuts?: string[];
    authorNote?: string;
    model?: string;
  } | null;
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
  return (
    <li className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            {showRepo && pr.repository && (
              <Link
                to={`/repositories/${pr.repository.id}`}
                className="text-xs text-ink-300 hover:text-ink-100"
              >
                {pr.repository.fullName}
              </Link>
            )}
            <a
              href={pr.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline"
            >
              #{pr.number} {pr.title}
            </a>
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
        <StatusBadge status={summary?.status ?? 'pending'} />
      </div>
      {summary?.status === 'ready' && (
        <div className="mt-4 space-y-4 text-sm">
          {summary.overview && (
            <p className="text-ink-100">{summary.overview}</p>
          )}
          {summary.authorNote && (
            <p className="rounded-md border border-ink-800 bg-ink-950/50 p-3 text-ink-200">
              <span className="text-xs uppercase tracking-wide text-ink-400">
                For @{pr.authorLogin}:
              </span>{' '}
              {summary.authorNote}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <BulletList title="Pros" tone="emerald" items={summary.pros} />
            <BulletList title="Cons" tone="rose" items={summary.cons} />
            <BulletList
              title="Watch out for"
              tone="amber"
              items={summary.watchOuts}
            />
          </div>
        </div>
      )}
      {summary?.status === 'pending' && (
        <p className="mt-3 text-sm text-ink-300">
          Generating summary…
        </p>
      )}
      {summary?.status === 'failed' && (
        <p className="mt-3 text-sm text-rose-300">
          Summary failed: {(summary as any).errorMessage ?? 'unknown error'}
        </p>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'ready' | 'failed' }) {
  if (status === 'ready') {
    return (
      <span className="badge bg-emerald-900/40 text-emerald-200">ready</span>
    );
  }
  if (status === 'failed') {
    return <span className="badge bg-rose-900/40 text-rose-200">failed</span>;
  }
  return <span className="badge bg-ink-800 text-ink-300">pending</span>;
}

function BulletList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'emerald' | 'rose' | 'amber';
  items?: string[];
}) {
  if (!items || items.length === 0) return null;
  const colour = {
    emerald: 'text-emerald-200',
    rose: 'text-rose-200',
    amber: 'text-amber-200',
  }[tone];
  return (
    <div>
      <h4 className={`text-xs font-semibold uppercase tracking-wide ${colour}`}>
        {title}
      </h4>
      <ul className="mt-2 space-y-1 text-ink-100">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className={`${colour}`}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
