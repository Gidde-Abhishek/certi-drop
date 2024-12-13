'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import React from 'react';

// Separate component for the callback logic
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      
      if (!code) {
        router.push('/?error=no_code');
        return;
      }

      try {
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('Failed to authenticate');
        }

        const data = await response.json();
        if (data.tokens) {
          localStorage.setItem('googleTokens', JSON.stringify(data.tokens));
          router.push('/?success=true');
        } else {
          throw new Error('No tokens received');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        router.push('/?error=auth_failed');
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a1c23] p-4">
      <div className="card-gradient rounded-xl p-8 text-center max-w-md w-full">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
        <h2 className="mt-4 text-xl font-semibold text-white">Completing authentication...</h2>
        <p className="mt-2 text-gray-400">Please wait while we process your login</p>
      </div>
    </div>
  );
}

// Loading component
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a1c23] p-4">
      <div className="card-gradient rounded-xl p-8 text-center max-w-md w-full">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
        <h2 className="mt-4 text-xl font-semibold text-white">Loading...</h2>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AuthCallback() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CallbackHandler />
    </Suspense>
  );
}