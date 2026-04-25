import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './lib/i18n';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Rider from './pages/Rider';
import Auth from './pages/Auth';
import InstallPrompt from './components/InstallPrompt';
import OfflineGate from './components/OfflineGate';
import { Toaster } from './components/ui/toaster';

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
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/rider" element={<Rider />} />
                {/* Legacy / direct-URL aliases -> home sections */}
                <Route path="/shop" element={<Navigate to="/#shop" replace />} />
                <Route path="/price" element={<Navigate to="/#price" replace />} />
                {/* Catch-all: any unknown path goes home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <InstallPrompt />
              <OfflineGate />
              <Toaster />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}

export default App;
