export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Simple Blog System built with Next.js and Tailwind.</p>
        <p>&copy; {new Date().getFullYear()} Blog System</p>
      </div>
    </footer>
  );
}
