import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Languages, Drumstick } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { items, setIsOpen } = useCart();
  const itemCount = items.length;
  const { isAdmin } = useAuth();
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
    <header className="sticky top-0 z-40 bg-[#FAF4EC]/95 backdrop-blur border-b border-[#EADFCF]">
      {/* Top row: logo + utilities */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#B93826] flex items-center justify-center shadow-sm shrink-0">
            <Drumstick className="w-5 h-5 text-[#FAF4EC]" strokeWidth={2.25} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-serif font-bold text-[#2A1A14] text-base md:text-lg truncate">
              ChickenCrew
            </div>
            <div className="text-[9px] md:text-[10px] tracking-[0.18em] text-[#7B5A48] font-medium">
              FARM FRESH DAILY
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className={`text-[15px] transition-colors whitespace-nowrap ${
                isActive(n.to)
                  ? 'text-[#B93826] font-semibold'
                  : 'text-[#3B2416] hover:text-[#B93826]'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#EADFCF] bg-white text-[#3B2416] text-sm hover:border-[#B93826]/40 transition-colors">
            <Languages className="w-4 h-4 text-[#B93826]" />
            <span className="font-medium">EN</span>
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 bg-[#B93826] hover:bg-[#A02E1F] text-white px-3 md:px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden xs:inline">Cart</span>
            {itemCount > 0 && (
              <span className="bg-white text-[#B93826] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile horizontal nav bar */}
      <nav className="md:hidden border-t border-[#EADFCF] bg-[#FAF4EC]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-4 py-2">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive(n.to)
                  ? 'bg-[#B93826] text-white shadow-sm'
                  : 'bg-white text-[#3B2416] border border-[#EADFCF] hover:border-[#B93826]/40'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
