import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await register(email, name, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CollabHub</h1>
          <p className="mt-2 text-sm text-ink-300">Create your account.</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password (8+ characters)
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-center text-xs text-ink-300">
            Already have an account?{' '}
            <Link to="/login" className="text-ink-100 underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
