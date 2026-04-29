import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  LogOut, Plus, Pencil, Trash2, Save, X, Upload, IndianRupee,
  ClipboardList, Package, TrendingUp, ImageIcon, Loader2, Store,
  Star, MessageSquare, CheckCircle2,
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
  <div className="bg-white border border-[#EADFCF] rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <div className="text-xs tracking-wider text-[#7B5A48] font-medium">{label}</div>
      <div className="w-9 h-9 rounded-full bg-[#F4E4D1] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#B93826]" />
      </div>
    </div>
    <div className="mt-3 font-serif text-3xl font-bold text-[#2A1A14]">{value}</div>
    {sub && <div className="text-xs text-[#7B5A48] mt-1">{sub}</div>}
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

  useEffect(() => {
    if (session && isAdmin) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAdmin]);

  const loadAll = async () => {
    await Promise.all([loadProducts(), loadOrders(), loadShop(), loadReviews()]);
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
    else loadOrders();
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this order permanently?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message });
    else {
      toast({ title: 'Order deleted' });
      loadOrders();
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

  if (loading) return <div className="min-h-screen bg-[#FAF4EC] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#B93826]" /></div>;
  if (!session || !isAdmin) return <Navigate to="/auth" replace />;

  const activeOrders = orders.filter((o) => o.payment_status === 'paid' || o.payment_status === 'preparing' || o.payment_status === 'ready' || o.payment_status === 'out_for_delivery');
  const revenueToday = orders
    .filter((o) => new Date(o.created_at).toISOString().slice(0, 10) === todayISO() && o.payment_status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#FAF4EC]">
      <Navbar />

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">SHOP DASHBOARD</div>
            <h1 className="font-serif text-4xl text-[#2A1A14] mt-1">Admin</h1>
            <p className="text-sm text-[#7B5A48] mt-1">Signed in as {session.user.email}</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-full border border-[#EADFCF] hover:border-[#B93826] text-sm text-[#3B2416] flex items-center gap-1.5"
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
          <div className="bg-white border border-[#EADFCF] rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F4E4D1] flex items-center justify-center">
                  <Store className="w-5 h-5 text-[#B93826]" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2A1A14]">Shop Settings</h3>
                  <p className="text-xs text-[#7B5A48]">Change shop name, phone, address, UPI ID, and rider passcode.</p>
                </div>
              </div>
              <button
                onClick={saveShop}
                disabled={savingShop || !shopDraft}
                className="px-4 py-2 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                {savingShop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#7B5A48]">Shop name</label>
                <input
                  value={shopDraft?.shop_name || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, shop_name: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#7B5A48]">Contact phone</label>
                <input
                  value={shopDraft?.contact_phone || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, contact_phone: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#7B5A48]">Address</label>
                <textarea
                  rows={2}
                  value={shopDraft?.address || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, address: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#7B5A48]">Notice (shown in shop)</label>
                <input
                  value={shopDraft?.notice || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, notice: e.target.value })}
                  placeholder="e.g., Closed Monday for market day"
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#7B5A48]">UPI ID</label>
                <input
                  value={shopDraft?.upi_id || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, upi_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#7B5A48]">Rider passcode</label>
                <input
                  value={shopDraft?.rider_passcode || ''}
                  onChange={(e) => setShopDraft({ ...shopDraft, rider_passcode: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Products + Prices */}
        <div className="bg-white border border-[#EADFCF] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#2A1A14]">Products & Today's Board</h3>
              <p className="text-xs text-[#7B5A48] mt-1">Click a price to edit. Hide a product by toggling active.</p>
            </div>
            <button
              onClick={() => setShowAddProduct(true)}
              className="px-4 py-2 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add product
            </button>
          </div>

          {showAddProduct && (
            <div className="border border-dashed border-[#B93826] rounded-xl p-4 mb-4 bg-[#FAF4EC]">
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  placeholder="Name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#EADFCF] text-sm"
                  data-testid="admin-new-product-name"
                />
                <input
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#EADFCF] text-sm"
                  data-testid="admin-new-product-desc"
                />
                <select
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[#EADFCF] text-sm bg-white"
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
                <button onClick={() => setShowAddProduct(false)} className="px-4 py-1.5 rounded-full border border-[#EADFCF] text-sm">Cancel</button>
                <button onClick={addProduct} className="px-4 py-1.5 rounded-full bg-[#B93826] text-white text-sm">Save</button>
              </div>
            </div>
          )}

          <ul className="divide-y divide-[#EADFCF]">
            {products.map((p) => (
              <li key={p.id} className="py-4 flex flex-wrap items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#F3EADB] overflow-hidden flex items-center justify-center shrink-0 relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#7B5A48]" />
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
                  <div className="font-serif text-lg text-[#2A1A14]">{p.name}</div>
                  <div className="text-xs text-[#7B5A48]">{p.description}</div>
                </div>
                <div className="min-w-[120px]">
                  {editingPrice === p.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[#B93826]">₹</span>
                      <input
                        autoFocus
                        type="number"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="w-20 px-2 py-1 rounded-md border border-[#B93826] text-right text-sm"
                      />
                      <button onClick={() => savePrice(p.id)} className="p-1.5 rounded-md bg-[#B93826] text-white">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingPrice(null)} className="p-1.5 rounded-md text-[#7B5A48]">
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
                      <span className="font-serif font-bold text-[#B93826] text-xl">₹{priceMap[p.id] ?? '—'}</span>
                      <span className="text-xs text-[#7B5A48] ml-1">/{normalizeUnit(p.unit)}</span>
                      <Pencil className="w-3 h-3 inline ml-2 text-[#7B5A48]" />
                    </button>
                  )}
                </div>
                <select
                  value={normalizeUnit(p.unit)}
                  onChange={(e) => updateUnit(p.id, e.target.value)}
                  className="px-2.5 py-1.5 rounded-full border border-[#EADFCF] text-xs bg-white text-[#3B2416] hover:border-[#B93826]/40 transition-colors"
                  title="Change unit"
                  data-testid={`admin-unit-select-${p.id}`}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-[#7B5A48]">
                  <input
                    type="checkbox"
                    checked={p.is_active}
                    onChange={() => toggleActive(p)}
                    className="w-4 h-4 accent-[#B93826]"
                  />
                  Active
                </label>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="p-2 rounded-full text-[#7B5A48] hover:text-white hover:bg-[#B93826]"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Orders */}
        <div className="bg-white border border-[#EADFCF] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#2A1A14]">Orders</h3>
              <p className="text-xs text-[#7B5A48] mt-1">Update status · delete old ones to keep it tidy</p>
            </div>
            <button
              onClick={bulkDeleteDelivered}
              className="px-4 py-2 rounded-full border border-[#EADFCF] hover:border-[#B93826] text-sm text-[#3B2416] flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Clean up (delivered + cancelled)
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-[#7B5A48] text-sm">No orders yet.</div>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="border border-[#EADFCF] rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-semibold text-[#2A1A14]">
                        {o.customer_name}
                        <span className="text-xs text-[#7B5A48] ml-2 font-normal">· {o.customer_phone}</span>
                      </div>
                      <div className="text-xs text-[#7B5A48]">
                        {new Date(o.created_at).toLocaleString('en-IN')} · {o.upi_txn_ref ? `✅ ${o.upi_txn_ref.slice(0, 18)}` : 'unpaid'}
                      </div>
                    </div>
                    <div className="font-serif font-bold text-[#B93826] text-lg">₹{Number(o.total_amount).toFixed(0)}</div>
                  </div>
                  <div className="mt-2 text-xs text-[#3B2416]">
                    {Array.isArray(o.items) && o.items.map((i, idx) => (
                      <span key={idx} className="mr-2">{i.name} × {i.qty}kg</span>
                    ))}
                  </div>
                  {o.customer_address && <div className="text-xs text-[#7B5A48] mt-1">📍 {o.customer_address}</div>}
                  {o.delivery_lat && o.delivery_lng && (
                    <a
                      href={`https://maps.google.com/?q=${o.delivery_lat},${o.delivery_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#B93826] underline"
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
                            ? 'bg-[#B93826] text-white border-[#B93826]'
                            : 'bg-white border-[#EADFCF] text-[#3B2416] hover:border-[#B93826]/40'
                        }`}
                      >
                        {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                    <button
                      onClick={() => deleteOrder(o.id)}
                      className="text-xs px-3 py-1 rounded-full text-[#7B5A48] hover:text-white hover:bg-[#B93826] ml-auto"
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
        <div className="bg-white border border-[#EADFCF] rounded-2xl p-6 mt-6" data-testid="admin-reviews-panel">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F4E4D1] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#B93826]" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2A1A14]">Customer Reviews</h3>
                <p className="text-xs text-[#7B5A48] mt-1">
                  Approve to publish on home page · {reviews.filter((r) => !r.is_approved).length} pending ·{' '}
                  {reviews.filter((r) => r.is_approved).length} live
                </p>
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-10 text-[#7B5A48] text-sm">
              No reviews yet. They'll show up here when customers submit them.
            </div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className={`border rounded-xl p-4 ${
                    r.is_approved ? 'border-emerald-200 bg-emerald-50/40' : 'border-[#EADFCF] bg-[#FFF7DA]/30'
                  }`}
                  data-testid={`admin-review-${r.id}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-[#2A1A14]">{r.name}</div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i <= (r.rating || 0)
                                  ? 'text-[#F5A623] fill-[#F5A623]'
                                  : 'text-[#EADFCF]'
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
                      <div className="text-xs text-[#7B5A48] mt-0.5">
                        {new Date(r.created_at).toLocaleString('en-IN')}
                        {r.phone ? ` · ${r.phone}` : ''}
                      </div>
                      <p className="mt-2 text-sm text-[#3B2416] leading-relaxed">{r.comment}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {r.is_approved ? (
                        <button
                          onClick={() => setReviewApproved(r.id, false)}
                          className="text-xs px-3 py-1.5 rounded-full border border-[#EADFCF] text-[#3B2416] hover:border-[#B93826]/40"
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
                        className="text-xs px-3 py-1.5 rounded-full text-[#7B5A48] hover:text-white hover:bg-[#B93826]"
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
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Admin;
