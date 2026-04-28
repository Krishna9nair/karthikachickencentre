import React, { Suspense, lazy, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './lib/i18n';
import Home from './pages/Home';
import InstallPrompt from './components/InstallPrompt';
import OfflineGate from './components/OfflineGate';
import FloatingActions from './components/FloatingActions';
import { Toaster } from './components/ui/toaster';

// Code-split the admin / rider / auth pages — only loaded on demand.
// Cuts initial JS bundle by ~40% for the 95% of users who never hit those routes.
const Admin = lazy(() => import('./pages/Admin'));
const Rider = lazy(() => import('./pages/Rider'));
const Auth = lazy(() => import('./pages/Auth'));

const RouteFallback = () => (
  <div className="min-h-screen bg-[#FAF4EC] flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-2 border-[#B93826]/30 border-t-[#B93826] animate-spin" />
  </div>
);

// Scrolls to element matching location.hash whenever the hash changes
const ScrollToHash = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const id = hash.replace('#', '');
    // Wait a tick so target element is mounted
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [pathname, hash]);
  return null;
};

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FAF4EC' }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    }
  }, []);

  return (
    <div className="App">
      <I18nProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <ScrollToHash />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/auth"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Auth />
                    </Suspense>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Admin />
                    </Suspense>
                  }
                />
                <Route
                  path="/rider"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Rider />
                    </Suspense>
                  }
                />
                {/* Legacy / direct-URL aliases -> home sections */}
                <Route path="/shop" element={<Navigate to="/#shop" replace />} />
                <Route path="/price" element={<Navigate to="/#price" replace />} />
                {/* Catch-all: any unknown path goes home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <InstallPrompt />
              <OfflineGate />
              <FloatingActions />
              <Toaster />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}

export default App;
