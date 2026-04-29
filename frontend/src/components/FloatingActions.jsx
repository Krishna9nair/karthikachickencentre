import React, { useEffect, useState } from 'react';
import { MessageCircle, Phone, X } from 'lucide-react';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';

// Hardcoded fallback so the buttons still appear even if the shop endpoint is unreachable.
const FALLBACK_PHONE = '9619417452';

// Floating contact stack: WhatsApp + Call. Auto-hides when the cart drawer
// or checkout dialog is open so it doesn't overlap critical CTAs.
const FloatingActions = () => {
  const { isOpen: cartOpen } = useCart();
  const [phone, setPhone] = useState(null);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [showTip, setShowTip] = useState(false);

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
    const dismissed = localStorage.getItem('cc_wa_tip_dismissed');
    if (!dismissed) setTimeout(() => setShowTip(true), 4000);
    setTipDismissed(!!dismissed);
    return () => { cancelled = true; };
  }, []);

  if (!phone || cartOpen) return null;

  const waMsg = 'Hi! I want to place an order from ChickenCrew.';
  const waHref = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`;
  const telHref = `tel:+${phone}`;

  const dismissTip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem('cc_wa_tip_dismissed', '1');
    setShowTip(false);
    setTipDismissed(true);
  };

  return (
    <div
      className="fixed bottom-5 right-5 z-[55] flex flex-col items-end gap-3"
      data-testid="floating-actions"
    >
      {showTip && !tipDismissed && (
        <div className="bg-white border border-[#EADFCF] rounded-2xl shadow-lg px-4 py-3 max-w-[240px] text-sm text-[#2A1A14] relative">
          <button
            onClick={dismissTip}
            aria-label="Dismiss"
            className="absolute top-1.5 right-1.5 p-1 rounded-full text-[#7B5A48] hover:bg-[#F3EADB]"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="font-medium pr-3">Need help? Tap to chat or call.</div>
          <div className="text-xs text-[#7B5A48] mt-0.5">Reply usually within 5 min</div>
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-[#EADFCF] rotate-45" />
        </div>
      )}

      {/* Call */}
      <a
        href={telHref}
        aria-label="Call shop"
        title="Call shop"
        data-testid="floating-call-btn"
        className="w-12 h-12 rounded-full bg-[#B93826] hover:bg-[#A02E1F] active:scale-95 shadow-lg flex items-center justify-center transition-all"
      >
        <Phone className="w-5 h-5 text-white" strokeWidth={2.2} />
      </a>

      {/* WhatsApp */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
        data-testid="whatsapp-fab-btn"
        className="group w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1FBD5A] active:scale-95 shadow-lg flex items-center justify-center transition-all relative"
        onClick={() => {
          localStorage.setItem('cc_wa_tip_dismissed', '1');
          setShowTip(false);
        }}
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping pointer-events-none" />
        <MessageCircle className="w-7 h-7 text-white fill-white relative" strokeWidth={1.5} />
      </a>
    </div>
  );
};

export default FloatingActions;
