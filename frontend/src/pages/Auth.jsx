import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Loader2, Drumstick } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const Auth = () => {
  const { session, isAdmin, signIn, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && isAdmin) navigate('/admin');
  }, [loading, session, isAdmin, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast({ title: 'Welcome back', description: 'Redirecting to admin dashboard…' });
      setTimeout(() => navigate('/admin'), 400);
    } catch (err) {
      toast({ title: 'Login failed', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF4EC] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <div className="w-11 h-11 rounded-full bg-[#B93826] flex items-center justify-center">
            <Drumstick className="w-6 h-6 text-[#FAF4EC]" />
          </div>
          <div>
            <div className="font-serif font-bold text-xl text-[#2A1A14]">ChickenCrew</div>
            <div className="text-[10px] tracking-[0.18em] text-[#7B5A48] font-medium">FARM FRESH DAILY</div>
          </div>
        </Link>

        <div className="bg-white rounded-2xl border border-[#EADFCF] shadow-sm p-8">
          <h1 className="font-serif text-3xl text-[#2A1A14]">Admin Login</h1>
          <p className="text-sm text-[#7B5A48] mt-1">Manage prices, products, and orders.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#7B5A48]">Email</label>
              <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus-within:border-[#B93826]">
                <Mail className="w-4 h-4 text-[#7B5A48]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 outline-none text-sm bg-transparent"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#7B5A48]">Password</label>
              <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus-within:border-[#B93826]">
                <Lock className="w-4 h-4 text-[#7B5A48]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="flex-1 outline-none text-sm bg-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign in
            </button>
          </form>

          <div className="text-center mt-5 text-xs text-[#7B5A48]">
            <Link to="/" className="hover:text-[#B93826]">← Back to shop</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
