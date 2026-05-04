import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

// Wrap a (potentially thenable) Supabase call with a hard timeout so a
// hung request can never freeze the auth state machine.
const withTimeout = (work, ms, label = 'op') => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  const wrapped = (async () => work)().then(
    (v) => { clearTimeout(timer); return v; },
    (e) => { clearTimeout(timer); throw e; }
  );
  return Promise.race([wrapped, timeout]);
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = useCallback(async (userId) => {
    if (!userId) {
      setIsAdmin(false);
      return false;
    }
    try {
      const result = await withTimeout(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle(),
        6000,
        'checkAdmin'
      );
      if (result?.error) throw result.error;
      const ok = !!result?.data;
      setIsAdmin(ok);
      return ok;
    } catch (err) {
      console.warn('[auth] checkAdmin failed:', err?.message || err);
      setIsAdmin(false);
      return false;
    }
  }, []);

  useEffect(() => {
    // No initialised-guard here: in React 18 StrictMode dev, the effect
    // mounts twice. A guard would skip the second init but the first's
    // cleanup already aborted in-flight work, leaving loading=true forever
    // (this was the "infinite admin loading" bug). Letting init run twice
    // is idempotent and cheap.
    let mounted = true;

    (async () => {
      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          6000,
          'getSession'
        );
        if (!mounted) return;
        const s = result?.data?.session || null;
        setSession(s);
        await checkAdmin(s?.user?.id);
      } catch (err) {
        console.warn('[auth] getSession failed, signing out cleanly:', err?.message || err);
        try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
        if (!mounted) return;
        setSession(null);
        setIsAdmin(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      await checkAdmin(sess?.user?.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [checkAdmin]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    await checkAdmin(data.session?.user?.id);
    return data;
  }, [checkAdmin]);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (_) {}
    setSession(null);
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{ session, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
