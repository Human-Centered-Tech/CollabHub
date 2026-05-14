import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

interface AppStatus {
  configured: boolean;
  slug?: string;
  appId?: string;
  source?: 'env' | 'db';
}

interface Installation {
  id: string;
  githubInstallationId: string;
  accountLogin: string;
  accountType: string;
  accountAvatarUrl?: string;
}

interface DiscoverableInstallation {
  githubInstallationId: string;
  accountLogin: string;
  accountType: string;
  accountAvatarUrl?: string | null;
  createdAt: string;
}

interface Manifest {
  postUrl: string;
  state: string;
  manifest: Record<string, unknown>;
}

export function ConnectGithub() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [installs, setInstalls] = useState<Installation[]>([]);
  const [discoverable, setDiscoverable] = useState<DiscoverableInstallation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);

  const setupOutcome = useMemo(() => {
    const setup = params.get('setup');
    if (!setup) return null;
    return {
      ok: setup === 'success',
      slug: params.get('slug') ?? undefined,
      reason: params.get('reason') ?? undefined,
    };
  }, [params]);

  async function load() {
    try {
      const s = await api<AppStatus>('/github/app-status');
      setStatus(s);
      const i = await api<Installation[]>('/github/installations');
      setInstalls(i);
      if (s.configured) {
        try {
          const d = await api<DiscoverableInstallation[]>(
            '/github/discoverable-installations',
          );
          setDiscoverable(d);
        } catch {
          setDiscoverable([]);
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function claim(githubInstallationId: string) {
    setClaiming(githubInstallationId);
    setError(null);
    try {
      await api(`/github/installations/${githubInstallationId}/claim`, {
        method: 'POST',
      });
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Could not claim installation');
    } finally {
      setClaiming(null);
    }
  }

  useEffect(() => {
    load();
  }, [setupOutcome?.ok]);

  async function startInstall() {
    setRedirecting(true);
    setError(null);
    try {
      const { url, state } = await api<{ url: string; state: string }>(
        '/github/install-url',
      );
      sessionStorage.setItem('collabhub_install_state', state);
      window.location.href = url;
    } catch (err: any) {
      setRedirecting(false);
      setError(err.message ?? 'Could not start install');
    }
  }

  async function startSetup() {
    setError(null);
    try {
      const m = await api<Manifest>('/github/manifest');
      setManifest(m);
      // Wait a tick so React renders the form before we submit it.
      setTimeout(() => {
        const form = document.getElementById(
          'manifest-form',
        ) as HTMLFormElement | null;
        form?.submit();
      }, 0);
    } catch (err: any) {
      setError(err.message ?? 'Could not start setup');
    }
  }

  function dismissSetupNotice() {
    params.delete('setup');
    params.delete('slug');
    params.delete('reason');
    setParams(params, { replace: true });
  }

  if (loading) return <p className="text-ink-300">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Connect GitHub</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-300">
          {status?.configured
            ? 'Install the CollabHub GitHub App on the repos you want summarized. CollabHub only sees what you grant.'
            : "Before users can connect repos, the CollabHub GitHub App needs to exist. Use the one-click setup below."}
        </p>
      </div>

      {setupOutcome && (
        <div
          className={`card flex items-start justify-between gap-4 border ${
            setupOutcome.ok
              ? 'border-emerald-700 bg-emerald-900/20'
              : 'border-rose-700 bg-rose-900/20'
          }`}
        >
          <div className="text-sm">
            {setupOutcome.ok ? (
              <>
                <p className="font-medium text-emerald-200">
                  GitHub App created.
                </p>
                <p className="mt-1 text-ink-200">
                  Slug: <code>{setupOutcome.slug}</code>. You can now install it
                  on repos below.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-rose-200">Setup failed.</p>
                <p className="mt-1 text-ink-200">
                  Reason: {setupOutcome.reason ?? 'unknown'}
                </p>
              </>
            )}
          </div>
          <button
            onClick={dismissSetupNotice}
            className="text-ink-300 hover:text-ink-100"
          >
            ✕
          </button>
        </div>
      )}

      {!status?.configured ? (
        <div className="card">
          <h3 className="mb-2 font-medium">Step 1 · Create the GitHub App</h3>
          <p className="mb-4 text-sm text-ink-300">
            Clicking the button sends a one-page form to GitHub with all the
            settings CollabHub needs (webhook URL, callback URL, permissions).
            You'll confirm on GitHub, and the credentials come straight back to
            this server — no copying secrets by hand.
          </p>
          <button onClick={startSetup} className="btn-primary">
            Set up GitHub App
          </button>
          {manifest && (
            <form
              id="manifest-form"
              method="post"
              action={`${manifest.postUrl}?state=${encodeURIComponent(manifest.state)}`}
              className="hidden"
            >
              <input
                type="hidden"
                name="manifest"
                value={JSON.stringify(manifest.manifest)}
              />
            </form>
          )}
        </div>
      ) : (
        <div className="card">
          <h3 className="mb-2 font-medium">Install the app</h3>
          <p className="mb-4 text-sm text-ink-300">
            You'll be redirected to GitHub to pick which repositories CollabHub
            can read. You can change this later from your GitHub settings.
          </p>
          <p className="mb-4 text-xs text-ink-400">
            Configured app: <code>{status.slug}</code> (id {status.appId},
            source {status.source})
          </p>
          <button
            onClick={startInstall}
            disabled={redirecting}
            className="btn-primary"
          >
            {redirecting ? 'Redirecting…' : 'Install on GitHub'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rose-300">{error}</p>}

      {discoverable.length > 0 && (
        <div className="card border-amber-700 bg-amber-900/10">
          <h3 className="mb-2 font-medium text-amber-100">
            Unlinked installations found
          </h3>
          <p className="mb-4 text-sm text-ink-300">
            CollabHub found GitHub App installations that aren't linked to any
            account yet (e.g. you installed on github.com without being
            redirected back). Click "Link to my account" to claim them.
          </p>
          <ul className="space-y-2">
            {discoverable.map((d) => (
              <li
                key={d.githubInstallationId}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-950/40 p-3"
              >
                <div className="flex items-center gap-3">
                  {d.accountAvatarUrl && (
                    <img
                      src={d.accountAvatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-medium">{d.accountLogin}</div>
                    <div className="text-xs text-ink-300">
                      {d.accountType} · installed{' '}
                      {new Date(d.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => claim(d.githubInstallationId)}
                  disabled={claiming === d.githubInstallationId}
                  className="btn-primary"
                >
                  {claiming === d.githubInstallationId
                    ? 'Linking…'
                    : 'Link to my account'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-3 font-medium">Existing installations</h3>
        {installs.length === 0 ? (
          <p className="text-ink-300">No installations yet.</p>
        ) : (
          <ul className="space-y-2">
            {installs.map((i) => (
              <li key={i.id} className="card flex items-center gap-3">
                {i.accountAvatarUrl && (
                  <img
                    src={i.accountAvatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div>
                  <div className="font-medium">{i.accountLogin}</div>
                  <div className="text-xs text-ink-300">{i.accountType}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
