export default function PostForm({
  title,
  initialTitle = '',
  initialContent = '',
  submitLabel,
  onSubmit,
  loading,
  error,
}: {
  title: string;
  initialTitle?: string;
  initialContent?: string;
  submitLabel: string;
  onSubmit: (values: { title: string; content: string }) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">Post editor</p>
        <h1 className="mt-3 text-3xl font-bold text-white">{title}</h1>
      </div>

      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          await onSubmit({
            title: String(formData.get('title') || ''),
            content: String(formData.get('content') || ''),
          });
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
          <input
            name="title"
            type="text"
            required
            defaultValue={initialTitle}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            placeholder="A strong blog title"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Content</span>
          <textarea
            name="content"
            required
            minLength={30}
            defaultValue={initialContent}
            rows={10}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            placeholder="Write the article body here..."
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
          className="rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
      </form>
    </div>
  );
}