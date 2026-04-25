import axios from 'axios';

// Fallback to the Emergent preview URL so Vercel/PWA still works for
// Razorpay even if env var isn't set. Override locally via .env.
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || 'https://karthik-chicken-app.preview.emergentagent.com';
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { 'Content-Type': 'application/json' },
});

// Loads Razorpay checkout script on demand
let rzpLoaded = null;
export const loadRazorpay = () => {
  if (rzpLoaded) return rzpLoaded;
  rzpLoaded = new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return rzpLoaded;
};
