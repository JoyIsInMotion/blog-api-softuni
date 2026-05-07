export default function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-12 text-center text-slate-300 shadow-xl shadow-slate-950/20">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm text-slate-400">{message}</p>
    </div>
  );
}