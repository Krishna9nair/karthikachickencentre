import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Loader2, User, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useToast } from '../hooks/use-toast';
import ForgotPasswordDialog from '../components/ForgotPasswordDialog';

// Emails that should be treated as admin staff and routed to /admin after
// login. Centralized so we only have to update it in one place.
// NOTE: Admin accounts are managed in Supabase Auth (not the new
// customer_credentials table) — they keep using the existing JWT flow.
const ADMIN_EMAILS = new Set(['knair9843@gmail.com']);

const formatApiErrorDetail = (detail) => {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
};

const Auth = () => {
  const adminAuth = useAuth();
  const customerAuth = useCustomerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // If admin lands here already-authenticated via Supabase Auth, redirect.
  useEffect(() => {
    if (adminAuth.loading) return;
    if (adminAuth.session && adminAuth.isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [adminAuth.loading, adminAuth.session, adminAuth.isAdmin, navigate]);

  // If a customer session is already active, bounce to next.
  useEffect(() => {
    if (customerAuth.loading) return;
    if (customerAuth.user) {
      navigate(next === '/auth' ? '/profile' : next, { replace: true });
    }
  }, [customerAuth.loading, customerAuth.user, navigate, next]);

  const handleGoogle = () => {
    customerAuth.signIn(next === '/auth' ? '/profile' : next);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      // Admin path → existing Supabase Auth (JWT)
      if (ADMIN_EMAILS.has(cleanEmail)) {
        await adminAuth.signIn(cleanEmail, password);
        toast({ title: 'Welcome back, admin', description: 'Loading the dashboard…' });
        navigate('/admin', { replace: true });
        return;
      }
      // Customer path → new email/password endpoint
      await customerAuth.signInWithPassword({ email: cleanEmail, password, rememberMe });
      toast({ title: 'Signed in', description: 'Welcome back!' });
      navigate(next === '/auth' ? '/profile' : next, { replace: true });
    } catch (err) {
      toast({
        title: 'Sign in failed',
        description: formatApiErrorDetail(err?.response?.data?.detail) || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    if (ADMIN_EMAILS.has(cleanEmail)) {
      toast({ title: 'Admin sign-up disabled', description: 'Admin accounts are managed manually.' });
      setSubmitting(false);
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.' });
      setSubmitting(false);
      return;
    }
    try {
      await customerAuth.signUp({
        email: cleanEmail,
        password,
        name,
        phone: phone || null,
        rememberMe,
      });
      toast({ title: 'Account created', description: 'You\u2019re signed in.' });
      navigate(next === '/auth' ? '/profile' : next, { replace: true });
    } catch (err) {
      toast({
        title: 'Sign up failed',
        description: formatApiErrorDetail(err?.response?.data?.detail) || err.message,
      });
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
          <h1 className="font-bold text-2xl text-[#212121] tracking-tight">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-[#616161] mt-1">
            {tab === 'signin'
              ? 'Sign in to view orders, addresses, and reorder in one tap.'
              : 'Sign up to save addresses and track orders.'}
          </p>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogle}
            data-testid="auth-google-btn"
            className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#E0E0E0] bg-white hover:bg-[#F5F5F5] text-[#212121] text-sm font-semibold transition-colors"
          >
            <GoogleIcon /> Continue with Google
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[#616161]">
            <span className="flex-1 h-px bg-[#E0E0E0]" />
            <span>or</span>
            <span className="flex-1 h-px bg-[#E0E0E0]" />
          </div>

          {/* Tabs */}
          <div role="tablist" className="inline-flex bg-[#F5F5F5] rounded-lg p-1 w-full" data-testid="auth-tabs">
            {[
              { key: 'signin', label: 'Sign in' },
              { key: 'signup', label: 'Sign up' },
            ].map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                data-testid={`auth-tab-${t.key}`}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  tab === t.key ? 'bg-white text-[#D32F2F] shadow-sm' : 'text-[#616161] hover:text-[#212121]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={tab === 'signin' ? handleSignIn : handleSignUp}
            className="mt-5 space-y-3.5"
            data-testid={tab === 'signin' ? 'signin-form' : 'signup-form'}
          >
            {tab === 'signup' && (
              <>
                <Field label="Full name" Icon={User}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={1}
                    maxLength={80}
                    className="flex-1 outline-none text-sm bg-transparent"
                    placeholder="Your name"
                    data-testid="signup-name"
                  />
                </Field>
                <Field label="Mobile (optional)" Icon={Phone}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 outline-none text-sm bg-transparent"
                    placeholder="10-digit mobile"
                    data-testid="signup-phone"
                  />
                </Field>
              </>
            )}
            <Field label="Email" Icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete={tab === 'signin' ? 'email' : 'username'}
                className="flex-1 outline-none text-sm bg-transparent"
                placeholder="you@example.com"
                data-testid={`${tab}-email`}
              />
            </Field>
            <Field label="Password" Icon={Lock}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={tab === 'signup' ? 8 : 1}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                className="flex-1 outline-none text-sm bg-transparent"
                placeholder={tab === 'signup' ? 'Min 8 characters' : 'Your password'}
                data-testid={`${tab}-password`}
              />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#D32F2F]"
                data-testid="auth-remember-me"
              />
              <span className="text-sm text-[#212121]">Remember me</span>
              <span className="text-xs text-[#616161]">
                {rememberMe ? '· stay signed in for 90 days' : '· session ends in 7 days'}
              </span>
            </label>

            {tab === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  data-testid="auth-forgot-password-btn"
                  className="text-sm text-[#D32F2F] hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid={`${tab}-submit`}
              className="w-full mt-2 py-3 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-[0.99] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="text-center mt-6 text-xs text-[#616161]">
            <Link to="/" className="hover:text-[#D32F2F]">← Back to shop</Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#616161] mt-4 leading-relaxed">
          Shop staff can sign in with their existing admin email — they'll be taken straight to the dashboard.
        </p>
      </div>
      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        defaultEmail={email}
      />
    </div>
  );
};

const Field = ({ label, Icon, children }) => (
  <div>
    <label className="text-xs font-semibold text-[#616161] uppercase tracking-wider">{label}</label>
    <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus-within:border-[#D32F2F]">
      {Icon && <Icon className="w-4 h-4 text-[#616161]" />}
      {children}
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92c-.26 1.36-1.04 2.51-2.21 3.28v2.72h3.57c2.09-1.92 3.22-4.74 3.22-8.03z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.72c-.99.66-2.27 1.05-3.71 1.05-2.85 0-5.27-1.92-6.13-4.51H2.18v2.83A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.87 14.16A6.6 6.6 0 0 1 5.5 12c0-.75.13-1.48.37-2.16V7H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.99l3.69-2.83z"/>
    <path fill="#EA4335" d="M12 5.38c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.45 2.06 14.97 1 12 1A11 11 0 0 0 2.18 7l3.69 2.84C6.73 7.3 9.15 5.38 12 5.38z"/>
  </svg>
);

export default Auth;
