export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-6 py-8 text-rose-100 shadow-xl shadow-rose-950/10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-rose-100/80">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center rounded-full bg-rose-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-300"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}