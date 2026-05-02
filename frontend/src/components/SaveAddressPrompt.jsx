import React, { useEffect, useState } from 'react';
import { MapPin, X, Check, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { toast } from 'sonner';

// Normalize an address string for fuzzy duplicate detection.
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[,.\-/]/g, '').trim();

// SaveAddressPrompt — Shown on the Bill screen after a successful order
// IF: (1) the customer is signed in, (2) they entered an address, and
// (3) that address isn't already in their saved address book.
//
// Lets them stamp it with a label (Home / Office / Other) and save with one tap.
const SaveAddressPrompt = ({ address, lat, lng }) => {
  const { user } = useCustomerAuth();
  const [eligible, setEligible] = useState(null); // null=checking, true=show, false=hide
  const [label, setLabel] = useState('Home');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkEligibility = async () => {
      // Gate: must be signed in WITH a linked phone, and have entered an address
      if (!user?.phone || !address || address.trim().length < 5) {
        setEligible(false);
        return;
      }
      try {
        const { data } = await api.get('/customer/addresses');
        const existing = data?.addresses || [];
        const target = norm(address);
        const dup = existing.some((a) => norm(a.address) === target);
        if (!cancelled) setEligible(!dup);
      } catch (_) {
        if (!cancelled) setEligible(false);
      }
    };
    checkEligibility();
    return () => { cancelled = true; };
  }, [user?.phone, address]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/customer/addresses', {
        label,
        address: address.trim(),
        lat: lat || null,
        lng: lng || null,
        is_default: false,
      });
      setDone(true);
      toast.success(`Saved as ${label}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  if (!eligible || dismissed) return null;

  return (
    <div
      data-testid="save-address-prompt"
      className="mx-5 mt-4 mb-2 rounded-xl border border-[#E0E0E0] bg-[#FFEBEE]/40 p-4"
    >
      {done ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold" data-testid="save-address-success">
          <Check className="w-4 h-4" /> Address saved as <b>{label}</b>. We'll reuse it next time.
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#E0E0E0] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#D32F2F]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[#212121] text-sm">Save this address for next time?</div>
              <p className="text-[12px] text-[#616161] mt-0.5 line-clamp-2 leading-snug">
                {address}
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              data-testid="save-address-dismiss-btn"
              className="p-1 rounded-md text-[#616161] hover:text-[#D32F2F]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            {['Home', 'Office', 'Other'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLabel(l)}
                data-testid={`save-address-label-${l.toLowerCase()}-btn`}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${label === l ? 'bg-[#D32F2F] text-white' : 'bg-white text-[#212121] border border-[#E0E0E0] hover:border-[#D32F2F]'}`}
              >
                {l}
              </button>
            ))}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              data-testid="save-address-save-btn"
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-xs font-bold disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SaveAddressPrompt;
