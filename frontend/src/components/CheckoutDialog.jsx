import React, { useState } from 'react';
import { X, CheckCircle2, MapPin, Loader2, Smartphone, Banknote } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';
import { api, loadRazorpay } from '../lib/api';

const CheckoutDialog = ({ open, onClose }) => {
  const { items, subtotal, clear, setIsOpen } = useCart();
  const { toast } = useToast();
  const [step, setStep] = useState('form'); // form | paying | success
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [location, setLocation] = useState(null); // { lat, lng }
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | ok | error
  const [orderDetails, setOrderDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online'); // online | cod

  if (!open) return null;

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation unavailable', description: 'Enter your address manually.' });
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ok');
        toast({ title: 'Location captured', description: 'Rider will use this for delivery.' });
      },
      (err) => {
        setGeoStatus('error');
        toast({ title: 'Location denied', description: err.message || 'Please enter your address.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
      total_amount: subtotal,
      notes: '',
    };

    // Cash on delivery path — no Razorpay
    if (paymentMethod === 'cod') {
      try {
        const resp = await api.post('/orders/cod', payload);
        setOrderDetails(resp.data.order);
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
        name: 'Fresh Cluck',
        description: 'Fresh chicken order',
        prefill: { name: form.name, contact: form.phone },
        theme: { color: '#B93826' },
        handler: async (resp) => {
          try {
            const verify = await api.post('/payments/verify', {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              local_order_id: data.local_order_id,
            });
            setOrderDetails(verify.data.order);
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
    setPaymentMethod('online');
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
              <label className="text-xs font-medium text-[#7B5A48]">Delivery Address</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm resize-none"
                placeholder="House/Flat, Street, Landmark"
              />
            </div>

            <button
              type="button"
              onClick={captureLocation}
              disabled={geoStatus === 'loading'}
              className={`w-full py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                location
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-[#B93826] text-[#B93826] hover:bg-[#B93826]/5'
              }`}
            >
              {geoStatus === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Getting location…
                </>
              ) : location ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Location captured ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" /> Share my live location (for rider)
                </>
              )}
            </button>

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
              <div className="border-t border-[#EADFCF] mt-2 pt-2 flex justify-between font-semibold text-[#2A1A14]">
                <span>Total</span>
                <span>₹{subtotal.toFixed(0)}</span>
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
                  <Banknote className="w-4 h-4" /> Place order · ₹{subtotal.toFixed(0)} COD
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" /> Pay ₹{subtotal.toFixed(0)} via Razorpay
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

        {step === 'success' && (
          <div className="p-8 flex flex-col items-center text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            <h4 className="mt-4 font-serif text-2xl text-[#2A1A14]">Order placed!</h4>
            <p className="text-sm text-[#7B5A48] mt-1">
              We'll prep your cuts. You'll get a call on {form.phone}.
            </p>
            {orderDetails?.id && (
              <div className="text-xs text-[#7B5A48] mt-1">
                Order ID: <span className="font-mono">{orderDetails.id.slice(0, 8)}</span>
              </div>
            )}
            <div className="mt-5 rounded-xl bg-[#F3EADB] px-5 py-3">
              <div className="text-xs text-[#7B5A48]">
                {paymentMethod === 'cod' ? 'Pay on delivery' : 'Paid'}
              </div>
              <div className="font-serif text-2xl font-bold text-[#B93826]">
                ₹{subtotal.toFixed(0)}
              </div>
            </div>
            <button
              onClick={handleDone}
              className="mt-6 w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutDialog;
