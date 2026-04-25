// Custom hook: re-runs `loader` every `intervalMs` and whenever the tab
// becomes visible / window regains focus. Used to keep prices fresh
// without users having to hard-refresh.
import { useEffect, useRef } from 'react';

export default function useAutoRefresh(loader, intervalMs = 60000) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loaderRef.current?.();
    };
    const interval = setInterval(tick, intervalMs);
    const onVisible = () => { if (!document.hidden) loaderRef.current?.(); };
    const onFocus = () => loaderRef.current?.();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [intervalMs]);
}
