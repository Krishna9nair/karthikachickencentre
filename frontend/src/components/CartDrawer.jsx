import React, { useState } from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import CheckoutDialog from './CheckoutDialog';

const WHATSAPP_PHONE = '918928370724';

const isPiece = (item) => (item.unit || 'kg').toLowerCase() === 'piece';
const stepFor = (item) => (isPiece(item) ? 1 : 0.25);
const fmtQty = (item) => {
  if (isPiece(item)) return `${item.qty} pc${item.qty === 1 ? '' : 's'}`;
  if (item.qty < 1) return `${(item.qty * 1000).toFixed(0)}g`;
  return `${item.qty} kg`;
};

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQty, removeItem, subtotal } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const waOrderLink = (() => {
    if (items.length === 0) return null;
    const lines = items
      .map(
        (i) =>
          `• ${i.name} — ${fmtQty(i)} (₹${(i.price * i.qty).toFixed(0)})`
      )
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
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#FAF4EC] z-50 shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EADFCF]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#B93826]" />
            <h3 className="font-serif text-xl font-bold text-[#2A1A14]">Your Cart</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-[#EADFCF] text-[#3B2416]"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#F4E4D1] flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7 text-[#B93826]" />
              </div>
              <p className="font-serif text-lg text-[#3B2416]">Your cart is empty</p>
              <p className="text-sm text-[#7B5A48] mt-1">
                Add fresh cuts from today's board.
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-5 px-5 py-2 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm"
              >
                Shop today's cuts
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="bg-white border border-[#EADFCF] rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="font-serif text-[#2A1A14] font-semibold">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#7B5A48] mt-0.5">
                      ₹{item.price}/{item.unit || 'kg'}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, +(item.qty - stepFor(item)).toFixed(2))}
                        className="w-7 h-7 rounded-full border border-[#EADFCF] flex items-center justify-center hover:border-[#B93826] text-[#3B2416]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-16 text-center text-[#2A1A14]">
                        {fmtQty(item)}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, +(item.qty + stepFor(item)).toFixed(2))}
                        className="w-7 h-7 rounded-full border border-[#EADFCF] flex items-center justify-center hover:border-[#B93826] text-[#3B2416]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif font-bold text-[#B93826]">
                      ₹{(item.price * item.qty).toFixed(0)}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="mt-3 text-[#7B5A48] hover:text-[#B93826]"
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
          <div className="border-t border-[#EADFCF] px-5 py-4 bg-[#F3EADB]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#7B5A48]">Subtotal</span>
              <span className="font-serif text-xl font-bold text-[#2A1A14]">
                ₹{subtotal.toFixed(0)}
              </span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              data-testid="cart-checkout-btn"
              className="w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium shadow-sm transition-colors"
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
            <p className="text-[11px] text-center text-[#7B5A48] mt-2">
              UPI, Card, COD or just WhatsApp us — your choice.
            </p>
          </div>
        )}
      </aside>

      <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
};

export default CartDrawer;
