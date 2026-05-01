import React, { useEffect, useState } from 'react';
import { X, Loader2, Sparkles, Copy, Check, PartyPopper } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const LS_LAST_CUSTOMER = 'cc_last_customer_v1';

// 6 segments — must match WHEEL_PRIZES order on the server.
const SEGMENTS = [
  { label: '5% OFF',  short: '5%',  color: '#B93826' },
  { label: '10% OFF', short: '10%', color: '#F5A623' },
  { label: '15% OFF', short: '15%', color: '#2E7D32' },
  { label: 'Try Again', short: 'Better luck', color: '#7B5A48' },
  { label: '₹50 OFF', short: '₹50', color: '#1976D2' },
  { label: '₹75 OFF', short: '₹75', color: '#8E24AA' },
];
const SEG_COUNT = SEGMENTS.length;
const SEG_DEG = 360 / SEG_COUNT; // 60°

const SundayWheel = ({ open, onClose }) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('checking'); // checking | ready | already_spun | not_sunday | disabled
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prize, setPrize] = useState(null); // { label, kind, value, coupon_code }
  const [copied, setCopied] = useState(false);

  // Pre-fill phone from last-customer localStorage so most users skip typing.
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(LS_LAST_CUSTOMER);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.phone) setPhone(saved.phone);
      }
    } catch (_) {}
  }, [open]);

  // Re-check eligibility whenever phone changes (10 digits)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus('checking');
    setPrize(null);
    const url = phone && phone.length === 10
      ? `/wheel/status?phone=${encodeURIComponent(phone)}`
      : '/wheel/status';
    api
      .get(url)
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.is_sunday) return setStatus('not_sunday');
        if (data.reason === 'disabled') return setStatus('disabled');
        if (data.reason === 'already_spun') {
          setPrize(data.prize ? { ...data.prize, coupon_code: data.prize.coupon_code } : null);
          return setStatus('already_spun');
        }
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('ready'); // fail open — let them try
      });
    return () => {
      cancelled = true;
    };
  }, [open, phone]);

  if (!open) return null;

  const onSpin = async () => {
    if (phone.length !== 10) {
      toast({ title: 'Enter your phone', description: 'A 10-digit number to claim your prize.' });
      return;
    }
    setSpinning(true);
    try {
      const { data } = await api.post('/wheel/spin', { phone });
      if (data.already_spun) {
        setPrize(data.prize);
        setStatus('already_spun');
        setSpinning(false);
        return;
      }
      const idx = Number(data.segment_index ?? 0);
      // Land the centre of the winning segment under the top pointer.
      // We add 6 full rotations for drama, then offset to the segment centre.
      const targetDeg = 360 * 6 + (360 - (idx * SEG_DEG + SEG_DEG / 2));
      setRotation(targetDeg);
      // Wait for the CSS transition to finish (matches duration below)
      setTimeout(() => {
        setPrize(data.prize);
        setSpinning(false);
        setStatus('done');
      }, 4500);
    } catch (err) {
      setSpinning(false);
      toast({
        title: 'Could not spin',
        description: err?.response?.data?.detail || 'Try again in a moment.',
      });
    }
  };

  const copyCode = async () => {
    if (!prize?.coupon_code) return;
    try {
      await navigator.clipboard.writeText(prize.coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  };

  // Conic-gradient wheel face — slices alternate colours from SEGMENTS.
  const conicStops = SEGMENTS.map((s, i) => {
    const from = i * SEG_DEG;
    const to = (i + 1) * SEG_DEG;
    return `${s.color} ${from}deg ${to}deg`;
  }).join(', ');

  const renderBody = () => {
    if (status === 'not_sunday') {
      return (
        <div className="p-6 text-center">
          <div className="text-4xl mb-2">🎡</div>
          <p className="font-serif text-lg text-[#2A1A14]">Come back this Sunday!</p>
          <p className="text-sm text-[#7B5A48] mt-1 max-w-xs mx-auto">
            The lucky wheel only spins on Sundays. Win up to <b>15% off</b> or <b>₹75 off</b> your next order.
          </p>
        </div>
      );
    }
    if (status === 'disabled') {
      return (
        <div className="p-6 text-center">
          <p className="font-serif text-lg text-[#2A1A14]">Wheel is paused</p>
          <p className="text-sm text-[#7B5A48] mt-1">It'll be back next Sunday — keep an eye out!</p>
        </div>
      );
    }
    if (status === 'already_spun' && prize) {
      const isWin = prize.prize_kind !== 'none' && prize.prize_value > 0;
      return (
        <div className="p-6 text-center">
          <div className="text-4xl mb-2">{isWin ? '🎉' : '🤞'}</div>
          <p className="font-serif text-lg text-[#2A1A14]">You already spun today!</p>
          <p className="text-sm text-[#7B5A48] mt-1">Your prize: <b className="text-[#B93826]">{prize.prize_label}</b></p>
          {isWin && prize.coupon_code && (
            <CouponDisplay code={prize.coupon_code} copied={copied} onCopy={copyCode} />
          )}
        </div>
      );
    }
    // status === 'ready' OR 'done' OR 'checking'
    return (
      <div className="p-5">
        {/* The wheel */}
        <div className="relative mx-auto w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
          {/* Pointer (top) */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-0 h-0
                          border-l-[12px] border-l-transparent
                          border-r-[12px] border-r-transparent
                          border-t-[18px] border-t-[#2A1A14] drop-shadow-md" />
          {/* Wheel disc */}
          <div
            className="absolute inset-0 rounded-full shadow-xl border-4 border-[#2A1A14] overflow-hidden"
            style={{
              background: `conic-gradient(from 0deg, ${conicStops})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4.5s cubic-bezier(0.17, 0.67, 0.21, 0.99)' : 'none',
            }}
          >
            {SEGMENTS.map((s, i) => {
              const angle = i * SEG_DEG + SEG_DEG / 2;
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 origin-[0_0] text-white font-bold text-[11px] sm:text-xs whitespace-nowrap drop-shadow-md"
                  style={{
                    transform: `rotate(${angle}deg) translateY(-115px) translateX(-50%) rotate(90deg)`,
                  }}
                >
                  {s.short}
                </div>
              );
            })}
          </div>
          {/* Centre hub */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FAF4EC] border-4 border-[#2A1A14] flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-[#B93826]" />
            </div>
          </div>
        </div>

        {/* Prize result OR spin button */}
        {status === 'done' && prize ? (
          <PrizeReveal prize={prize} copied={copied} onCopy={copyCode} />
        ) : (
          <div className="mt-5">
            <label className="text-xs font-medium text-[#7B5A48]">Your phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              placeholder="10-digit mobile"
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
              data-testid="wheel-phone"
              disabled={spinning}
            />
            <button
              onClick={onSpin}
              disabled={spinning || phone.length !== 10}
              data-testid="wheel-spin-btn"
              className="mt-3 w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-bold text-base shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {spinning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Spinning…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> SPIN THE WHEEL
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-[#7B5A48] mt-2">
              One spin per phone, every Sunday. Win coupons valid for 7 days.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
      onClick={spinning ? undefined : onClose}
      data-testid="sunday-wheel-dialog"
    >
      <div
        className="bg-[#FAF4EC] rounded-2xl w-full max-w-md shadow-2xl border border-[#EADFCF] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EADFCF] bg-gradient-to-r from-[#FFF7DA] to-[#FFE7B0]">
          <div className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-[#B93826]" />
            <h3 className="font-serif text-xl font-bold text-[#2A1A14]">Sunday Lucky Spin</h3>
          </div>
          <button
            onClick={onClose}
            disabled={spinning}
            className="p-1.5 rounded-full hover:bg-[#EADFCF] text-[#3B2416] disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {renderBody()}
      </div>
    </div>
  );
};

const PrizeReveal = ({ prize, copied, onCopy }) => {
  const isWin = prize.kind !== 'none' && prize.value > 0;
  return (
    <div className="mt-5 text-center">
      <div className="text-4xl mb-1">{isWin ? '🎉' : '🤞'}</div>
      <div className="font-serif text-2xl font-bold text-[#2A1A14]">
        {isWin ? 'You won!' : 'So close…'}
      </div>
      <div className="mt-1 text-lg font-bold text-[#B93826]">{prize.label}</div>
      {isWin && prize.coupon_code ? (
        <>
          <p className="text-xs text-[#7B5A48] mt-2">
            Use this code at checkout — valid for 7 days
          </p>
          <CouponDisplay code={prize.coupon_code} copied={copied} onCopy={onCopy} />
        </>
      ) : (
        <p className="text-sm text-[#7B5A48] mt-2 max-w-xs mx-auto">
          Don't worry — come back next Sunday for another spin!
        </p>
      )}
    </div>
  );
};

const CouponDisplay = ({ code, copied, onCopy }) => (
  <div className="mt-3 mx-auto w-fit">
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-[#B93826] bg-white">
      <span className="font-mono font-bold text-lg text-[#2A1A14] tracking-wider">{code}</span>
      <button
        onClick={onCopy}
        data-testid="wheel-copy-coupon"
        className="ml-2 p-1.5 rounded-full hover:bg-[#FAF4EC] text-[#B93826]"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
    <p className="text-[10px] text-[#7B5A48] mt-1.5 text-center">
      {copied ? 'Copied!' : 'Tap the icon to copy'}
    </p>
  </div>
);

export default SundayWheel;
