import React, { useEffect, useMemo, useState } from 'react';
import { X, MapPin, Loader2, Smartphone, Banknote, CheckCircle2, Sparkles, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';
import { api, loadRazorpay } from '../lib/api';
import Bill from './Bill';
import DeliverySlotPicker from './DeliverySlotPicker';

const LS_LAST_CUSTOMER = 'cc_last_customer_v1';
const FIRST_ORDER_DISCOUNT_PCT = 10;
const FREE_DELIVERY_THRESHOLD = 299;
const DELIVERY_FEE = 20;

const CheckoutDialog = ({ open, onClose }) => {
  const { items, subtotal, clear, setIsOpen } = useCart();
  const { toast } = useToast();
  const [step, setStep] = useState('form'); // form | paying | success
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [location, setLocation] = useState(null); // { lat, lng }
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | ok | error
  const [orderDetails, setOrderDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online'); // online | cod
  const [profileLookup, setProfileLookup] = useState('idle'); // idle | loading | found
  const [firstOrderEligible, setFirstOrderEligible] = useState(false);
  // Coupon flow state
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount } when applied
  const [couponError, setCouponError] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState(null); // { date, start, end, label }
  // Snapshot the cart at order placement so the Bill is stable even after
  // the parent cart state is cleared (or items change).
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  // Final amounts shown in the summary. The bigger of (first-order 10%) and
  // (coupon discount) wins — they don't stack.
  const firstOrderDiscount = useMemo(
    () => (firstOrderEligible ? +(subtotal * FIRST_ORDER_DISCOUNT_PCT / 100).toFixed(2) : 0),
    [firstOrderEligible, subtotal]
  );
  const couponDiscount = coupon?.discount || 0;
  const useCoupon = couponDiscount > firstOrderDiscount;
  const discount = useCoupon ? couponDiscount : firstOrderDiscount;
  // Delivery fee is based on the GROSS subtotal (before discount). Above
  // the threshold = free; below = ₹20. Mirrors the backend rule exactly.
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const finalTotal = +Math.max(subtotal - discount + deliveryFee, 0).toFixed(2);

  // On open, hydrate the form from the most-recent localStorage profile so
  // returning customers don't have to retype anything.
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(LS_LAST_CUSTOMER);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved) return;
      setForm((f) => ({
        name: f.name || saved.name || '',
        phone: f.phone || saved.phone || '',
        address: f.address || saved.address || '',
      }));
      if (saved.lat && saved.lng) {
        setLocation({ lat: Number(saved.lat), lng: Number(saved.lng) });
        setGeoStatus('ok');
      }
    } catch (_) {}
  }, [open]);

  // When the customer types a 10-digit phone, look up the saved server-side
  // profile (works across devices). localStorage already covers same-device.
  useEffect(() => {
    if (form.phone.length !== 10) {
      setFirstOrderEligible(false);
      return;
    }
    let cancelled = false;
    setProfileLookup('loading');
    api
      .get(`/public/customer-profile/${form.phone}`)
      .then(({ data }) => {
        if (cancelled || !data) return;
        // Only auto-fill empty fields; never clobber what the user already typed.
        setForm((f) => ({
          name: f.name || data.name || '',
          phone: f.phone,
          address: f.address || data.address || '',
        }));
        if (!location && data.lat && data.lng) {
          setLocation({ lat: Number(data.lat), lng: Number(data.lng) });
          setGeoStatus('ok');
        }
        setProfileLookup('found');
        toast({
          title: 'Welcome back!',
          description: 'We pre-filled your saved address. Edit if anything changed.',
        });
      })
      .catch(() => {
        if (!cancelled) setProfileLookup('idle');
      });

    // Parallel check: is this customer eligible for the 10% first-order discount?
    api
      .get(`/public/first-order-eligible/${form.phone}`)
      .then(({ data }) => {
        if (cancelled) return;
        setFirstOrderEligible(!!data?.eligible);
      })
      .catch(() => {
        if (!cancelled) setFirstOrderEligible(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone]);

  // Re-validate the applied coupon when the cart subtotal or phone changes
  // (e.g. customer edits cart after applying — keeps min-order check fresh).
  useEffect(() => {
    if (!coupon || !open) return;
    let cancelled = false;
    api
      .post('/coupons/validate', {
        code: coupon.code,
        phone: form.phone || null,
        items_total: subtotal,
      })
      .then(({ data }) => {
        if (cancelled) return;
        if (data.valid) {
          setCoupon({ code: coupon.code, discount: Number(data.discount) });
          setCouponError('');
        } else {
          setCoupon(null);
          setCouponError(data.error || 'Coupon no longer valid');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, form.phone, open]);

  if (!open) return null;

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Enter a code');
      return;
    }
    setCouponChecking(true);
    setCouponError('');
    try {
      const { data } = await api.post('/coupons/validate', {
        code,
        phone: form.phone || null,
        items_total: subtotal,
      });
      if (data.valid) {
        setCoupon({ code, discount: Number(data.discount) });
        setCouponError('');
      } else {
        setCoupon(null);
        setCouponError(data.error || 'Invalid code');
      }
    } catch (err) {
      setCoupon(null);
      setCouponError(err?.response?.data?.detail || 'Could not validate code');
    } finally {
      setCouponChecking(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    setCouponError('');
  };


  const captureLocation = async () => {
    // NATIVE (Capacitor) path — uses Android/iOS location API
    if (Capacitor.isNativePlatform()) {
      setGeoStatus('loading');
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            setGeoStatus('error');
            toast({
              title: 'Location permission denied',
              description:
                'Go to phone Settings → Apps → ChickenCrew → Permissions → Location → Allow.',
            });
            return;
          }
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ok');
        toast({ title: 'Location captured', description: 'Rider will use this for delivery.' });
      } catch (err) {
        setGeoStatus('error');
        toast({
          title: 'Location unavailable',
          description: err?.message || 'Please enter your address manually.',
        });
      }
      return;
    }

    // WEB path — browser geolocation
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser doesn\'t support location. Enter your address manually below.',
      });
      return;
    }

    try {
      if (navigator.permissions?.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          toast({
            title: 'Location blocked in browser',
            description:
              'Tap the 🔒 padlock in address bar → Site settings → Location → Allow. Then reload this page.',
          });
          setGeoStatus('error');
          return;
        }
      }
    } catch (_) {}

    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ok');
        toast({ title: 'Location captured', description: 'Rider will use this for delivery.' });
      },
      (err) => {
        setGeoStatus('error');
        const msg =
          err.code === 1
            ? 'You blocked location. Tap the padlock in address bar → allow location → reload.'
            : err.code === 2
            ? 'Could not determine location. Check GPS/internet and try again.'
            : err.code === 3
            ? 'Location request timed out. Try again or enter address manually.'
            : err.message || 'Please enter your address manually.';
        toast({ title: 'Location unavailable', description: msg });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || form.phone.length < 10) {
      toast({ title: 'Missing details', description: 'Name and 10-digit phone required.' });
      return;
    }
    if (!location && !form.address.trim()) {
      toast({
        title: 'Location needed',
        description: 'Share your live location OR enter an address for delivery.',
      });
      return;
    }
    if (!deliverySlot) {
      toast({
        title: 'Pick a delivery slot',
        description: 'Choose when you want your meat delivered.',
      });
      return;
    }

    setStep('paying');

    const payload = {
      customer_name: form.name,
      customer_phone: form.phone,
      customer_address: form.address,
      delivery_lat: location?.lat || null,
      delivery_lng: location?.lng || null,
      items: items.map((i) => ({
        product_id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
      })),
      total_amount: finalTotal,
      apply_first_order_discount: firstOrderEligible,
      coupon_code: useCoupon ? coupon.code : null,
      delivery_slot_date: deliverySlot.date,
      delivery_slot_start: deliverySlot.start,
      delivery_slot_end: deliverySlot.end,
      delivery_slot_label: deliverySlot.label,
      notes: '',
    };

    // Capture immutable snapshot of cart for the Bill / admin notification
    const snapshot = {
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        unit: i.unit || 'kg',
      })),
      subtotal: finalTotal,
      grossSubtotal: subtotal,
      discount,
      deliveryFee,
      firstOrderDiscountApplied: firstOrderEligible && !useCoupon,
      couponCode: useCoupon ? coupon.code : null,
      deliverySlot,
      customer: { name: form.name, phone: form.phone, address: form.address },
    };

    // Persist the customer details locally so next checkout pre-fills instantly.
    try {
      localStorage.setItem(
        LS_LAST_CUSTOMER,
        JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          lat: location?.lat || null,
          lng: location?.lng || null,
          updated_at: new Date().toISOString(),
        })
      );
    } catch (_) {}

    // Cash on delivery path — no Razorpay
    if (paymentMethod === 'cod') {
      try {
        const resp = await api.post('/orders/cod', payload);
        setOrderDetails(resp.data.order);
        setOrderSnapshot(snapshot);
        setStep('success');
      } catch (err) {
        toast({
          title: 'Could not place order',
          description: err?.response?.data?.detail || err.message,
        });
        setStep('form');
      }
      return;
    }

    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load Razorpay');

      const { data } = await api.post('/payments/create-order', payload);

      const opts = {
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpay_order_id,
        name: 'ChickenCrew',
        description: 'Fresh chicken order',
        prefill: {
          name: form.name,
          contact: form.phone,
          email: `${form.phone}@chickencrew.shop`, // Razorpay requires email; synthesize from phone
          method: 'upi',
        },
        theme: { color: '#B93826' },
        // Force-show UPI block + Cards/Wallets/Netbanking
        method: { upi: true, card: true, wallet: true, netbanking: true },
        // On Android, prefer UPI Intent flow (opens GPay/PhonePe/etc directly)
        config: {
          display: {
            blocks: {
              upi_block: {
                name: 'Pay using UPI',
                instruments: [{ method: 'upi', flows: ['intent', 'collect', 'qr'] }],
              },
            },
            sequence: ['block.upi_block'],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (resp) => {
          try {
            const verify = await api.post('/payments/verify', {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              local_order_id: data.local_order_id,
            });
            setOrderDetails(verify.data.order);
            setOrderSnapshot(snapshot);
            setStep('success');
          } catch (err) {
            toast({ title: 'Payment verification failed', description: err?.response?.data?.detail || err.message });
            setStep('form');
          }
        },
        modal: {
          ondismiss: () => setStep('form'),
        },
      };

      const rzp = new window.Razorpay(opts);
      rzp.on('payment.failed', (resp) => {
        toast({ title: 'Payment failed', description: resp.error?.description || 'Try again.' });
        setStep('form');
      });
      rzp.open();
    } catch (err) {
      toast({ title: 'Checkout error', description: err?.response?.data?.detail || err.message });
      setStep('form');
    }
  };

  const handleDone = () => {
    clear();
    setStep('form');
    setForm({ name: '', phone: '', address: '' });
    setLocation(null);
    setGeoStatus('idle');
    setOrderDetails(null);
    setOrderSnapshot(null);
    setPaymentMethod('online');
    setProfileLookup('idle');
    setFirstOrderEligible(false);
    setCoupon(null);
    setCouponInput('');
    setCouponError('');
    setCouponOpen(false);
    setDeliverySlot(null);
    onClose();
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#FAF4EC] rounded-2xl w-full max-w-md shadow-2xl border border-[#EADFCF] overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EADFCF] sticky top-0 bg-[#FAF4EC]">
          <h3 className="font-serif text-xl font-bold text-[#2A1A14]">
            {step === 'success' ? 'Order Confirmed' : 'Checkout'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#EADFCF] text-[#3B2416]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={handlePay} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#7B5A48]">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#7B5A48]">Phone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                placeholder="10-digit mobile"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#7B5A48] flex items-center gap-2">
                Delivery Address
                {profileLookup === 'loading' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#7B5A48]">
                    <Loader2 className="w-3 h-3 animate-spin" /> looking up…
                  </span>
                )}
                {profileLookup === 'found' && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
                    data-testid="saved-address-badge"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Saved address loaded
                  </span>
                )}
              </label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm resize-none"
                placeholder="House/Flat, Street, Landmark"
                data-testid="checkout-address-input"
              />
            </div>

            <div className="rounded-xl border-2 border-dashed border-[#B93826]/40 bg-[#B93826]/5 p-4">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#B93826] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#2A1A14]">Share live location</div>
                  <div className="text-xs text-[#7B5A48] mt-0.5">
                    Your browser will ask for permission. Rider uses this to reach you faster.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={captureLocation}
                disabled={geoStatus === 'loading'}
                className={`mt-3 w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  location
                    ? 'bg-emerald-600 text-white'
                    : geoStatus === 'error'
                    ? 'bg-white border border-[#B93826] text-[#B93826]'
                    : 'bg-[#B93826] hover:bg-[#A02E1F] text-white'
                }`}
              >
                {geoStatus === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Waiting for permission…
                  </>
                ) : location ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Location shared ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                  </>
                ) : geoStatus === 'error' ? (
                  <>
                    <MapPin className="w-4 h-4" /> Try again
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" /> Allow location access
                  </>
                )}
              </button>
              {geoStatus === 'error' && (
                <div className="mt-2 text-[11px] text-[#7B5A48] leading-relaxed">
                  Blocked? Tap the 🔒 padlock icon in your browser's address bar → <b>Site settings</b> →{' '}
                  <b>Location</b> → <b>Allow</b>, then reload. Or just type the address above.
                </div>
              )}
            </div>

            <DeliverySlotPicker value={deliverySlot} onChange={setDeliverySlot} />

            {firstOrderEligible && !useCoupon && (
              <div
                className="rounded-xl bg-gradient-to-r from-[#FFF7DA] to-[#FFE7B0] border border-[#F0DC8A] p-4 flex items-start gap-3"
                data-testid="first-order-discount-banner"
              >
                <div className="shrink-0 w-9 h-9 rounded-full bg-[#B93826] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#2A1A14]">
                    🎉 First order — {FIRST_ORDER_DISCOUNT_PCT}% off applied!
                  </div>
                  <div className="text-xs text-[#7B5A48] mt-0.5">
                    You're saving <b className="text-[#B93826]">₹{discount.toFixed(0)}</b> on this order. Welcome to ChickenCrew!
                  </div>
                </div>
              </div>
            )}

            {/* Coupon code — collapsible */}
            <div className="rounded-xl border border-[#EADFCF] bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setCouponOpen((v) => !v)}
                data-testid="coupon-toggle-btn"
                className="w-full px-4 py-3 flex items-center justify-between text-sm text-[#3B2416] hover:bg-[#FAF4EC] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#B93826]" />
                  {coupon ? (
                    <span className="font-semibold text-emerald-700">
                      Coupon <span className="font-mono">{coupon.code}</span> applied · −₹
                      {coupon.discount.toFixed(0)}
                    </span>
                  ) : (
                    <span className="font-medium">Have a coupon code?</span>
                  )}
                </span>
                {couponOpen ? <ChevronUp className="w-4 h-4 text-[#7B5A48]" /> : <ChevronDown className="w-4 h-4 text-[#7B5A48]" />}
              </button>
              {couponOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-[#EADFCF] bg-[#FAF4EC]">
                  {coupon ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-[#7B5A48]">
                        {useCoupon ? (
                          <>Coupon discount applied (better than first-order offer).</>
                        ) : (
                          <>First-order 10% gives you a bigger saving — using that instead.</>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        data-testid="coupon-remove-btn"
                        className="text-xs px-3 py-1 rounded-full border border-[#EADFCF] hover:border-[#B93826]/40 text-[#3B2416]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyCoupon();
                            }
                          }}
                          placeholder="e.g. WELCOME20"
                          className="flex-1 px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm font-mono uppercase tracking-wide"
                          data-testid="coupon-input"
                        />
                        <button
                          type="button"
                          onClick={applyCoupon}
                          disabled={couponChecking || !couponInput.trim()}
                          data-testid="coupon-apply-btn"
                          className="px-4 py-2.5 rounded-lg bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm font-medium disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {couponChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <div className="mt-2 text-xs text-[#B93826]" data-testid="coupon-error">
                          {couponError}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#F3EADB] p-4">
              <div className="text-xs text-[#7B5A48] mb-2">Order summary</div>
              <ul className="space-y-1 text-sm text-[#3B2416]">
                {items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>{i.name} × {i.qty} kg</span>
                    <span>₹{(i.price * i.qty).toFixed(0)}</span>
                  </li>
                ))}
              </ul>
              {discount > 0 && (
                <>
                  <div className="border-t border-[#EADFCF] mt-2 pt-2 flex justify-between text-sm text-[#3B2416]">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div
                    className="flex justify-between text-sm text-emerald-700 font-medium"
                    data-testid="discount-line"
                  >
                    <span>
                      {useCoupon
                        ? `Coupon ${coupon.code}`
                        : `First-order discount (${FIRST_ORDER_DISCOUNT_PCT}%)`}
                    </span>
                    <span>− ₹{discount.toFixed(0)}</span>
                  </div>
                </>
              )}
              {/* Delivery fee line — always shown so customers know the policy */}
              <div
                className={`flex justify-between text-sm ${
                  discount > 0 ? '' : 'border-t border-[#EADFCF] mt-2 pt-2'
                }`}
                data-testid="delivery-fee-line"
              >
                <span className="text-[#3B2416]">Delivery fee</span>
                {deliveryFee === 0 ? (
                  <span className="text-emerald-700 font-semibold">FREE</span>
                ) : (
                  <span className="text-[#3B2416]">+ ₹{deliveryFee}</span>
                )}
              </div>
              {amountToFreeDelivery > 0 && (
                <div
                  className="mt-2 rounded-lg bg-[#FFF7DA] border border-[#F0DC8A] px-3 py-2 text-[11px] text-[#5C3A14]"
                  data-testid="free-delivery-hint"
                >
                  Add <b>₹{amountToFreeDelivery.toFixed(0)} more</b> to your cart and delivery becomes <b>FREE</b>.
                </div>
              )}
              <div className="border-t border-[#EADFCF] mt-2 pt-2 flex justify-between font-semibold text-[#2A1A14]">
                <span>Total</span>
                <span data-testid="checkout-final-total">₹{finalTotal.toFixed(0)}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-[#7B5A48] mb-2">Payment method</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm transition-colors ${
                    paymentMethod === 'online'
                      ? 'border-[#B93826] bg-[#B93826]/5 text-[#B93826]'
                      : 'border-[#EADFCF] bg-white text-[#3B2416]'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Pay Online</div>
                    <div className="text-[10px] opacity-70">UPI / Card / Wallet</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm transition-colors ${
                    paymentMethod === 'cod'
                      ? 'border-[#B93826] bg-[#B93826]/5 text-[#B93826]'
                      : 'border-[#EADFCF] bg-white text-[#3B2416]'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Cash on Delivery</div>
                    <div className="text-[10px] opacity-70">Pay at doorstep</div>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium flex items-center justify-center gap-2"
            >
              {paymentMethod === 'cod' ? (
                <>
                  <Banknote className="w-4 h-4" /> Place order · ₹{finalTotal.toFixed(0)} COD
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" /> Pay ₹{finalTotal.toFixed(0)} via Razorpay
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-[#7B5A48]">
              {paymentMethod === 'cod'
                ? 'Rider will collect cash when delivering.'
                : 'UPI / Cards / Wallets · Secured by Razorpay'}
            </p>
          </form>
        )}

        {step === 'paying' && (
          <div className="p-10 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-[#B93826] animate-spin" />
            <p className="mt-5 font-serif text-lg text-[#2A1A14]">Opening payment…</p>
            <p className="text-xs text-[#7B5A48]">Complete the payment in the Razorpay window.</p>
          </div>
        )}

        {step === 'success' && orderSnapshot && (
          <Bill
            order={orderDetails}
            items={orderSnapshot.items}
            subtotal={orderSnapshot.subtotal}
            customer={orderSnapshot.customer}
            paymentMethod={paymentMethod}
            grossSubtotal={orderSnapshot.grossSubtotal}
            discount={orderSnapshot.discount}
            firstOrderDiscountApplied={orderSnapshot.firstOrderDiscountApplied}
            couponCode={orderSnapshot.couponCode}
            deliverySlot={orderSnapshot.deliverySlot}
            deliveryFee={orderSnapshot.deliveryFee}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
};

export default CheckoutDialog;
