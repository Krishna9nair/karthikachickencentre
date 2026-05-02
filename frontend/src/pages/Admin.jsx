import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  LogOut, Plus, Pencil, Trash2, Save, X, Upload, IndianRupee,
  ClipboardList, Package, TrendingUp, ImageIcon, Loader2, Store,
  Star, MessageSquare, CheckCircle2, Tag, Clock, RefreshCw,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { UNITS, UNIT_LABEL, isValidUnit, normalizeUnit } from '../lib/units';

const todayISO = () => new Date().toISOString().slice(0, 10);

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-white border border-[#E0E0E0] rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <div className="text-xs tracking-wider text-[#616161] font-medium">{label}</div>
      <div className="w-9 h-9 rounded-full bg-[#FFEBEE] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#D32F2F]" />
      </div>
    </div>
    <div className="mt-3 font-serif text-3xl font-bold text-[#212121]">{value}</div>
    {sub && <div className="text-xs text-[#616161] mt-1">{sub}</div>}
  </div>
);

const Admin = () => {
  const { session, isAdmin, loading, signOut } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState([]);
  const [priceMap, setPriceMap] = useState({}); // product_id -> price
  const [orders, setOrders] = useState([]);
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceInput, setPriceInput] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', unit: 'kg' });
  const [uploading, setUploading] = useState(null);
  const [shop, setShop] = useState(null);
  const [shopDraft, setShopDraft] = useState(null);
  const [savingShop, setSavingShop] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'pct',
    discount_value: '',
    min_order_amount: '',
    valid_until: '',
  });
  const [disabledSlots, setDisabledSlots] = useState([]);
  const [slotBookings, setSlotBookings] = useState({});

  useEffect(() => {
    if (session && isAdmin) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAdmin]);

  const loadAll = async () => {
    await Promise.all([
      loadProducts(), loadOrders(), loadShop(), loadReviews(),
      loadCoupons(), loadDisabledSlots(), loadSlotBookings(),
    ]);
  };

  const loadSlotBookings = async () => {
    // Count active orders per (date, slot) for today + tomorrow.
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const { data } = await supabase
      .from('orders')
      .select('delivery_slot_date, delivery_slot_start, payment_status')
      .gte('delivery_slot_date', todayIso)
      .neq('payment_status', 'cancelled');
    const map = {};
    for (const r of data || []) {
      if (!r.delivery_slot_date || !r.delivery_slot_start) continue;
      const key = `${r.delivery_slot_date}|${(r.delivery_slot_start || '').slice(0, 5)}`;
      map[key] = (map[key] || 0) + 1;
    }
    setSlotBookings(map);
  };

  const loadDisabledSlots = async () => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const { data } = await supabase
      .from('disabled_slots')
      .select('*')
      .gte('slot_date', todayIso)
      .order('slot_date', { ascending: true });
    setDisabledSlots(data || []);
  };

  const toggleSlotDisabled = async (slotDate, slotStart, currentlyDisabled) => {
    if (currentlyDisabled) {
      const { error } = await supabase
        .from('disabled_slots')
        .delete()
        .eq('slot_date', slotDate)
        .eq('slot_start', slotStart);
      if (error) toast({ title: 'Failed', description: error.message });
    } else {
      const { error } = await supabase
        .from('disabled_slots')
        .insert({ slot_date: slotDate, slot_start: slotStart, reason: 'Closed by admin' });
      if (error) toast({ title: 'Failed', description: error.message });
    }
    loadDisabledSlots();
  };

  const loadCoupons = async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    setCoupons(data || []);
  };

  const addCoupon = async () => {
    const code = newCoupon.code.trim().toUpperCase();
    const value = parseFloat(newCoupon.discount_value);
    if (!code || isNaN(value) || value <= 0) {
      toast({ title: 'Invalid coupon', description: 'Code and a positive discount value required.' });
      return;
    }
    const payload = {
      code,
      discount_type: newCoupon.discount_type,
      discount_value: value,
      min_order_amount: parseFloat(newCoupon.min_order_amount) || 0,
      valid_until: newCoupon.valid_until ? new Date(newCoupon.valid_until).toISOString() : null,
      is_active: true,
    };
    const { error } = await supabase.from('coupons').upsert(payload, { onConflict: 'code' });
    if (error) toast({ title: 'Save failed', description: error.message });
    else {
      toast({ title: 'Coupon saved' });
      setShowAddCoupon(false);
      setNewCoupon({ code: '', discount_type: 'pct', discount_value: '', min_order_amount: '', valid_until: '' });
      loadCoupons();
    }
  };

  const toggleCouponActive = async (c) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !c.is_active })
      .eq('code', c.code);
    if (error) toast({ title: 'Update failed', description: error.message });
    else loadCoupons();
  };

  const deleteCoupon = async (code) => {
    if (!window.confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
    const { error } = await supabase.from('coupons').delete().eq('code', code);
    if (error) toast({ title: 'Delete failed', description: error.message });
    else {
      toast({ title: 'Coupon deleted' });
      loadCoupons();
    }
  };

  const loadReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    setReviews(data || []);
  };

  const setReviewApproved = async (id, approved) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: approved })
      .eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message });
    else {
      toast({ title: approved ? 'Review approved' : 'Review hidden' });
      loadReviews();
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message });
    else {
      toast({ title: 'Review deleted' });
      loadReviews();
    }
  };

  const loadShop = async () => {
    const { data } = await supabase.from('shop_settings').select('*').limit(1).maybeSingle();
    setShop(data);
    setShopDraft(data);
  };

  const saveShop = async () => {
    if (!shopDraft?.id) return;
    setSavingShop(true);
    // Race the update against an 8-second timeout so the spinner can never
    // hang forever (e.g., flaky network, RLS rejection without error event).
    const updatePromise = supabase
      .from('shop_settings')
      .update({
        shop_name: shopDraft.shop_name,
        contact_phone: shopDraft.contact_phone,
        address: shopDraft.address,
        notice: shopDraft.notice,
        upi_id: shopDraft.upi_id,
        rider_passcode: shopDraft.rider_passcode,
        sunday_wheel_enabled: shopDraft.sunday_wheel_enabled !== false,
      })
      .eq('id', shopDraft.id)
      .select('id')
      .maybeSingle();

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Save timed out — check your network and try again.')), 8000)
    );

    try {
      const { error, data } = await Promise.race([updatePromise, timeout]);
      if (error) throw error;
      if (!data) {
        toast({
          title: 'Save blocked',
          description:
            'No row updated. Make sure you are signed in as admin and the row exists.',
        });
      } else {
        toast({ title: 'Shop settings updated' });
        setShop(shopDraft);
        // Bust the public localStorage cache so customers see new info quickly
        try { localStorage.removeItem('cc_shop_v1'); } catch (_) {}
      }
    } catch (err) {
      toast({ title: 'Save failed', description: err.message || String(err) });
    } finally {
      setSavingShop(false);
    }
  };

  const loadProducts = async () => {
    const [{ data: prods }, { data: prices }] = await Promise.all([
      supabase.from('products').select('*').order('sort_order'),
      supabase.from('daily_prices').select('*').eq('price_date', todayISO()),
    ]);
    setProducts(prods || []);
    const pm = {};
    (prices || []).forEach((p) => (pm[p.product_id] = Number(p.price_per_unit)));
    // fallback to latest price if today's not set
    const missing = (prods || []).filter((p) => !(p.id in pm)).map((p) => p.id);
    if (missing.length) {
      const { data: latest } = await supabase
        .from('daily_prices')
        .select('*')
        .in('product_id', missing)
        .order('price_date', { ascending: false });
      (latest || []).forEach((p) => {
        if (!(p.product_id in pm)) pm[p.product_id] = Number(p.price_per_unit);
      });
    }
    setPriceMap(pm);
  };

  const loadOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const savePrice = async (product_id) => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) {
      toast({ title: 'Invalid price' });
      return;
    }
    const { error } = await supabase.from('daily_prices').upsert(
      { product_id, price_per_unit: price, price_date: todayISO() },
      { onConflict: 'product_id,price_date' }
    );
    if (error) {
      toast({ title: 'Save failed', description: error.message });
    } else {
      toast({ title: 'Price updated' });
      setPriceMap((prev) => ({ ...prev, [product_id]: price }));
      setEditingPrice(null);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message });
    else {
      toast({ title: 'Product deleted' });
      loadProducts();
    }
  };

  const toggleActive = async (p) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !p.is_active })
      .eq('id', p.id);
    if (error) toast({ title: 'Update failed', description: error.message });
    else loadProducts();
  };

  const addProduct = async () => {
    if (!newProduct.name.trim()) return;
    if (!isValidUnit(newProduct.unit)) {
      toast({ title: 'Invalid unit', description: 'Choose kg, dzn, or piece.' });
      return;
    }
    const maxSort = products.reduce((m, p) => Math.max(m, p.sort_order || 0), 0);
    const { error } = await supabase.from('products').insert({
      name: newProduct.name,
      description: newProduct.description,
      unit: normalizeUnit(newProduct.unit),
      sort_order: maxSort + 1,
      is_active: true,
    });
    if (error) toast({ title: 'Add failed', description: error.message });
    else {
      toast({ title: 'Product added' });
      setShowAddProduct(false);
      setNewProduct({ name: '', description: '', unit: 'kg' });
      loadProducts();
    }
  };

  const updateUnit = async (product_id, unit) => {
    if (!isValidUnit(unit)) {
      toast({ title: 'Invalid unit', description: 'Choose kg, dzn, or piece.' });
      return;
    }
    const { error } = await supabase
      .from('products')
      .update({ unit: normalizeUnit(unit) })
      .eq('id', product_id);
    if (error) toast({ title: 'Update failed', description: error.message });
    else {
      toast({ title: 'Unit updated' });
      loadProducts();
    }
  };

  const uploadImage = async (product_id, file) => {
    setUploading(product_id);
    try {
      const fd = new FormData();
      fd.append('product_id', product_id);
      fd.append('admin_token', session.access_token);
      fd.append('file', file);
      const resp = await api.post('/admin/upload-product-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: 'Image uploaded' });
      setProducts((prev) => prev.map((p) => (p.id === product_id ? { ...p, image_url: resp.data.image_url } : p)));
    } catch (err) {
      toast({ title: 'Upload failed', description: err?.response?.data?.detail || err.message });
    } finally {
      setUploading(null);
    }
  };

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ payment_status: status }).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message });
    else {
      loadOrders();
      loadSlotBookings();
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this order permanently?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message });
    else {
      toast({ title: 'Order deleted' });
      loadOrders();
      loadSlotBookings();
    }
  };

  const bulkDeleteDelivered = async () => {
    if (!window.confirm('Delete all delivered & cancelled orders?')) return;
    const { error } = await supabase.from('orders').delete().in('payment_status', ['delivered', 'cancelled']);
    if (error) toast({ title: 'Delete failed', description: error.message });
    else {
      toast({ title: 'Old orders cleaned up' });
      loadOrders();
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" /></div>;
  if (!session || !isAdmin) return <Navigate to="/auth" replace />;

  const activeOrders = orders.filter((o) => o.payment_status === 'paid' || o.payment_status === 'preparing' || o.payment_status === 'ready' || o.payment_status === 'out_for_delivery');
  const revenueToday = orders
    .filter((o) => new Date(o.created_at).toISOString().slice(0, 10) === todayISO() && o.payment_status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Navbar />

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.25em] font-semibold text-[#D32F2F]">SHOP DASHBOARD</div>
            <h1 className="font-serif text-4xl text-[#212121] mt-1">Admin</h1>
            <p className="text-sm text-[#616161] mt-1">Signed in as {session.user.email}</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-full border border-[#E0E0E0] hover:border-[#D32F2F] text-sm text-[#212121] flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={ClipboardList} label="ORDERS TODAY" value={orders.filter((o) => new Date(o.created_at).toISOString().slice(0,10) === todayISO()).length} sub="All statuses" />
          <StatCard icon={IndianRupee} label="REVENUE TODAY" value={`₹${revenueToday.toFixed(0)}`} />
          <StatCard icon={Package} label="ACTIVE" value={activeOrders.length} sub="Paid / preparing / ready" />
          <StatCard icon={TrendingUp} label="PRODUCTS" value={products.filter((p) => p.is_active).length} sub={`${products.length} total`} />
        </div>

        {/* Shop Settings */}
        {shop && (
          <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFEBEE] flex items-center justify-center">
                  <Store className="w-5 h-5 text-[#D32F2F]" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#212121]">Shop Settings</h3>
                  <p className="text-xs text-[#616161]">Change shop name, phone, address, UPI ID, and rider passcode.</p>
                </div>
              </div>
              <button
                onClick={saveShop}
                disabled={savingShop || !shopDraft}
                className="px-4 py-2 rounded-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                {savingShop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#616161]">Shop name</label>
                <input
                  value={shopDraft?.shop_name || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, shop_name: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus:outline-none focus:border-[#D32F2F] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#616161]">Contact phone</label>
                <input
                  value={shopDraft?.contact_phone || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, contact_phone: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus:outline-none focus:border-[#D32F2F] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#616161]">Address</label>
                <textarea
                  rows={2}
                  value={shopDraft?.address || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, address: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus:outline-none focus:border-[#D32F2F] text-sm resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#616161]">Notice (shown in shop)</label>
                <input
                  value={shopDraft?.notice || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, notice: e.target.value })}
                  placeholder="e.g., Closed Monday for market day"
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus:outline-none focus:border-[#D32F2F] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#616161]">UPI ID</label>
                <input
                  value={shopDraft?.upi_id || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, upi_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus:outline-none focus:border-[#D32F2F] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#616161]">Rider passcode</label>
                <input
                  value={shopDraft?.rider_passcode || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, rider_passcode: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white focus:outline-none focus:border-[#D32F2F] text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E0E0E0] bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shopDraft?.sunday_wheel_enabled !== false}
                    onChange={(e) =>
                      setShopDraft({ ...shopDraft, sunday_wheel_enabled: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#D32F2F]"
                    data-testid="shop-sunday-wheel-toggle"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#212121]">Sunday Lucky Spin</div>
                    <div className="text-[11px] text-[#616161]">
                      Show the spinning wheel to customers every Sunday. Uncheck to pause the promo.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Products + Prices */}
        <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#212121]">Products & Today's Board</h3>
              <p className="text-xs text-[#616161] mt-1">Click a price to edit. Hide a product by toggling active.</p>
            </div>
            <button
              onClick={() => setShowAddProduct(true)}
              className="px-4 py-2 rounded-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add product
            </button>
          </div>

          {showAddProduct && (
            <div className="border border-dashed border-[#D32F2F] rounded-xl p-4 mb-4 bg-[#FFFFFF]">
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  placeholder="Name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm"
                  data-testid="admin-new-product-name"
                />
                <input
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm"
                  data-testid="admin-new-product-desc"
                />
                <select
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm bg-white"
                  data-testid="admin-new-product-unit"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      Sold by: {UNIT_LABEL[u]} ({u})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <button onClick={() => setShowAddProduct(false)} className="px-4 py-1.5 rounded-full border border-[#E0E0E0] text-sm">Cancel</button>
                <button onClick={addProduct} className="px-4 py-1.5 rounded-full bg-[#D32F2F] text-white text-sm">Save</button>
              </div>
            </div>
          )}

          <ul className="divide-y divide-[#E0E0E0]">
            {products.map((p) => (
              <li key={p.id} className="py-4 flex flex-wrap items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#F5F5F5] overflow-hidden flex items-center justify-center shrink-0 relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#616161]" />
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadImage(p.id, e.target.files[0])}
                    />
                    {uploading === p.id ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                    )}
                  </label>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <div className="font-serif text-lg text-[#212121]">{p.name}</div>
                  <div className="text-xs text-[#616161]">{p.description}</div>
                </div>
                <div className="min-w-[120px]">
                  {editingPrice === p.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[#D32F2F]">₹</span>
                      <input
                        autoFocus
                        type="number"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="w-20 px-2 py-1 rounded-md border border-[#D32F2F] text-right text-sm"
                      />
                      <button onClick={() => savePrice(p.id)} className="p-1.5 rounded-md bg-[#D32F2F] text-white">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingPrice(null)} className="p-1.5 rounded-md text-[#616161]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPrice(p.id);
                        setPriceInput(String(priceMap[p.id] ?? ''));
                      }}
                      className="text-left"
                    >
                      <span className="font-serif font-bold text-[#D32F2F] text-xl">₹{priceMap[p.id] ?? '—'}</span>
                      <span className="text-xs text-[#616161] ml-1">/{normalizeUnit(p.unit)}</span>
                      <Pencil className="w-3 h-3 inline ml-2 text-[#616161]" />
                    </button>
                  )}
                </div>
                <select
                  value={normalizeUnit(p.unit)}
                  onChange={(e) => updateUnit(p.id, e.target.value)}
                  className="px-2.5 py-1.5 rounded-full border border-[#E0E0E0] text-xs bg-white text-[#212121] hover:border-[#D32F2F]/40 transition-colors"
                  title="Change unit"
                  data-testid={`admin-unit-select-${p.id}`}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-[#616161]">
                  <input
                    type="checkbox"
                    checked={p.is_active}
                    onChange={() => toggleActive(p)}
                    className="w-4 h-4 accent-[#D32F2F]"
                  />
                  Active
                </label>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="p-2 rounded-full text-[#616161] hover:text-white hover:bg-[#D32F2F]"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Orders */}
        <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#212121]">Orders</h3>
              <p className="text-xs text-[#616161] mt-1">Update status · delete old ones to keep it tidy</p>
            </div>
            <button
              onClick={bulkDeleteDelivered}
              className="px-4 py-2 rounded-full border border-[#E0E0E0] hover:border-[#D32F2F] text-sm text-[#212121] flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Clean up (delivered + cancelled)
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-[#616161] text-sm">No orders yet.</div>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="border border-[#E0E0E0] rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-semibold text-[#212121]">
                        {o.customer_name}
                        <span className="text-xs text-[#616161] ml-2 font-normal">· {o.customer_phone}</span>
                      </div>
                      <div className="text-xs text-[#616161]">
                        {new Date(o.created_at).toLocaleString('en-IN')} · {o.upi_txn_ref ? `✅ ${o.upi_txn_ref.slice(0, 18)}` : 'unpaid'}
                      </div>
                    </div>
                    <div className="font-serif font-bold text-[#D32F2F] text-lg">₹{Number(o.total_amount).toFixed(0)}</div>
                  </div>
                  <div className="mt-2 text-xs text-[#212121]">
                    {Array.isArray(o.items) && o.items.map((i, idx) => (
                      <span key={idx} className="mr-2">{i.name} × {i.qty}kg</span>
                    ))}
                  </div>
                  {o.customer_address && <div className="text-xs text-[#616161] mt-1">📍 {o.customer_address}</div>}
                  {o.delivery_slot_label && (
                    <div className="text-xs text-[#D32F2F] font-semibold mt-1 inline-flex items-center gap-1 bg-[#FFF7DA] border border-[#F0DC8A] px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" />
                      {o.delivery_slot_date} · {o.delivery_slot_label}
                    </div>
                  )}
                  {o.delivery_lat && o.delivery_lng && (
                    <a
                      href={`https://maps.google.com/?q=${o.delivery_lat},${o.delivery_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#D32F2F] underline"
                    >
                      View location on map
                    </a>
                  )}
                  <div className="mt-3 flex gap-2 flex-wrap items-center">
                    {['cod_pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateOrderStatus(o.id, s)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          o.payment_status === s
                            ? 'bg-[#D32F2F] text-white border-[#D32F2F]'
                            : 'bg-white border-[#E0E0E0] text-[#212121] hover:border-[#D32F2F]/40'
                        }`}
                      >
                        {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                    <button
                      onClick={() => deleteOrder(o.id)}
                      className="text-xs px-3 py-1 rounded-full text-[#616161] hover:text-white hover:bg-[#D32F2F] ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reviews moderation */}
        <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 mt-6" data-testid="admin-reviews-panel">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFEBEE] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#D32F2F]" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#212121]">Customer Reviews</h3>
                <p className="text-xs text-[#616161] mt-1">
                  Approve to publish on home page · {reviews.filter((r) => !r.is_approved).length} pending ·{' '}
                  {reviews.filter((r) => r.is_approved).length} live
                </p>
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-10 text-[#616161] text-sm">
              No reviews yet. They'll show up here when customers submit them.
            </div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className={`border rounded-xl p-4 ${
                    r.is_approved ? 'border-emerald-200 bg-emerald-50/40' : 'border-[#E0E0E0] bg-[#FFF7DA]/30'
                  }`}
                  data-testid={`admin-review-${r.id}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-[#212121]">{r.name}</div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i <= (r.rating || 0)
                                  ? 'text-[#F5A623] fill-[#F5A623]'
                                  : 'text-[#E0E0E0]'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            r.is_approved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.is_approved ? 'Live' : 'Pending'}
                        </span>
                      </div>
                      <div className="text-xs text-[#616161] mt-0.5">
                        {new Date(r.created_at).toLocaleString('en-IN')}
                        {r.phone ? ` · ${r.phone}` : ''}
                      </div>
                      <p className="mt-2 text-sm text-[#212121] leading-relaxed">{r.comment}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {r.is_approved ? (
                        <button
                          onClick={() => setReviewApproved(r.id, false)}
                          className="text-xs px-3 py-1.5 rounded-full border border-[#E0E0E0] text-[#212121] hover:border-[#D32F2F]/40"
                          data-testid={`admin-review-hide-${r.id}`}
                        >
                          Hide
                        </button>
                      ) : (
                        <button
                          onClick={() => setReviewApproved(r.id, true)}
                          className="text-xs px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                          data-testid={`admin-review-approve-${r.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => deleteReview(r.id)}
                        className="text-xs px-3 py-1.5 rounded-full text-[#616161] hover:text-white hover:bg-[#D32F2F]"
                        data-testid={`admin-review-delete-${r.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Coupon codes */}
        <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 mt-6" data-testid="admin-coupons-panel">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFEBEE] flex items-center justify-center">
                <Tag className="w-5 h-5 text-[#D32F2F]" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#212121]">Coupon Codes</h3>
                <p className="text-xs text-[#616161] mt-1">
                  Create discount codes. One use per phone number.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddCoupon(true)}
              data-testid="admin-add-coupon-btn"
              className="px-4 py-2 rounded-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New coupon
            </button>
          </div>

          {showAddCoupon && (
            <div className="border border-dashed border-[#D32F2F] rounded-xl p-4 mb-4 bg-[#FFFFFF]">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  placeholder="CODE (e.g. WELCOME20)"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm font-mono uppercase tracking-wide"
                  data-testid="admin-new-coupon-code"
                />
                <select
                  value={newCoupon.discount_type}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm bg-white"
                  data-testid="admin-new-coupon-type"
                >
                  <option value="pct">% off</option>
                  <option value="flat">₹ flat off</option>
                </select>
                <input
                  type="number"
                  placeholder={newCoupon.discount_type === 'pct' ? '% (e.g. 20)' : '₹ off'}
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm"
                  data-testid="admin-new-coupon-value"
                />
                <input
                  type="number"
                  placeholder="Min order ₹ (optional)"
                  value={newCoupon.min_order_amount}
                  onChange={(e) => setNewCoupon({ ...newCoupon, min_order_amount: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm"
                  data-testid="admin-new-coupon-min"
                />
                <input
                  type="date"
                  placeholder="Expires (optional)"
                  value={newCoupon.valid_until}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm"
                  data-testid="admin-new-coupon-expiry"
                />
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddCoupon(false)}
                  className="px-4 py-1.5 rounded-full border border-[#E0E0E0] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addCoupon}
                  data-testid="admin-save-coupon-btn"
                  className="px-4 py-1.5 rounded-full bg-[#D32F2F] text-white text-sm"
                >
                  Save coupon
                </button>
              </div>
            </div>
          )}

          {coupons.length === 0 ? (
            <div className="text-center py-10 text-[#616161] text-sm">
              No coupons yet. Click "New coupon" to create one.
            </div>
          ) : (
            <ul className="divide-y divide-[#E0E0E0]">
              {coupons.map((c) => {
                const expired =
                  c.valid_until && new Date(c.valid_until) < new Date();
                return (
                  <li key={c.code} className="py-3 flex items-center flex-wrap gap-3">
                    <div className="font-mono font-bold text-[#212121] tracking-wide">{c.code}</div>
                    <div className="text-sm text-[#212121]">
                      {c.discount_type === 'pct'
                        ? `${Number(c.discount_value)}% off`
                        : `₹${Number(c.discount_value)} off`}
                    </div>
                    {Number(c.min_order_amount) > 0 && (
                      <div className="text-xs text-[#616161]">
                        min ₹{Number(c.min_order_amount).toFixed(0)}
                      </div>
                    )}
                    {c.valid_until && (
                      <div
                        className={`text-xs ${
                          expired ? 'text-[#D32F2F] font-semibold' : 'text-[#616161]'
                        }`}
                      >
                        {expired ? 'EXPIRED · ' : 'until '}
                        {new Date(c.valid_until).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        c.is_active && !expired
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {!c.is_active ? 'Disabled' : expired ? 'Expired' : 'Live'}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-[#616161]">
                        <input
                          type="checkbox"
                          checked={c.is_active}
                          onChange={() => toggleCouponActive(c)}
                          className="w-4 h-4 accent-[#D32F2F]"
                          data-testid={`admin-coupon-toggle-${c.code}`}
                        />
                        Active
                      </label>
                      <button
                        onClick={() => deleteCoupon(c.code)}
                        data-testid={`admin-coupon-delete-${c.code}`}
                        className="p-2 rounded-full text-[#616161] hover:text-white hover:bg-[#D32F2F]"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Delivery slot management — admin can disable specific slots */}
        <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 mt-6" data-testid="admin-slots-panel">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#FFEBEE] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#D32F2F]" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold text-[#212121]">Delivery Slots</h3>
              <p className="text-xs text-[#616161] mt-1">
                Tap a slot to block it for that day (e.g. you're closed, or out of stock).
              </p>
            </div>
            <button
              onClick={loadSlotBookings}
              aria-label="Refresh bookings"
              data-testid="admin-slots-refresh-btn"
              className="p-2 rounded-lg border border-[#E0E0E0] text-[#616161] hover:text-[#D32F2F] hover:border-[#D32F2F]"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Daily summary cards */}
          <div className="grid grid-cols-2 gap-3 mb-5" data-testid="admin-slots-summary">
            {[0, 1].map((dayOffset) => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              d.setDate(d.getDate() + dayOffset);
              const dateIso = d.toISOString().slice(0, 10);
              const SLOT_STARTS = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];
              const totalBooked = SLOT_STARTS.reduce(
                (sum, s) => sum + (slotBookings[`${dateIso}|${s}`] || 0), 0
              );
              const totalCap = SLOT_STARTS.length * 10; // 60
              const pct = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;
              const fullSlots = SLOT_STARTS.filter(
                (s) => (slotBookings[`${dateIso}|${s}`] || 0) >= 10
              ).length;
              const accent = pct >= 80 ? '#D32F2F' : pct >= 50 ? '#F57C00' : '#2E7D32';
              return (
                <div
                  key={dateIso}
                  data-testid={`admin-slot-summary-${dayOffset === 0 ? 'today' : 'tomorrow'}`}
                  className="rounded-xl border border-[#E0E0E0] bg-[#F5F5F5] p-3"
                >
                  <div className="text-[10px] font-bold tracking-wider text-[#616161] uppercase">
                    {dayOffset === 0 ? 'Today' : 'Tomorrow'}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold" style={{ color: accent }}>
                      {totalBooked}
                    </span>
                    <span className="text-sm text-[#616161]">/ {totalCap} booked</span>
                  </div>
                  {/* Fill bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-white border border-[#E0E0E0] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: accent }}
                    />
                  </div>
                  <div className="mt-1.5 text-[10px] text-[#616161]">
                    {fullSlots > 0 ? (
                      <span className="text-[#D32F2F] font-semibold">{fullSlots} slot{fullSlots > 1 ? 's' : ''} full</span>
                    ) : (
                      <span>{pct}% capacity</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {[0, 1].map((dayOffset) => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + dayOffset);
            const dateIso = d.toISOString().slice(0, 10);
            const slots = [
              { start: '09:00', label: '9–11 AM' },
              { start: '11:00', label: '11 AM–1 PM' },
              { start: '13:00', label: '1–3 PM' },
              { start: '15:00', label: '3–5 PM' },
              { start: '17:00', label: '5–7 PM' },
              { start: '19:00', label: '7–9 PM' },
            ];
            return (
              <div key={dateIso} className="mb-3">
                <div className="text-xs font-semibold text-[#616161] uppercase tracking-wider mb-2">
                  {dayOffset === 0 ? 'Today' : 'Tomorrow'} · {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => {
                    const isDisabled = disabledSlots.some(
                      (ds) => ds.slot_date === dateIso && (ds.slot_start || '').slice(0, 5) === s.start
                    );
                    const booked = slotBookings[`${dateIso}|${s.start}`] || 0;
                    const isFull = booked >= 10;
                    const heat = booked === 0
                      ? null
                      : isFull
                        ? 'bg-[#D32F2F] text-white'
                        : booked >= 7
                          ? 'bg-[#F57C00] text-white'
                          : booked >= 4
                            ? 'bg-[#FFEBEE] text-[#D32F2F]'
                            : 'bg-emerald-50 text-emerald-700';
                    return (
                      <button
                        key={s.start}
                        onClick={() => toggleSlotDisabled(dateIso, s.start, isDisabled)}
                        data-testid={`admin-slot-${dateIso}-${s.start}`}
                        className={`relative px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center min-w-[100px] ${
                          isDisabled
                            ? 'bg-[#FFEBEE] text-[#D32F2F] border-[#D32F2F] line-through'
                            : isFull
                            ? 'bg-[#F5F5F5] text-[#D32F2F] border-[#D32F2F]'
                            : 'bg-white text-[#212121] border-[#E0E0E0] hover:border-[#D32F2F]/40'
                        }`}
                      >
                        {/* Booking count chip — top-right */}
                        {!isDisabled && booked > 0 && (
                          <span className={`absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shadow ${heat}`}>
                            {booked}
                          </span>
                        )}
                        <span>{s.label}</span>
                        <span className={`text-[9px] mt-0.5 font-semibold ${
                          isDisabled ? 'text-[#D32F2F]' : isFull ? 'text-[#D32F2F]' : 'text-[#616161]'
                        }`}>
                          {booked}/10 booked{isFull ? ' · FULL' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#616161]">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-50 border border-emerald-200" /> Light load
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#FFEBEE] border border-[#FFCDD2]" /> Filling up
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#F57C00]" /> Almost full
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#D32F2F]" /> Full / blocked
            </span>
          </div>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Admin;
