import React from 'react';
import { MapPin, Phone, Drumstick } from 'lucide-react';
import { SHOP_INFO } from '../data/mock';

const Footer = () => {
  return (
    <footer className="bg-[#F3EADB] border-t border-[#EADFCF]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-14 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#B93826] flex items-center justify-center">
              <Drumstick className="w-5 h-5 text-[#FAF4EC]" />
            </div>
            <div className="font-serif font-bold text-xl text-[#2A1A14]">
              {SHOP_INFO.name}
            </div>
          </div>
          <p className="mt-4 text-sm text-[#6B4E3D] max-w-xs leading-relaxed">
            {SHOP_INFO.about}
          </p>
        </div>

        <div>
          <h4 className="font-serif text-lg font-bold text-[#2A1A14]">Visit Us</h4>
          <div className="mt-4 space-y-3 text-sm text-[#3B2416]">
            <div className="flex gap-3 items-start">
              <MapPin className="w-4 h-4 mt-0.5 text-[#B93826] shrink-0" />
              <span>{SHOP_INFO.address}</span>
            </div>
            <div className="flex gap-3 items-center">
              <Phone className="w-4 h-4 text-[#B93826] shrink-0" />
              <a href={`tel:${SHOP_INFO.phone}`} className="hover:text-[#B93826]">
                {SHOP_INFO.phone}
              </a>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-serif text-lg font-bold text-[#2A1A14]">Open hours</h4>
          <div className="mt-4 space-y-2 text-sm text-[#3B2416]">
            <div>{SHOP_INFO.hoursWeekday}</div>
            <div>{SHOP_INFO.hoursSunday}</div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#EADFCF] py-5">
        <div className="max-w-7xl mx-auto px-5 md:px-8 text-center text-xs text-[#7B5A48]">
          © {new Date().getFullYear()} {SHOP_INFO.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
