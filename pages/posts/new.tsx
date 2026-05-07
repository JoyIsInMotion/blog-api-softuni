import { useRouter } from 'next/router';
import { useState } from 'react';
import PostForm from '@/components/PostForm';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { fetchJson, htmlFromText } from '@/lib/blog';
import { useAuth } from '@/hooks/useAuth';
import type { BlogPost } from '@/types/blog';

export default function NewPostPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return <LoadingState label="Preparing editor" />;
  }

  if (!user || !token) {
    return (
      <EmptyState
        title="Login required"
        message="You need an account before you can publish posts."
      />
    );
  }

  return (
    <PostForm
      title="Publish a new post"
      submitLabel="Publish"
      loading={loading}
      error={error}
      token={token}
      onSubmit={async ({ title, content, coverImageUrl }) => {
        try {
          setLoading(true);
          setError(null);
          const post = await fetchJson<BlogPost>(
            '/api/posts',
            {
              method: 'POST',
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
          setError(err instanceof Error ? err.message : 'Unable to create post');
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}