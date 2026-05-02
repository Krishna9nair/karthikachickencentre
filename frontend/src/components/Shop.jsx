import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Trash2, RefreshCw, MessageCircle, Flame } from 'lucide-react';
import { fetchPublicProducts } from '../lib/publicData';
import useAutoRefresh from '../lib/useAutoRefresh';
import { useCart } from '../context/CartContext';
import { useT } from '../lib/i18n';
import {
  presetsFor,
  formatQty,
  calcSubtotal,
  normalizeUnit,
  UNIT_SHORT,
} from '../lib/units';
import QuantitySelector from './QuantitySelector';

// Hardcoded best-seller list (by product name keyword)
const BEST_SELLERS = ['Curry Cut', 'Country Chicken', 'Boneless'];
const WHATSAPP_PHONE = '919619417452';

const buildWaLink = (product, qty) => {
  const subtotal = calcSubtotal(product.price, qty);
  const msg = `Hi! I want to order from ChickenCrew:

• ${product.name} — ${formatQty(qty, product.unit)} (₹${subtotal})

Please confirm availability & delivery time.`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
};

const ProductCard = React.memo(function ProductCard({ product }) {
  const t = useT();
  const { items, addItem, updateQty, removeItem } = useCart();
  const inCart = items.find((i) => i.id === product.id);
  const cartQty = inCart?.qty || 0;
  const presets = presetsFor(product.unit);
  const unit = presets.unit;

  // When item is not in cart, show the user's currently picked preset.
  const [pickedQty, setPickedQty] = useState(
    presets.options[1]?.value || presets.options[0].value
  );
  const activeQty = cartQty || pickedQty;

  const isBestSeller = BEST_SELLERS.some((kw) =>
    product.name.toLowerCase().includes(kw.toLowerCase())
  );

  const handleAdd = (q = pickedQty) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        unit: normalizeUnit(product.unit),
      },
      q
    );
  };
  const inc = () => updateQty(product.id, +(cartQty + presets.step).toFixed(2));
  const dec = () => {
    const next = +(cartQty - presets.step).toFixed(2);
    if (next <= 0) removeItem(product.id);
    else updateQty(product.id, next);
  };

  const onChangeQty = (q) => {
    if (cartQty > 0) updateQty(product.id, q);
    else setPickedQty(q);
  };

  return (
    <div className="group bg-white rounded-xl border border-[#E0E0E0] p-4 md:p-5 shadow-sm hover:shadow-lg hover:border-[#D32F2F]/40 transition-all duration-200 relative overflow-hidden flex flex-col">
      {/* Image with badges overlaid */}
      {product.image_url ? (
        <div className="relative mb-4 aspect-[4/3] rounded-lg overflow-hidden bg-[#F5F5F5]">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
            {isBestSeller ? (
              <span
                data-testid={`product-bestseller-badge-${product.id}`}
                className="inline-flex items-center gap-1 bg-[#D32F2F] text-white text-[10px] font-bold tracking-wider px-2 py-1 rounded-md shadow"
              >
                <Flame className="w-3 h-3" /> BEST SELLER
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold tracking-wider px-2 py-1 rounded-md shadow">
                FRESH TODAY
              </span>
            )}
          </div>
          {cartQty > 0 && (
            <span
              data-testid={`product-qty-badge-${product.id}`}
              className="absolute top-2 right-2 bg-[#D32F2F] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow"
            >
              IN CART
            </span>
          )}
        </div>
      ) : (
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-[1]">
          {isBestSeller && (
            <span
              data-testid={`product-bestseller-badge-${product.id}`}
              className="inline-flex items-center gap-1 bg-[#D32F2F] text-white text-[10px] font-bold tracking-wider px-2 py-1 rounded-md shadow"
            >
              <Flame className="w-3 h-3" /> BEST SELLER
            </span>
          )}
          {cartQty > 0 && (
            <span
              data-testid={`product-qty-badge-${product.id}`}
              className="bg-[#D32F2F] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow"
            >
              IN CART
            </span>
          )}
        </div>
      )}

      <h3 className="font-bold text-lg md:text-xl text-[#212121] leading-tight tracking-tight">
        {product.name}
      </h3>
      {product.description && (
        <p className="mt-1 text-[13px] text-[#616161] line-clamp-2 leading-snug">{product.description}</p>
      )}

      {/* Big price */}
      <div className="mt-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl md:text-4xl font-bold text-[#212121] leading-none">
            ₹{product.price ?? '—'}
          </span>
          <span className="text-sm text-[#616161]">/{UNIT_SHORT[unit]}</span>
        </div>
      </div>

      {/* Quantity preset chips (re-usable component) */}
      {product.price > 0 && (
        <div className="mt-4">
          <QuantitySelector
            product={product}
            value={activeQty}
            onChange={onChangeQty}
            testIdPrefix="product-qty"
          />
        </div>
      )}

      {/* CTA row */}
      <div className="mt-4 pt-4 border-t border-[#F5F5F5] flex items-center gap-2">
        {cartQty > 0 ? (
          <div className="flex items-center gap-1 bg-[#D32F2F] rounded-lg p-1 mr-auto">
            <button
              onClick={dec}
              className="w-8 h-8 rounded-md bg-white text-[#D32F2F] flex items-center justify-center hover:bg-[#FFEBEE]"
              aria-label="Decrease"
            >
              {cartQty <= presets.step ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </button>
            <span className="text-white text-xs font-semibold min-w-[60px] text-center">
              {formatQty(cartQty, unit)}
            </span>
            <button
              onClick={inc}
              className="w-8 h-8 rounded-md bg-white text-[#D32F2F] flex items-center justify-center hover:bg-[#FFEBEE]"
              aria-label="Increase"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleAdd()}
            disabled={!product.price}
            data-testid={`product-add-btn-${product.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-95 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> {t('shop.add')}
          </button>
        )}

        <a
          href={buildWaLink(product, activeQty)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Order ${product.name} on WhatsApp`}
          title="Order on WhatsApp"
          data-testid={`product-wa-btn-${product.id}`}
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#25D366] hover:bg-[#1FBD5A] active:scale-95 text-white shadow-sm transition-all"
        >
          <MessageCircle className="w-5 h-5 fill-white" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
});

const Shop = () => {
  const t = useT();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const isFirst = useRef(true);
  const load = ({ silent = false } = {}) => {
    if (!silent) setStatus('loading');
    // Safety net — never let the Shop section sit on its skeleton forever.
    let safetyTimer;
    if (!silent) {
      safetyTimer = setTimeout(() => {
        setStatus((s) => (s === 'loading' ? 'error' : s));
      }, 10000);
    }
    fetchPublicProducts({
      onRevalidate: (fresh) => setProducts(fresh),
    })
      .then((list) => {
        setProducts(list);
        setStatus('ready');
      })
      .catch(() => { if (!silent) setStatus('error'); })
      .finally(() => { if (safetyTimer) clearTimeout(safetyTimer); });
  };
  useEffect(() => { load(); }, []);
  useAutoRefresh(() => { if (!isFirst.current) load({ silent: true }); isFirst.current = false; }, 60000);

  // Sort: best sellers first, then sort_order. Memoized to avoid re-sorting
  // on every render (only re-runs when `products` array reference changes).
  const sorted = useMemo(
    () =>
      [...products].sort((a, b) => {
        const aBest = BEST_SELLERS.some((kw) => a.name.toLowerCase().includes(kw.toLowerCase()));
        const bBest = BEST_SELLERS.some((kw) => b.name.toLowerCase().includes(kw.toLowerCase()));
        if (aBest && !bBest) return -1;
        if (!aBest && bBest) return 1;
        return 0;
      }),
    [products]
  );

  return (
    <section id="shop" className="bg-white py-12 md:py-20">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-8 md:mb-10">
          <div className="text-[11px] tracking-[0.25em] font-bold text-[#D32F2F]">{t('shop.eyebrow')}</div>
          <h2 className="mt-2 font-bold text-3xl md:text-4xl text-[#212121] tracking-tight">{t('shop.title')}</h2>
          <p className="mt-3 text-[#616161] max-w-xl mx-auto text-sm md:text-base">
            {t('shop.subtitle')}
          </p>
          <div
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFEBEE] border border-[#FFCDD2] text-[#D32F2F] text-xs font-bold tracking-wide"
            data-testid="first-order-promo-badge"
          >
            <Flame className="w-3.5 h-3.5" />
            FIRST ORDER? GET 10% OFF AT CHECKOUT
          </div>
        </div>

        {status === 'loading' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5" data-testid="shop-loading">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl bg-white border border-[#E0E0E0] p-4 md:p-5 animate-pulse">
                <div className="aspect-[4/3] rounded-lg bg-[#F5F5F5] mb-4" />
                <div className="h-5 w-2/3 bg-[#F5F5F5] rounded mb-2" />
                <div className="h-3 w-full bg-[#F5F5F5] rounded mb-4" />
                <div className="h-8 w-1/3 bg-[#F5F5F5] rounded mb-4" />
                <div className="h-10 w-full bg-[#F5F5F5] rounded" />
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-10" data-testid="shop-error">
            <div className="text-[#616161] mb-4 text-sm">{t('shop.error')}</div>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold transition-colors"
              data-testid="shop-retry-btn"
            >
              <RefreshCw className="w-4 h-4" /> {t('price.retry')}
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center text-[#616161] py-10">{t('shop.empty')}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {sorted.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Shop;
