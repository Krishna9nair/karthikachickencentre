import axios from 'axios';

// Fallback to the Emergent preview URL so Vercel/PWA still works for
// Razorpay even if env var isn't set. Override locally via .env.
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || 'https://karthik-chicken-app.preview.emergentagent.com';
export const API = `${BACKEND_URL}/api`;

// withCredentials: true so the httpOnly session_token cookie set by the
// backend after Google sign-in is sent on every customer-API call.
export const api = axios.create({
  baseURL: API,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Capacitor WebView and some private-mode browsers strip third-party cookies.
// Fallback: if `cc_session_token` is in localStorage, send it as Bearer token.
api.interceptors.request.use((config) => {
  try {
    const tok = localStorage.getItem('cc_session_token');
    if (tok && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${tok}`;
    }
  } catch (_) {}
  return config;
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
