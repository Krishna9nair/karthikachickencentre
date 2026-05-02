import React from 'react';
import LegalPage from '../components/LegalPage';

// Cancellation & Refund Policy. The cancellation rule here matches the
// behaviour wired into the customer-facing /orders page (Cancel button is
// only enabled for orders in cod_pending|paid|preparing|ready).
const LAST_UPDATED = '2 May 2026';

const Cancellation = () => (
  <LegalPage title="Cancellation & Refund Policy" lastUpdated={LAST_UPDATED}>
    <p>
      We want every order to feel hassle-free, including when you change your mind. This page explains when
      you can cancel an order, who can cancel it, and how refunds are processed for online payments.
    </p>

    <div className="callout">
      <strong>Quick rule:</strong> you can cancel any order from <a href="/orders">My Orders</a> any time before
      we mark it as <em>Out for delivery</em>. Once a rider has picked it up, the order can no longer be cancelled.
    </div>

    <h2>1. When can I cancel?</h2>
    <p>You can cancel an order while it is in any of these statuses:</p>
    <table>
      <thead>
        <tr><th>Status</th><th>Cancellable?</th></tr>
      </thead>
      <tbody>
        <tr><td>Order placed (pending payment / COD pending)</td><td>Yes</td></tr>
        <tr><td>Paid</td><td>Yes</td></tr>
        <tr><td>Preparing</td><td>Yes</td></tr>
        <tr><td>Ready for pickup</td><td>Yes</td></tr>
        <tr><td>Out for delivery</td><td>No</td></tr>
        <tr><td>Delivered</td><td>No</td></tr>
        <tr><td>Cancelled</td><td>—</td></tr>
      </tbody>
    </table>

    <h2>2. How do I cancel?</h2>
    <ol>
      <li>Sign in to your account and open <a href="/orders">My Orders</a>.</li>
      <li>Find the order under the <strong>Ongoing</strong> tab.</li>
      <li>Tap <strong>Cancel order</strong>. The status will change to “Cancelled” immediately.</li>
    </ol>
    <p>
      If you don't have an account, message us on WhatsApp at <a href="tel:+919619417452">+91 96194 17452</a> with
      your order number. We'll cancel it for you if it hasn't left the shop yet.
    </p>

    <h2>3. Cancellations by us</h2>
    <p>In rare situations we may need to cancel an order on our side, including:</p>
    <ul>
      <li>The product or quantity you ordered is no longer available.</li>
      <li>Your delivery address falls outside our serviceable area.</li>
      <li>We could not reach you on the phone number provided after two attempts.</li>
      <li>Suspected fraud or misuse of payment method.</li>
      <li>Unforeseen events (vehicle breakdown, weather, etc.) that prevent same-day delivery.</li>
    </ul>
    <p>If we cancel your order, we'll inform you on WhatsApp/phone and refund any online payment in full.</p>

    <h2>4. Refunds</h2>
    <h3>Online payments (UPI / card / net banking / wallet)</h3>
    <ul>
      <li>Refunds are initiated within 24 hours of cancellation.</li>
      <li>The amount typically reaches your account in <strong>5–7 business days</strong>, depending on your bank or UPI app.</li>
      <li>Refunds go back to the original payment source. We cannot refund to a different card / UPI / account.</li>
      <li>Refund references are visible on your order page and on your bank/UPI statement.</li>
    </ul>

    <h3>Cash on Delivery (COD)</h3>
    <ul>
      <li>If a COD order is cancelled before the rider leaves the shop, no money has changed hands — there is nothing to refund.</li>
      <li>Once an order is out for delivery, COD cannot be refused at the door without a valid reason (visible spoilage, wrong item, missing items). Please contact us in those cases.</li>
    </ul>

    <h2>5. Quality issues after delivery</h2>
    <p>
      If you receive a product that is visibly spoilt, mislabelled, or significantly different from what you
      ordered, please notify us within <strong>2 hours of delivery</strong> with a photo of the product and
      packaging. Based on the situation we'll offer one of:
    </p>
    <ul>
      <li>A free replacement on the next available delivery slot, or</li>
      <li>Store credit equal to the affected item's value, or</li>
      <li>A refund of the affected item to the original payment method (online payments).</li>
    </ul>
    <p>
      Because chicken is a perishable product, we cannot accept returns once you've consumed or improperly
      stored the item. Please refrigerate the meat as soon as you receive it.
    </p>

    <h2>6. Refunds for partial cancellations</h2>
    <p>
      If only part of your order is unavailable or quality-affected, the refund will be calculated for that
      item only — including its share of any discount applied to the order. Delivery fees are non-refundable
      once the order has been dispatched.
    </p>

    <h2>7. Need help?</h2>
    <p>
      For any cancellation or refund question, reach out within 7 days of the order at{' '}
      <a href="mailto:knair9843@gmail.com">knair9843@gmail.com</a> or <a href="tel:+919619417452">+91 96194 17452</a>.
      Mention your order number — we'll resolve most cases within one business day.
    </p>
  </LegalPage>
);

export default Cancellation;
