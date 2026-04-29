import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ALL_SLOTS, getAvailableDates, getSlotsForDate, formatDateLabel, isoDate } from '../lib/slots';

/**
 * Customer-facing delivery slot picker for the checkout dialog.
 *
 * Props:
 *   value   : { date, start, end, label } | null
 *   onChange: fn(slot) — called with the same shape, or null to clear
 */
const DeliverySlotPicker = ({ value, onChange }) => {
  const dates = useMemo(() => getAvailableDates(), []);
  const [activeDate, setActiveDate] = useState(value?.date ? new Date(value.date) : dates[0]);
  const [disabledSet, setDisabledSet] = useState(new Set());

  // Pull admin's per-date disabled slots (today + tomorrow only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromDate = isoDate(dates[0]);
      const toDate = isoDate(dates[dates.length - 1]);
      const { data } = await supabase
        .from('disabled_slots')
        .select('slot_date, slot_start')
        .gte('slot_date', fromDate)
        .lte('slot_date', toDate);
      if (cancelled) return;
      const set = new Set((data || []).map((r) => `${r.slot_date}|${(r.slot_start || '').slice(0, 5)}`));
      setDisabledSet(set);
    })();
    return () => {
      cancelled = true;
    };
  }, [dates]);

  const slots = useMemo(
    () => getSlotsForDate(activeDate, disabledSet),
    [activeDate, disabledSet]
  );

  const isSelected = (s) =>
    value &&
    isoDate(new Date(value.date)) === isoDate(activeDate) &&
    value.start === s.start;

  const choose = (s) => {
    if (s.disabled) return;
    onChange({
      date: isoDate(activeDate),
      start: s.start,
      end: s.end,
      label: s.label,
    });
  };

  return (
    <div className="rounded-xl border border-[#EADFCF] bg-white p-4" data-testid="delivery-slot-picker">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#B93826]" />
        <div className="text-sm font-semibold text-[#2A1A14]">Delivery time slot</div>
      </div>

      {/* Date selector */}
      <div className="flex gap-2 mb-3">
        {dates.map((d) => {
          const active = isoDate(d) === isoDate(activeDate);
          return (
            <button
              key={isoDate(d)}
              type="button"
              onClick={() => setActiveDate(d)}
              data-testid={`slot-date-${isoDate(d)}`}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                active
                  ? 'bg-[#B93826] text-white border border-[#B93826]'
                  : 'bg-white text-[#3B2416] border border-[#EADFCF] hover:border-[#B93826]/40'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {formatDateLabel(d)}
            </button>
          );
        })}
      </div>

      {/* Slots */}
      {slots.length === 0 ? (
        <div className="text-sm text-[#7B5A48] text-center py-4">
          No delivery slots left for {formatDateLabel(activeDate).toLowerCase()}. Pick another day.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {slots.map((s) => {
            const selected = isSelected(s);
            return (
              <button
                key={s.start}
                type="button"
                onClick={() => choose(s)}
                disabled={s.disabled}
                data-testid={`slot-${s.start}`}
                className={`py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                  s.disabled
                    ? 'bg-[#F3EADB] text-[#A89381] border-[#EADFCF] cursor-not-allowed line-through'
                    : selected
                    ? 'bg-[#B93826] text-white border-[#B93826] shadow-sm'
                    : 'bg-white text-[#3B2416] border-[#EADFCF] hover:border-[#B93826]/40'
                }`}
              >
                {s.label}
                {s.disabled && (
                  <span className="block text-[9px] mt-0.5 font-normal not-italic">unavailable</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliverySlotPicker;
