import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';

// AuthCallback — handles the URL fragment `#session_id=...` produced by
// Emergent Google Auth. Exchanges it server-side for a session_token,
// stores token in localStorage as cookie fallback, then redirects to /profile.
const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refresh } = useCustomerAuth();
  const [error, setError] = useState(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const hash = window.location.hash || '';
    const sessionId = hash.match(/session_id=([^&]+)/)?.[1];
    const next = params.get('next') || '/profile';

    if (!sessionId) {
      setError('Missing session_id from Google');
      return;
    }

    (async () => {
      try {
        const { data } = await api.post('/auth/google/session', { session_id: sessionId });
        if (data?.session_token) {
          try { localStorage.setItem('cc_session_token', data.session_token); } catch (_) {}
        }
        // Pull current user into context, then navigate
        await refresh();
        // Strip hash and navigate to next
        window.history.replaceState({}, '', window.location.pathname);
        navigate(next, { replace: true });
      } catch (e) {
        setError(e?.response?.data?.detail || 'Sign-in failed. Please try again.');
      }
    })();
  }, [navigate, params, refresh]);

  return (
    <div
      data-testid="auth-callback-screen"
      className="min-h-screen bg-white flex items-center justify-center px-5"
    >
      <div className="text-center">
        {error ? (
          <>
            <div className="text-[#D32F2F] font-bold text-lg" data-testid="auth-callback-error">
              {error}
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-5 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
            >
              Back to home
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#D32F2F]/30 border-t-[#D32F2F] animate-spin" />
            <div className="mt-4 text-[#212121] font-semibold">Signing you in…</div>
            <div className="mt-1 text-sm text-[#616161]">One moment, securing your session.</div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
