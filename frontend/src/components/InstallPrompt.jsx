import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('fc_install_dismissed');
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone || dismissed) return;

    const ua = window.navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    if (isIos) {
      setIsIOS(true);
      setTimeout(() => setVisible(true), 3000);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem('fc_install_dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-md">
      <div className="bg-white border border-[#EADFCF] rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FAF4EC] border border-[#EADFCF] flex items-center justify-center shrink-0 overflow-hidden">
          <img src="/logo.png" alt="ChickenCrew" className="w-8 h-8 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif font-bold text-[#2A1A14] text-sm">Install ChickenCrew</div>
          <div className="text-[11px] text-[#7B5A48] leading-snug">
            {isIOS
              ? 'Tap the Share icon → "Add to Home Screen"'
              : 'Quicker access, works offline.'}
          </div>
        </div>
        {!isIOS && (
          <button
            onClick={install}
            className="px-3 py-2 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-xs font-medium flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Install
          </button>
        )}
        <button onClick={dismiss} className="p-1.5 rounded-full text-[#7B5A48] hover:bg-[#F3EADB]" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
