import React, { useRef, useState } from 'react';
import { CheckCircle2, MessageCircle, Printer, Copy, Check, ArrowDown, Star } from 'lucide-react';
import { formatQty, calcSubtotal, UNIT_SHORT, normalizeUnit } from '../lib/units';
import ReviewDialog from './ReviewDialog';

// Single source of truth for the admin/shop WhatsApp number that
// receives every new order notification.
const ADMIN_WHATSAPP = '919619417452';

// Build a richly-formatted WhatsApp message with order details.
// Uses WhatsApp's *bold*, _italic_ markdown so it renders nicely in chat.
const buildAdminMessage = ({ order, items, subtotal, customer, paymentMethod, deliverySlot }) => {
  const orderId = order?.id ? order.id.slice(0, 8).toUpperCase() : '—';
  const lines = items
    .map(
      (i) =>
        `• ${i.name} — ${formatQty(i.qty, i.unit)} × ₹${i.price}/${UNIT_SHORT[normalizeUnit(i.unit)]} = ₹${calcSubtotal(i.price, i.qty)}`
    )
    .join('\n');
  const payLabel =
    paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online (UPI / Card)';
  const slotLine = deliverySlot
    ? `\n*Deliver:* ${formatSlotDate(deliverySlot.date)}, ${deliverySlot.label}\n`
    : '';
  return `🐔 *NEW ORDER — ChickenCrew*

*Order ID:* ${orderId}
*Date:* ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
${slotLine}
*Customer:* ${customer.name}
*Phone:* ${customer.phone}
*Address:* ${customer.address}

*Items:*
${lines}

*Total: ₹${subtotal.toFixed(0)}*
*Payment:* ${payLabel}

— sent from karthikachickencentre.shop`;
};

