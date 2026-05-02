import React, { useState } from 'react';
import { X, Mail, Loader2, Check } from 'lucide-react';
import { api } from '../lib/api';

// ForgotPasswordDialog — modal launched from /auth sign-in form.
// Always shows the same success message regardless of whether the email exists,
// so attackers can't enumerate accounts.
const ForgotPasswordDialog = ({ open, onClose, defaultEmail = '' }) => {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState('idle'); // idle | submitting | sent
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setStatus('idle');
      setError('');
    }
  }, [open, defaultEmail]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    setStatus('submitting');
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStatus('sent');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not send reset email. Try again.');
      setStatus('idle');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="forgot-password-overlay"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-[#212121]">Reset your password</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            data-testid="forgot-password-close-btn"
            className="p-1 rounded text-[#616161] hover:text-[#D32F2F]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="text-center py-4" data-testid="forgot-password-sent">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="font-bold text-[#212121]">Check your inbox</p>
            <p className="text-sm text-[#616161] mt-2 leading-relaxed">
              If an account exists for <b>{email}</b>, we just sent a reset link. The link is valid for 60 minutes.
            </p>
            <p className="text-xs text-[#616161] mt-3">
              Didn't get it? Check your spam folder or wait 30 seconds and try again.
            </p>
            <button
              onClick={onClose}
              className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        ) : (
          <form onSubmit={submit} data-testid="forgot-password-form">
            <p className="text-sm text-[#616161] mb-4 leading-relaxed">
              Enter the email you used to sign up. We'll send you a link to set a new password.
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-[#616161] uppercase tracking-wider">Email</span>
              <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus-within:border-[#D32F2F]">
                <Mail className="w-4 h-4 text-[#616161]" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 outline-none text-sm bg-transparent"
                  placeholder="you@example.com"
                  data-testid="forgot-password-email"
                />
              </div>
            </label>
            {error && (
              <div className="mt-2 text-sm text-[#D32F2F]" data-testid="forgot-password-error">{error}</div>
            )}
            <button
              type="submit"
              disabled={status === 'submitting'}
              data-testid="forgot-password-submit-btn"
              className="mt-5 w-full py-3 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send reset link
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordDialog;
