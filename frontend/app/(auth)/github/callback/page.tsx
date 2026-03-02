'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuthTokens } from '@/lib/auth';
import apiClient from '@/lib/api-client';

function GitHubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code) {
        setError('No authorization code received');
        return;
      }

      try {
        const response = await apiClient.post('/oauth/github/callback', {
          code,
          state,
        });

        const { tokens } = response.data;
        setAuthTokens(tokens);
        router.push('/dashboard');
      } catch (err) {
        console.error('GitHub OAuth error:', err);
        setError('Failed to authenticate with GitHub');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Failed
          </h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Authenticating with GitHub</h1>
        <p className="text-gray-600">Please wait...</p>
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Loading...</h1>
          </div>
        </div>
      }
    >
      <GitHubCallbackContent />
    </Suspense>
  );
}
