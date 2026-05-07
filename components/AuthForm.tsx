import Link from 'next/link';

export default function AuthForm({
  title,
  submitLabel,
  switchHref,
  switchLabel,
  onSubmit,
  loading,
  error,
}: {
  title: string;
  submitLabel: string;
  switchHref: string;
  switchLabel: string;
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">Account</p>
        <h1 className="mt-3 text-3xl font-bold text-white">{title}</h1>
      </div>

      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          await onSubmit({
            email: String(formData.get('email') || ''),
            password: String(formData.get('password') || ''),
          });
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400"
            placeholder="••••••••"
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Please wait...' : submitLabel}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        {switchLabel}{' '}
        <Link href={switchHref} className="text-sky-300 hover:text-sky-200">
          here
        </Link>
        .
      </p>
    </div>
  );
}