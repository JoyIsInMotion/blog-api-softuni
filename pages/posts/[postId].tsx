import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { fetchJson, formatDate } from '@/lib/blog';
import { useAuth } from '@/hooks/useAuth';
import type { BlogPost } from '@/types/blog';

export default function PostDetailsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const postId = String(router.query.postId || '');
    let active = true;

    async function loadPost() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<BlogPost>(`/api/posts/${postId}`);
        if (active) {
          setPost(data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load post');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPost();

    return () => {
      active = false;
    };
  }, [router.isReady, router.query.postId]);

  if (loading || authLoading) {
    return <LoadingState label="Loading post" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => router.reload()} />;
  }

  if (!post) {
    return (
      <EmptyState
        title="Post not found"
        message="The post you are looking for no longer exists."
      />
    );
  }

  const canEdit = Boolean(user && user.id === post.authorId && token);

  return (
    <article className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/20 overflow-hidden">
      {post.coverImageUrl && (
        <div className="relative h-96 w-full -mx-8 -mt-8 mb-8 overflow-hidden rounded-t-[2rem]">
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">
            {post.author?.email || 'Anonymous'}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">{post.title}</h1>
        </div>
        <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
          {formatDate(post.publishedAt || post.createdAt)}
        </span>
      </div>

      <div
        className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-white prose-a:text-sky-300"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      {post.tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
        >
          Back to posts
        </Link>
        {canEdit ? (
          <>
            <Link
              href={`/posts/${post.id}/edit`}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
            >
              Edit post
            </Link>
            <button
              type="button"
              onClick={async () => {
                if (!token || !confirm('Delete this post?')) {
                  return;
                }

                await fetchJson(`/api/posts/${post.id}`, { method: 'DELETE' }, token);
                await router.push('/');
              }}
              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
            >
              Delete
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}