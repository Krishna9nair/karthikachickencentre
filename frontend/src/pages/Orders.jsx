import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, ShoppingCart, X, Calendar, Clock, RefreshCw, ChevronRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { api } from '../lib/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { formatQty } from '../lib/units';

const TABS = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABEL = {
  cod_pending: 'COD · Pending',
  paid: 'Paid · Preparing',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  rejected: 'Rejected',
};

// Orders — Customer order history. Three tabs: Ongoing / Delivered / Cancelled.
// Each card supports Cancel (pending only) and Reorder (refills cart).
const Orders = () => {
  const { user, loading, signIn } = useCustomerAuth();
  const navigate = useNavigate();
  const { addItem, setIsOpen } = useCart();

  const [tab, setTab] = useState('ongoing');
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = async () => {
    if (!user?.phone) { setStatus('ready'); setOrders([]); return; }
    setStatus('loading');
    try {
      const { data } = await api.get('/customer/orders', { params: { status: tab } });
      setOrders(data.orders || []);
      setStatus('ready');
    } catch (_) {
      setStatus('error');
    }
  };

  useEffect(() => { load(); }, [tab, user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelOrder = async (id) => {
    if (!window.confirm('Cancel this pending order?')) return;
    try {
      await api.post(`/customer/orders/${id}/cancel`, { reason: '' });
      toast.success('Order cancelled');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not cancel');
    }
  };

  const reorder = (order) => {
    const items = order.items || [];
    if (items.length === 0) { toast.error('No items to reorder'); return; }
    items.forEach((it) => {
      addItem(
        {
          id: it.id || it.product_id,
          name: it.name,
          price: Number(it.price) || 0,
          unit: it.unit || 'kg',
        },
        Number(it.qty) || 1
      );
    });
    toast.success(`${items.length} item${items.length > 1 ? 's' : ''} added to cart`);
    setIsOpen(true);
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
            <Package className="w-7 h-7 text-[#D32F2F]" />
          </div>
          <h1 className="text-2xl font-bold text-[#212121]">Sign in to see your orders</h1>
          <p className="mt-2 text-sm text-[#616161]">Track ongoing deliveries, browse past orders, and reorder in one tap.</p>
          <button
            onClick={() => signIn('/orders')}
            data-testid="orders-signin-btn"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#E0E0E0] hover:bg-[#F5F5F5] text-[#212121] font-semibold shadow-sm"
          >
            Sign in with Google
          </button>
          <Link to="/" className="block mt-4 text-sm text-[#616161] hover:text-[#D32F2F]">← Back to home</Link>
        </div>
      </div>
    );
  }

  if (!user.phone) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-md mx-auto px-5 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#212121]">Link your phone first</h1>
          <p className="mt-2 text-sm text-[#616161]">
            Your past orders are tied to your phone. Add it on your profile to see them here.
          </p>
          <button
            onClick={() => navigate('/profile')}
            data-testid="orders-link-phone-cta"
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold"
          >
            Go to profile <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ---------- Orders dashboard ----------
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20 md:pb-0">
      <Navbar />
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-6 md:py-10">
        <div className="flex items-center justify-between gap-3">
          <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-[#616161] hover:text-[#D32F2F]">
            <ArrowLeft className="w-4 h-4" /> Profile
          </Link>
          <button
            onClick={load}
            aria-label="Refresh"
            data-testid="orders-refresh-btn"
            className="p-2 rounded-lg border border-[#E0E0E0] text-[#616161] hover:text-[#D32F2F] hover:border-[#D32F2F]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-[#212121] tracking-tight">My Orders</h1>

        {/* Tabs */}
        <div
          role="tablist"
          className="mt-5 inline-flex bg-white rounded-lg border border-[#E0E0E0] p-1"
          data-testid="orders-tabs"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              data-testid={`orders-tab-${t.key}`}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === t.key ? 'bg-[#D32F2F] text-white' : 'text-[#212121] hover:text-[#D32F2F]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-5">
          {status === 'loading' ? (
            <div className="space-y-3" data-testid="orders-loading">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-white border border-[#E0E0E0] animate-pulse" />
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="text-center py-10 text-[#616161]" data-testid="orders-error">
              Couldn't load orders.
              <button onClick={load} className="ml-2 text-[#D32F2F] font-semibold">Retry</button>
            </div>
          ) : orders.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <ul className="space-y-3" data-testid="orders-list">
              {orders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onReorder={() => reorder(o)}
                  onCancel={() => cancelOrder(o.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ order, onReorder, onCancel }) => {
  const statusKey = (order.payment_status || '').toLowerCase();
  const statusLabel = STATUS_LABEL[statusKey] || statusKey || 'Pending';
  const canCancel = ['cod_pending', 'paid', 'preparing', 'ready'].includes(statusKey);
  const isCancelled = ['cancelled', 'canceled', 'rejected'].includes(statusKey);
  const created = useMemo(() => order.created_at ? new Date(order.created_at) : null, [order.created_at]);

  return (
    <li
      data-testid={`order-card-${order.id}`}
      className="rounded-xl bg-white border border-[#E0E0E0] p-4 md:p-5 hover:border-[#D32F2F]/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold tracking-wider text-[#616161]">
              #{(order.id || '').toString().slice(0, 8).toUpperCase()}
            </span>
            <span
              className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
                isCancelled
                  ? 'bg-[#F5F5F5] text-[#616161]'
                  : statusKey === 'delivered' || statusKey === 'completed'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-[#FFEBEE] text-[#D32F2F]'
              }`}
            >
              {statusLabel.toUpperCase()}
            </span>
          </div>
          {created && (
            <div className="mt-1 flex items-center gap-1 text-xs text-[#616161]">
              <Calendar className="w-3 h-3" /> {created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              <span className="mx-1">·</span>
              <Clock className="w-3 h-3" /> {created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-bold text-lg text-[#212121]">₹{Number(order.total_amount || 0).toFixed(0)}</div>
          {order.delivery_slot_date && order.delivery_slot_start && (
            <div className="text-[11px] text-[#616161] mt-0.5">
              Slot · {order.delivery_slot_start}
              {order.delivery_slot_end ? `–${order.delivery_slot_end}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <ul className="mt-3 divide-y divide-[#F5F5F5] border-t border-[#F5F5F5]">
        {(order.items || []).slice(0, 4).map((it, idx) => (
          <li key={idx} className="py-2 flex items-center justify-between text-sm">
            <span className="text-[#212121]">
              {it.name} <span className="text-[#616161]">· {formatQty(Number(it.qty) || 1, it.unit || 'kg')}</span>
            </span>
            <span className="text-[#616161]">₹{((Number(it.price) || 0) * (Number(it.qty) || 0)).toFixed(0)}</span>
          </li>
        ))}
        {(order.items || []).length > 4 && (
          <li className="py-2 text-xs text-[#616161]">+ {order.items.length - 4} more</li>
        )}
      </ul>

      {/* Address */}
      {order.customer_address && (
        <div className="mt-2 text-xs text-[#616161] line-clamp-2">
          To: {order.customer_address}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={onReorder}
          data-testid={`order-reorder-btn-${order.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
        >
          <ShoppingCart className="w-4 h-4" /> Reorder
        </button>
        {canCancel && (
          <button
            onClick={onCancel}
            data-testid={`order-cancel-btn-${order.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E0E0E0] text-[#212121] hover:border-[#D32F2F] hover:text-[#D32F2F] text-sm font-semibold"
          >
            <X className="w-4 h-4" /> Cancel order
          </button>
        )}
      </div>
    </li>
  );
};

const EmptyState = ({ tab }) => {
  const copy = {
    ongoing: { title: 'No ongoing orders', desc: 'Place a new order — it’ll show up here while it’s being prepared and delivered.' },
    delivered: { title: 'No delivered orders yet', desc: 'Once your first order is delivered, it’ll show up here.' },
    cancelled: { title: 'No cancelled orders', desc: 'You haven’t cancelled any orders. Nice!' },
  }[tab];
  return (
    <div className="text-center py-12 border-2 border-dashed border-[#E0E0E0] rounded-xl bg-white" data-testid={`orders-empty-${tab}`}>
      <Package className="w-10 h-10 text-[#E0E0E0] mx-auto" />
      <p className="mt-3 font-bold text-[#212121]">{copy.title}</p>
      <p className="text-sm text-[#616161] mt-1 max-w-md mx-auto">{copy.desc}</p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center gap-1 px-5 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
      >
        Browse menu <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
};

export default Orders;
