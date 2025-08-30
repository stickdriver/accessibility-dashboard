'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ActivatePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    const activateAccount = async () => {
      if (!token) {
        setStatus('invalid');
        setMessage('Invalid activation link. Please check your email for the correct activation link.');
        return;
      }

      try {
        // First verify the token
        const verifyResponse = await fetch(`/api/auth/activate?token=${token}`);
        const verifyData = await verifyResponse.json();

        if (!verifyData.success) {
          setStatus('error');
          setMessage(verifyData.error || 'Invalid or expired activation token.');
          return;
        }

        // If token is valid, activate the account
        const activateResponse = await fetch('/api/auth/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const activateData = await activateResponse.json();

        if (activateData.success) {
          setStatus('success');
          setMessage(activateData.data.message || 'Your account has been successfully activated!');
        } else {
          setStatus('error');
          setMessage(activateData.error || 'Failed to activate account.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error. Please try again later.');
      }
    };

    activateAccount();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Appable
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Account Activation
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Activating Your Account...
                </h2>
                <p className="text-sm text-gray-600">
                  Please wait while we activate your account.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div>
                <div className="rounded-full bg-green-100 p-2 mx-auto w-12 h-12 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Account Activated!
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  {message}
                </p>
                <div className="space-y-3">
                  <a
                    href="/"
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Sign In
                  </a>
                </div>
              </div>
            )}

            {(status === 'error' || status === 'invalid') && (
              <div>
                <div className="rounded-full bg-red-100 p-2 mx-auto w-12 h-12 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Activation Failed
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  {message}
                </p>
                <div className="space-y-3">
                  <a
                    href="/"
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to Home
                  </a>
                  <p className="text-xs text-gray-500">
                    Need help? You can request a new activation email from the sign-up page.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}