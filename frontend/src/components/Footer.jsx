import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Drumstick } from 'lucide-react';
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
    <footer className="bg-[#F3EADB] border-t border-[#EADFCF]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-14 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#B93826] flex items-center justify-center">
              <Drumstick className="w-5 h-5 text-[#FAF4EC]" />
            </div>
            <div className="font-serif font-bold text-xl text-[#2A1A14]">
              {shop.shop_name || 'ChickenCrew'}
            </div>
          </div>
          <p className="mt-4 text-sm text-[#6B4E3D] max-w-xs leading-relaxed">
            Locally sourced, hand-cleaned chicken delivered to your door. Cluck-worthy quality, every day.
          </p>
        </div>

        <div>
          <h4 className="font-serif text-lg font-bold text-[#2A1A14]">Visit Us</h4>
          <div className="mt-4 space-y-3 text-sm text-[#3B2416]">
            {shop.address && (
              <div className="flex gap-3 items-start">
                <MapPin className="w-4 h-4 mt-0.5 text-[#B93826] shrink-0" />
                <span>{shop.address}</span>
              </div>
            )}
            {shop.contact_phone && (
              <div className="flex gap-3 items-center">
                <Phone className="w-4 h-4 text-[#B93826] shrink-0" />
                <a href={`tel:${shop.contact_phone}`} className="hover:text-[#B93826]">
                  {shop.contact_phone}
                </a>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-serif text-lg font-bold text-[#2A1A14]">Open hours</h4>
          <div className="mt-4 space-y-2 text-sm text-[#3B2416]">
            <div>Mon – Sat: 7:00 AM – 9:00 PM</div>
            <div>Sunday: 7:00 AM – 9:00 PM</div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#EADFCF] py-5">
        <div className="max-w-7xl mx-auto px-5 md:px-8 text-center text-xs text-[#7B5A48]">
          © {new Date().getFullYear()} {shop.shop_name || 'ChickenCrew'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
