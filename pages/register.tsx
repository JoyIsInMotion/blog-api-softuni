import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AuthForm from '@/components/AuthForm';
import { fetchJson } from '@/lib/blog';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
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
        title="Create your account"
        submitLabel="Register"
        switchHref="/login"
        switchLabel="Already have an account? Login"
        loading={loading}
        error={error}
        onSubmit={async ({ email, password }) => {
          try {
            setLoading(true);
            setError(null);
            const response = await fetchJson<{ token: string }>('/api/auth/register', {
              method: 'POST',
              body: JSON.stringify({ email, password }),
            });

            await auth.register(response.token);
            await router.push('/profile');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
}