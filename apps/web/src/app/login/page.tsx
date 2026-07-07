'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const { loginWithEmail, isConnected } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isConnected) {
    window.location.href = '/dashboard';
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithEmail(form.email, form.password);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-1 px-lg">
      <div className="w-full max-w-md">
        <div className="bg-canvas border border-hairline p-xl">
          <h1 className="text-headline text-ink mb-lg">Sign In</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-md">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {error && (
              <p className="text-body-sm text-semantic-error">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-lg text-center">
            <p className="text-body-sm text-ink-muted">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-primary hover:underline">Create one</a>
            </p>
          </div>

          <div className="mt-md pt-md border-t border-hairline text-center">
            <a href="/" className="text-body-sm text-primary hover:underline">
              Or connect with Freighter wallet
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
