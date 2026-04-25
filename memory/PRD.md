# ChickenCrew — Product Requirements (PRD)

## Original Problem Statement
Clone `karthikachickencentre.shop` into an exact-UI replica branded as **ChickenCrew**. Must include:
- Razorpay payments (LIVE keys)
- Supabase backend (Postgres + Auth)
- Admin dashboard, Rider dashboard, Shop Settings
- Native Android APK/AAB via Capacitor

## Tech Stack
- Frontend: React + Tailwind + Shadcn UI, React Router
- Backend: FastAPI (Razorpay only)
- DB/Auth: Supabase (Postgres) — direct from frontend for public reads
- Payments: Razorpay LIVE
- Mobile: Capacitor (Android) — **Live-URL APK** (loads `karthikachickencentre.shop`)

## APK distribution model
The APK is a thin Capacitor shell that loads the production Vercel site
directly via `server.url` in `capacitor.config.ts`. Any UI / feature
change deployed to Vercel is live in the APK instantly — no rebuild
or reinstall needed (except for native plugin / permission changes).

## Routes
- `/` → Home (Hero, Today's Price, Shop, Footer)
- `/auth`, `/admin`, `/rider`
- `/shop` → redirects to `/#shop`
- `/price` → redirects to `/#price`
- `*` → redirects to `/`

## Key Files
- `src/App.js` — routes + ScrollToHash + OfflineGate
- `src/components/OfflineGate.jsx` — Swiggy-style "No Internet" overlay
- `src/lib/publicData.js` — Supabase-direct fetch for products + shop
- `src/lib/useAutoRefresh.js` — auto-refresh hook (60s + visibility)
- `src/components/{Hero,Shop,TodayPrice,Navbar,Footer,CheckoutDialog,CartDrawer}.jsx`
- `src/pages/{Home,Admin,Rider,Auth}.jsx`
- `backend/server.py` — Razorpay create-order / verify-signature
- `frontend/capacitor.config.ts` — `server.url` set to live Vercel URL
- `frontend/android/app/src/main/AndroidManifest.xml` — `<queries>` for UPI app discovery

## DB Schema (Supabase)
- `user_roles`, `products`, `daily_prices`, `shop_settings`, `orders`

## Changelog
- 2026-04-24: Built full MVP (replica UI, Supabase, Razorpay LIVE, COD, Admin, Rider, Shop Settings, Capacitor Android, Play Store assets).
- 2026-04-24: Fixed `/shop` blank page — added ScrollToHash + redirect routes + catch-all in `App.js`.
- 2026-04-24: Fixed "Loading today's board…" hang — Shop & TodayPrice now read directly from Supabase (no FastAPI dependency); added loading/error/retry states.
- 2026-04-25: Added auto-refresh — Today's Price & Shop silently re-fetch every 60s, on tab focus, and on visibility change. Manual refresh button + "Updated X ago" label.
- 2026-04-25: Switched APK to live-URL model (`capacitor.config.ts → server.url`). UI updates ship via Vercel without APK rebuild.
- 2026-04-25: Fixed Razorpay UPI apps not showing — added `<queries>` in AndroidManifest for UPI intent discovery (Android 11+) + explicit UPI Intent flow in Razorpay options.
- 2026-04-25: Added Swiggy-style **Offline Gate** — full-screen "No Internet" overlay with Refresh button when device loses connectivity.

## Credentials
- Admin: `knair9843@gmail.com` / `Ocean1234@`
- Rider passcode: `12345`

## Backlog / P1
- Order tracking page for customers
- Push notifications on new orders (Capacitor)
- Multi-language (Tamil/Hindi) toggle is currently UI-only
- WhatsApp "Order Confirmed" auto-message via Twilio
