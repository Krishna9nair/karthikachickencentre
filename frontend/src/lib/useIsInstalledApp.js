import { useEffect, useState } from 'react';

/**
 * Returns true when the app is running as an installed PWA / native shell —
 * i.e. *not* in a regular browser tab. Used to hide the "Get App" CTA
 * after the user has already installed.
 *
 * Detection covers:
 *  - Android / Desktop Chrome / Edge / Brave installed PWA  (display-mode: standalone)
 *  - iOS Safari home-screen install                          (navigator.standalone)
 *  - Capacitor / Cordova native APK                          (capacitor:// or no protocol)
 */
export default function useIsInstalledApp() {
  const [installed, setInstalled] = useState(() => detect());

  useEffect(() => {
    setInstalled(detect());
    const mql =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(display-mode: standalone)')
        : null;
    if (!mql) return;
    const handler = () => setInstalled(detect());
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, []);

  return installed;
}

function detect() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    if (window.navigator && window.navigator.standalone === true) return true; // iOS
    if (window.location && window.location.protocol === 'capacitor:') return true;
  } catch (_) {}
  return false;
}
