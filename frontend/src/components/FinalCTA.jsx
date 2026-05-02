import React from 'react';
import { Phone, MessageCircle, ArrowRight } from 'lucide-react';
import { useT } from '../lib/i18n';

const WHATSAPP_PHONE = '919619417452';

// FinalCTA — Closing red banner driving final conversion before footer.
// Headline + Order Now button + WhatsApp/Call fallbacks.
const FinalCTA = () => {
  const t = useT();
  const scrollToShop = () => {
    const el = document.getElementById('shop');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const waMsg = 'Hi! I want to place an order from ChickenCrew.';
  const waHref = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waMsg)}`;

  return (
    <section
      data-testid="final-cta-section"
      className="bg-[#D32F2F] text-white"
    >
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16 text-center">
        <h2 className="font-bold text-3xl md:text-4xl tracking-tight">
          Hungry? Get fresh chicken in hours.
        </h2>
        <p className="mt-3 text-white/90 text-sm md:text-base max-w-xl mx-auto">
          Browse today's cuts, pick a 2-hour slot, pay with UPI or COD. New customers get <b>10% OFF</b>.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={scrollToShop}
            data-testid="final-cta-order-btn"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-white text-[#D32F2F] font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
          >
            {t('hero.cta_primary')} <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="final-cta-wa-btn"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#25D366] hover:bg-[#1FBD5A] text-white font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-white" /> WhatsApp
          </a>
          <a
            href={`tel:+${WHATSAPP_PHONE}`}
            data-testid="final-cta-call-btn"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border-2 border-white/40 hover:border-white text-white font-semibold transition-colors"
          >
            <Phone className="w-4 h-4" /> Call
          </a>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
