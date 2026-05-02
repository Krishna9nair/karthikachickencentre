import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

/**
 * Route guard for the /admin page.
 *
 * Two-layer defence:
 *   1. Client-side: checks useAuth().isAdmin (fast, prevents UI flash)
 *   2. Server-side: calls GET /api/admin/me with the Supabase access token;
 *      backend re-verifies the token + role. If this fails for any reason,
 *      we boot the user out. Prevents anyone who somehow mutated the client
 *      state from seeing the admin shell.
 *
 * While the server check is pending we show the same spinner as auth
 * loading, so there's no flash of admin UI.
 */
const RequireAdmin = ({ children }) => {
  const { session, isAdmin, loading } = useAuth();
  const [serverOk, setServerOk] = useState(null); // null = pending, true/false = resolved

  useEffect(() => {
    if (loading || !session || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const token = s?.session?.access_token;
        if (!token) {
          if (!cancelled) setServerOk(false);
          return;
        }
        await api.get('/admin/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setServerOk(true);
      } catch (_) {
        if (!cancelled) setServerOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, session, isAdmin]);

  if (loading || (session && isAdmin && serverOk === null)) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F]/30 border-t-[#D32F2F] animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!isAdmin || serverOk === false) return <Navigate to="/" replace />;

  return children;
};

export default RequireAdmin;
