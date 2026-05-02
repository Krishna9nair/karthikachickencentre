import React, { useEffect, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { api } from '../lib/api';

const Footer = () => {
  const [shop, setShop] = useState({
    shop_name: 'ChickenCrew',
    address: '',
    contact_phone: '',
  });

  useEffect(() => {
    api.get('/public/shop').then((r) => setShop(r.data || {})).catch(() => {});
  }, []);

  return (
    <footer className="bg-[#212121] text-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white border border-white/20 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="ChickenCrew" className="w-9 h-9 object-contain" />
            </div>
            <div className="font-bold text-xl tracking-tight">
              {shop.shop_name || 'ChickenCrew'}
            </div>
          </div>
          <p className="mt-4 text-sm text-white/70 max-w-xs leading-relaxed">
            Locally sourced, hand-cleaned chicken delivered to your door. Cluck-worthy quality, every day.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-base text-white">Visit Us</h4>
          <div className="mt-4 space-y-3 text-sm text-white/80">
            {shop.address && (
              <div className="flex gap-3 items-start">
                <MapPin className="w-4 h-4 mt-0.5 text-[#D32F2F] shrink-0" />
                <span>{shop.address}</span>
              </div>
            )}
            {shop.contact_phone && (
              <div className="flex gap-3 items-center">
                <Phone className="w-4 h-4 text-[#D32F2F] shrink-0" />
                <a href={`tel:${shop.contact_phone}`} className="hover:text-white">
                  {shop.contact_phone}
                </a>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-base text-white">Open hours</h4>
          <div className="mt-4 space-y-2 text-sm text-white/80">
            <div>Mon – Sat: 7:00 AM – 9:00 PM</div>
            <div>Sunday: 7:00 AM – 9:00 PM</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <div className="max-w-7xl mx-auto px-5 md:px-8 text-center text-xs text-white/60">
          © {new Date().getFullYear()} {shop.shop_name || 'ChickenCrew'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
