import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Phone } from 'lucide-react';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';

// Hardcoded fallback so the buttons still appear even if the shop endpoint is unreachable.
const FALLBACK_PHONE = '9619417452';

// Routes where the floating Call/WhatsApp stack should NOT render — e.g.
// auth flows where it would overlap form fields.
const HIDDEN_ROUTES = ['/auth', '/admin', '/rider'];

// Floating contact stack: WhatsApp + Call. Auto-hides when the cart drawer
// or checkout dialog is open, and on auth/admin/rider routes.
const FloatingActions = () => {
  const { isOpen: cartOpen } = useCart();
  const { pathname } = useLocation();
  const [phone, setPhone] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const sanitize = (raw) => {
      const digits = (raw || '').replace(/\D/g, '');
      if (!digits) return null;
      return digits.length === 10 ? `91${digits}` : digits;
    };
    setPhone(sanitize(FALLBACK_PHONE));
    (async () => {
      try {
        const { data } = await api.get('/public/shop');
        if (cancelled) return;
        const e164 = sanitize(data?.contact_phone);
        if (e164) setPhone(e164);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!phone || cartOpen) return null;
  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  const waMsg = 'Hi! I want to place an order from ChickenCrew.';
  const waHref = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`;
  const telHref = `tel:+${phone}`;

  return (
    <div
      // Sit above the BottomTabBar (~56px) so it doesn't overlap mobile nav.
      className="fixed bottom-20 md:bottom-5 right-4 md:right-5 z-[55] flex flex-col items-end gap-3"
      data-testid="floating-actions"
    >
      {/* Call */}
      <a
        href={telHref}
        aria-label="Call shop"
        title="Call shop"
        data-testid="floating-call-btn"
        className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-95 shadow-lg flex items-center justify-center transition-all"
      >
        <Phone className="w-4 h-4 md:w-5 md:h-5 text-white" strokeWidth={2.2} />
      </a>

      {/* WhatsApp */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
        data-testid="whatsapp-fab-btn"
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#25D366] hover:bg-[#1FBD5A] active:scale-95 shadow-lg flex items-center justify-center transition-all"
      >
        <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-white fill-white" strokeWidth={1.5} />
      </a>
    </div>
  );
};

export default FloatingActions;
