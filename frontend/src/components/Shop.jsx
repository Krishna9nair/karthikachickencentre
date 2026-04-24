import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { PRODUCTS } from '../data/mock';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(product, 0.5);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group bg-white rounded-2xl border border-[#EADFCF] p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:shadow-md hover:border-[#B93826]/30 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl md:text-2xl text-[#2A1A14] leading-tight">
          {product.name}
        </h3>
        <span className="shrink-0 text-[10px] tracking-[0.15em] font-semibold text-[#B93826] border border-dashed border-[#B93826] rounded-full px-2.5 py-1">
          FRESH
        </span>
      </div>
      <p className="mt-3 text-sm text-[#7B5A48]">{product.desc}</p>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <div className="text-[10px] tracking-[0.2em] font-semibold text-[#7B5A48]">
            TODAY
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-serif text-3xl font-bold text-[#B93826]">
              ₹{product.price}
            </span>
            <span className="text-xs text-[#7B5A48]">/kg</span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={added}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-white text-sm font-medium shadow-sm transition-all ${
            added
              ? 'bg-emerald-600'
              : 'bg-[#B93826] hover:bg-[#A02E1F] active:scale-95'
          }`}
        >
          {added ? (
            <>
              <Check className="w-4 h-4" /> Added
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const Shop = () => {
  return (
    <section id="shop" className="bg-[#FAF4EC] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-12">
          <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">
            OUR CUTS
          </div>
          <h2 className="mt-2 font-serif text-4xl md:text-5xl text-[#2A1A14]">
            Pick your pieces
          </h2>
          <p className="mt-3 text-[#7B5A48] max-w-xl mx-auto">
            Hand-cut by our butchers each morning. Add to cart, pay by UPI, and
            we'll get it ready.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Shop;
