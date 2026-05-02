import React, { Suspense, lazy, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { I18nProvider } from './lib/i18n';
import Home from './pages/Home';
import { Toaster } from './components/ui/toaster';

// Code-split the admin / rider / auth / profile / orders pages
const Admin = lazy(() => import('./pages/Admin'));
const Rider = lazy(() => import('./pages/Rider'));
const Auth = lazy(() => import('./pages/Auth'));
const RequireAdmin = lazy(() => import('./components/RequireAdmin'));
const Profile = lazy(() => import('./pages/Profile'));
const Orders = lazy(() => import('./pages/Orders'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const AuthReset = lazy(() => import('./pages/AuthReset'));

// Code-split non-critical UI (floating buttons, offline gate, install prompt)
// so they don't delay the LCP / TTI on the home page.
const FloatingActions = lazy(() => import('./components/FloatingActions'));
const OfflineGate = lazy(() => import('./components/OfflineGate'));
const InstallPrompt = lazy(() => import('./components/InstallPrompt'));

const RouteFallback = () => (
  <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F]/30 border-t-[#D32F2F] animate-spin" />
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
      StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    }
  }, []);

  return (
    <div className="App">
      <I18nProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <BrowserRouter>
                <ScrollToHash />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route
                    path="/auth/callback"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <AuthCallback />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/auth/reset"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <AuthReset />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/auth"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <Auth />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <Profile />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <Orders />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <RequireAdmin>
                          <Admin />
                        </RequireAdmin>
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
                <Suspense fallback={null}>
                  <InstallPrompt />
                  <OfflineGate />
                  <FloatingActions />
                </Suspense>
                <Toaster />
              </BrowserRouter>
            </CartProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}

export default App;
