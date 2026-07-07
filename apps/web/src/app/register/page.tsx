'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function RegisterPage() {
  const { registerWithEmail, isConnected } = useAuth();
  const [form, setForm] = useState({ email: '', nama: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isConnected) {
    window.location.href = '/dashboard';
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(form.email, form.nama, form.password);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-1 px-lg">
      <div className="w-full max-w-md">
        <div className="bg-canvas border border-hairline p-xl">
          <h1 className="text-headline text-ink mb-lg">Create Account</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-md">
            <Input
              label="Full Name"
              type="text"
              placeholder="Your name"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-caption text-ink-subtle hover:text-ink"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />

            {error && (
              <p className="text-body-sm text-semantic-error">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading}>
              Create Account
            </Button>
          </form>

          <div className="mt-lg text-center">
            <p className="text-body-sm text-ink-muted">
              Already have an account?{' '}
              <a href="/login" className="text-primary hover:underline">Sign in</a>
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
