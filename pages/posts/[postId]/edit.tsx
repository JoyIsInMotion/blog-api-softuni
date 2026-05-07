import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import PostForm from '@/components/PostForm';
import { fetchJson, htmlFromText, stripHtml } from '@/lib/blog';
import { useAuth } from '@/hooks/useAuth';
import type { BlogPost } from '@/types/blog';

export default function EditPostPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  if (authLoading || loading) {
    return <LoadingState label="Loading editor" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => router.reload()} />;
  }

  if (!post) {
    return <EmptyState title="Post not found" message="This draft cannot be edited." />;
  }

  if (!user || !token) {
    return (
      <EmptyState
        title="Login required"
        message="You need to be signed in to edit posts."
      />
    );
  }

  if (post.authorId !== user.id) {
    return (
      <EmptyState
        title="Access denied"
        message="You can only edit your own posts."
      />
    );
  }

  return (
    <PostForm
      title="Edit post"
      initialTitle={post.title}
      initialContent={stripHtml(post.contentHtml)}
      initialCoverImageUrl={post.coverImageUrl}
      submitLabel="Save changes"
      loading={saving}
      error={saveError}
      token={token}
      onSubmit={async ({ title, content, coverImageUrl }) => {
        try {
          setSaving(true);
          setSaveError(null);
          await fetchJson<BlogPost>(
            `/api/posts/${post.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                title,
                contentHtml: htmlFromText(content),
                coverImageUrl,
              }),
            },
            token
          );

          await router.push(`/posts/${post.id}`);
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : 'Unable to save post');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}