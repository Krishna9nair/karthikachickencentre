import React, { lazy, Suspense, useEffect, useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

const SundayWheel = lazy(() => import('./SundayWheel'));

// Returns true if "now" in IST is a Sunday. IST = UTC+5:30, no DST.
const isSundayIST = () => {
  const now = new Date();
  // Convert to IST by adjusting epoch ms
  const istMs = now.getTime() + (now.getTimezoneOffset() + 330) * 60000;
  return new Date(istMs).getDay() === 0; // 0 = Sunday
};

const SundayWheelBanner = () => {
  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(isSundayIST());
  }, []);

  if (!showBanner) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="sunday-wheel-banner"
        className="w-full py-2.5 px-4 bg-gradient-to-r from-[#D32F2F] via-[#E64A19] to-[#FF6B35] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md relative z-10"
      >
        <PartyPopper className="w-4 h-4 animate-bounce" />
        <span>Sunday Lucky Spin is LIVE — win up to 15% off!</span>
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline ml-1 underline decoration-dotted">Tap to spin</span>
      </button>
      {open && (
        <Suspense fallback={null}>
          <SundayWheel open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default SundayWheelBanner;
