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
    <div className="group bg-white rounded-2xl border border-[#EADFCF] p-5 md:p-6 shadow-sm hover:shadow-lg hover:border-[#B93826]/40 transition-all duration-200 relative overflow-hidden flex flex-col">
      {/* Top-right badges */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-[1]">
        {isBestSeller && (
          <span
            data-testid={`product-bestseller-badge-${product.id}`}
            className="inline-flex items-center gap-1 bg-[#F3B43E] text-[#3B2416] text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full shadow"
          >
            <Flame className="w-3 h-3 fill-[#B93826] text-[#B93826]" /> BEST SELLER
          </span>
        )}
        {cartQty > 0 && (
          <span
            data-testid={`product-qty-badge-${product.id}`}
            className="bg-[#B93826] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
          >
            IN CART
          </span>
        )}
      </div>

      {product.image_url && (
        <div className="mb-4 aspect-video rounded-lg overflow-hidden bg-[#F3EADB]">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <h3 className="font-serif text-xl md:text-2xl text-[#2A1A14] leading-tight pr-24">
        {product.name}
      </h3>
      {product.description && (
        <p className="mt-1.5 text-sm text-[#7B5A48] line-clamp-2">{product.description}</p>
      )}

      {/* Big price */}
      <div className="mt-4">
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-4xl md:text-5xl font-bold text-[#B93826] leading-none">
            ₹{product.price ?? '—'}
          </span>
          <span className="text-sm text-[#7B5A48]">/{UNIT_SHORT[unit]}</span>
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
      <div className="mt-5 pt-4 border-t border-[#F3EADB] flex items-center gap-2">
        {cartQty > 0 ? (
          <div className="flex items-center gap-1 bg-[#B93826] rounded-full p-1 mr-auto">
            <button
              onClick={dec}
              className="w-8 h-8 rounded-full bg-white text-[#B93826] flex items-center justify-center hover:bg-[#FAF4EC]"
              aria-label="Decrease"
            >
              {cartQty <= presets.step ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </button>
            <span className="text-white text-xs font-semibold min-w-[60px] text-center">
              {formatQty(cartQty, unit)}
            </span>
            <button
              onClick={inc}
              className="w-8 h-8 rounded-full bg-white text-[#B93826] flex items-center justify-center hover:bg-[#FAF4EC]"
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
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#B93826] hover:bg-[#A02E1F] active:scale-95 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#1FBD5A] active:scale-95 text-white shadow-md transition-all"
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
    <section id="shop" className="bg-[#FAF4EC] py-10 md:py-20">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-8 md:mb-12">
          <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">{t('shop.eyebrow')}</div>
          <h2 className="mt-2 font-serif text-4xl md:text-5xl text-[#2A1A14]">{t('shop.title')}</h2>
          <p className="mt-3 text-[#7B5A48] max-w-xl mx-auto">
            {t('shop.subtitle')}
          </p>
          <div
            className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FFF7DA] to-[#FFE7B0] border border-[#F0DC8A] text-[#5C3A14] text-xs font-bold tracking-wide shadow-sm"
            data-testid="first-order-promo-badge"
          >
            <Flame className="w-3.5 h-3.5 text-[#B93826]" />
            FIRST ORDER? GET 10% OFF AT CHECKOUT
          </div>
        </div>

        {status === 'loading' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="shop-loading">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-white border border-[#EADFCF] animate-pulse" />
            ))}
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-10" data-testid="shop-error">
            <div className="text-[#7B5A48] mb-4">{t('shop.error')}</div>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm font-medium shadow-sm transition-colors"
              data-testid="shop-retry-btn"
            >
              <RefreshCw className="w-4 h-4" /> {t('price.retry')}
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center text-[#7B5A48] py-10">{t('shop.empty')}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
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
