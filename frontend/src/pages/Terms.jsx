import React from 'react';
import LegalPage from '../components/LegalPage';

// Terms & Conditions for ChickenCrew. Original text — written specifically
// for a small chicken delivery business in Dombivli operating online + COD
// with Razorpay. Replace the contact email/phone with the real ones if/when
// they change. Edit the LAST_UPDATED constant whenever you revise the text.
const LAST_UPDATED = '2 May 2026';

const Terms = () => (
  <LegalPage title="Terms & Conditions" lastUpdated={LAST_UPDATED}>
    <p>
      Welcome to <strong>ChickenCrew</strong>, a service operated by <strong>Karthika Chicken Centre</strong>
      (referred to in this document as “we”, “us”, “our”, or “the shop”). By using this website, our mobile app,
      or placing an order with us, you agree to the terms below. Please read them before you order.
    </p>

    <div className="callout">
      Short version: order fresh chicken, we deliver it the same day in Dombivli. Pay online or by cash.
      You can cancel any pending order from your profile until it leaves our shop.
    </div>

    <h2>1. Who we are</h2>
    <p>
      ChickenCrew is the online ordering brand of Karthika Chicken Centre, a chicken retail business based in
      Dombivli, Maharashtra, India. Our website is <a href="https://karthikachickencentre.shop">karthikachickencentre.shop</a>.
      For any concern, write to <a href="mailto:knair9843@gmail.com">knair9843@gmail.com</a> or call/WhatsApp
      <a href="tel:+919619417452"> +91 96194 17452</a>.
    </p>

    <h2>2. Eligibility</h2>
    <p>
      You must be at least 18 years old (or have a parent/guardian's consent) and be located in our delivery
      area in Dombivli to place an order. By placing an order you confirm that the details you provided
      (name, mobile, address) are accurate and that you are authorised to use the payment method.
    </p>

    <h2>3. Products and pricing</h2>
    <ul>
      <li>All product prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise.</li>
      <li>Prices on the website reflect the live rate for the day and may change without notice. The price displayed at the time you place the order is the price you pay.</li>
      <li>Product weights are approximate. Small variations of up to 50 g per kilogram are normal because we cut to order.</li>
      <li>Photographs are illustrative. Actual cuts may differ slightly in size and appearance.</li>
    </ul>

    <h2>4. Delivery</h2>
    <ul>
      <li>We deliver only within select areas of Dombivli. If your address falls outside the serviceable area, we may not be able to fulfil the order and will refund any online payment.</li>
      <li>You must select a 2-hour delivery slot at checkout. We try our best to deliver within the slot, but unforeseen delays (traffic, weather, vehicle issues) may push delivery by up to 30 minutes.</li>
      <li>A delivery fee of <strong>₹20</strong> applies to orders below <strong>₹299</strong>. Orders of ₹299 or more get free delivery.</li>
      <li>Someone above 18 must be present at the address to receive the order. If no one is available after two attempts to reach you, the order may be cancelled and the food disposed of without refund.</li>
    </ul>

    <h2>5. Payment</h2>
    <ul>
      <li>You can pay online via UPI, debit/credit card, net banking, or wallets through our payment partner Razorpay.</li>
      <li>Cash on Delivery (COD) is available. Please keep exact change ready; the rider may not always have change.</li>
      <li>For online payments, your payment information is processed by Razorpay; we do not store your card or UPI details on our servers.</li>
    </ul>

    <h2>6. Discounts and coupons</h2>
    <ul>
      <li>First-order customers receive an automatic 10% discount on their first order with us.</li>
      <li>Coupon codes are valid only on qualifying orders that meet the minimum cart value, expiry, and per-customer usage rules shown when the code is applied.</li>
      <li>Only one offer can be applied per order. The system automatically picks the higher saving between the first-order discount and any coupon entered.</li>
      <li>We may withdraw or change any promotion at our sole discretion without prior notice.</li>
    </ul>

    <h2>7. Cancellations and refunds</h2>
    <p>
      Cancellation rules are explained in detail on our{' '}
      <a href="/cancellation">Cancellation Policy</a> page. In short: you can cancel any pending order from
      your <a href="/orders">My Orders</a> page until it is marked “Out for delivery”. Refunds for online
      payments are processed within 5–7 business days.
    </p>

    <h2>8. Quality and food safety</h2>
    <ul>
      <li>All chicken is hand-cleaned at the shop the same morning. We do not freeze stock overnight.</li>
      <li>We package orders in food-grade sealed bags and request that you refrigerate the meat as soon as you receive it.</li>
      <li>If the product you receive is visibly spoilt, contaminated, or significantly different from what you ordered, please notify us within 2 hours of delivery. We may offer a free replacement, store credit, or refund based on the situation.</li>
    </ul>

    <h2>9. User accounts</h2>
    <ul>
      <li>You may create an account using your email and a password, or by signing in with Google.</li>
      <li>You are responsible for keeping your password confidential. Please don't share it with anyone.</li>
      <li>If you suspect your account has been accessed without your permission, change your password immediately and contact us.</li>
    </ul>

    <h2>10. Acceptable use</h2>
    <p>You agree not to:</p>
    <ul>
      <li>Use the service for any unlawful purpose or to defraud another person.</li>
      <li>Place orders using false information, stolen payment methods, or someone else's identity.</li>
      <li>Attempt to disrupt, reverse-engineer, or scrape the website.</li>
      <li>Resell our products commercially without our written permission.</li>
    </ul>
    <p>We may refuse service or terminate accounts found to be in violation, with or without notice.</p>

    <h2>11. Reviews and content</h2>
    <p>
      When you submit a review, you grant us a non-exclusive, royalty-free right to display, quote, and share
      it on our website and marketing materials. Reviews are moderated and we may remove content that is abusive,
      defamatory, off-topic, or appears to be spam. Submit honest, first-hand experiences only.
    </p>

    <h2>12. Liability</h2>
    <p>
      To the maximum extent permitted by Indian law, our liability for any single order is limited to the
      total amount you paid for that order. We are not liable for indirect, incidental, or consequential
      losses (for example, loss of business, loss of goodwill) arising from delays, unavailability, or other
      issues with the service.
    </p>

    <h2>13. Force majeure</h2>
    <p>
      We are not responsible for delays or non-delivery caused by events outside our reasonable control —
      including but not limited to natural calamities, riots, internet/payment-gateway outages, government
      restrictions, lockdowns, or supply-chain disruptions.
    </p>

    <h2>14. Changes to these terms</h2>
    <p>
      We may update these terms from time to time. We'll change the “Last updated” date at the top of this
      page when we do. Continued use of the service after changes means you accept the updated terms.
    </p>

    <h2>15. Governing law</h2>
    <p>
      These terms are governed by the laws of India. Any dispute will be subject to the exclusive jurisdiction
      of the courts at <strong>Thane, Maharashtra</strong>.
    </p>

    <h2>16. Contact</h2>
    <p>
      Questions, complaints, or feedback? Reach us at <a href="mailto:knair9843@gmail.com">knair9843@gmail.com</a>{' '}
      or call <a href="tel:+919619417452">+91 96194 17452</a>. We try to respond within one business day.
    </p>
  </LegalPage>
);

export default Terms;
