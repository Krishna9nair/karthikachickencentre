# ChickenCrew — Product Requirements (PRD)

## Original Problem Statement
Clone `karthikachickencentre.shop` into an exact-UI replica branded as **ChickenCrew**. Must include:
- Razorpay payments (LIVE keys)
- Supabase backend (Postgres + Auth)
- Admin dashboard, Rider dashboard, Shop Settings
- Native Android APK/AAB via Capacitor

## Tech Stack
- Frontend: React + Tailwind + Shadcn UI, React Router
- Backend: FastAPI (only for Razorpay order/verify)
- DB/Auth: Supabase (Postgres)
- Payments: Razorpay LIVE
- Mobile: Capacitor (Android)

## Routes
- `/` → Home (Hero, Today's Price, Shop, Footer)
- `/auth`, `/admin`, `/rider`
- `/shop` → redirects to `/#shop`
- `/price` → redirects to `/#price`
- `*` → redirects to `/`

## Key Files
- `src/App.js` (routes + ScrollToHash)
- `src/components/{Hero,Shop,TodayPrice,Navbar,Footer,CheckoutDialog,CartDrawer}.jsx`
- `src/pages/{Home,Admin,Rider,Auth}.jsx`
- `backend/server.py` (Razorpay create-order / verify-signature)
- `frontend/android/*` (Capacitor Android project)

## DB Schema (Supabase)
- `user_roles`, `products`, `daily_prices`, `shop_settings`, `orders`

## Changelog
- 2026-04-24: Built full MVP (replica UI, Supabase, Razorpay LIVE, COD, Admin, Rider, Shop Settings, Capacitor Android, Play Store assets).
- 2026-04-24: Fixed "products not visible" bug — `/shop` URL was blank (no route) and `/#shop` didn't auto-scroll. Added `ScrollToHash`, redirect routes, and catch-all fallback in `App.js`.

## Credentials
- Admin: `knair9843@gmail.com` / `Ocean1234@`
- Rider passcode: `12345`

## Backlog / P1
- Order tracking page for customers
- Push notifications on new orders (Capacitor)
- Multi-language (Tamil/Hindi) toggle currently UI-only
