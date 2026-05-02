import React from 'react';
import { ShieldCheck, Snowflake, Truck, BadgeCheck } from 'lucide-react';
import { useT } from '../lib/i18n';

// Hero — Swiggy/Licious style. Clean white background, deep red CTAs,
// dark grey typography. Primary headline + subtext + Order Now CTA +
// 4 trust badges. Hero image is hidden on mobile to keep LCP fast.
const Hero = () => {
  const t = useT();
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const badges = [
    { Icon: ShieldCheck, label: t('trust.hygienic') },
    { Icon: Snowflake, label: t('trust.never_frozen') },
    { Icon: Truck, label: t('trust.same_day') },
    { Icon: BadgeCheck, label: t('trust.fssai') },
  ];

  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden bg-white border-b border-[#E0E0E0]"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-20 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFEBEE] border border-[#FFCDD2]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F] animate-pulse" />
            <span className="text-[11px] tracking-[0.18em] font-semibold text-[#D32F2F]">
              {t('hero.eyebrow_long')}
            </span>
          </div>

          <h1
            data-testid="hero-title"
            className="mt-4 md:mt-6 font-bold text-[#212121] leading-[1.05] text-4xl sm:text-5xl lg:text-6xl tracking-tight"
          >
            {t('hero.title_a')}{' '}
            <span className="text-[#D32F2F]">{t('hero.title_b')}</span>
          </h1>

          <p className="mt-4 md:mt-5 text-[15px] md:text-[17px] text-[#616161] max-w-md leading-relaxed">
            {t('hero.subtitle_long')}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => scrollTo('shop')}
              data-testid="hero-order-now-btn"
              className="px-7 py-3.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-[0.98] text-white font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {t('hero.cta_primary')}
            </button>
            <button
              onClick={() => scrollTo('price')}
              data-testid="hero-see-price-btn"
              className="px-7 py-3.5 rounded-lg border border-[#E0E0E0] hover:border-[#D32F2F] hover:text-[#D32F2F] text-[#212121] font-semibold bg-white transition-colors"
            >
              {t('hero.cta_secondary')}
            </button>
          </div>

          {/* Trust badges row */}
          <div
            className="mt-7 md:mt-9 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl"
            data-testid="hero-trust-badges"
          >
            {badges.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-lg bg-[#F5F5F5] border border-[#E0E0E0] px-3 py-2.5"
              >
                <Icon className="w-4 h-4 text-[#D32F2F] shrink-0" strokeWidth={2.2} />
                <span className="text-[12px] font-medium text-[#212121] leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero image — hidden on mobile to protect LCP */}
        <div className="relative max-w-sm md:max-w-none mx-auto md:mx-0 w-full hidden md:block">
          <div className="absolute -inset-6 bg-[#FFEBEE] rounded-3xl blur-2xl opacity-60" />
          <div className="relative rounded-2xl bg-white border border-[#E0E0E0] shadow-sm overflow-hidden">
            <div className="p-4">
              <img
                src="/hero-rooster-800.webp"
                srcSet="/hero-rooster-480.webp 480w, /hero-rooster-800.webp 800w"
                sizes="(max-width: 1024px) 50vw, 40vw"
                alt="Fresh chicken delivery illustration"
                width="800"
                height="1067"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-contain max-h-[360px] md:max-h-[440px]"
                style={{ aspectRatio: '3 / 4' }}
              />
            </div>
          </div>
          <div className="absolute -bottom-3 left-6 md:left-12 bg-[#D32F2F] text-white font-bold text-xs md:text-sm px-4 py-2 rounded-lg shadow-lg">
            {t('hero.open_today')}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
