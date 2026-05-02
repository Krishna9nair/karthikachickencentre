import React, { lazy, Suspense, useEffect, useState } from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, MessageCircle, PartyPopper } from 'lucide-react';
import { useCart } from '../context/CartContext';
import CheckoutDialog from './CheckoutDialog';
import { presetsFor, formatQty, calcSubtotal, normalizeUnit, UNIT_SHORT } from '../lib/units';

const SundayWheel = lazy(() => import('./SundayWheel'));

const WHATSAPP_PHONE = '919619417452';

// IST = UTC+5:30, no DST. Sunday in IST?
const isSundayIST = () => {
  const now = new Date();
  const istMs = now.getTime() + (now.getTimezoneOffset() + 330) * 60000;
  return new Date(istMs).getDay() === 0;
};

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQty, removeItem, subtotal } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [isSunday, setIsSunday] = useState(false);

  useEffect(() => {
    setIsSunday(isSundayIST());
  }, []);

  const waOrderLink = (() => {
    if (items.length === 0) return null;
    const lines = items
      .map((i) => `• ${i.name} — ${formatQty(i.qty, i.unit)} (₹${calcSubtotal(i.price, i.qty)})`)
      .join('\n');
    const total = subtotal.toFixed(0);
    const msg = `Hi! I want to order from ChickenCrew:\n\n${lines}\n\nTotal: ₹${total}\n\nPlease confirm availability & delivery time.`;
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
  })();

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#FFFFFF] z-50 shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D32F2F]" />
            <h3 className="font-serif text-xl font-bold text-[#212121]">Your Cart</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-[#E0E0E0] text-[#212121]"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#FFEBEE] flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7 text-[#D32F2F]" />
              </div>
              <p className="font-serif text-lg text-[#212121]">Your cart is empty</p>
              <p className="text-sm text-[#616161] mt-1">
                Add fresh cuts from today's board.
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-5 px-5 py-2 rounded-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm"
              >
                Shop today's cuts
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="bg-white border border-[#E0E0E0] rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="font-serif text-[#212121] font-semibold">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#616161] mt-0.5">
                      ₹{item.price}/{UNIT_SHORT[normalizeUnit(item.unit)]}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, +(item.qty - presetsFor(item.unit).step).toFixed(2))}
                        className="w-7 h-7 rounded-full border border-[#E0E0E0] flex items-center justify-center hover:border-[#D32F2F] text-[#212121]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-16 text-center text-[#212121]">
                        {formatQty(item.qty, item.unit)}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, +(item.qty + presetsFor(item.unit).step).toFixed(2))}
                        className="w-7 h-7 rounded-full border border-[#E0E0E0] flex items-center justify-center hover:border-[#D32F2F] text-[#212121]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif font-bold text-[#D32F2F]">
                      ₹{calcSubtotal(item.price, item.qty)}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="mt-3 text-[#616161] hover:text-[#D32F2F]"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#E0E0E0] px-5 py-4 bg-[#F5F5F5]">
            {/* Free delivery progress hint — encourages upselling */}
            {subtotal < 299 && (
              <div
                className="mb-3 rounded-lg bg-[#FFF7DA] border border-[#F0DC8A] px-3 py-2 text-[11px] text-[#212121]"
                data-testid="cart-free-delivery-hint"
              >
                Add <b>₹{Math.max(0, 299 - subtotal).toFixed(0)} more</b> for <b>FREE delivery</b> · otherwise ₹20 fee applies
              </div>
            )}
            {subtotal >= 299 && (
              <div
                className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800 font-semibold flex items-center gap-1"
                data-testid="cart-free-delivery-active"
              >
                ✓ FREE delivery on this order
              </div>
            )}
            {isSunday && (
              <button
                type="button"
                onClick={() => setWheelOpen(true)}
                data-testid="cart-sunday-wheel-btn"
                className="w-full mb-3 py-2 rounded-full bg-gradient-to-r from-[#FFF7DA] to-[#FFE7B0] border border-[#F0DC8A] text-[#212121] text-xs font-bold flex items-center justify-center gap-2 hover:brightness-105"
              >
                <PartyPopper className="w-4 h-4 text-[#D32F2F]" />
                Sunday Spin: win up to 15% off · TAP TO PLAY
              </button>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#616161]">Subtotal</span>
              <span className="font-serif text-xl font-bold text-[#212121]">
                ₹{subtotal.toFixed(0)}
              </span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              data-testid="cart-checkout-btn"
              className="w-full py-3 rounded-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-medium shadow-sm transition-colors"
            >
              Checkout & Pay
            </button>
            <a
              href={waOrderLink}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="cart-whatsapp-btn"
              className="mt-2 w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-[#25D366] hover:bg-[#1FBD5A] text-white font-medium shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-white" /> Order on WhatsApp
            </a>
            <p className="text-[11px] text-center text-[#616161] mt-2">
              UPI, Card, COD or just WhatsApp us — your choice.
            </p>
          </div>
        )}
      </aside>

      <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      {wheelOpen && (
        <Suspense fallback={null}>
          <SundayWheel open={wheelOpen} onClose={() => setWheelOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default CartDrawer;
