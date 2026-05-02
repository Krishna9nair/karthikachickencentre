import React from 'react';
import { Leaf, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { useT } from '../lib/i18n';

// WhyChooseUs — Trust-building section between Shop and Reviews.
// 4 simple value props with icons. Light grey accent background.
const WhyChooseUs = () => {
  const t = useT();

  const items = [
    { Icon: Leaf, title: t('why.fresh_title'), desc: t('why.fresh_desc') },
    { Icon: ShieldCheck, title: t('why.hygiene_title'), desc: t('why.hygiene_desc') },
    { Icon: Truck, title: t('why.fast_title'), desc: t('why.fast_desc') },
    { Icon: Wallet, title: t('why.pay_title'), desc: t('why.pay_desc') },
  ];

  return (
    <section
      id="why"
      data-testid="why-section"
      className="bg-[#F5F5F5] py-12 md:py-20"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-8 md:mb-12">
          <div className="text-[11px] tracking-[0.25em] font-bold text-[#D32F2F]">
            {t('why.eyebrow')}
          </div>
          <h2 className="mt-2 font-bold text-3xl md:text-4xl text-[#212121] tracking-tight">
            {t('why.title')}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {items.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-xl border border-[#E0E0E0] p-5 md:p-6 hover:border-[#D32F2F]/40 hover:shadow-md transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-[#FFEBEE] flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-[#D32F2F]" strokeWidth={2.2} />
              </div>
              <h3 className="font-bold text-[#212121] text-[16px] leading-tight">{title}</h3>
              <p className="mt-1.5 text-sm text-[#616161] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
