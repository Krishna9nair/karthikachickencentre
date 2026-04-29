import React, { useEffect, useRef, useState } from 'react';
import { Star, RefreshCw } from 'lucide-react';
import { fetchPublicProducts } from '../lib/publicData';
import useAutoRefresh from '../lib/useAutoRefresh';
import { useT, useI18n } from '../lib/i18n';

// Tiny self-updating "X seconds ago" label
const RelativeTime = ({ date, className = '' }) => {
  const t = useT();
  const { lang } = useI18n();
  const [, force] = useState(0);
  useEffect(() => {
    const tt = setInterval(() => force((n) => n + 1), 15000);
    return () => clearInterval(tt);
  }, []);
  if (!date) return null;
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const unit = lang === 'hi' ? { s: 'से', m: 'मि', h: 'घं' } : { s: 's', m: 'm', h: 'h' };
  const ago = lang === 'hi' ? 'पहले' : 'ago';
  const label =
    diff < 10 ? t('price.just_now')
    : diff < 60 ? `${diff}${unit.s} ${ago}`
    : diff < 3600 ? `${Math.floor(diff / 60)}${unit.m} ${ago}`
    : `${Math.floor(diff / 3600)}${unit.h} ${ago}`;
  return <span className={className}>{t('price.updated')} {label}</span>;
};

const TodayPrice = () => {
  const t = useT();
  const { lang } = useI18n();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const isFirst = useRef(true);
  const load = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setStatus('loading');
    // UI safety net: if the data layer hangs longer than 10s for any reason,
    // flip to the error state so the customer can tap Retry instead of being
    // stuck on a perpetual loading screen.
    let safetyTimer;
    if (!silent) {
      safetyTimer = setTimeout(() => setStatus('error'), 10000);
    }
    try {
      const list = await fetchPublicProducts();
      setProducts(list);
      setStatus('ready');
      setUpdatedAt(new Date());
    } catch (_) {
      if (!silent) setStatus('error');
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (silent) setRefreshing(false);
    }
  };
  useEffect(() => { load(); }, []);
  useAutoRefresh(() => { if (!isFirst.current) load({ silent: true }); isFirst.current = false; }, 60000);

  return (
    <section id="price" className="bg-[#FAF4EC] py-10 md:py-20">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="text-center mb-6 md:mb-10">
          <div
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] font-bold text-white bg-[#B93826] px-3 py-1.5 rounded-full shadow-md relative overflow-hidden"
            data-testid="live-today-badge"
          >
            <span className="absolute inset-0 bg-white/30 animate-pulse" />
            <span className="relative flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {t('price.live_badge')}
            </span>
          </div>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl text-[#2A1A14]">{t('price.title')}</h2>
          <div className="mt-2 text-sm text-[#7B5A48]">{today}</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-[#3A1F13] to-[#2A140A] border-2 border-[#C47B4A] shadow-xl p-4 md:p-10 relative overflow-hidden">
          <div className="absolute inset-2 border border-[#C47B4A]/40 rounded-xl pointer-events-none" />

          <div className="flex items-center justify-between pb-4 border-b border-[#C47B4A]/30 mb-4 relative gap-3">
            <div className="flex items-center gap-2 text-[#F3B43E] font-serif text-2xl md:text-3xl font-bold min-w-0">
              <Star className="w-5 h-5 fill-[#F3B43E] shrink-0" />
              <span className="truncate">{t('price.fresh_today')}</span>
              <Star className="w-5 h-5 fill-[#F3B43E] shrink-0" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {updatedAt && (
                <RelativeTime date={updatedAt} className="hidden sm:block text-[10px] text-[#FBE8BE]/60" />
              )}
              <button
                onClick={() => load({ silent: true })}
                disabled={refreshing}
                aria-label="Refresh prices"
                title="Refresh prices"
                className="text-[#F3B43E] border border-[#F3B43E]/60 rounded-full p-1.5 hover:bg-[#F3B43E]/10 transition-colors disabled:opacity-50"
                data-testid="today-price-refresh-btn"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-[#F3B43E] border border-[#F3B43E]/60 rounded-full px-3 py-1 text-xs md:text-sm">
                {t('price.per_kg')}
              </div>
            </div>
          </div>

          {status === 'loading' ? (
            <div className="text-center py-8 text-[#FBE8BE]/70" data-testid="today-price-loading">
              {t('price.loading')}
            </div>
          ) : status === 'error' ? (
            <div className="text-center py-8 relative" data-testid="today-price-error">
              <div className="text-[#FBE8BE]/90 text-sm">
                {t('price.error')}
              </div>
              <button
                onClick={load}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#F3B43E]/60 text-[#F3B43E] hover:bg-[#F3B43E]/10 transition-colors text-sm"
                data-testid="today-price-retry-btn"
              >
                <RefreshCw className="w-4 h-4" /> {t('price.retry')}
              </button>
            </div>
          ) : products.filter((p) => p.price != null).length === 0 ? (
            <div className="text-center py-8 text-[#FBE8BE]/70">
              {t('price.empty')}
            </div>
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
          {t('price.disclaimer')}
        </p>
      </div>
    </section>
  );
};

export default TodayPrice;
