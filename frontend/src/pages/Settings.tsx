import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

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
