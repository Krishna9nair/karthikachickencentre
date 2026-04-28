import React from 'react';
import { Sparkles } from 'lucide-react';
import { useT } from '../lib/i18n';

const Hero = () => {
  const t = useT();
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-[#FAF4EC]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-20 grid md:grid-cols-2 gap-8 md:gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F4E4D1] border border-[#EAD1B5]">
            <Sparkles className="w-3.5 h-3.5 text-[#B93826]" />
            <span className="text-[11px] tracking-[0.2em] font-semibold text-[#B93826]">
              {t('hero.eyebrow_long')}
            </span>
          </div>

          <h1 className="mt-4 md:mt-6 font-serif text-[#2A1A14] leading-[1.05] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            {t('hero.title_a')}
            <br />
            <span className="text-[#B93826] italic">{t('hero.title_b')}</span>
          </h1>

          <p className="mt-4 md:mt-6 text-[15px] md:text-[17px] text-[#6B4E3D] max-w-md leading-relaxed">
            {t('hero.subtitle_long')}
          </p>

          <div className="mt-5 md:mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => scrollTo('shop')}
              className="px-6 py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium shadow-sm transition-colors"
            >
              {t('hero.cta_primary')}
            </button>
            <button
              onClick={() => scrollTo('price')}
              className="px-6 py-3 rounded-full border border-[#3B2416]/20 hover:border-[#B93826] text-[#3B2416] font-medium bg-white transition-colors"
            >
              {t('hero.cta_secondary')}
            </button>
          </div>

          <div className="mt-6 md:mt-12 pt-5 md:pt-6 border-t border-[#EADFCF] grid grid-cols-3 gap-4 md:gap-6 max-w-md">
            <div>
              <div className="font-serif text-xl md:text-2xl font-bold text-[#B93826]">100%</div>
              <div className="text-[11px] md:text-xs text-[#7B5A48] mt-1">{t('hero.stat_local')}</div>
            </div>
            <div>
              <div className="font-serif text-xl md:text-2xl font-bold text-[#B93826]">Daily</div>
              <div className="text-[11px] md:text-xs text-[#7B5A48] mt-1">{t('hero.stat_fresh')}</div>
            </div>
            <div>
              <div className="font-serif text-xl md:text-2xl font-bold text-[#B93826]">UPI</div>
              <div className="text-[11px] md:text-xs text-[#7B5A48] mt-1">{t('hero.stat_upi')}</div>
            </div>
          </div>
        </div>

        <div className="relative max-w-xs sm:max-w-sm md:max-w-none mx-auto md:mx-0 w-full">
          <div className="absolute -inset-6 bg-gradient-to-br from-[#F5D4C0]/40 via-[#FAF4EC] to-[#FAF4EC] rounded-3xl blur-2xl" />
          <div className="relative rounded-2xl bg-[#FFF8EE] border-2 border-[#C47B4A] shadow-lg overflow-hidden">
            <div className="m-2 md:m-3 border-[1.5px] border-[#C47B4A] rounded-xl p-3 md:p-4 relative">
              <img
                src="https://karthikachickencentre.shop/assets/hero-rooster-d4bxhC-A.jpg"
                alt="Fresh farm rooster illustration"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="w-full h-auto object-contain max-h-[260px] sm:max-h-[320px] md:max-h-none"
                onError={(e) => {
                  e.target.src =
                    'https://images.pexels.com/photos/27202653/pexels-photo-27202653.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=700';
                }}
              />
            </div>
          </div>
          <div className="absolute -bottom-3 md:-bottom-4 left-6 md:left-16 bg-[#F3B43E] text-[#3B2416] font-serif font-bold text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-lg shadow-md rotate-[-4deg]">
            {t('hero.open_today')}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
