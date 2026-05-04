# Karthika Chicken Centre — Flutter Android App

Native Android app (Flutter 3.27+) that connects to the **same FastAPI backend** as the website (`karthikachickencentre.shop`). Any product, price, or coupon change on the web reflects instantly in the app — there is no separate API.

## Why this is NOT a WebView wrapper

- All flows (Splash, Auth, Home, Product Detail, Cart, Checkout, Razorpay, Orders, Profile, Addresses) are built with **native Flutter widgets**.
- The only HTTP integration is the backend's `/api/*` JSON endpoints — the same ones the website calls.
- WebView is **only** used for the legal pages (`/terms`, `/privacy`, `/cancellation`) so legal copy stays in sync with the web. Google Play allows WebView for auxiliary informational content.

This pattern lets the app pass the "WebView-only / Low-value content" review.

---

## What's in v1

- **Splash** — animated red logo screen (matches the website's `splash.mp4` brand frame).
- **Auth** — Email + password sign-in / sign-up with "Remember me" (90 vs 7-day session). Forgot password emails via Resend, deep-link reset URL handled. Google sign-in placeholder (see *Google sign-in setup* below).
- **Home** — Live products from `/api/public/products`, auto-refresh every 60 seconds, pull-to-refresh, BEST/FRESH tags, IN-CART pill, hero panel with trust badges, shop notice banner, skeleton loaders.
- **Product detail** — full image, description, FRESH TODAY pill, native qty stepper, "Go to cart" CTA.
- **Cart** — local-first (persisted via SharedPreferences), per-line stepper, subtotal sticky bar, empty-state.
- **Checkout** — Native form with name / phone / address (auto-pulled from saved addresses), 6 delivery slots × 2 days with 30-min cutoff, coupon validation against `/api/coupons/validate`, automatic 10%-off detection for first-time customers, summary that mirrors server-side discount logic, **Cash on Delivery** *and* **Razorpay (UPI / Card / Net banking)** via `razorpay_flutter`.
- **Orders** — Tabs (Ongoing / Delivered / Cancelled) tied to `/api/customer/orders`. Per-card **Reorder** + **Cancel** + tap-into detail screen with 4-stage timeline (Placed → Preparing → Out for delivery → Delivered).
- **Profile** — Avatar with initial, link-phone gate, edit name, saved addresses CRUD, WhatsApp shortcut, Terms / Privacy / Cancellation, sign out.
- **Bottom navigation** — Home / Cart / Orders / Profile with cart badge.

## Backend endpoints used

All under `${API_BASE_URL}/api/`:

| Method | Path                                | Purpose                       |
| ------ | ----------------------------------- | ----------------------------- |
| POST   | `/auth/signup`                      | Email + password signup       |
| POST   | `/auth/login`                       | Email + password login        |
| POST   | `/auth/google/session`              | Exchange Emergent session_id  |
| GET    | `/auth/me`                          | Current user                  |
| POST   | `/auth/logout`                      | Clear session                 |
| POST   | `/auth/forgot-password`             | Send reset email              |
| POST   | `/auth/reset-password`              | Apply new password            |
| GET    | `/public/shop`                      | Shop name, address, notice    |
| GET    | `/public/products`                  | Live product catalog          |
| GET    | `/public/slot-availability`         | Delivery-slot capacity        |
| GET    | `/public/first-order-eligible/{p}`  | First-order discount check    |
| POST   | `/coupons/validate`                 | Apply coupon code             |
| POST   | `/orders/cod`                       | Place COD order               |
| POST   | `/payments/create-order`            | Razorpay order creation       |
| POST   | `/payments/verify`                  | Razorpay signature verify     |
| POST   | `/customer/link-phone`              | Link phone to account         |
| GET    | `/customer/profile`                 | Linked phone + saved profile  |
| PUT    | `/customer/profile`                 | Update name                   |
| GET    | `/customer/addresses`               | List saved addresses          |
| POST   | `/customer/addresses`               | Save new address              |
| PUT    | `/customer/addresses/{id}`          | Update address                |
| DELETE | `/customer/addresses/{id}`          | Delete address                |
| GET    | `/customer/orders?status=...`       | Order history                 |
| POST   | `/customer/orders/{id}/cancel`      | Cancel pending order          |

The session is stored in `SharedPreferences` and sent as `Authorization: Bearer <token>` on every request, so it works inside Capacitor / native WebViews where third-party cookies are blocked.

---

## Folder structure

```
lib/
├── main.dart                  # App bootstrap, Riverpod root, theme load
├── app/
│   ├── env.dart               # API_BASE_URL + APP_NAME from .env
│   ├── theme.dart             # AppColors + Poppins/OpenSans theme
│   └── router.dart            # go_router config
├── core/
│   ├── api_client.dart        # Dio + auth-header interceptor
│   ├── auth_storage.dart      # session_token persistence (SP)
│   └── cart_store.dart        # local-first cart, persisted (SP)
├── data/
│   ├── models/                # Plain Dart models matching backend payloads
│   └── repositories/          # API-call wrappers, one per resource
├── features/
│   ├── auth/                  # login / signup / forgot / reset
│   ├── home/                  # product grid + product card
│   ├── product/               # product detail
│   ├── cart/                  # cart screen
│   ├── checkout/              # full checkout form (COD + Razorpay)
│   ├── orders/                # tabs + order detail with timeline
│   ├── profile/               # profile + addresses CRUD
│   ├── legal/                 # WebView for /terms /privacy /cancellation
│   ├── shell/                 # bottom-nav shell
│   └── splash/                # animated red splash logo
└── widgets/
    └── sticky_cart_bar.dart   # Swiggy-style bottom cart pill

assets/images/                 # app_icon.png + app_icon_fg.png + splash_logo.png

android/
├── app/build.gradle           # signing config + minSDK 21
├── app/src/main/AndroidManifest.xml
└── app/proguard-rules.pro     # Razorpay + Firebase rules
```

---

## Quick start

### 1. Install Flutter

```bash
# https://docs.flutter.dev/get-started/install
flutter --version    # confirm 3.27+
flutter doctor
```

### 2. Get packages

```bash
cd /path/to/repo/mobile
flutter pub get
```

### 3. Generate launcher icons + splash

Drop your 1024×1024 logo at `assets/images/app_icon.png`, the foreground at `assets/images/app_icon_fg.png`, and the centered splash logo at `assets/images/splash_logo.png`, then:

```bash
flutter pub run flutter_launcher_icons
flutter pub run flutter_native_splash:create
```

### 4. Run on a connected Android device / emulator

```bash
flutter devices
flutter run                     # debug
flutter run --release           # release-equivalent
```

### 5. Build a signed App Bundle for Play Store

```bash
# One-time: generate a signing keystore.
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# Tell Gradle where the keystore lives.
cat > android/key.properties <<EOF
storePassword=YOUR_STORE_PASS
keyPassword=YOUR_KEY_PASS
keyAlias=upload
storeFile=/Users/you/upload-keystore.jks
EOF

# Build signed AAB.
flutter build appbundle --release

# Output: build/app/outputs/bundle/release/app-release.aab
```

Upload `app-release.aab` to Play Console → Internal Testing → roll out.

---

## Environment variables

`/.env` (bundled as a Flutter asset) controls runtime config. **Never commit secrets here** — only public URLs.

| Variable        | Default                                 | What it does                |
| --------------- | --------------------------------------- | --------------------------- |
| `API_BASE_URL`  | `https://karthikachickencentre.shop`    | Base URL for all `/api/*`   |
| `APP_NAME`      | `Karthika Chicken Centre`               | App bar / about text        |

---

## Razorpay (already wired)

Razorpay LIVE checkout is enabled at the **Payment** step inside Checkout. Backend endpoints (`/api/payments/create-order` and `/api/payments/verify`) are already implemented on the website's FastAPI server — the Flutter app simply opens the native Razorpay sheet with the order id returned by the backend, then hands the response back for signature verification.

Required to ship:
- Backend `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` env vars (already set on the production server).
- Nothing extra inside the app — the publishable key flows from the server to the SDK at runtime.

---

## Native Google Sign-In setup

The app currently shows a "Continue with Google" button on the login screen that opens an info sheet. To wire up actual native sign-in:

1. Create a Firebase project at https://console.firebase.google.com.
2. Add an Android app:
   - Package name: `com.karthika.chicken`
   - SHA-1: get it via `cd android && ./gradlew signingReport`
3. Enable **Authentication → Google** in Firebase.
4. Drop `google-services.json` into `android/app/google-services.json`.
5. In `android/settings.gradle` and `android/app/build.gradle`, uncomment the `com.google.gms.google-services` plugin lines.
6. Replace the bottom-sheet stub in `lib/features/auth/login_screen.dart` (`_googleSignIn` method) with a `GoogleSignIn().signIn()` call → forward the resulting `idToken` to a new backend endpoint that mints a `session_token` (you can mirror the existing `/api/auth/google/session` handler with idToken verification instead of Emergent session ids).

Until step 4 is done, customers can still sign in fine using **email + password**.

---

## Firebase / FCM push notifications

Push is wired but lazy — the app boots fine without `google-services.json`. To enable:

1. Same Firebase project as above.
2. Drop `google-services.json` into `android/app/google-services.json`.
3. Uncomment the `com.google.gms.google-services` plugin in `android/app/build.gradle` and `android/settings.gradle`.
4. Add a small bootstrap call to `FirebaseMessaging.instance.requestPermission()` + `getToken()` in `main.dart` and POST the token to a new backend endpoint (e.g. `POST /api/push/register-token`).

---

## Play Store submission checklist

- [x] Native UI (no WebView wrapper)
- [x] Privacy policy URL → `https://karthikachickencentre.shop/privacy`
- [x] Min SDK 21 (`android/app/build.gradle`)
- [x] Required permissions: `INTERNET`, `POST_NOTIFICATIONS` (Android 13+)
- [x] Package: `com.karthika.chicken`
- [x] App name: Karthika Chicken Centre
- [x] Razorpay LIVE checkout
- [x] Cash on Delivery
- [ ] You provide: 1024×1024 icon, 1024×500 feature graphic, 2-8 phone screenshots (1080×1920), short + full description.
- [ ] You provide: signing keystore (one-time, see Quick Start §5).
- [ ] You provide: Firebase project (optional for v1 — needed for push + native Google sign-in).
