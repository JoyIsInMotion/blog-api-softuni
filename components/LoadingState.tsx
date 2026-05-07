export default function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-10 text-center text-slate-300 shadow-2xl shadow-slate-950/20">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{label}</p>
    </div>
  );
}