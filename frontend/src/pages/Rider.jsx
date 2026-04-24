import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { RIDER_DELIVERIES } from '../data/mock';
import { Bike, MapPin, Phone, Navigation2, CheckCircle2 } from 'lucide-react';

const Rider = () => {
  const [deliveries, setDeliveries] = useState(RIDER_DELIVERIES);

  const markDelivered = (id) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'Delivered' } : d))
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF4EC]">
      <Navbar />

      <section className="max-w-5xl mx-auto px-5 md:px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#B93826] flex items-center justify-center">
            <Bike className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">
              DELIVERY PORTAL
            </div>
            <h1 className="font-serif text-4xl text-[#2A1A14]">Rider</h1>
          </div>
        </div>
        <p className="text-sm text-[#7B5A48] mb-8">
          Your active deliveries for today. Tap “Navigate” for directions.
        </p>

        <div className="space-y-4">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-[#EADFCF] rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-[#2A1A14]">{d.id}</span>
                  <span
                    className={`text-[10px] tracking-wider px-2 py-0.5 rounded-full ${
                      d.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-[#F4E4D1] text-[#B93826]'
                    }`}
                  >
                    {d.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-1 text-lg font-medium text-[#2A1A14]">{d.customer}</div>
                <div className="mt-2 flex items-start gap-2 text-sm text-[#3B2416]">
                  <MapPin className="w-4 h-4 text-[#B93826] mt-0.5 shrink-0" />
                  <span>{d.address}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-[#3B2416]">
                  <Phone className="w-4 h-4 text-[#B93826] shrink-0" />
                  <a href={`tel:${d.phone}`} className="hover:text-[#B93826]">
                    {d.phone}
                  </a>
                </div>
                <div className="mt-3 text-sm text-[#7B5A48]">
                  <span className="font-semibold text-[#2A1A14]">Items: </span>
                  {d.items}
                </div>
              </div>

              <div className="md:w-52 flex md:flex-col items-end justify-between gap-3">
                <div className="text-right">
                  <div className="text-xs text-[#7B5A48]">Collect on delivery</div>
                  <div className="font-serif text-2xl font-bold text-[#B93826]">₹{d.total}</div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(d.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-full border border-[#EADFCF] hover:border-[#B93826] text-sm text-[#3B2416] flex items-center gap-1.5"
                  >
                    <Navigation2 className="w-3.5 h-3.5" /> Navigate
                  </a>
                  {d.status !== 'Delivered' && (
                    <button
                      onClick={() => markDelivered(d.id)}
                      className="px-3 py-2 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Rider;
