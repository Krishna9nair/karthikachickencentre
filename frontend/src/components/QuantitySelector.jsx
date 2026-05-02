import React from 'react';
import { presetsFor, formatQty, calcSubtotal } from '../lib/units';

/**
 * Reusable quantity selector for any product unit.
 *
 * Props:
 *  - product: { name, price, unit }
 *  - value: currently selected quantity (number)
 *  - onChange: (newQty) => void
 *  - showSubtotal: boolean (default true)
 *  - testIdPrefix: string for data-testid scoping
 */
const QuantitySelector = ({
  product,
  value,
  onChange,
  showSubtotal = true,
  testIdPrefix = 'qty',
}) => {
  if (!product?.price) return null;
  const { options, unit } = presetsFor(product.unit);

  return (
    <div data-testid={`${testIdPrefix}-${product.id}`}>
      <div className="text-[10px] tracking-[0.2em] font-semibold text-[#616161] mb-2">
        CHOOSE QUANTITY
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-label="Quantity"
      >
        {options.map((opt) => {
          const active = +Number(value).toFixed(2) === +Number(opt.value).toFixed(2);
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`${testIdPrefix}-chip-${product.id}-${opt.value}`}
              onClick={() => onChange(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                active
                  ? 'bg-[#D32F2F] text-white border-[#D32F2F] shadow-sm'
                  : 'bg-white text-[#212121] border-[#E0E0E0] hover:border-[#D32F2F]/50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {showSubtotal && (
        <div className="mt-2 text-xs text-[#212121]">
          <span className="text-[#616161]">{formatQty(value, unit)} = </span>
          <span
            className="font-bold text-[#212121]"
            data-testid={`${testIdPrefix}-subtotal-${product.id}`}
          >
            ₹{calcSubtotal(product.price, value)}
          </span>
        </div>
      )}
    </div>
  );
};

export default QuantitySelector;
