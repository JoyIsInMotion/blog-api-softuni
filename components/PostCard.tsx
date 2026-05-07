import Link from 'next/link';
import { excerptFromHtml, formatDate } from '@/lib/blog';
import type { BlogPostSummary } from '@/types/blog';

export default function PostCard({
  post,
  canEdit = false,
}: {
  post: BlogPostSummary;
  canEdit?: boolean;
}) {
  return (
    <article className="group rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-sky-400/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300/70">
            {post.author?.email || 'Anonymous'}
          </p>
          <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-sky-200">
            {post.title}
          </h3>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
          {formatDate(post.publishedAt || post.createdAt)}
        </span>
      </div>

      <p className="mt-5 text-sm leading-7 text-slate-300">
        {excerptFromHtml(post.contentHtml, 180)}
      </p>

      {post.tags?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/posts/${post.id}`}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Read more
        </Link>
        {canEdit ? (
          <Link
            href={`/posts/${post.id}/edit`}
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
          >
            Edit
          </Link>
        ) : null}
      </div>
    </article>
  );
}