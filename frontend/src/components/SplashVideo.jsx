import React, { useEffect, useRef, useState } from 'react';

// SplashVideo — plays the brand intro video full-screen on app launch,
// fades into the app when the video ends or the user taps to skip.
//
// Behaviour:
//  - Plays once per browser session (sessionStorage flag) so users don't
//    sit through it on every page nav within the same session.
//  - Muted by default (browsers block autoplay with sound).
//  - Auto-skips if the video fails to load within 1.5s — never blocks the
//    app from rendering.
//  - Tap anywhere to skip.
//
// To replace the video: drop a new file at /app/frontend/public/splash.mp4.
const SESSION_FLAG = 'cc_splash_played';

const SplashVideo = () => {
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !sessionStorage.getItem(SESSION_FLAG);
    } catch (_) {
      return true;
    }
  });
  const [fading, setFading] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  // Lock body scroll while splash is active.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  // Hard timeout: if anything goes wrong (network, codec), bail in 4 s.
  useEffect(() => {
    if (!active) return;
    timerRef.current = setTimeout(() => finish(), 4000);
    return () => clearTimeout(timerRef.current);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => {
    if (fading) return;
    setFading(true);
    try { sessionStorage.setItem(SESSION_FLAG, '1'); } catch (_) {}
    // Allow CSS fade to play (300ms) before unmounting.
    setTimeout(() => setActive(false), 320);
  };

  if (!active) return null;

  return (
    <div
      role="dialog"
      aria-label="ChickenCrew intro"
      data-testid="splash-video-overlay"
      onClick={finish}
      className={`fixed inset-0 z-[200] bg-white flex items-center justify-center transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        onCanPlay={() => {
          // Once we know we can play, give it the full duration to finish.
          clearTimeout(timerRef.current);
        }}
        className="w-full h-full object-contain bg-white"
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finish(); }}
        data-testid="splash-skip-btn"
        className="absolute bottom-6 right-6 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-semibold backdrop-blur-sm"
      >
        Skip
      </button>
    </div>
  );
};

export default SplashVideo;
