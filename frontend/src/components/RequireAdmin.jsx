import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

/**
 * Route guard for /admin.
 *
 * Decision sequence (each rendered synchronously, never blocks indefinitely):
 *   1. AuthContext still booting -> show spinner (capped by AuthContext's
 *      own 6s timeout, so it can't deadlock here).
 *   2. No session -> /auth.
 *   3. Logged in but not admin -> /.
 *   4. Logged in admin -> render the dashboard immediately. We fire a
 *      background server-side verification; if THAT fails with 401/403,
 *      we sign out and the next render kicks the user back to /auth.
 *      A failed server check never leaves the user staring at a spinner.
 */
const RequireAdmin = ({ children }) => {
  const { session, isAdmin, loading, signOut } = useAuth();
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    if (loading || !session || !isAdmin) return;
    let cancelled = false;
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 8000);

    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const token = s?.session?.access_token;
        if (!token) {
          if (!cancelled) {
            try { await signOut(); } catch (_) {}
            setRevoked(true);
          }
          return;
        }
        await api.get('/admin/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: ac.signal,
          timeout: 7000,
        });
        // Verified ok — nothing to do.
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          try { await signOut(); } catch (_) {}
          if (!cancelled) setRevoked(true);
        }
        // Other failures (network/timeout): keep the user on the dashboard.
        // They'll get clean errors from individual admin actions instead of
        // a permanent spinner.
      } finally {
        clearTimeout(tid);
      }
    })();

    return () => { cancelled = true; clearTimeout(tid); ac.abort(); };
  }, [loading, session, isAdmin, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F]/30 border-t-[#D32F2F] animate-spin" />
      </div>
    );
  }
  if (!session || revoked) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default RequireAdmin;
