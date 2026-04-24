import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Rider from './pages/Rider';
import Auth from './pages/Auth';
import InstallPrompt from './components/InstallPrompt';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/rider" element={<Rider />} />
            </Routes>
            <InstallPrompt />
            <Toaster />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
