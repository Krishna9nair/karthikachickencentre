import React, { useEffect, useState } from 'react';
import { X, Download, Smartphone, Apple, Monitor, Share2 } from 'lucide-react';
import { useT } from '../lib/i18n';

const SITE_URL = 'https://karthikachickencentre.shop';
// Free QR code service — no key needed. Encodes our live URL.
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(SITE_URL)}&color=2A1A14&bgcolor=FAF4EC&qzone=2`;

const InstallAppDialog = ({ open, onClose }) => {
  const t = useT();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState('android'); // android | ios | desktop

  useEffect(() => {
    const ua = window.navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /android/i.test(ua);
    setPlatform(isIos ? 'ios' : isAndroid ? 'android' : 'desktop');

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!open) return null;

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="install-dialog"
    >
      <div
        className="bg-[#FAF4EC] rounded-2xl w-full max-w-md shadow-2xl border border-[#EADFCF] overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EADFCF] sticky top-0 bg-[#FAF4EC] z-10">
          <h3 className="font-serif text-xl font-bold text-[#2A1A14]" data-testid="install-dialog-title">
            {t('install.title')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#EADFCF] text-[#3B2416]"
            aria-label={t('install.close')}
            data-testid="install-dialog-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-[#7B5A48]">{t('install.subtitle')}</p>

          {/* Platform tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F3EADB] rounded-full text-xs">
            {[
              { id: 'android', icon: Smartphone, label: 'Android' },
              { id: 'ios', icon: Apple, label: 'iPhone' },
              { id: 'desktop', icon: Monitor, label: 'PC' },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = platform === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPlatform(tab.id)}
                  data-testid={`install-tab-${tab.id}`}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-full font-medium transition-colors ${
                    active ? 'bg-white shadow-sm text-[#B93826]' : 'text-[#7B5A48] hover:text-[#3B2416]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Steps per platform */}
          {platform === 'android' && (
            <div className="space-y-3">
              <Step n={1} text={t('install.android_step1')} />
              <Step n={2} text={t('install.android_step2')} />
              <Step n={3} text={t('install.android_step3')} />
              {deferredPrompt && (
                <button
                  onClick={triggerInstall}
                  className="mt-2 w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium flex items-center justify-center gap-2"
                  data-testid="install-now-btn"
                >
                  <Download className="w-4 h-4" /> {t('install.android_btn')}
                </button>
              )}
            </div>
          )}

          {platform === 'ios' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#B93826] tracking-wide">
                {t('install.ios_title')}
              </div>
              <Step n={1} icon={Share2} text={t('install.ios_step1')} />
              <Step n={2} text={t('install.ios_step2')} />
              <Step n={3} text={t('install.ios_step3')} />
            </div>
          )}

          {platform === 'desktop' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#B93826] tracking-wide">
                {t('install.desktop_title')}
              </div>
              <p className="text-sm text-[#3B2416]">{t('install.desktop_text')}</p>
              <div className="rounded-2xl bg-white border border-[#EADFCF] p-4 flex flex-col items-center">
                <div className="text-xs text-[#7B5A48] mb-2">{t('install.qr_title')}</div>
                <img
                  src={QR_SRC}
                  alt="Install QR code"
                  className="w-40 h-40 rounded-lg"
                  data-testid="install-qr-image"
                />
                <div className="mt-2 text-[10px] text-[#7B5A48] font-mono break-all">
                  {SITE_URL}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Step = ({ n, text, icon: Icon }) => (
  <div className="flex items-start gap-3">
    <div className="shrink-0 w-7 h-7 rounded-full bg-[#B93826] text-white flex items-center justify-center text-xs font-bold">
      {Icon ? <Icon className="w-3.5 h-3.5" /> : n}
    </div>
    <div className="text-sm text-[#3B2416] pt-1">{text}</div>
  </div>
);

export default InstallAppDialog;
