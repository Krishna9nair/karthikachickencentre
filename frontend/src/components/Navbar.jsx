import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Languages, Menu, X, Drumstick } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { totalQty, setIsOpen } = useCart();
  const { isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname, hash } = useLocation();

  const NAV = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/#shop' },
    { label: "Today's Price", to: '/#price' },
    { label: isAdmin ? 'Admin' : 'Admin Login', to: isAdmin ? '/admin' : '/auth' },
    { label: 'Rider', to: '/rider' },
  ];

  const isActive = (to) => {
    if (to === '/') return pathname === '/' && !hash;
    if (to.startsWith('/#')) return pathname === '/' && hash === to.slice(1);
    return pathname === to;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF4EC]/90 backdrop-blur border-b border-[#EADFCF]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#B93826] flex items-center justify-center shadow-sm">
            <Drumstick className="w-5 h-5 text-[#FAF4EC]" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <div className="font-serif font-bold text-[#2A1A14] text-lg">Fresh Cluck</div>
            <div className="text-[10px] tracking-[0.18em] text-[#7B5A48] font-medium">FARM FRESH DAILY</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className={`text-[15px] transition-colors ${
                isActive(n.to)
                  ? 'text-[#B93826] font-semibold'
                  : 'text-[#3B2416] hover:text-[#B93826]'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#EADFCF] bg-white text-[#3B2416] text-sm hover:border-[#B93826]/40 transition-colors">
            <Languages className="w-4 h-4 text-[#B93826]" />
            <span className="font-medium">EN</span>
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 bg-[#B93826] hover:bg-[#A02E1F] text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cart</span>
            {totalQty > 0 && (
              <span className="bg-white text-[#B93826] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalQty % 1 === 0 ? totalQty : totalQty.toFixed(1)}
              </span>
            )}
          </button>
          <button
            className="md:hidden p-2 text-[#3B2416]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#EADFCF] bg-[#FAF4EC]">
          <div className="px-5 py-3 flex flex-col gap-3">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                onClick={() => setMobileOpen(false)}
                className={`text-[15px] ${
                  isActive(n.to) ? 'text-[#B93826] font-semibold' : 'text-[#3B2416]'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
