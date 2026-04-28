import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Languages, Download } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../lib/i18n';
import InstallAppDialog from './InstallAppDialog';

const Navbar = () => {
  const { items, setIsOpen } = useCart();
  const itemCount = items.length;
  const { isAdmin } = useAuth();
  const { lang, setLang, t } = useI18n();
  const { pathname, hash } = useLocation();
  const [installOpen, setInstallOpen] = useState(false);

  const NAV = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.shop'), to: '/#shop' },
    { label: t('nav.todays_price'), to: '/#price' },
    { label: t('nav.visit'), to: '/#visit' },
    {
      label: isAdmin ? t('nav.admin') : t('nav.admin_login'),
      to: isAdmin ? '/admin' : '/auth',
    },
    { label: t('nav.rider'), to: '/rider' },
  ];

  const isActive = (to) => {
    if (to === '/') return pathname === '/' && !hash;
    if (to.startsWith('/#')) return pathname === '/' && hash === to.slice(1);
    return pathname === to;
  };

  const toggleLang = () => setLang(lang === 'en' ? 'hi' : 'en');

  return (
    <header className="sticky top-0 z-40 bg-[#FAF4EC]/95 backdrop-blur border-b border-[#EADFCF]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#FAF4EC] border border-[#EADFCF] flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/logo.png" alt="ChickenCrew" className="w-8 h-8 md:w-9 md:h-9 object-contain" />
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
              key={n.to + n.label}
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
          {/* Get App button */}
          <button
            onClick={() => setInstallOpen(true)}
            data-testid="navbar-get-app-btn"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#EADFCF] bg-white text-[#3B2416] text-sm hover:border-[#B93826]/40 hover:text-[#B93826] transition-colors"
          >
            <Download className="w-4 h-4 text-[#B93826]" />
            <span className="font-medium">{t('nav.get_app')}</span>
          </button>

          {/* Language toggle (works) */}
          <button
            onClick={toggleLang}
            data-testid="navbar-lang-toggle"
            aria-label="Toggle language"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#EADFCF] bg-white text-[#3B2416] text-sm hover:border-[#B93826]/40 transition-colors"
          >
            <Languages className="w-4 h-4 text-[#B93826]" />
            <span className="font-medium">{lang === 'en' ? 'EN' : 'हिं'}</span>
          </button>

          {/* Cart */}
          <button
            onClick={() => setIsOpen(true)}
            data-testid="navbar-cart-btn"
            className="flex items-center gap-2 bg-[#B93826] hover:bg-[#A02E1F] text-white px-3 md:px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden xs:inline">{t('nav.cart')}</span>
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
          {/* Get App pill (mobile prominence) */}
          <button
            onClick={() => setInstallOpen(true)}
            data-testid="navbar-get-app-btn-mobile"
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-[#B93826]/10 text-[#B93826] border border-[#B93826]/30"
          >
            <Download className="w-3.5 h-3.5" /> {t('nav.get_app')}
          </button>
          {NAV.map((n) => (
            <Link
              key={n.to + n.label}
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

      <InstallAppDialog open={installOpen} onClose={() => setInstallOpen(false)} />
    </header>
  );
};

export default Navbar;
