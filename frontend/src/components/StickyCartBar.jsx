import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useT } from '../lib/i18n';

// StickyCartBar — Swiggy/Zomato style sticky bottom bar shown on mobile
// whenever the cart has items. Tapping it opens the cart drawer for
// quick checkout. Hidden on desktop (drawer + navbar cart button suffice).
const StickyCartBar = () => {
  const { items, subtotal, setIsOpen, isOpen } = useCart();
  const t = useT();
  const count = items.length;

  if (count === 0 || isOpen) return null;

  return (
    <div
      className="md:hidden fixed bottom-[64px] inset-x-0 z-40 px-3 pb-3 pt-2 pointer-events-none"
      data-testid="sticky-cart-bar"
    >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="sticky-cart-bar-btn"
        className="pointer-events-auto w-full bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-[0.99] text-white rounded-xl shadow-2xl flex items-center justify-between px-4 py-3 transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-white text-[#D32F2F] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {count}
            </span>
          </div>
          <div className="text-left min-w-0">
            <div className="text-[13px] font-semibold leading-tight truncate">
              {count} item{count > 1 ? 's' : ''} · ₹{subtotal.toFixed(0)}
            </div>
            <div className="text-[10px] opacity-90 leading-tight">
              {t('nav.cart')} · Tap to checkout
            </div>
          </div>
        </div>
        <span className="text-sm font-bold whitespace-nowrap">View Cart →</span>
      </button>
    </div>
  );
};

export default StickyCartBar;
