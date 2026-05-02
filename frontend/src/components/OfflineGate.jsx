import React, { useEffect, useState, useCallback } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useT } from '../lib/i18n';

/**
 * Full-screen overlay shown when the device loses internet.
 * - Listens to browser online/offline events (works in Capacitor webview too)
 * - Falls back to a periodic connectivity probe in case events don't fire
 * - "Refresh" button re-checks connectivity, then reloads the app
 */
const probe = async () => {
  try {
    // Hit a tiny, no-cors-friendly endpoint. Supabase REST root is fine.
    const url = process.env.REACT_APP_SUPABASE_URL
      ? `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/`
      : 'https://www.gstatic.com/generate_204';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, mode: 'no-cors' });
    clearTimeout(t);
    return true; // any response (incl. opaque) means we have connectivity
  } catch (_) {
    return false;
  }
};

const OfflineGate = () => {
  const t = useT();
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    // Defensive: poll every 20s in case events miss-fire (some Android webviews)
    const i = setInterval(async () => {
      const ok = await probe();
      setOnline(ok);
    }, 20000);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
      clearInterval(i);
    };
  }, []);

  const retry = useCallback(async () => {
    setChecking(true);
    const ok = await probe();
    setChecking(false);
    if (ok) {
      setOnline(true);
      // Force a fresh load so any pending fetches re-run
      window.location.reload();
    }
  }, []);

  if (online) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#FFFFFF] flex flex-col items-center justify-center px-6"
      data-testid="offline-gate"
    >
      <div className="w-32 h-32 rounded-full bg-[#D32F2F]/10 flex items-center justify-center mb-6">
        <WifiOff className="w-14 h-14 text-[#D32F2F]" strokeWidth={1.5} />
      </div>
      <h2 className="font-serif text-3xl text-[#212121]">{t('offline.title')}</h2>
      <p className="mt-2 text-center text-[#616161] max-w-xs">
        {t('offline.subtitle')}
      </p>
      <button
        onClick={retry}
        disabled={checking}
        className="mt-8 inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-95 text-white font-medium shadow-md transition-all disabled:opacity-70"
        data-testid="offline-refresh-btn"
      >
        <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
        {checking ? t('offline.checking') : t('offline.refresh')}
      </button>
    </div>
  );
};

export default OfflineGate;
