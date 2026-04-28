import React, { useEffect, useState } from 'react';
import { MapPin, Phone, MessageCircle, Clock, Navigation } from 'lucide-react';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';

const FALLBACK = {
  shop_name: 'Karthika Chicken Centre',
  address: 'Trimurti Nagar, Dombivli East, Thane, Maharashtra 421201',
  contact_phone: '8928370724',
};

const VisitShop = () => {
  const t = useT();
  const [shop, setShop] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/public/shop');
        if (!cancelled && data) setShop({ ...FALLBACK, ...data });
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const phoneDigits = (shop.contact_phone || '').replace(/\D/g, '');
  const e164 = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
  const mapsQuery = encodeURIComponent(`${shop.shop_name}, ${shop.address}`);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const embedSrc = `https://maps.google.com/maps?q=${mapsQuery}&output=embed`;
  const telHref = e164 ? `tel:+${e164}` : '#';
  const waMsg = 'Hi! I want to place an order from ChickenCrew.';
  const waHref = e164 ? `https://wa.me/${e164}?text=${encodeURIComponent(waMsg)}` : '#';

  return (
    <section id="visit" className="bg-[#FAF4EC] py-12 md:py-20" data-testid="visit-shop-section">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-8 md:mb-10">
          <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">
            {t('visit.eyebrow')}
          </div>
          <h2 className="mt-2 font-serif text-4xl md:text-5xl text-[#2A1A14]">
            {t('visit.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {/* Map */}
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block rounded-2xl overflow-hidden border-2 border-[#EADFCF] shadow-sm hover:shadow-md transition-shadow"
            data-testid="visit-map-link"
            aria-label="Open in Google Maps"
          >
            <iframe
              title="Shop location map"
              src={embedSrc}
              loading="lazy"
              className="w-full h-[260px] md:h-full md:min-h-[360px] border-0 pointer-events-none"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <span className="text-white text-xs font-medium drop-shadow">
                {t('visit.tap_for_map')}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white text-[#B93826] text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm group-hover:bg-[#B93826] group-hover:text-white transition-colors">
                <Navigation className="w-3.5 h-3.5" /> {t('visit.directions')}
              </span>
            </div>
          </a>

          {/* Info card */}
          <div className="rounded-2xl bg-white border border-[#EADFCF] p-6 md:p-8 flex flex-col">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#B93826]/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#B93826]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-xl md:text-2xl font-bold text-[#2A1A14] leading-tight">
                  {shop.shop_name}
                </div>
                <p className="mt-1 text-sm text-[#3B2416] leading-relaxed">
                  {shop.address}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 text-sm text-[#3B2416]">
              <div className="w-10 h-10 rounded-full bg-[#F3EADB] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#7B5A48]" />
              </div>
              <div>
                <div className="text-xs text-[#7B5A48]">{t('visit.hours_label')}</div>
                <div className="font-medium">{t('visit.hours_value')}</div>
              </div>
            </div>

            <div className="mt-auto pt-6 grid grid-cols-2 gap-3">
              <a
                href={telHref}
                data-testid="visit-call-btn"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] active:scale-95 text-white font-medium shadow-sm transition-all"
              >
                <Phone className="w-4 h-4" /> {t('visit.call')}
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="visit-wa-btn"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#25D366] hover:bg-[#1FBD5A] active:scale-95 text-white font-medium shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisitShop;
