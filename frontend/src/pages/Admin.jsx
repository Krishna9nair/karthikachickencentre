import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { PRODUCTS, MOCK_ORDERS } from '../data/mock';
import { ClipboardList, Package, IndianRupee, TrendingUp, Edit2, Check } from 'lucide-react';

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
  const [prices, setPrices] = useState(PRODUCTS.map((p) => ({ ...p })));
  const [editingId, setEditingId] = useState(null);
  const [orders, setOrders] = useState(MOCK_ORDERS);

  const updatePrice = (id, newPrice) => {
    setPrices((prev) =>
      prev.map((p) => (p.id === id ? { ...p, price: parseInt(newPrice) || 0 } : p))
    );
  };

  const updateStatus = (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const todaysRevenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="min-h-screen bg-[#FAF4EC]">
      <Navbar />

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="mb-8">
          <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">
            SHOP DASHBOARD
          </div>
          <h1 className="font-serif text-4xl text-[#2A1A14] mt-1">Admin</h1>
          <p className="text-sm text-[#7B5A48] mt-1">
            Update today's board and manage incoming orders.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={ClipboardList} label="ORDERS TODAY" value={orders.length} sub="Live from UPI" />
          <StatCard icon={IndianRupee} label="REVENUE" value={`₹${todaysRevenue}`} sub="Collected today" />
          <StatCard icon={Package} label="READY" value={orders.filter((o) => o.status === 'Ready').length} />
          <StatCard icon={TrendingUp} label="AVG TICKET" value={`₹${Math.round(todaysRevenue / orders.length)}`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#EADFCF] rounded-2xl p-6">
            <h3 className="font-serif text-xl font-bold text-[#2A1A14]">Today's Board</h3>
            <p className="text-xs text-[#7B5A48] mt-1 mb-4">Click edit to update price (₹/kg).</p>
            <ul className="divide-y divide-[#EADFCF]">
              {prices.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between">
                  <span className="font-serif text-[#2A1A14]">{p.name}</span>
                  <div className="flex items-center gap-2">
                    {editingId === p.id ? (
                      <input
                        type="number"
                        autoFocus
                        value={p.price}
                        onChange={(e) => updatePrice(p.id, e.target.value)}
                        className="w-20 px-2 py-1 rounded-md border border-[#B93826] text-right text-sm"
                      />
                    ) : (
                      <span className="font-serif font-bold text-[#B93826]">₹{p.price}</span>
                    )}
                    <button
                      onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                      className="p-1.5 rounded-md hover:bg-[#F4E4D1] text-[#3B2416]"
                    >
                      {editingId === p.id ? <Check className="w-4 h-4" /> : <Edit2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-[#EADFCF] rounded-2xl p-6">
            <h3 className="font-serif text-xl font-bold text-[#2A1A14]">Recent Orders</h3>
            <p className="text-xs text-[#7B5A48] mt-1 mb-4">Update status to keep customers posted.</p>
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="border border-[#EADFCF] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#2A1A14]">{o.id} · {o.customer}</div>
                      <div className="text-xs text-[#7B5A48]">{o.time} · {o.payment}</div>
                    </div>
                    <div className="font-serif font-bold text-[#B93826]">₹{o.total}</div>
                  </div>
                  <div className="mt-2 text-xs text-[#3B2416]">
                    {o.items.map((i) => `${i.name} × ${i.qty}kg`).join(', ')}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {['Preparing', 'Ready', 'Out for delivery', 'Delivered'].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(o.id, s)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          o.status === s
                            ? 'bg-[#B93826] text-white border-[#B93826]'
                            : 'bg-white border-[#EADFCF] text-[#3B2416] hover:border-[#B93826]/40'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Admin;
