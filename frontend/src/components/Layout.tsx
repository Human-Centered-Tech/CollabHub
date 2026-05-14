import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { PolarBearLogo } from './PolarBearLogo';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800 bg-ink-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <PolarBearLogo className="h-7 w-16 text-ink-50" />
            <span className="font-semibold tracking-tight">CollabHub</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              to="/"
              className={
                location.pathname === '/'
                  ? 'text-ink-50'
                  : 'text-ink-300 hover:text-ink-50'
              }
            >
              Dashboard
            </Link>
            <Link
              to="/connect"
              className={
                location.pathname === '/connect'
                  ? 'text-ink-50'
                  : 'text-ink-300 hover:text-ink-50'
              }
            >
              Connect GitHub
            </Link>
            <div className="ml-4 flex items-center gap-3 border-l border-ink-800 pl-4 text-ink-300">
              <span>{user?.name}</span>
              <button onClick={logout} className="hover:text-ink-50">
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
