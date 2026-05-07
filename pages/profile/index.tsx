import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import PostCard from '@/components/PostCard';
import { fetchJson } from '@/lib/blog';
import { useAuth } from '@/hooks/useAuth';
import type { BlogPostSummary } from '@/types/blog';

export default function ProfilePage() {
  const { user, token, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<BlogPostSummary[]>(
          '/api/posts?limit=100&page=1',
          {},
          token
        );

        if (active) {
          setPosts(data.filter((post) => post.authorId === user?.id));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load profile');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (!authLoading) {
      loadProfile();
    }

    return () => {
      active = false;
    };
  }, [authLoading, token, user?.id]);

  const stats = useMemo(
    () => ({
      posts: posts.length,
      email: user?.email || 'Unknown',
    }),
    [posts.length, user?.email]
  );

  if (authLoading) {
    return <LoadingState label="Loading profile" />;
  }

  if (!user || !token) {
    return (
      <EmptyState
        title="Login required"
        message="Your profile is available after you sign in."
      />
    );
  }

  if (loading) {
    return <LoadingState label="Loading your posts" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/20">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">Profile</p>
        <h1 className="mt-3 text-3xl font-bold text-white">My account</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Email</p>
            <p className="mt-2 text-white">{stats.email}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Posts</p>
            <p className="mt-2 text-white">{stats.posts}</p>
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/posts/new"
            className="inline-flex rounded-full bg-sky-500 px-4 py-2 font-medium text-white transition hover:bg-sky-400"
          >
            Create post
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white">My posts</h2>
        {posts.length ? (
          <div className="grid gap-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} canEdit />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No posts yet"
            message="Publish your first post to see it here."
          />
        )}
      </section>
    </div>
  );
}