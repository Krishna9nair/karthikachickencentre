# ChickenCrew — Final Rebuild & Redeploy Guide
*(Generated 2026-04-25 — covers the live-URL switch, UPI fix, offline screen, auto-refresh)*

This is the **last** APK rebuild you'll ever need to do for UI changes.
After this, every Vercel deploy is live in the APK instantly.

---

## 1. Redeploy Vercel (5 min — required first)

The APK in step 2 will load whatever Vercel is serving, so **deploy
Vercel first.**

### Option A — via the Emergent **"Save to Github"** flow (recommended)
1. In the Emergent chat input, click **"Save to Github"**.
2. Push to your existing repo connected to Vercel.
3. Vercel auto-builds and deploys within 1–2 minutes.
4. Open `https://karthikachickencentre.shop` to confirm:
   - 8 product cards visible on Home
   - "Today's Price" board shows prices + a small refresh icon
   - Footer & nav look fine

### Option B — manual upload to Vercel
1. Download `/app/frontend/build/` folder.
2. Drag-and-drop the folder into your Vercel project's **Deployments** tab.

> ⚠️ **Do not skip this step**. The new APK loads Vercel directly — if Vercel is stale, the APK shows the old version.

---

## 2. Final APK rebuild (10 min — required ONCE)

You must do this once because three changes are **native** and ship inside
the APK itself:

| Change | Why it needs a rebuild |
|---|---|
| Live-URL APK (`server.url`) | Lives in `capacitor.config.json` inside the APK |
| UPI app discovery (`<queries>`) | Lives in `AndroidManifest.xml` |
| Network state permission | New Android permission |

### Steps (Android Studio)

1. **Download the latest android source zip**:
   `https://karthikachickencentre.shop/downloads/chickencrew-android.zip`
   *(also lives at `/app/frontend/public/downloads/chickencrew-android.zip`)*

2. **Unzip** it on your laptop. You'll get an `android/` folder.

3. **Open Android Studio** → File → Open → select the unzipped `android/` folder.
   Wait for Gradle sync to finish (first time can take 5–10 min).

4. **Build the APK**:
   - Menu: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`.
   - When done, Android Studio shows a "locate" link → click it.
   - The APK is at: `android/app/build/outputs/apk/debug/app-debug.apk`.

5. **Install** the new APK on your phone (uninstall the old one first to
   avoid signature conflicts during testing).

### For Play Store (AAB instead of APK)
- Menu: `Build` → `Generate Signed Bundle / APK` → choose **Android App Bundle**.
- Use your existing keystore (the one you used last time).
- Upload the resulting `.aab` to Play Console.

---

## 3. Verification checklist (5 min)

After the new APK is installed:

### Live-URL working
- [ ] Open the app → it should load the same site you see on
      `karthikachickencentre.shop`. The very first launch may take
      1–2 seconds longer than before (downloading from Vercel), but
      subsequent launches are cached and fast.

### Offline screen
- [ ] Turn on airplane mode → open the app.
- [ ] You should see the "No Internet" screen with a Refresh button.
- [ ] Turn off airplane mode → tap Refresh → app loads.

### UPI apps in Razorpay
- [ ] Add a product to cart → Checkout.
- [ ] Choose **Pay Online** → place order.
- [ ] Razorpay popup opens → tap "UPI".
- [ ] You should now see your installed UPI apps listed
      (GPay, PhonePe, Paytm, BHIM, etc.).
- [ ] Tap any one — it opens that app for payment.

### Auto-refresh
- [ ] Open the app on your phone, leave it on the Home screen.
- [ ] Open Admin in a desktop browser, change a product's price.
- [ ] Within ~60 seconds, the phone shows the new price (no manual reload).

---

## 4. Future workflow (post this rebuild)

From now on:

| Change type | Action needed |
|---|---|
| Edit prices, products, shop info | Just save in Admin — instant |
| UI tweaks, new pages, bug fixes | Push to Vercel → auto-live in APK |
| Add native plugin (camera, push) | Rebuild APK once for that change |
| Update app icon / splash / name | Rebuild APK once |
| New Play Store version | Generate signed AAB, upload |

You should be able to go **months** without touching Android Studio.

---

## 5. Troubleshooting

### Vercel deploy succeeded but APK still shows old UI
- Clear app cache: phone Settings → Apps → ChickenCrew → Storage → Clear cache.
- Or just close and reopen the app.

### UPI apps still don't appear in Razorpay
- Confirm you're using the **rebuilt** APK (the old APK won't work).
- Confirm UPI apps are installed AND have a UPI ID set up on the phone.
- On a fresh emulator without UPI apps, the UPI block will be empty — that's expected.

### "No Internet" screen stuck even when online
- Pull down notification shade and check the WiFi/data icon.
- Tap Refresh again.
- If Vercel itself is down, the screen will stay (this is correct behavior).

### Razorpay shows "BAD_REQUEST_ERROR: invalid email"
- Already handled — we synthesize a placeholder email from the phone number.
- If you still see this, your Razorpay account may require a real email — let me know and I'll add an email field.
