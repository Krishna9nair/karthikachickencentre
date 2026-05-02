import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Store, Tag, ShoppingBag, User } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';

// BottomTabBar — Swiggy/Zomato-style fixed bottom navigation for mobile.
// Auto-hides on admin / rider / auth routes (where it would be confusing).
// Five tabs sized to fit even narrow screens (320px wide). Active tab gets
// the deep-red color from the design system.
const TABS = [
  { key: 'home',   to: '/',         label: 'Home',       Icon: Home,        isActive: (p, h) => p === '/' && (!h || h === '#') },
  { key: 'shop',   to: '/#shop',    label: 'Shop',       Icon: Store,       isActive: (p, h) => h === '#shop' },
  { key: 'price',  to: '/#price',   label: "Today's",    Icon: Tag,         isActive: (p, h) => h === '#price' },
  { key: 'orders', to: '/orders',   label: 'Orders',     Icon: ShoppingBag, isActive: (p) => p.startsWith('/orders') },
  { key: 'profile',to: '/profile',  label: 'Account',    Icon: User,        isActive: (p) => p.startsWith('/profile') || p.startsWith('/auth') },
];

// Routes where the bottom bar must not render — full-screen flows.
const HIDDEN_ROUTES = ['/admin', '/rider', '/auth'];

const BottomTabBar = () => {
  const { pathname, hash } = useLocation();
  const { user } = useCustomerAuth();

  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  return (
    <nav
      data-testid="bottom-tab-bar"
      aria-label="Primary navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E0E0E0] shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ key, to, label, Icon, isActive }) => {
          const active = isActive(pathname, hash);
          // For Account tab: show Sign in label when signed out.
          const isAccount = key === 'profile';
          const finalLabel = isAccount && !user ? 'Sign in' : label;
          // Account tab → /auth when signed-out, /profile when signed-in.
          const finalTo = isAccount && !user ? '/auth' : to;
          return (
            <li key={key}>
              <Link
                to={finalTo}
                data-testid={`bottom-tab-${key}`}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                  active ? 'text-[#D32F2F]' : 'text-[#616161] hover:text-[#212121]'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                <span className={`text-[10px] tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>
                  {finalLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
