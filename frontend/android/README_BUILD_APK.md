# ChickenCrew – Build APK on your laptop

This folder contains a ready-to-build Android project for the ChickenCrew app (generated via Capacitor).

## 📋 What you need on your laptop

1. **Android Studio** (free) — https://developer.android.com/studio
   - On install, click **"More Actions → SDK Manager"** and make sure
     **Android 14 (API 34)** or newer is installed.
2. **Java 17 JDK** is bundled with Android Studio — no separate install needed.

## 🚀 Build the APK (5 minutes)

1. Unzip this folder somewhere convenient, e.g. `~/chickencrew-android`.
2. Open **Android Studio** → **File → Open** → select the unzipped folder (the one containing `build.gradle`, `settings.gradle`, `gradlew`).
3. Android Studio will sync Gradle automatically (first time takes ~2 min to download dependencies).
4. When sync finishes, click the top menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. Wait for the green "APK(s) generated successfully" notification.
6. Click **"locate"** in that notification — Android Studio opens the folder containing:
   ```
   app/build/outputs/apk/debug/app-debug.apk
   ```
7. That's your APK! Send it via WhatsApp / email / USB cable to any Android phone.

## 📱 Install on a phone

1. On the Android phone: open the APK file from Files / WhatsApp.
2. Android will warn about "unknown apps" → tap **Settings → Allow** → tap **Install**.
3. App icon "ChickenCrew" appears on home screen.

## 🏷️ Optional: sign the APK for Play Store

To publish on Google Play, you need a signed release APK.

1. In Android Studio: **Build → Generate Signed Bundle / APK → APK**.
2. Create a new keystore (remember the password!) → continue → choose **release**.
3. You'll get `app-release.apk` — upload this to Google Play Console ($25 one-time developer fee).

## 🔗 The app connects to

- **Live backend:** `https://karthik-chicken-app.preview.emergentagent.com/api`
- **Supabase:** `https://ksgvwlmmsplamtfkuavb.supabase.co`

You can edit these in `app/src/main/assets/capacitor.config.json` if you change the backend URL.

## ❓ Troubleshooting

- **"Unable to install JDK"** → run Android Studio → Settings → Build Tools → Gradle → Gradle JDK: pick the one bundled with Android Studio (usually JDK 17 or JBR).
- **"SDK location not found"** → open `local.properties` in project root and set:
  ```
  sdk.dir=/Users/YourName/Library/Android/sdk
  ```
  (path to where Android Studio installed the SDK)
- **Build fails with AAPT2 errors** → File → Invalidate Caches → Restart.

---

Built with Capacitor 7 • React 19 • Supabase • Razorpay
