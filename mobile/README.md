# Karthika Chicken Centre — Flutter App

Native Android app for Karthika Chicken Centre / ChickenCrew. Connects to the
**same backend** as the website (`karthikachickencentre.shop`), so any product,
price, or coupon change on the web instantly reflects in the app.

---

## Why this is NOT a WebView wrapper

- All product cards, cart, checkout, orders, profile, and auth screens are
  built with native Flutter widgets.
- The only HTTP integration is the backend's `/api/*` JSON endpoints —
  the same ones the website calls.
- WebView is **only** used for the legal pages (`/terms`, `/privacy`,
  `/cancellation`) so legal copy stays in sync with the web. This is a
  Google-Play-allowed pattern (auxiliary informational content).

This pattern lets the app pass the "WebView-only / Low-value content" review.

---

## Folder structure

```
lib/
├── main.dart                  # App bootstrap, Riverpod root, theme, FCM init
├── app/
│   ├── theme.dart             # Color tokens (#D32F2F brand) + Poppins/OpenSans
│   ├── router.dart            # go_router config + role-based redirects
│   └── env.dart               # Strongly-typed env config
├── core/
│   ├── api_client.dart        # Dio + cookie jar + auth header injection
│   ├── auth_storage.dart      # Persistent session_token (SharedPreferences)
│   └── connectivity.dart      # Network status provider
├── data/
│   ├── models/                # Plain Dart models matching backend payloads
│   │   ├── product.dart
│   │   ├── cart_item.dart
│   │   ├── order.dart
│   │   ├── address.dart
│   │   └── user.dart
│   └── repositories/          # API-call wrappers, one per resource
│       ├── auth_repository.dart
│       ├── products_repository.dart
│       ├── orders_repository.dart
│       └── profile_repository.dart
├── features/
│   ├── auth/                  # Sign-in / sign-up screens
│   ├── home/                  # Product grid + today's price
│   ├── product/               # Product detail screen (route)
│   ├── cart/                  # Cart screen + sticky bottom checkout bar
│   ├── checkout/              # Address + slot + COD flow
│   ├── orders/                # Tabs: ongoing / delivered / cancelled
│   ├── profile/               # Profile + addresses + sign-out
│   └── shell/                 # Bottom navigation shell
└── widgets/                   # Shared UI primitives (buttons, badges, etc.)

assets/
├── images/
│   ├── app_icon.png           # 1024x1024 (you provide)
│   ├── app_icon_fg.png        # 432x432 foreground for adaptive icon
│   └── splash_logo.png        # Centered logo on red background

android/
└── app/
    └── build.gradle           # versionCode, applicationId, signing config
```

---

## Quick start

### 1. Install Flutter SDK

```bash
# macOS / Linux: install Flutter 3.22+
# https://docs.flutter.dev/get-started/install
flutter --version    # confirm 3.22+
flutter doctor       # fix any red items
```

### 2. Get packages

```bash
cd /path/to/this/repo
flutter pub get
```

### 3. Generate launcher icons + splash

Drop your 1024×1024 logo at `assets/images/app_icon.png` and a centered
foreground at `assets/images/app_icon_fg.png`, then:

```bash
flutter pub run flutter_launcher_icons
flutter pub run flutter_native_splash:create
```

### 4. Run on a connected Android device / emulator

```bash
flutter devices
flutter run                     # debug mode
flutter run --release           # release mode (faster, prod-like)
```

### 5. Build a signed App Bundle for Play Store

```bash
# One-time: generate a signing keystore.
# Replace YOUR_NAME / etc. with real values.
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# Tell Gradle where the keystore lives.
cat > android/key.properties <<EOF
storePassword=YOUR_STORE_PASS
keyPassword=YOUR_KEY_PASS
keyAlias=upload
storeFile=/Users/you/upload-keystore.jks
EOF

# Build signed AAB for Play Store.
flutter build appbundle --release

# Output: build/app/outputs/bundle/release/app-release.aab
```

Upload `app-release.aab` to Play Console → Internal Testing → roll out.

---

## Firebase (FCM push notifications) setup

Push notifications are wired but require Firebase project credentials to
receive messages. Without `google-services.json` the app boots fine —
push registration just no-ops.

### One-time setup

1. Go to https://console.firebase.google.com → **Add project** → name it
   `Karthika Chicken Centre` → disable Google Analytics (optional).
