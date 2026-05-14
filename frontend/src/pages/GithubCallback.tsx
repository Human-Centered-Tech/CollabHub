import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export function GithubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const installationId = params.get('installation_id');
    const setupAction = params.get('setup_action');
    const stateFromUrl = params.get('state');
    const stateFromSession = sessionStorage.getItem('collabhub_install_state');
    const state = stateFromUrl ?? stateFromSession;

    if (!installationId || !state) {
      setError('Missing installation_id or state in callback URL.');
      return;
    }

    api('/github/installations/link', {
      method: 'POST',
      body: JSON.stringify({ installationId, state }),
    })
      .then(() => {
        sessionStorage.removeItem('collabhub_install_state');
        navigate('/', { replace: true });
      })
      .catch((err) => {
        setError(err.message ?? 'Linking failed');
      });
    // setupAction can be 'install', 'update', or 'request' — we treat them all the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="card max-w-xl">
        <h2 className="font-semibold">Couldn't finish GitHub setup</h2>
        <p className="mt-2 text-sm text-rose-300">{error}</p>
      </div>
    );
  }
  return <p className="text-ink-300">Finalizing GitHub install…</p>;
}
