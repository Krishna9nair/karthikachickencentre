import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../lib/api';

const TodayPrice = () => {
  const [products, setProducts] = useState([]);
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  useEffect(() => {
    api.get('/public/products').then((r) => setProducts(r.data.products || [])).catch(() => {});
  }, []);

  return (
    <section id="price" className="bg-[#FAF4EC] py-10 md:py-20">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="text-center mb-6 md:mb-10">
          <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">
            DAILY BOARD
          </div>
          <h2 className="mt-2 font-serif text-4xl md:text-5xl text-[#2A1A14]">Today's Price</h2>
          <div className="mt-2 text-sm text-[#7B5A48]">{today}</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-[#3A1F13] to-[#2A140A] border-2 border-[#C47B4A] shadow-xl p-4 md:p-10 relative overflow-hidden">
          <div className="absolute inset-2 border border-[#C47B4A]/40 rounded-xl pointer-events-none" />

          <div className="flex items-center justify-between pb-4 border-b border-[#C47B4A]/30 mb-4 relative">
            <div className="flex items-center gap-2 text-[#F3B43E] font-serif text-2xl md:text-3xl font-bold">
              <Star className="w-5 h-5 fill-[#F3B43E]" />
              <span>Fresh Today</span>
              <Star className="w-5 h-5 fill-[#F3B43E]" />
            </div>
            <div className="text-[#F3B43E] border border-[#F3B43E]/60 rounded-full px-3 py-1 text-xs md:text-sm">
              ₹ / kg
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-8 text-[#FBE8BE]/70">Loading today's board…</div>
          ) : (
            <ul className="divide-y divide-[#C47B4A]/20 relative">
              {products
                .filter((p) => p.price != null)
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-3 md:py-4 hover:bg-white/5 px-2 rounded-lg transition-colors"
                  >
                    <span className="font-serif text-lg md:text-xl text-[#FBE8BE]">{p.name}</span>
                    <span className="font-serif text-xl md:text-2xl font-bold text-[#F3B43E]">
                      ₹{p.price}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-[#7B5A48] mt-5 italic">
          * Prices may vary slightly based on market rates. Updated daily by our shop.
        </p>
      </div>
    </section>
  );
};

export default TodayPrice;
