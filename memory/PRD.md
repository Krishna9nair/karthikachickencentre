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
- 2026-04-29: Replaced auto-open WhatsApp on bill with explicit "Alert shop on WhatsApp" CTA + warning banner. Removed unused CallMeBot backend code (urllib + notifier function + env vars). Bill.jsx now shows a clear "Last step — alert the shop owner" prompt above the green WA button using the same `wa.me` deep link to admin (919619417452).
- 2026-04-29: **Customer Reviews** + **Saved Address** features added. (1) New `reviews` table with admin moderation (pending → approved). Public reviews section on home page after Visit Us with "Write a review" CTA. Bill page also has "Got your meat? Leave a review" button after the order. Admin dashboard now has a Reviews moderation panel (Approve / Hide / Delete). (2) New `customer_profiles` table auto-saves name + address + lat/lng on every order. CheckoutDialog hydrates from localStorage on open and from server on 10-digit phone entry, showing a "Saved address loaded" badge so customers don't retype anything for repeat orders. Migration: `supabase_migrations/2026-04-29-reviews-and-profiles.sql` (must run once in Supabase SQL editor).
- 2026-04-29: **Share with neighbours** word-of-mouth nudge — after submitting a 4★ or 5★ review, the dialog shows a green WhatsApp share button with a pre-filled friendly recommendation containing the shop link. Free organic referral loop for the small shop.
- 2026-04-29: **10% OFF first order** promo. New `customer_profiles`-backed eligibility check: any phone never seen before gets 10% off automatically. Server-side enforcement (re-derives from items + customer_profiles, can't be cheated by tampering with client total). UI: yellow "First order — 10% off applied" banner in checkout + discount line in summary + final total reflects discount + receipt shows discount line. Marketing badge "FIRST ORDER? GET 10% OFF AT CHECKOUT" on Shop section header. New `GET /api/public/first-order-eligible/{phone}` endpoint.
- 2026-04-29: **Coupon code system**. Admin-managed multi-coupon CRUD (% off or ₹ flat off, optional min order, optional expiry, active toggle). One use per phone enforced by `coupon_uses` table. New `coupons` + `coupon_uses` tables (RLS: admin-only, backend uses service role for validation). Collapsible "Have a coupon?" input in checkout with live validation against `POST /api/coupons/validate`. Discount logic: bigger of (first-order 10%, coupon discount) wins — they don't stack. Server-side recomputes everything, can't be tampered. Initial coupon `WELCOME20` (20% off, min ₹599, valid till 31 May 2026) seeded in migration. Migration: `supabase_migrations/2026-04-29-coupons.sql`.
- 2026-04-29: **Reliability fix** for Today's Board getting stuck on "Loading…". Hard 8s timeout on each Supabase call in `publicData.js` + stale-cache fallback when network refresh fails + 10s UI safety net in TodayPrice + Shop. No more infinite spinners on slow networks.
- 2026-04-29: **Security hardening (free wins)**. (a) In-memory sliding-window rate limiter on `/api/orders/cod`, `/api/payments/create-order`, `/api/reviews`, `/api/coupons/validate`, `/api/rider/login`, `/api/public/*` — caps 5 orders/hr, 3 reviews/hr, 30 coupon checks/min, 10 rider logins/10min per IP. Returns 429 with Retry-After. (c) Tightened all Pydantic models with min/max length, ge/le numeric bounds, allowed-status enum for OrderStatusIn. New `validate_indian_phone` (rejects junk like `9999999999`, `1234567890`) + `sanitize_text` (strips control chars + zero-widths, collapses whitespace, hard length cap) applied before every DB write. (d) `/api/admin/seed` now refuses to run if an admin already exists — neutralized post-bootstrap, so a leaked JWT_SECRET can no longer create rogue admins. (i) CORS locked to `karthikachickencentre.shop` + capacitor:// + localhost + regex for `*.vercel.app` + `*.preview.emergentagent.com` only. Override via `CORS_ORIGINS` env var. Specific `allow_methods` + `allow_headers` instead of `*`.

## Credentials
- Admin: `knair9843@gmail.com` / `Ocean1234@`
- Rider passcode: `12345`

## Backlog / P1
- Order tracking page for customers (with order ID lookup)
- Push notifications on new orders (Capacitor + FCM)
- WhatsApp "Order Confirmed" auto-message via Meta Cloud API (when FB block clears)
- Marathi language support
- Add Eggs / Mutton categories with their own grid
- Photo upload on customer reviews (currently text + rating only)
- Multiple saved addresses per phone (Home / Office labels) — currently just last-used
