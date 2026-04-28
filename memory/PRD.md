# ChickenCrew — Product Requirements (PRD)

## Original Problem Statement
Clone `karthikachickencentre.shop` into an exact-UI replica branded as **ChickenCrew**. Razorpay LIVE payments, Supabase backend, Admin + Rider dashboards, native Android APK via Capacitor.

## Tech Stack
- Frontend: React + Tailwind + Shadcn UI, React Router, i18n (EN/HI)
- Backend: FastAPI (Razorpay + protected reads)
- DB/Auth: Supabase (Postgres) — direct frontend reads for products/prices
- Payments: Razorpay LIVE + Cash on Delivery
- Mobile: Capacitor (Android) — Live-URL APK
- Hosting: Vercel (`karthikachickencentre.shop`)

## Routes
- `/` Home, `/auth`, `/admin`, `/rider`
- `/shop`/`/price` redirect to `/#shop` / `/#price`
- `*` catch-all → home

## Key Files
- `src/App.js` — providers, routes, ScrollToHash, OfflineGate, WhatsAppFAB
- `src/lib/i18n.jsx` — EN/HI dictionary + provider
- `src/lib/publicData.js` — Supabase-direct fetch with fallback
- `src/lib/api.js` — FastAPI base with hardcoded fallback URL
- `src/lib/supabaseClient.js` — Supabase client with hardcoded public anon fallback
- `src/lib/useAutoRefresh.js` — 60s + visibility-based refetch
- `src/components/{Hero,Shop,TodayPrice,Navbar,Footer,CheckoutDialog,CartDrawer,InstallAppDialog,WhatsAppFAB,OfflineGate}.jsx`
- `src/pages/{Home,Admin,Rider,Auth}.jsx`
- `backend/server.py` — Razorpay endpoints + protected reads
- `frontend/capacitor.config.ts` — `server.url` = live Vercel URL
- `frontend/android/app/src/main/AndroidManifest.xml` — `<queries>` for UPI app discovery
- `frontend/public/index.html` — full SEO meta + LocalBusiness JSON-LD
- `vercel.json` — build command pinned (CRA + craco, CI=false)

## DB Schema (Supabase)
- `user_roles`, `products`, `daily_prices`, `shop_settings`, `orders`

## Changelog
- 2026-04-24: Built MVP (replica UI, Supabase, Razorpay LIVE, COD, Admin, Rider, Shop Settings, Capacitor Android, Play Store assets).
- 2026-04-24: Fixed `/shop` blank page — ScrollToHash + redirect routes + catch-all.
- 2026-04-24: Fixed "Loading today's board…" hang — Supabase-direct reads + states.
- 2026-04-25: Auto-refresh prices (60s + focus + visibility) + manual refresh button.
- 2026-04-25: Live-URL APK + UPI app discovery `<queries>` + Razorpay UPI Intent flow.
- 2026-04-25: Swiggy-style Offline Gate with WiFi-off icon + Refresh button.
- 2026-04-25: Vercel build config (CRA+craco, CI=false), env-var fallbacks for Supabase/Backend.
- 2026-04-25: EN ↔ HI language toggle (full dictionary, persists in localStorage).
- 2026-04-25: "Get App" button + InstallAppDialog (Android/iPhone/PC tabs + QR).
- 2026-04-28: Production polish: SEO meta + JSON-LD schema, OG/Twitter cards, font preconnect, lazy-loaded product images, "IN CART" badge, live qty × price calc on cards, bigger Add buttons, WhatsApp FAB with hardcoded fallback phone.

## Credentials
- Admin: `knair9843@gmail.com` / `Ocean1234@`
- Rider passcode: `12345`

## Backlog / P1
- Order tracking page for customers (with order ID lookup)
- Push notifications on new orders (Capacitor + FCM)
- WhatsApp "Order Confirmed" auto-message via Twilio
- Marathi language support
- Add Eggs / Mutton categories with their own grid