2. Add an Android app:
   - Package name: `com.karthika.chicken`
   - App nickname: `ChickenCrew Android`
   - SHA-1: optional for FCM-only flows — get it via:
     `cd android && ./gradlew signingReport`
3. Download `google-services.json` and drop it into:
   `android/app/google-services.json`
4. Rebuild: `flutter clean && flutter run`

The app calls `POST /api/push/register-token` (you'll need to add this
endpoint when you wire customer pushes — see Phase 2).

---

## Environment variables

`/.env` controls runtime config. **Never commit secrets here** — only
public URLs. Backend secrets live on the server.

| Variable        | Default                                 | What it does                |
| --------------- | --------------------------------------- | --------------------------- |
| `API_BASE_URL`  | `https://karthikachickencentre.shop`    | Base URL for all `/api/*`   |
| `APP_NAME`      | `Karthika Chicken Centre`               | Title bar / about screen    |

---

## Backend endpoints used by this app

All under `${API_BASE_URL}/api/`:

| Method | Path                                | Purpose                       |
| ------ | ----------------------------------- | ----------------------------- |
| POST   | `/auth/signup`                      | Email + password signup       |
| POST   | `/auth/login`                       | Email + password login        |
| GET    | `/auth/me`                          | Current user                  |
| POST   | `/auth/logout`                      | Clear session                 |
| POST   | `/auth/forgot-password`             | Send reset email              |
| GET    | `/public/products`                  | Live product catalog          |
| GET    | `/public/shop`                      | Shop name, address, phone     |
| GET    | `/public/slot-availability`         | Delivery-slot capacity        |
| POST   | `/orders/cod`                       | Place COD order               |
| GET    | `/customer/profile`                 | Linked phone + saved profile  |
| POST   | `/customer/link-phone`              | Link phone to account         |
| GET    | `/customer/addresses`               | List saved addresses          |
| POST   | `/customer/addresses`               | Save new address              |
| GET    | `/customer/orders?status=...`       | Order history                 |
| POST   | `/customer/orders/{id}/cancel`      | Cancel pending order          |
| POST   | `/coupons/validate`                 | Apply coupon code             |

---

## What's in v1 (this commit)

- Email/password sign-in + sign-up
- Persistent session (90-day "Remember me" matches the web)
- Home: live products + Today's price (auto-refresh every minute)
- Product detail screen
- Cart (persisted to SharedPreferences across app restarts)
- Checkout: name, address, delivery slot, COD only
- Orders tabs (Ongoing / Delivered / Cancelled) with Reorder + Cancel
- Profile: name, linked phone, saved addresses (CRUD)
- Bottom navigation: Home, Cart, Orders, Profile
- "No internet" fullscreen state
- Pull-to-refresh on Home + Orders
- Splash screen (red logo intro)
- Legal pages via WebView (`/terms`, `/privacy`, `/cancellation`)
- Hardware back button properly handled across tabs

## Roadmap (Phase 2)

- FCM push: order-status updates → customer's phone
- Razorpay UPI / card checkout (currently COD only)
- Sunday Wheel promo
- Banners API + admin UI
- Google Sign-In native

## Roadmap (Phase 3)

- In-app analytics (Firebase Analytics)
- Feature flags from backend
- Marathi localization

---

## Play Store submission checklist

- [x] Native UI (no WebView wrapper) — see "Why this is NOT a WebView wrapper"
- [x] Privacy policy URL → `https://karthikachickencentre.shop/privacy`
- [x] Min SDK 21 (`android/app/build.gradle`)
- [x] Required permissions only: `INTERNET` + `POST_NOTIFICATIONS` (Android 13+)
- [x] Package: `com.karthika.chicken`
- [x] App name: Karthika Chicken Centre
- [ ] You provide: 1024×1024 icon, 1024×500 feature graphic, 2-8 phone
      screenshots (1080×1920), short + full description.
- [ ] You provide: signing keystore (one-time, see Quick Start §5).
- [ ] You provide: Firebase project (optional for v1 — needed for push).

The app's `Architecture` and `Native UI` are designed specifically to avoid
the two most common rejection reasons ("WebView-only app" and "Low-value
content"). All product/checkout/order flows are native screens; auxiliary
informational pages (legal docs only) use WebView for content sync.
