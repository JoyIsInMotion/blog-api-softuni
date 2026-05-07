import { useEffect, useState } from 'react';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import Pagination from '@/components/Pagination';
import PostCard from '@/components/PostCard';
import { fetchJson } from '@/lib/blog';
import { useAuth } from '@/hooks/useAuth';
import type { BlogPostSummary } from '@/types/blog';

const PAGE_SIZE = 6;

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<BlogPostSummary[]>(
          `/api/posts?page=${page}&limit=${PAGE_SIZE}`
        );

        if (active) {
          setPosts(data);
          setHasNext(data.length === PAGE_SIZE);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load posts');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      active = false;
    };
  }, [page, refreshTick]);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/20">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">Blog System</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Read, write, and manage posts in one simple space.
          </h1>
          <p className="text-base leading-7 text-slate-300 sm:text-lg">
            Browse paginated public posts, open full details, and sign in to create,
            edit, or delete your own articles.
          </p>
        </div>
        {!user ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-full bg-sky-500 px-5 py-3 font-medium text-white transition hover:bg-sky-400">
              Create account
            </Link>
            <Link href="/login" className="rounded-full border border-white/10 px-5 py-3 font-medium text-white transition hover:bg-white/5">
              Login
            </Link>
          </div>
        ) : null}
      </section>

      {loading ? (
        <LoadingState label="Loading posts" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setRefreshTick((current) => current + 1)} />
      ) : posts.length ? (
        <>
          <div className="grid gap-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination
            page={page}
            hasPrevious={page > 1}
            hasNext={hasNext}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => current + 1)}
          />
        </>
      ) : (
        <EmptyState
          title="No posts yet"
          message="Be the first to publish something interesting."
        />
      )}
    </div>
  );
}
