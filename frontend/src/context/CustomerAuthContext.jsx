import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const CustomerAuthContext = createContext(null);

// Manages the Google-authenticated customer session.
// `user` shape: { email, name, picture, phone | null } | null
// `loading` is true only during the initial /auth/me check.
export const CustomerAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      return data;
    } catch (_) {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If we are mid-auth-callback (URL fragment has session_id),
    // skip /auth/me — AuthCallback will exchange the session_id and call
    // refresh() once the cookie is set. This avoids the well-known global
    // AuthProvider race that 401s before the cookie lands.
    if (typeof window !== 'undefined' && window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Kick off Google sign-in. Returns the user back to /auth/callback after
  // Google completes — the callback page exchanges session_id for a cookie.
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const signIn = (returnTo = '/profile') => {
    const redirectUrl = window.location.origin + '/auth/callback?next=' + encodeURIComponent(returnTo);
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  // Email/password sign-in. Returns the resolved user object (also updates context).
  const signInWithPassword = async ({ email, password, rememberMe = false }) => {
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
      remember_me: !!rememberMe,
    });
    if (data?.session_token) {
      try { localStorage.setItem('cc_session_token', data.session_token); } catch (_) {}
    }
    setUser(data.user);
    return data.user;
  };

  // Email/password sign-up. Same response shape as login; auto-signs the user in.
  const signUp = async ({ email, password, name, phone = null, rememberMe = false }) => {
    const { data } = await api.post('/auth/signup', {
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      phone: phone ? phone.replace(/\D/g, '').slice(0, 10) : null,
      remember_me: !!rememberMe,
    });
    if (data?.session_token) {
      try { localStorage.setItem('cc_session_token', data.session_token); } catch (_) {}
    }
    setUser(data.user);
    return data.user;
  };

  const signOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    try { localStorage.removeItem('cc_session_token'); } catch (_) {}
    setUser(null);
  };

  return (
    <CustomerAuthContext.Provider value={{ user, loading, refresh, signIn, signInWithPassword, signUp, signOut, setUser }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return ctx;
};
