import React, { useEffect, useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';

const STEP = 0.25;

const ProductCard = ({ product }) => {
  const { items, addItem, updateQty, removeItem } = useCart();
  const inCart = items.find((i) => i.id === product.id);
  const qty = inCart?.qty || 0;

  const handleAdd = () => {
    addItem({ id: product.id, name: product.name, price: product.price }, 0.5);
  };
  const inc = () => updateQty(product.id, +(qty + STEP).toFixed(2));
  const dec = () => {
    const next = +(qty - STEP).toFixed(2);
    if (next <= 0) removeItem(product.id);
    else updateQty(product.id, next);
  };

  return (
    <div className="group bg-white rounded-2xl border border-[#EADFCF] p-5 md:p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:shadow-md hover:border-[#B93826]/30 transition-all duration-200">
      {product.image_url && (
        <div className="mb-4 aspect-video rounded-lg overflow-hidden bg-[#F3EADB]">
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl md:text-2xl text-[#2A1A14] leading-tight">
          {product.name}
        </h3>
        <span className="shrink-0 text-[10px] tracking-[0.15em] font-semibold text-[#B93826] border border-dashed border-[#B93826] rounded-full px-2.5 py-1">
          FRESH
        </span>
      </div>
      {product.description && (
        <p className="mt-3 text-sm text-[#7B5A48]">{product.description}</p>
      )}

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-[0.2em] font-semibold text-[#7B5A48]">TODAY</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-serif text-3xl font-bold text-[#B93826]">
              ₹{product.price ?? '—'}
            </span>
            <span className="text-xs text-[#7B5A48]">/{product.unit || 'kg'}</span>
          </div>
        </div>

        {qty > 0 ? (
          <div className="flex items-center gap-2 bg-[#B93826] rounded-full p-1">
            <button
              onClick={dec}
              className="w-8 h-8 rounded-full bg-white text-[#B93826] flex items-center justify-center hover:bg-[#FAF4EC] transition-colors"
              aria-label="Decrease"
            >
              {qty <= STEP ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </button>
            <span className="text-white text-sm font-semibold min-w-[50px] text-center">
              {qty} kg
            </span>
            <button
              onClick={inc}
              className="w-8 h-8 rounded-full bg-white text-[#B93826] flex items-center justify-center hover:bg-[#FAF4EC] transition-colors"
              aria-label="Increase"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={!product.price}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#B93826] hover:bg-[#A02E1F] active:scale-95 text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>
    </div>
  );
};

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/public/products')
      .then((r) => setProducts(r.data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="shop" className="bg-[#FAF4EC] py-10 md:py-20">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-8 md:mb-12">
          <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">OUR CUTS</div>
          <h2 className="mt-2 font-serif text-4xl md:text-5xl text-[#2A1A14]">Pick your pieces</h2>
          <p className="mt-3 text-[#7B5A48] max-w-xl mx-auto">
            Hand-cut by our butchers each morning. Add to cart, pay by UPI, and we'll get it ready.
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-white border border-[#EADFCF] animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center text-[#7B5A48]">No products available right now.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Shop;
