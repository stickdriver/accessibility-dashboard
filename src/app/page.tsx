'use client';

import { useState } from 'react';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password }
        : { email, password, name };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        if (isLogin) {
          setMessage(`✅ Welcome back! Token: ${data.data.token.substring(0, 20)}...`);
          localStorage.setItem('auth_token', data.data.token);
        } else {
          setMessage(`✅ ${data.data.message} Check your console for the activation email!`);
        }
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivation = async () => {
    const token = prompt('Enter activation token from email:');
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Account activated! You can now sign in.`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendActivation = async () => {
    const emailToResend = prompt('Enter your email address:');
    if (!emailToResend) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/resend-activation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailToResend }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.data.message}`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <head>
        <title>Appable - Accessibility Scanner</title>
        <meta name="description" content="Test your email verification signup flow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Appable
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Accessibility Scanner Dashboard
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Testing Email Verification Signup Flow
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  isLogin 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  !isLogin 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Password (8+ chars, mixed case, number)"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </form>

          {/* Helper buttons */}
          <div className="mt-6 space-y-2">
            <button
              onClick={handleActivation}
              disabled={isLoading}
              className="w-full text-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Activate Account (Enter Token)
            </button>
            
            <button
              onClick={handleResendActivation}
              disabled={isLoading}
              className="w-full text-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Resend Activation Email
            </button>
          </div>

          {/* Message display */}
          {message && (
            <div className="mt-4 p-3 rounded-md bg-gray-50">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{message}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 text-xs text-gray-500 space-y-2">
            <p><strong>Testing Instructions:</strong></p>
            <p>1. <strong>Sign Up</strong> with any email - activation email will appear in your terminal</p>
            <p>2. <strong>Try Sign In</strong> before activation - should be blocked</p>
            <p>3. <strong>Activate Account</strong> using the token from terminal</p>
            <p>4. <strong>Sign In</strong> after activation - should work</p>
            <p className="text-blue-600">Check your terminal for activation emails! 📧</p>
          </div>
        </div>
      </div>
    </div>
  );
}