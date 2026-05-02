import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Plus, Pencil, Trash2, Star, Phone, LogOut, ShoppingBag, User,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { api } from '../lib/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { toast } from 'sonner';

// Profile — Customer self-service hub. Requires Google sign-in.
// Sections: Account, Linked Phone, Saved Addresses (multi).
const Profile = () => {
  const { user, loading, signIn, signOut, refresh } = useCustomerAuth();
  const navigate = useNavigate();
  const [linking, setLinking] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [editor, setEditor] = useState(null); // null | { id?, label, address, lat, lng, is_default }
  const [savingName, setSavingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Pre-fill name from auth
  useEffect(() => {
    if (user?.name) setNameInput(user.name);
  }, [user?.name]);

  // Load addresses once phone is linked
  const loadAddresses = async () => {
    if (!user?.phone) {
      setAddresses([]);
      return;
    }
    setAddrLoading(true);
    try {
      const { data } = await api.get('/customer/addresses');
      setAddresses(data.addresses || []);
    } catch (_) {
      setAddresses([]);
    } finally {
      setAddrLoading(false);
    }
  };

  useEffect(() => { loadAddresses(); }, [user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const linkPhone = async () => {
    const cleaned = (phoneInput || '').replace(/\D/g, '');
    if (cleaned.length !== 10) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLinking(true);
    try {
      await api.post('/customer/link-phone', { phone: cleaned });
      await refresh();
      toast.success('Phone linked! Loading your orders…');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not link phone');
    } finally {
      setLinking(false);
    }
  };

  const updateName = async () => {
    const v = (nameInput || '').trim();
    if (!v) { toast.error('Name cannot be empty'); return; }
    setSavingName(true);
    try {
      await api.put('/customer/profile', { name: v });
      toast.success('Name updated');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Update failed');
    } finally {
      setSavingName(false);
    }
  };

  const saveAddress = async (form) => {
    try {
      if (form.id) {
        await api.put(`/customer/addresses/${form.id}`, {
          label: form.label, address: form.address, lat: form.lat, lng: form.lng, is_default: form.is_default,
        });
      } else {
        await api.post('/customer/addresses', {
          label: form.label, address: form.address, lat: form.lat, lng: form.lng, is_default: form.is_default,
        });
      }
      setEditor(null);
      await loadAddresses();
      toast.success('Address saved');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await api.delete(`/customer/addresses/${id}`);
      await loadAddresses();
      toast.success('Address removed');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const setDefault = async (a) => {
    try {
      await api.put(`/customer/addresses/${a.id}`, { ...a, is_default: true });
      await loadAddresses();
    } catch (e) {
      toast.error('Could not set default');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // ---------- Loading / signed-out states ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F]/30 border-t-[#D32F2F] animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-md mx-auto px-5 py-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FFEBEE] flex items-center justify-center mb-4">
            <User className="w-7 h-7 text-[#D32F2F]" />
          </div>
          <h1 className="text-2xl font-bold text-[#212121]">Sign in to ChickenCrew</h1>
          <p className="mt-2 text-sm text-[#616161]">
            Sign in with Google to manage saved addresses and view your order history.
          </p>
          <button
            onClick={() => signIn('/profile')}
            data-testid="profile-google-signin-btn"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#E0E0E0] bg-white hover:bg-[#F5F5F5] text-[#212121] font-semibold shadow-sm"
          >
            <GoogleIcon /> Sign in with Google
          </button>
          <Link to="/" className="block mt-4 text-sm text-[#616161] hover:text-[#D32F2F]">← Back to home</Link>
        </div>
      </div>
    );
  }

  // ---------- Signed-in dashboard ----------
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20 md:pb-0">
      <Navbar />
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-6 md:py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-[#616161] hover:text-[#D32F2F]">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Header card */}
        <div className="mt-3 rounded-xl bg-white border border-[#E0E0E0] p-5 md:p-6">
          <div className="flex items-center gap-4">
            {user.picture ? (
              <img src={user.picture} alt={user.name || 'avatar'} className="w-14 h-14 rounded-full border border-[#E0E0E0]" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#FFEBEE] flex items-center justify-center">
                <User className="w-6 h-6 text-[#D32F2F]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-bold text-lg text-[#212121] truncate" data-testid="profile-name">
                {user.name || 'Welcome'}
              </div>
              <div className="text-sm text-[#616161] truncate">{user.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              data-testid="profile-signout-btn"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E0E0E0] hover:border-[#D32F2F] hover:text-[#D32F2F] text-[#212121] text-sm font-semibold"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>

          {/* Quick links */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              to="/orders"
              data-testid="profile-orders-link"
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#FFEBEE] text-[#D32F2F] font-semibold hover:bg-[#FFCDD2]"
            >
              <ShoppingBag className="w-4 h-4" /> My Orders
            </Link>
            <button
              onClick={handleSignOut}
              className="sm:hidden flex items-center gap-2 px-4 py-3 rounded-lg border border-[#E0E0E0] text-[#212121] font-semibold"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>

        {/* Phone-link gate */}
        {!user.phone ? (
          <div
            data-testid="profile-link-phone-section"
            className="mt-5 rounded-xl bg-white border border-[#E0E0E0] p-5 md:p-6"
          >
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#D32F2F]" />
              <h2 className="font-bold text-lg text-[#212121]">Link your phone</h2>
            </div>
            <p className="mt-1 text-sm text-[#616161]">
              We use your phone to find your past orders and saved addresses. One phone per account.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                data-testid="profile-phone-input"
                className="flex-1 px-4 py-3 rounded-lg border border-[#E0E0E0] focus:border-[#D32F2F] focus:outline-none text-[#212121]"
              />
              <button
                onClick={linkPhone}
                disabled={linking || phoneInput.length !== 10}
                data-testid="profile-link-phone-btn"
                className="px-5 py-3 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold disabled:opacity-50"
              >
                {linking ? 'Linking…' : 'Link'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Account details */}
            <div className="mt-5 rounded-xl bg-white border border-[#E0E0E0] p-5 md:p-6">
              <h2 className="font-bold text-lg text-[#212121]">Account details</h2>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs text-[#616161] font-semibold uppercase tracking-wider">Name</span>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      data-testid="profile-name-input"
                      className="flex-1 px-4 py-2.5 rounded-lg border border-[#E0E0E0] focus:border-[#D32F2F] focus:outline-none"
                    />
                    <button
                      onClick={updateName}
                      disabled={savingName || nameInput === (user.name || '')}
                      data-testid="profile-save-name-btn"
                      className="px-4 py-2.5 rounded-lg bg-[#212121] hover:bg-black text-white text-sm font-semibold disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </label>
                <div>
                  <span className="text-xs text-[#616161] font-semibold uppercase tracking-wider">Phone</span>
                  <div className="mt-1 px-4 py-2.5 rounded-lg bg-[#F5F5F5] border border-[#E0E0E0] text-[#212121] font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#D32F2F]" /> +91 {user.phone}
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="mt-5 rounded-xl bg-white border border-[#E0E0E0] p-5 md:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-[#212121]">Saved addresses</h2>
                <button
                  onClick={() => setEditor({ label: 'Home', address: '', lat: null, lng: null, is_default: false })}
                  data-testid="profile-add-address-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" /> Add new
                </button>
              </div>

              {addrLoading ? (
                <div className="mt-4 space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-20 rounded-lg bg-[#F5F5F5] animate-pulse" />
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <div data-testid="profile-addresses-empty" className="mt-4 text-center py-8 border-2 border-dashed border-[#E0E0E0] rounded-lg">
                  <MapPin className="w-8 h-8 text-[#E0E0E0] mx-auto mb-2" />
                  <p className="text-sm text-[#616161]">No saved addresses yet. Add one to speed up checkout.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3" data-testid="profile-addresses-list">
                  {addresses.map((a) => (
                    <li
                      key={a.id}
                      data-testid={`profile-address-${a.id}`}
                      className="rounded-lg border border-[#E0E0E0] p-4 flex items-start gap-3 hover:border-[#D32F2F]/40"
                    >
                      <MapPin className="w-5 h-5 text-[#D32F2F] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#212121] font-bold">{a.label}</span>
                          {a.is_default && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider bg-[#FFEBEE] text-[#D32F2F] px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-[#D32F2F]" /> DEFAULT
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-[#616161] leading-relaxed break-words">{a.address}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {!a.is_default && (
                          <button
                            onClick={() => setDefault(a)}
                            className="text-[11px] text-[#616161] hover:text-[#D32F2F] font-semibold"
                            data-testid={`profile-address-default-btn-${a.id}`}
                          >
                            Set default
                          </button>
                        )}
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditor(a)}
                            aria-label="Edit"
                            data-testid={`profile-address-edit-btn-${a.id}`}
                            className="p-1.5 rounded text-[#616161] hover:text-[#D32F2F] hover:bg-[#FFEBEE]"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteAddress(a.id)}
                            aria-label="Delete"
                            data-testid={`profile-address-delete-btn-${a.id}`}
                            className="p-1.5 rounded text-[#616161] hover:text-[#D32F2F] hover:bg-[#FFEBEE]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {editor && (
        <AddressEditor
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={saveAddress}
        />
      )}
    </div>
  );
};

const AddressEditor = ({ initial, onClose, onSave }) => {
  const [label, setLabel] = useState(initial.label || 'Home');
  const [address, setAddress] = useState(initial.address || '');
  const [isDefault, setIsDefault] = useState(!!initial.is_default);

  const submit = (e) => {
    e.preventDefault();
    if (!address || address.trim().length < 5) return;
    onSave({
      id: initial.id,
      label: label.trim() || 'Home',
      address: address.trim(),
      lat: initial.lat || null,
      lng: initial.lng || null,
      is_default: isDefault,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="address-editor-overlay"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 md:p-6"
      >
        <h3 className="font-bold text-lg text-[#212121]">
          {initial.id ? 'Edit address' : 'Add new address'}
        </h3>
        <div className="mt-4 space-y-3">
          <div>
            <span className="text-xs text-[#616161] font-semibold uppercase tracking-wider">Label</span>
            <div className="mt-1 flex gap-2 flex-wrap">
              {['Home', 'Office', 'Other'].map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLabel(l)}
                  data-testid={`address-label-${l.toLowerCase()}-btn`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${label === l ? 'bg-[#D32F2F] text-white' : 'bg-[#F5F5F5] text-[#212121] border border-[#E0E0E0]'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs text-[#616161] font-semibold uppercase tracking-wider">Address</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              minLength={5}
              maxLength={400}
              rows={3}
              data-testid="address-editor-input"
              className="mt-1 w-full px-4 py-3 rounded-lg border border-[#E0E0E0] focus:border-[#D32F2F] focus:outline-none resize-none"
              placeholder="Flat / building, street, area, city, pincode"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 accent-[#D32F2F]"
              data-testid="address-editor-default-toggle"
            />
            <span className="text-sm text-[#212121]">Set as default delivery address</span>
          </label>
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-[#E0E0E0] text-[#212121] font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="address-editor-save-btn"
            className="px-5 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold"
          >
            {initial.id ? 'Save changes' : 'Add address'}
          </button>
        </div>
      </form>
    </div>
  );
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92c-.26 1.36-1.04 2.51-2.21 3.28v2.72h3.57c2.09-1.92 3.22-4.74 3.22-8.03z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.72c-.99.66-2.27 1.05-3.71 1.05-2.85 0-5.27-1.92-6.13-4.51H2.18v2.83A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.87 14.16A6.6 6.6 0 0 1 5.5 12c0-.75.13-1.48.37-2.16V7H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.99l3.69-2.83z"/>
    <path fill="#EA4335" d="M12 5.38c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.45 2.06 14.97 1 12 1A11 11 0 0 0 2.18 7l3.69 2.84C6.73 7.3 9.15 5.38 12 5.38z"/>
  </svg>
);

export default Profile;
