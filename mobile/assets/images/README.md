## Drop your icon assets here

To enable launcher icons + native splash:

1. Place a square 1024×1024 PNG at `assets/images/app_icon.png` — your app icon.
2. Place a 432×432 transparent foreground at `assets/images/app_icon_fg.png` — used for the Android adaptive icon.
3. Place a centered logo PNG at `assets/images/splash_logo.png` — shown on the red launch screen while the app boots.

Then run:

```bash
flutter pub get
flutter pub run flutter_launcher_icons
flutter pub run flutter_native_splash:create
```

These commands generate the `mipmap-*` resources and the `drawable-*` splash drawables for you. Re-run any time you change a source asset.
