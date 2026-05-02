import React from 'react';
import LegalPage from '../components/LegalPage';

// Privacy Policy — original text describing exactly what data we collect
// and why, written for a small chicken delivery shop using Supabase, Razorpay,
// Resend, Capacitor (geolocation), and Google Sign-In.
const LAST_UPDATED = '2 May 2026';

const Privacy = () => (
  <LegalPage title="Privacy Policy" lastUpdated={LAST_UPDATED}>
    <p>
      Your trust matters more than your data. This page explains exactly what information we collect when you
      shop with us, why we collect it, and how you can have it removed. We never sell your personal data.
    </p>

    <h2>1. Who we are</h2>
    <p>
      <strong>Karthika Chicken Centre</strong> (operating the brand <strong>ChickenCrew</strong>) is the data
      controller for the information collected through this website and app. You can reach us at{' '}
      <a href="mailto:knair9843@gmail.com">knair9843@gmail.com</a> or{' '}
      <a href="tel:+919619417452">+91 96194 17452</a>.
    </p>

    <h2>2. What we collect</h2>
    <h3>You give it to us</h3>
    <ul>
      <li><strong>Account</strong>: name, email, password (stored as a one-way bcrypt hash; we never see your real password).</li>
      <li><strong>Order details</strong>: phone number, delivery address, optional location coordinates (only if you tap “Allow location”), the items you ordered, your selected delivery slot, and any notes.</li>
      <li><strong>Reviews</strong>: the rating, comment, and the name you choose to display.</li>
      <li><strong>Communication</strong>: any messages you send us via email, WhatsApp, or phone.</li>
    </ul>

    <h3>We collect automatically</h3>
    <ul>
      <li><strong>Technical data</strong>: device type, browser, IP address, approximate access times — used for security, fraud prevention, and basic usage analytics.</li>
      <li><strong>Order history</strong>: the dates, statuses, and items of orders linked to your account.</li>
    </ul>

    <h3>From third parties</h3>
    <ul>
      <li><strong>Google Sign-In</strong>: if you sign in with Google we receive your name, email, and profile picture from Google. We don't get access to your Gmail or Google contacts.</li>
      <li><strong>Razorpay</strong>: confirmation that a payment succeeded (transaction ID, amount, payment method) — but never your full card number, CVV, UPI PIN, or bank password.</li>
    </ul>

    <h2>3. Why we collect it</h2>
    <ul>
      <li>To take and deliver your orders.</li>
      <li>To process payments and issue refunds.</li>
      <li>To communicate order updates over WhatsApp / phone / email.</li>
      <li>To remember your saved addresses so you don't have to retype them.</li>
      <li>To detect and prevent fraud and abuse (rate limits, brute-force protection, device fingerprinting).</li>
      <li>To run special offers like the first-order discount and Sunday Wheel.</li>
      <li>To improve the site and app based on aggregated usage patterns.</li>
    </ul>

    <h2>4. Who we share it with</h2>
    <p>We share data only with service providers who help us run the business, and only the minimum needed for them to do their job.</p>
    <table>
      <thead>
        <tr><th>Provider</th><th>What they receive</th><th>Why</th></tr>
      </thead>
      <tbody>
        <tr><td>Supabase</td><td>Database hosting</td><td>To store your account, orders, addresses, reviews</td></tr>
        <tr><td>Razorpay</td><td>Name, phone, email, order amount</td><td>To process online payments</td></tr>
        <tr><td>Google</td><td>Sign-in handshake (you initiate this)</td><td>Optional Google Sign-In</td></tr>
        <tr><td>Resend</td><td>Email address, message body</td><td>Password-reset and transactional emails</td></tr>
        <tr><td>Vercel</td><td>Anonymous traffic logs</td><td>To host the website</td></tr>
        <tr><td>Delivery rider</td><td>Name, phone, address, items</td><td>To deliver your order</td></tr>
      </tbody>
    </table>
    <p>
      We don't sell your personal data. We don't share it with advertisers. We may disclose information if
      required by law (court order, criminal investigation) or to protect the rights, property, or safety of
      the shop, our customers, or the public.
    </p>

    <h2>5. Cookies and similar tech</h2>
    <p>We use a small set of cookies / local-storage entries:</p>
    <ul>
      <li><strong>Session cookie</strong> (<code>session_token</code>): keeps you signed in. Set as httpOnly so JavaScript cannot read it.</li>
      <li><strong>Local-storage</strong>: stores your last-used checkout details (name, phone, address) so the form pre-fills on your next visit. You can clear it any time from your browser settings.</li>
      <li><strong>Cart cookie / local-storage</strong>: remembers what's in your cart between visits.</li>
    </ul>
    <p>We do not use third-party advertising or tracking cookies.</p>

    <h2>6. How long we keep it</h2>
    <ul>
      <li><strong>Account &amp; orders</strong>: as long as your account is active.</li>
      <li><strong>Payment confirmations</strong>: at least 7 years (required by Indian tax/accounting rules).</li>
      <li><strong>Reset / login logs</strong>: 90 days.</li>
      <li><strong>Reviews</strong>: indefinitely (so other customers can see them), but we'll anonymize the display name on request.</li>
    </ul>

    <h2>7. Your rights</h2>
    <p>You can ask us to:</p>
    <ul>
      <li>Show you a copy of the personal data we hold about you.</li>
      <li>Correct any wrong or outdated information.</li>
      <li>Delete your account and associated personal data (we'll keep order/payment records as required by law, but anonymize them).</li>
      <li>Export your saved addresses and order history.</li>
      <li>Stop processing your data for marketing (we don't currently send marketing emails, but if we ever do, every email will have an unsubscribe link).</li>
    </ul>
    <p>
      To exercise any of these rights, email us at <a href="mailto:knair9843@gmail.com">knair9843@gmail.com</a> from the
      address registered on your account. We respond within 30 days.
    </p>

    <h2>8. Data security</h2>
    <ul>
      <li>Passwords are hashed using bcrypt before being saved.</li>
      <li>Payment details are handled entirely by Razorpay. We never see your card or UPI credentials.</li>
      <li>The site runs on HTTPS end-to-end.</li>
      <li>Database access is restricted to our backend service via short-lived service keys.</li>
      <li>We rate-limit sign-ups, logins, password resets, and order placements to discourage brute-force and abuse.</li>
    </ul>

    <h2>9. Children</h2>
    <p>
      Our service is not directed to children under 18. If you believe a minor has created an account or placed
      an order without parental consent, please contact us and we'll remove the account.
    </p>

    <h2>10. International transfers</h2>
    <p>
      Some of our service providers (Supabase, Vercel, Resend, Google) may store your data on servers outside
      India. They are bound by their own privacy commitments and standard contractual clauses where applicable.
    </p>

    <h2>11. Changes to this policy</h2>
    <p>
      If we make material changes, we'll update the “Last updated” date at the top of this page and, where
      reasonable, notify signed-in users by email. Continued use after the change means you accept the updated policy.
    </p>

    <h2>12. Contact</h2>
    <p>
      For privacy questions or to exercise any right above, write to{' '}
      <a href="mailto:knair9843@gmail.com">knair9843@gmail.com</a>. Please include your registered email and a
      brief description of your request.
    </p>
  </LegalPage>
);

export default Privacy;
