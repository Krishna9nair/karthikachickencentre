import React, { useEffect, useState } from 'react';
import { Bike, MapPin, Phone, Navigation2, CheckCircle2, Lock, LogOut, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const TOKEN_KEY = 'fc_rider_token';

const Rider = () => {
  const { toast } = useToast();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [passcode, setPasscode] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (token) loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const r = await api.get('/rider/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(r.data.orders || []);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        toast({ title: 'Session expired', description: 'Please log in again.' });
      } else {
        toast({ title: 'Failed to load', description: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const r = await api.post('/rider/login', { passcode });
      localStorage.setItem(TOKEN_KEY, r.data.token);
      setToken(r.data.token);
      setPasscode('');
    } catch (err) {
      toast({ title: 'Login failed', description: err?.response?.data?.detail || err.message });
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOrders([]);
  };

  const markStatus = async (id, status) => {
    try {
      await api.post(
        `/rider/orders/${id}/status`,
        { payment_status: status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: `Marked ${status.replace(/_/g, ' ')}` });
      loadOrders();
    } catch (err) {
      toast({ title: 'Update failed', description: err?.response?.data?.detail || err.message });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FAF4EC]">
        <Navbar />
        <section className="max-w-md mx-auto px-5 py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#B93826] flex items-center justify-center">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">DELIVERY PORTAL</div>
              <h1 className="font-serif text-4xl text-[#2A1A14]">Rider</h1>
            </div>
          </div>
          <form onSubmit={login} className="bg-white border border-[#EADFCF] rounded-2xl p-6">
            <label className="text-xs font-medium text-[#7B5A48]">Passcode</label>
            <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus-within:border-[#B93826]">
              <Lock className="w-4 h-4 text-[#7B5A48]" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                className="flex-1 outline-none text-sm bg-transparent"
                placeholder="Enter rider passcode"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="mt-4 w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign in as Rider
            </button>
            <p className="text-[11px] text-center text-[#7B5A48] mt-3">
              Passcode is shared by the shop admin.
            </p>
          </form>
        </section>
        <Footer />
        <CartDrawer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF4EC]">
      <Navbar />

      <section className="max-w-5xl mx-auto px-5 md:px-8 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#B93826] flex items-center justify-center">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">DELIVERY PORTAL</div>
              <h1 className="font-serif text-4xl text-[#2A1A14]">Rider</h1>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-full border border-[#EADFCF] hover:border-[#B93826] text-sm text-[#3B2416] flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-[#7B5A48]"><Loader2 className="w-5 h-5 animate-spin inline" /> Loading deliveries…</div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-[#7B5A48]">
            <p className="font-serif text-xl text-[#2A1A14]">No active deliveries</p>
            <p className="text-sm">New paid orders will appear here automatically.</p>
            <button onClick={loadOrders} className="mt-4 px-4 py-2 rounded-full bg-[#B93826] text-white text-sm">Refresh</button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className="bg-white border border-[#EADFCF] rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-[#2A1A14]">#{o.id.slice(0, 8)}</span>
                    <span className="text-[10px] tracking-wider px-2 py-0.5 rounded-full bg-[#F4E4D1] text-[#B93826]">
                      {String(o.payment_status).replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-medium text-[#2A1A14]">{o.customer_name}</div>
                  {o.customer_address && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-[#3B2416]">
                      <MapPin className="w-4 h-4 text-[#B93826] mt-0.5 shrink-0" />
                      <span>{o.customer_address}</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-sm text-[#3B2416]">
                    <Phone className="w-4 h-4 text-[#B93826] shrink-0" />
                    <a href={`tel:${o.customer_phone}`} className="hover:text-[#B93826]">
                      {o.customer_phone}
                    </a>
                  </div>
                  <div className="mt-3 text-sm text-[#7B5A48]">
                    <span className="font-semibold text-[#2A1A14]">Items: </span>
                    {Array.isArray(o.items)
                      ? o.items.map((i) => `${i.qty}kg ${i.name}`).join(', ')
                      : ''}
                  </div>
                </div>

                <div className="md:w-56 flex md:flex-col items-end justify-between gap-3">
                  <div className="text-right">
                    <div className="text-xs text-[#7B5A48]">Paid online</div>
                    <div className="font-serif text-2xl font-bold text-[#B93826]">₹{Number(o.total_amount).toFixed(0)}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {o.delivery_lat && o.delivery_lng ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${o.delivery_lat},${o.delivery_lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-full border border-[#EADFCF] hover:border-[#B93826] text-sm text-[#3B2416] flex items-center gap-1.5"
                      >
                        <Navigation2 className="w-3.5 h-3.5" /> Navigate
                      </a>
                    ) : o.customer_address ? (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(o.customer_address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-full border border-[#EADFCF] hover:border-[#B93826] text-sm text-[#3B2416] flex items-center gap-1.5"
                      >
                        <Navigation2 className="w-3.5 h-3.5" /> Navigate
                      </a>
                    ) : null}
                    {o.payment_status !== 'delivered' && (
                      <>
                        {o.payment_status !== 'out_for_delivery' && (
                          <button
                            onClick={() => markStatus(o.id, 'out_for_delivery')}
                            className="px-3 py-2 rounded-full border border-[#B93826] text-[#B93826] text-sm"
                          >
                            Pick up
                          </button>
                        )}
                        <button
                          onClick={() => markStatus(o.id, 'delivered')}
                          className="px-3 py-2 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Rider;
