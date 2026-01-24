/**
 * AuthModal Component
 *
 * Modal for user authentication (sign in / sign up).
 * Supports email/password authentication via Supabase.
 */

import React, { useState } from 'react';
import { ICONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, isLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      if (mode === 'signin') {
        const { error: loginError } = await login(email, password);
        if (loginError) {
          setError(loginError);
        } else {
          onClose();
        }
      } else if (mode === 'signup') {
        const { error: registerError } = await register(email, password);
        if (registerError) {
          setError(registerError);
        } else {
          setSuccess('Account created! Check your email to confirm your account.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-panel border border-border rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <ICONS.User />
            </div>
            <h2 className="text-lg font-bold text-primaryText">
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-xl transition-all"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondaryText uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-primaryText placeholder-secondaryText/50 focus:outline-none focus:border-accent transition-all"
            />
          </div>

          {/* Password Field */}
          {mode !== 'forgot' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-secondaryText uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-primaryText placeholder-secondaryText/50 focus:outline-none focus:border-accent transition-all"
              />
            </div>
          )}

          {/* Confirm Password Field (Sign Up only) */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-secondaryText uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-primaryText placeholder-secondaryText/50 focus:outline-none focus:border-accent transition-all"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent hover:bg-accent/90 text-canvas py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <ICONS.Loader />}
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Send Reset Link'}
          </button>

          {/* Mode Switcher */}
          <div className="pt-4 border-t border-border text-center text-sm">
            {mode === 'signin' && (
              <>
                <span className="text-secondaryText">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-accent hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                <span className="text-secondaryText">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-accent hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-accent hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