// "2026-04-29" → "Today" / "Tomorrow" / "Wed, 30 Apr"
const formatSlotDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const Bill = ({
  order,
  items,
  subtotal,
  customer,
  paymentMethod,
  onDone,
  grossSubtotal,
  discount = 0,
  firstOrderDiscountApplied = false,
  couponCode = null,
  deliverySlot = null,
}) => {
  const billRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [notified, setNotified] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const orderId = order?.id ? order.id.slice(0, 8).toUpperCase() : null;
  const date = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const adminMsg = buildAdminMessage({
    order,
    items,
    subtotal,
    customer,
    paymentMethod,
    deliverySlot,
  });
  const waAdminLink = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(adminMsg)}`;

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    const itemsHtml = items
      .map(
        (i) => `
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td style="text-align:center">${escapeHtml(formatQty(i.qty, i.unit))}</td>
          <td style="text-align:right">₹${i.price}<br/><span class="rate">/${UNIT_SHORT[normalizeUnit(i.unit)]}</span></td>
          <td style="text-align:right;font-weight:600">₹${calcSubtotal(i.price, i.qty)}</td>
        </tr>`
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Bill — Karthika Chicken Centre</title>
      <style>
        body{font-family:'Segoe UI',-apple-system,Inter,Helvetica,Arial,sans-serif;color:#2A1A14;margin:0;padding:24px;background:#fff}
        .receipt{max-width:380px;margin:0 auto;border:2px dashed #C47B4A;padding:18px;border-radius:12px}
        h1{font-family:Georgia,serif;font-size:22px;margin:0;text-align:center}
        .sub{text-align:center;font-size:10px;letter-spacing:.2em;color:#7B5A48;margin-top:2px}
        .addr{text-align:center;font-size:10px;color:#7B5A48;margin-top:4px;padding-bottom:10px;border-bottom:1px solid #EADFCF}
        .row{display:flex;justify-content:space-between;font-size:11px;margin-top:10px;gap:8px}
        .row .label{color:#7B5A48;text-transform:uppercase;letter-spacing:.08em;font-size:9px}
        .cust{margin-top:8px;font-size:11px}
        .cust .name{font-weight:600}
        .cust .meta{color:#7B5A48;font-size:10px}
        table{width:100%;border-collapse:collapse;margin-top:14px;font-size:11px;border-top:1px dashed #EADFCF;padding-top:8px}
        th{font-size:9px;text-transform:uppercase;color:#7B5A48;letter-spacing:.05em;text-align:left;padding-bottom:4px}
        th:nth-child(2){text-align:center}th:nth-child(3),th:nth-child(4){text-align:right}
        td{padding:6px 0;border-top:1px solid #F3EADB;vertical-align:top}
        td .rate{font-size:9px;color:#7B5A48}
        .total{margin-top:12px;padding-top:12px;border-top:2px solid #C47B4A;display:flex;justify-content:space-between;align-items:flex-end}
        .total .pay{font-size:11px}
        .total .pay .label{font-size:9px;color:#7B5A48;text-transform:uppercase}
        .total .amount{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#B93826}
        .thanks{margin-top:10px;text-align:center;font-size:10px;color:#7B5A48;font-style:italic}
        @media print{body{padding:0}}
      </style></head>
      <body>
        <div class="receipt">
          <h1>Karthika Chicken Centre</h1>
          <div class="sub">FARM FRESH DAILY</div>
          <div class="addr">Trimurti Nagar, Dombivli East · +91 9619417452</div>
          <div class="row">
            <div><div class="label">Order ID</div><div style="font-family:monospace;font-weight:600">${escapeHtml(orderId || '—')}</div></div>
            <div style="text-align:right"><div class="label">Date</div><div>${escapeHtml(date)}</div></div>
          </div>
          <div class="cust">
            <div class="label" style="color:#7B5A48;text-transform:uppercase;font-size:9px;letter-spacing:.08em">Customer</div>
            <div class="name">${escapeHtml(customer.name)}</div>
            <div class="meta">${escapeHtml(customer.phone)}</div>
            <div class="meta">${escapeHtml(customer.address)}</div>
          </div>
          ${deliverySlot ? `<div class="cust" style="margin-top:6px"><div class="label" style="color:#7B5A48;text-transform:uppercase;font-size:9px;letter-spacing:.08em">Deliver</div><div class="name">${escapeHtml(formatSlotDate(deliverySlot.date))} · ${escapeHtml(deliverySlot.label)}</div></div>` : ''}
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amt</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="total">
            <div class="pay"><div class="label">Payment</div><div>${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'}</div></div>
            <div><div class="label" style="color:#7B5A48;text-transform:uppercase;font-size:9px;letter-spacing:.08em;text-align:right">Total</div><div class="amount">₹${subtotal.toFixed(0)}</div></div>
          </div>
          <div class="thanks">Thank you — your order will be ready before you reach the shop.</div>
        </div>
        <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)});</script>
      </body></html>`;

    const w = window.open('', '_blank', 'width=420,height=700');
    if (!w) {
      // Pop-up blocked — fall back to native print of the current page
      window.print();
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // Tiny HTML escaper for the print template (not security critical here, but
  // keeps weird characters from breaking the layout).
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(adminMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  };

  return (
    <div className="p-5 md:p-7" data-testid="order-bill">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h4 className="mt-3 font-serif text-2xl text-[#2A1A14]">Order placed!</h4>
        <p className="text-sm text-[#7B5A48] mt-1 max-w-xs">
          Your bill is below. <b className="text-[#B93826]">One last step</b> — tap the green button to alert the shop owner on WhatsApp so your order starts being prepared.
        </p>
      </div>

      {/* Bill / receipt — printable */}
      <div
        ref={billRef}
        className="mt-5 rounded-xl border-2 border-dashed border-[#C47B4A] bg-white p-5 text-[#2A1A14] print:border-black print:border print:p-3"
        data-testid="bill-receipt"
      >
        <div className="text-center pb-3 border-b border-[#EADFCF]">
          <div className="font-serif text-xl font-bold">Karthika Chicken Centre</div>
          <div className="text-[10px] tracking-[0.2em] text-[#7B5A48] mt-0.5">
            FARM FRESH DAILY
          </div>
          <div className="text-[10px] text-[#7B5A48] mt-1">
            Trimurti Nagar, Dombivli East · +91 9619417452
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
          <div>
            <div className="text-[10px] text-[#7B5A48] uppercase tracking-wide">Order ID</div>
            <div className="font-mono font-semibold" data-testid="bill-order-id">
              {orderId || '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#7B5A48] uppercase tracking-wide">Date</div>
            <div>{date}</div>
          </div>
          <div className="col-span-2">
            <div className="text-[10px] text-[#7B5A48] uppercase tracking-wide">Customer</div>
            <div className="font-medium">{customer.name}</div>
            <div className="text-[#7B5A48]">{customer.phone}</div>
            <div className="text-[#7B5A48] text-[11px]">{customer.address}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-[#EADFCF] pt-3">
          {deliverySlot && (
            <div
              className="mb-3 rounded-lg bg-[#FFF7DA] border border-[#F0DC8A] px-3 py-2 flex items-start gap-2"
              data-testid="bill-delivery-slot"
            >
              <div className="text-[10px] text-[#7B5A48] uppercase tracking-wide">Deliver</div>
              <div className="text-xs font-semibold text-[#2A1A14]">
                {formatSlotDate(deliverySlot.date)} · {deliverySlot.label}
              </div>
            </div>
          )}
          <table className="w-full text-xs" data-testid="bill-items-table">
            <thead className="text-[10px] uppercase tracking-wider text-[#7B5A48]">
              <tr>
                <th className="text-left pb-1">Item</th>
                <th className="text-center pb-1">Qty</th>
                <th className="text-right pb-1">Rate</th>
                <th className="text-right pb-1">Amt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-[#F3EADB]">
                  <td className="py-1.5 align-top">{i.name}</td>
                  <td className="py-1.5 text-center">{formatQty(i.qty, i.unit)}</td>
                  <td className="py-1.5 text-right">
                    ₹{i.price}
                    <div className="text-[9px] text-[#7B5A48]">/{UNIT_SHORT[normalizeUnit(i.unit)]}</div>
                  </td>
                  <td className="py-1.5 text-right font-semibold">
                    ₹{calcSubtotal(i.price, i.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 pt-3 border-t-2 border-[#C47B4A] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#7B5A48] uppercase tracking-wide">Payment</div>
            <div className="text-xs font-medium">
              {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'}
            </div>
            {firstOrderDiscountApplied && discount > 0 && (
              <div
                className="text-[10px] text-emerald-700 font-medium mt-1"
                data-testid="bill-discount-line"
              >
                First-order 10% off: − ₹{Number(discount).toFixed(0)}
                {grossSubtotal ? ` (was ₹${Number(grossSubtotal).toFixed(0)})` : ''}
              </div>
            )}
            {couponCode && discount > 0 && (
              <div
                className="text-[10px] text-emerald-700 font-medium mt-1"
                data-testid="bill-coupon-line"
              >
                Coupon {couponCode}: − ₹{Number(discount).toFixed(0)}
                {grossSubtotal ? ` (was ₹${Number(grossSubtotal).toFixed(0)})` : ''}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#7B5A48] uppercase tracking-wide">Total</div>
            <div className="font-serif text-2xl font-bold text-[#B93826]" data-testid="bill-total">
              ₹{subtotal.toFixed(0)}
            </div>
          </div>
        </div>

        <div className="mt-3 text-center text-[10px] text-[#7B5A48] italic">
          Thank you — your order will be ready before you reach the shop.
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 print:hidden">
        {/* Prominent prompt to alert the shop owner */}
        <div className="rounded-xl bg-[#FFF7DA] border border-[#F0DC8A] px-4 py-3 flex items-start gap-3">
          <div className="shrink-0 w-7 h-7 rounded-full bg-[#B93826] text-white flex items-center justify-center text-xs font-bold">
            !
          </div>
          <div className="flex-1 text-[13px] leading-snug text-[#5C3A14]">
            <div className="font-semibold text-[#2A1A14]">Last step — alert the shop owner</div>
            Press the green button below to send your order details to the owner on WhatsApp. Without this, the shop won't know your order.
          </div>
        </div>
        <div className="flex justify-center mt-2 mb-1 text-[#B93826] animate-bounce">
          <ArrowDown className="w-5 h-5" />
        </div>

        <a
          href={waAdminLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setNotified(true)}
          data-testid="bill-notify-shop-btn"
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#25D366] hover:bg-[#1FBD5A] text-white font-bold text-base shadow-lg transition-colors ring-2 ring-[#25D366]/30 ring-offset-2 ring-offset-[#FAF4EC]"
        >
          <MessageCircle className="w-5 h-5 fill-white" />
          {notified ? 'Re-send to shop on WhatsApp' : 'Alert shop on WhatsApp'}
        </a>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={handlePrint}
            data-testid="bill-print-btn"
            className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-[#EADFCF] bg-white hover:border-[#B93826]/40 text-[#3B2416] text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handleCopy}
            data-testid="bill-copy-btn"
            className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-[#EADFCF] bg-white hover:border-[#B93826]/40 text-[#3B2416] text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy bill'}
          </button>
        </div>
      </div>

      <button
        onClick={onDone}
        data-testid="bill-done-btn"
        className="mt-3 w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium print:hidden"
      >
        Done
      </button>

      {/* Review nudge — appears once order is placed; the customer can come
          back to the same Bill and tap this after their meat arrives. */}
      <button
        type="button"
        onClick={() => setReviewOpen(true)}
        data-testid="bill-leave-review-btn"
        className="mt-3 w-full py-2.5 rounded-full border-2 border-[#F5A623] bg-[#FFF7DA] hover:bg-[#FFEFB7] text-[#5C3A14] text-sm font-medium flex items-center justify-center gap-2 print:hidden"
      >
        <Star className="w-4 h-4 text-[#F5A623] fill-[#F5A623]" />
        Got your meat? Leave a review
      </button>

      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        orderId={order?.id || null}
        prefillName={customer?.name || ''}
        phone={customer?.phone || null}
      />
    </div>
  );
};

export default Bill;
