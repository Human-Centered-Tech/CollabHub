import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

function generatePassword(): string {
  const charset =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join('');
}

export function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must differ from the current password');
      return;
    }
    setSubmitting(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message ?? 'Could not change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Account settings</h2>
        <p className="mt-1 text-sm text-ink-300">
          Signed in as <span className="text-ink-100">{user?.email}</span>.
        </p>
      </div>

      <AddTeammate />

      <form onSubmit={onSubmit} className="card space-y-4">
        <h3 className="font-medium">Change password</h3>
        <div>
          <label className="label" htmlFor="current">
            Current password
          </label>
          <input
            id="current"
            type="password"
            required
            className="input"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="new">
            New password (8+ characters)
          </label>
          <input
            id="new"
            type="password"
            required
            minLength={8}
            className="input"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            className="input"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {success && (
          <p className="text-sm text-emerald-300">
            Password updated. You'll need it the next time you sign in.
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

function AddTeammate() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState(() => generatePassword());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    email: string;
    name: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    if (password.length < 8) {
      setError('Temporary password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await api('/auth/users', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      });
      setCreated({ email, name, password });
      setEmail('');
      setName('');
      setPassword(generatePassword());
    } catch (err: any) {
      setError(err.message ?? 'Could not create user');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredentials() {
    if (!created) return;
    const text = `CollabHub login\nEmail: ${created.email}\nTemporary password: ${created.password}\nSign in: ${window.location.origin}/login`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard write failed');
    }
  }

  return (
    <section className="card space-y-4">
      <div>
        <h3 className="font-medium">Add a teammate</h3>
        <p className="mt-1 text-xs text-ink-300">
          Creates a new CollabHub account with the temporary password below.
          Share the credentials with them out-of-band; they can change the
          password after signing in.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="t-name">
            Full name
          </label>
          <input
            id="t-name"
            type="text"
            required
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="t-email">
            Email
          </label>
          <input
            id="t-email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="t-pass">
            Temporary password
          </label>
          <div className="flex gap-2">
            <input
              id="t-pass"
              type="text"
              required
              minLength={8}
              className="input flex-1 font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="btn-ghost shrink-0"
            >
              Generate
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>

      {created && (
        <div className="mt-4 space-y-3 rounded-lg border border-emerald-700 bg-emerald-900/20 p-4 text-sm">
          <p className="font-medium text-emerald-200">
            Account created for {created.name}
          </p>
          <div className="space-y-1 font-mono text-xs">
            <div>
              <span className="text-ink-300">Email:</span>{' '}
              <span className="text-ink-50">{created.email}</span>
            </div>
            <div>
              <span className="text-ink-300">Temporary password:</span>{' '}
              <span className="text-ink-50">{created.password}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={copyCredentials}
            className="btn-ghost"
          >
            {copied ? 'Copied!' : 'Copy credentials'}
          </button>
          <p className="text-xs text-ink-300">
            This password is only shown once — copy it before navigating away.
          </p>
        </div>
      )}
    </section>
  );
}
