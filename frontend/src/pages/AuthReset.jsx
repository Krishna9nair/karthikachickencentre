import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';

// AuthReset — Standalone page reached from the email reset link
// (e.g. /auth/reset?token=abc123...). Lets the user set a new password.
const AuthReset = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('This reset link is missing or invalid. Request a new one.');
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\u2019t match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      toast({ title: 'Password updated', description: 'Sign in with your new password.' });
      setTimeout(() => navigate('/auth', { replace: true }), 1500);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not reset password. Try requesting a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 rounded-full bg-white border border-[#E0E0E0] flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="ChickenCrew" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <div className="font-bold text-xl text-[#212121] tracking-tight">ChickenCrew</div>
            <div className="text-[10px] tracking-[0.18em] text-[#616161] font-medium">FARM FRESH DAILY</div>
          </div>
        </Link>

        <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-7 md:p-8">
          {done ? (
            <div className="text-center py-4" data-testid="auth-reset-done">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h1 className="font-bold text-2xl text-[#212121] tracking-tight">Password updated</h1>
              <p className="text-sm text-[#616161] mt-2">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="font-bold text-2xl text-[#212121] tracking-tight">Set a new password</h1>
              <p className="text-sm text-[#616161] mt-1">
                Choose a password you don't use anywhere else. Min 8 characters.
              </p>

              <form onSubmit={submit} className="mt-5 space-y-3.5" data-testid="auth-reset-form">
                <div>
                  <label className="text-xs font-semibold text-[#616161] uppercase tracking-wider">New password</label>
                  <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus-within:border-[#D32F2F]">
                    <Lock className="w-4 h-4 text-[#616161]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="flex-1 outline-none text-sm bg-transparent"
                      placeholder="Min 8 characters"
                      data-testid="auth-reset-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#616161] uppercase tracking-wider">Confirm password</label>
                  <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus-within:border-[#D32F2F]">
                    <Lock className="w-4 h-4 text-[#616161]" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="flex-1 outline-none text-sm bg-transparent"
                      placeholder="Type it again"
                      data-testid="auth-reset-confirm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-[#D32F2F]" data-testid="auth-reset-error">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !token}
                  data-testid="auth-reset-submit-btn"
                  className="w-full mt-2 py-3 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Update password
                </button>
              </form>
            </>
          )}

          <div className="text-center mt-6 text-xs text-[#616161]">
            <Link to="/auth" className="hover:text-[#D32F2F]">← Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthReset;
