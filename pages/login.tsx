import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AuthForm from '@/components/AuthForm';
import { fetchJson } from '@/lib/blog';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.user) {
      router.replace('/');
    }
  }, [auth.user, router]);

  return (
    <div className="flex justify-center py-8">
      <AuthForm
        title="Welcome back"
        submitLabel="Login"
        switchHref="/register"
        switchLabel="Need an account? Register"
        loading={loading}
        error={error}
        onSubmit={async ({ email, password }) => {
          try {
            setLoading(true);
            setError(null);
            const response = await fetchJson<{ token: string }>('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email, password }),
            });

            await auth.login(response.token);
            await router.push('/profile');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
}