import React, { useState } from 'react';
import { X, CheckCircle2, Smartphone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const CheckoutDialog = ({ open, onClose }) => {
  const { items, subtotal, clear, setIsOpen } = useCart();
  const { toast } = useToast();
  const [step, setStep] = useState('form'); // form | paying | success
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  if (!open) return null;

  const handlePay = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast({ title: 'Missing details', description: 'Please fill your name and phone.' });
      return;
    }
    setStep('paying');
    // Simulated payment (Razorpay/UPI mock)
    setTimeout(() => {
      setStep('success');
    }, 1600);
  };

  const handleDone = () => {
    clear();
    setStep('form');
    setForm({ name: '', phone: '', address: '' });
    onClose();
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#FAF4EC] rounded-2xl w-full max-w-md shadow-2xl border border-[#EADFCF] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EADFCF]">
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
              <label className="text-xs font-medium text-[#7B5A48]">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#7B5A48]">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                placeholder="10-digit mobile"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#7B5A48]">Delivery Address (optional)</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm resize-none"
                placeholder="Leave blank for pickup at shop"
              />
            </div>

            <div className="rounded-xl bg-[#F3EADB] p-4">
              <div className="text-xs text-[#7B5A48] mb-2">Order summary</div>
              <ul className="space-y-1 text-sm text-[#3B2416]">
                {items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      {i.name} × {i.qty} kg
                    </span>
                    <span>₹{(i.price * i.qty).toFixed(0)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[#EADFCF] mt-2 pt-2 flex justify-between font-semibold text-[#2A1A14]">
                <span>Total</span>
                <span>₹{subtotal.toFixed(0)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Pay ₹{subtotal.toFixed(0)} via UPI
            </button>
            <p className="text-[11px] text-center text-[#7B5A48]">
              Powered by Razorpay (mock). Real payment requires backend keys.
            </p>
          </form>
        )}

        {step === 'paying' && (
          <div className="p-10 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-[#B93826] border-t-transparent rounded-full animate-spin" />
            <p className="mt-5 font-serif text-lg text-[#2A1A14]">Connecting to UPI...</p>
            <p className="text-xs text-[#7B5A48]">Approve the payment request on your phone.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 flex flex-col items-center text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            <h4 className="mt-4 font-serif text-2xl text-[#2A1A14]">Order placed!</h4>
            <p className="text-sm text-[#7B5A48] mt-1">
              We'll prep your cuts. You'll get a call on {form.phone}.
            </p>
            <div className="mt-5 rounded-xl bg-[#F3EADB] px-5 py-3">
              <div className="text-xs text-[#7B5A48]">Paid</div>
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
