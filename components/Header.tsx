import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-lg font-bold text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-300 text-slate-950 shadow-lg shadow-sky-500/20">
            B
          </span>
          Blog System
        </Link>

        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Link href="/" className="rounded-full px-4 py-2 transition hover:bg-white/5 hover:text-white">
            Posts
          </Link>
          {user ? (
            <>
              <Link href="/posts/new" className="rounded-full px-4 py-2 transition hover:bg-white/5 hover:text-white">
                New post
              </Link>
              <Link href="/profile" className="rounded-full px-4 py-2 transition hover:bg-white/5 hover:text-white">
                Profile
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-white/10 px-4 py-2 text-white transition hover:border-sky-400/40 hover:bg-sky-400/10"
              >
                Logout
              </button>
            </>
          ) : loading ? (
            <span className="rounded-full border border-white/10 px-4 py-2 text-slate-400">
              Checking session...
            </span>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 transition hover:bg-white/5 hover:text-white">
                Login
              </Link>
              <Link href="/register" className="rounded-full bg-sky-500 px-4 py-2 text-white transition hover:bg-sky-400">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
