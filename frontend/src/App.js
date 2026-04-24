import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Rider from './pages/Rider';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <div className="App">
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/rider" element={<Rider />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </CartProvider>
    </div>
  );
}

export default App;
