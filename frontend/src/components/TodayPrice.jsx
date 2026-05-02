import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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

// Today's Price — Swiggy/Licious clean white-card style. Live red dot,
// header with date + per-kg pill, simple rows with name + bold red price.
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

  const visible = products.filter((p) => p.price != null);

  return (
    <section id="price" className="bg-white py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-5 md:px-8">
        <div className="text-center mb-6 md:mb-8">
          <div
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] font-bold text-white bg-[#D32F2F] px-3 py-1.5 rounded-full"
            data-testid="live-today-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {t('price.live_badge')}
          </div>
          <h2 className="mt-3 font-bold text-3xl md:text-4xl text-[#212121] tracking-tight">
            {t('price.title')}
          </h2>
          <div className="mt-1 text-sm text-[#616161]">{today}</div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E0E0E0] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 md:px-7 py-4 bg-[#F5F5F5] border-b border-[#E0E0E0] gap-3">
            <div className="font-bold text-[#212121] text-base md:text-lg min-w-0 truncate">
              {t('price.fresh_today')}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {updatedAt && (
                <RelativeTime date={updatedAt} className="hidden sm:block text-[11px] text-[#616161]" />
              )}
              <button
                onClick={() => load({ silent: true })}
                disabled={refreshing}
                aria-label="Refresh prices"
                title="Refresh prices"
                className="text-[#D32F2F] border border-[#E0E0E0] bg-white rounded-full p-1.5 hover:border-[#D32F2F] transition-colors disabled:opacity-50"
                data-testid="today-price-refresh-btn"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-[#D32F2F] bg-white border border-[#E0E0E0] rounded-full px-3 py-1 text-xs font-semibold">
                {t('price.per_kg')}
              </div>
            </div>
          </div>

          {status === 'loading' ? (
            <div className="divide-y divide-[#E0E0E0]" data-testid="today-price-loading">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 md:px-7 py-4">
                  <div className="h-4 w-32 bg-[#F5F5F5] rounded animate-pulse" />
                  <div className="h-5 w-14 bg-[#F5F5F5] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="text-center py-10 px-5" data-testid="today-price-error">
              <div className="text-[#616161] text-sm">{t('price.error')}</div>
              <button
                onClick={load}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold transition-colors"
                data-testid="today-price-retry-btn"
              >
                <RefreshCw className="w-4 h-4" /> {t('price.retry')}
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-10 text-[#616161] text-sm">{t('price.empty')}</div>
          ) : (
            <ul className="divide-y divide-[#E0E0E0]">
              {visible.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-5 md:px-7 py-4 hover:bg-[#F5F5F5] transition-colors"
                >
                  <span className="text-[15px] md:text-base text-[#212121] font-medium">
                    {p.name}
                  </span>
                  <span className="text-lg md:text-xl font-bold text-[#D32F2F]">
                    ₹{p.price}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-[#616161] mt-4">
          {t('price.disclaimer')}
        </p>
      </div>
    </section>
  );
};

export default TodayPrice;
