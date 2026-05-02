import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Languages, Download, User, ShoppingBag, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useI18n } from '../lib/i18n';
import useIsInstalledApp from '../lib/useIsInstalledApp';
import InstallAppDialog from './InstallAppDialog';

const Navbar = () => {
  const { items, setIsOpen } = useCart();
  const itemCount = items.length;
  const { isAdmin } = useAuth();
  const { user: customer, signIn, signOut } = useCustomerAuth();
  const { lang, setLang, t } = useI18n();
  const { pathname, hash } = useLocation();
  const [installOpen, setInstallOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  // Hide the "Get App" CTA when already running as an installed PWA / native APK.
  const installed = useIsInstalledApp();

  const NAV = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.shop'), to: '/#shop' },
    { label: t('nav.todays_price'), to: '/#price' },
    { label: t('nav.visit'), to: '/#visit' },
    // Only show the Admin link if the user is actually an admin. We
    // deliberately do NOT expose a "Sign in" link to the public nav —
    // customers don't have accounts, and hiding the route keeps it
    // obscure from casual visitors. Admins bookmark /auth directly.
    ...(isAdmin ? [{ label: t('nav.admin'), to: '/admin' }] : []),
    { label: t('nav.rider'), to: '/rider' },
  ];

  const isActive = (to) => {
    if (to === '/') return pathname === '/' && !hash;
    if (to.startsWith('/#')) return pathname === '/' && hash === to.slice(1);
    return pathname === to;
  };

  const toggleLang = () => setLang(lang === 'en' ? 'hi' : 'en');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E0E0E0]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border border-[#E0E0E0] flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/logo.png" alt="ChickenCrew" className="w-8 h-8 md:w-9 md:h-9 object-contain" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-bold text-[#212121] text-base md:text-lg truncate tracking-tight">
              ChickenCrew
            </div>
            <div className="text-[9px] md:text-[10px] tracking-[0.18em] text-[#616161] font-medium">
              FARM FRESH DAILY
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((n) => (
            <Link
              key={n.to + n.label}
              to={n.to}
              className={`text-sm transition-colors whitespace-nowrap ${
                isActive(n.to)
                  ? 'text-[#D32F2F] font-bold'
                  : 'text-[#212121] hover:text-[#D32F2F] font-medium'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Get App button — hidden once the app is installed */}
          {!installed && (
            <button
              onClick={() => setInstallOpen(true)}
              data-testid="navbar-get-app-btn"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0E0E0] bg-white text-[#212121] text-sm hover:border-[#D32F2F] hover:text-[#D32F2F] transition-colors"
            >
              <Download className="w-4 h-4 text-[#D32F2F]" />
              <span className="font-medium">{t('nav.get_app')}</span>
            </button>
          )}

          {/* Language toggle (works) */}
          <button
            onClick={toggleLang}
            data-testid="navbar-lang-toggle"
            aria-label="Toggle language"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0E0E0] bg-white text-[#212121] text-sm hover:border-[#D32F2F] transition-colors"
          >
            <Languages className="w-4 h-4 text-[#D32F2F]" />
            <span className="font-medium">{lang === 'en' ? 'EN' : 'हिं'}</span>
          </button>

          {/* Customer account */}
          {customer ? (
            <div className="relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
                data-testid="navbar-account-btn"
                aria-label="My account"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[#E0E0E0] bg-white hover:border-[#D32F2F] transition-colors"
              >
                {customer.picture ? (
                  <img src={customer.picture} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-5 h-5 text-[#D32F2F]" />
                )}
                <span className="hidden lg:inline text-sm font-medium text-[#212121] max-w-[120px] truncate">
                  {customer.name?.split(' ')[0] || 'You'}
                </span>
              </button>
              {accountOpen && (
                <div
                  data-testid="navbar-account-menu"
                  className="absolute right-0 top-[calc(100%+6px)] w-56 bg-white border border-[#E0E0E0] rounded-lg shadow-lg overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-[#F5F5F5]">
                    <div className="text-sm font-bold text-[#212121] truncate">{customer.name || 'Welcome'}</div>
                    <div className="text-xs text-[#616161] truncate">{customer.email}</div>
                  </div>
                  <Link
                    to="/profile"
                    data-testid="navbar-profile-link"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#212121] hover:bg-[#FFEBEE] hover:text-[#D32F2F]"
                  >
                    <User className="w-4 h-4" /> My Profile
                  </Link>
                  <Link
                    to="/orders"
                    data-testid="navbar-orders-link"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#212121] hover:bg-[#FFEBEE] hover:text-[#D32F2F]"
                  >
                    <ShoppingBag className="w-4 h-4" /> My Orders
                  </Link>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); signOut(); setAccountOpen(false); }}
                    data-testid="navbar-signout-btn"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#212121] hover:bg-[#FFEBEE] hover:text-[#D32F2F] border-t border-[#F5F5F5]"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              data-testid="navbar-signin-btn"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0E0E0] bg-white text-[#212121] text-sm hover:border-[#D32F2F] hover:text-[#D32F2F] transition-colors"
            >
              <User className="w-4 h-4 text-[#D32F2F]" />
              <span className="font-medium">Sign in</span>
            </Link>
          )}

          {/* Cart */}
          <button
            onClick={() => setIsOpen(true)}
            data-testid="navbar-cart-btn"
            className="flex items-center gap-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-3 md:px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden xs:inline">{t('nav.cart')}</span>
            {itemCount > 0 && (
              <span className="bg-white text-[#D32F2F] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile horizontal nav bar */}
      <nav className="md:hidden border-t border-[#E0E0E0] bg-white">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-4 py-2">
          {/* Get App pill (mobile prominence) — hidden when already installed */}
          {!installed && (
            <button
              onClick={() => setInstallOpen(true)}
              data-testid="navbar-get-app-btn-mobile"
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap bg-[#FFEBEE] text-[#D32F2F] border border-[#FFCDD2]"
            >
              <Download className="w-3.5 h-3.5" /> {t('nav.get_app')}
            </button>
          )}
          {NAV.map((n) => (
            <Link
              key={n.to + n.label}
              to={n.to}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive(n.to)
                  ? 'bg-[#D32F2F] text-white shadow-sm'
                  : 'bg-white text-[#212121] border border-[#E0E0E0] hover:border-[#D32F2F]'
              }`}
            >
              {n.label}
            </Link>
          ))}
          {/* Mobile sign-in / profile pill */}
          {customer ? (
            <Link
              to="/profile"
              data-testid="navbar-mobile-profile-link"
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap bg-white text-[#212121] border border-[#E0E0E0] hover:border-[#D32F2F]"
            >
              <User className="w-3.5 h-3.5 text-[#D32F2F]" /> {customer.name?.split(' ')[0] || 'Account'}
            </Link>
          ) : (
            <Link
              to="/auth"
              data-testid="navbar-mobile-signin-btn"
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap bg-white text-[#212121] border border-[#E0E0E0] hover:border-[#D32F2F]"
            >
              <User className="w-3.5 h-3.5 text-[#D32F2F]" /> Sign in
            </Link>
          )}
        </div>
      </nav>

      <InstallAppDialog open={installOpen} onClose={() => setInstallOpen(false)} />
    </header>
  );
};

export default Navbar;
