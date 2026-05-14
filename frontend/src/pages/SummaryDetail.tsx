import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  BulletList,
  PrStateBadge,
  PrSummary,
} from '../components/SummaryBits';

interface SummaryResponse extends PrSummary {
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
    body?: string;
    repository: {
      id: string;
      fullName: string;
    };
  };
}

export function SummaryDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      const r = await api<SummaryResponse>(`/summaries/${id}`);
      setData(r);
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

  if (loading) return <p className="text-ink-300">Loading…</p>;
  if (error || !data) {
    return <p className="text-ink-300">{error ?? 'Summary not found.'}</p>;
  }

  const { pullRequest: pr } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-300">
        <Link to="/" className="hover:text-ink-100">
          Dashboard
        </Link>
        <span>/</span>
        <Link
          to={`/repositories/${pr.repository.id}`}
          className="hover:text-ink-100"
        >
          {pr.repository.fullName}
        </Link>
        <span>/</span>
        <span className="text-ink-200">#{pr.number}</span>
      </div>

      <header className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold leading-tight">
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                #{pr.number} {pr.title}
              </a>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-300">
              {pr.authorAvatarUrl && (
                <img
                  src={pr.authorAvatarUrl}
                  alt=""
                  className="h-5 w-5 rounded-full"
                />
              )}
              <span>@{pr.authorLogin}</span>
              {data.createdAt && (
                <>
                  <span>·</span>
                  <span>
                    summarized {new Date(data.createdAt).toLocaleString()}
                  </span>
                </>
              )}
              {data.model && (
                <>
                  <span>·</span>
                  <span className="font-mono text-xs">{data.model}</span>
                </>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <PrStateBadge pr={pr} />
          </div>
        </div>
      </header>

      {data.status === 'pending' && (
        <div className="card text-ink-300">Generating summary…</div>
      )}

      {data.status === 'failed' && (
        <div className="card border-rose-700 bg-rose-900/20 text-sm text-rose-200">
          <p className="font-medium">Summary failed</p>
          {data.errorMessage && (
            <p className="mt-1 text-ink-200">{data.errorMessage}</p>
          )}
          <p className="mt-2 text-ink-300">
            The next push to this PR will retry automatically.
          </p>
        </div>
      )}

      {data.status === 'ready' && (
        <div className="space-y-6">
          {data.overview && (
            <section className="card">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-300">
                Overview
              </h2>
              <p className="text-ink-100">{data.overview}</p>
            </section>
          )}

          {data.authorNote && (
            <section className="card border-ink-700 bg-ink-950/40">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-300">
                Note for @{pr.authorLogin}
              </h2>
              <p className="text-ink-100">{data.authorNote}</p>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.pros && data.pros.length > 0 && (
              <section className="card">
                <BulletList title="Pros" tone="emerald" items={data.pros} />
              </section>
            )}
            {data.cons && data.cons.length > 0 && (
              <section className="card">
                <BulletList title="Cons" tone="rose" items={data.cons} />
              </section>
            )}
            {data.watchOuts && data.watchOuts.length > 0 && (
              <section className="card">
                <BulletList
                  title="Watch out for"
                  tone="amber"
                  items={data.watchOuts}
                />
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
