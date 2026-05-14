import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Installation {
  id: string;
  githubInstallationId: string;
  accountLogin: string;
  accountType: string;
  accountAvatarUrl?: string;
}

export function ConnectGithub() {
  const [installs, setInstalls] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Installation[]>('/github/installations')
      .then(setInstalls)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Connect GitHub</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-300">
          Install the CollabHub GitHub App on the repositories you want
          summarized. You choose the repos on GitHub's install screen — CollabHub
          only sees what you grant.
        </p>
      </div>

      <div className="card">
        <h3 className="mb-2 font-medium">Install the app</h3>
        <p className="mb-4 text-sm text-ink-300">
          You'll be redirected to GitHub to choose which repositories CollabHub
          can read. You can change this at any time from your GitHub settings.
        </p>
        <button
          onClick={startInstall}
          disabled={redirecting}
          className="btn-primary"
        >
          {redirecting ? 'Redirecting…' : 'Install on GitHub'}
        </button>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </div>

      <div>
        <h3 className="mb-3 font-medium">Existing installations</h3>
        {loading ? (
          <p className="text-ink-300">Loading…</p>
        ) : installs.length === 0 ? (
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
