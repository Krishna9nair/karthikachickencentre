# ChickenCrew — Play Store Listing Handoff Package

Everything your helper needs to publish ChickenCrew on Google Play Store.

---

## 📎 Files in this package

- `app-icon-512.png` — App icon (512×512, upload to "Graphics" → "App icon")
- `feature-graphic-1024x500.png` — Feature graphic (upload to "Graphics" → "Feature graphic")
- `screenshot-1-hero.png` — Phone screenshot 1 (upload to "Phone screenshots")
- `screenshot-2-price.png` — Phone screenshot 2
- `screenshot-3-shop.png` — Phone screenshot 3
- `screenshot-4-cart.png` — Phone screenshot 4
- `PRIVACY_POLICY.md` — Privacy policy text (host somewhere publicly, share URL)
- `STORE_LISTING.md` — This file with all copy & settings

---

## 📱 Basic App Info

| Field | Value |
|---|---|
| **App name** | ChickenCrew |
| **Default language** | English (India) – `en-IN` |
| **App type** | App |
| **Category** | Food & Drink |
| **Tags** | Food, Shopping, Local |
| **Free or paid** | Free |
| **Contains ads** | No |
| **In-app purchases** | No (Razorpay is external payment, not IAP) |

---

## 📝 Short description (80 chars max)

```
Farm-fresh chicken delivered daily. Today's prices, UPI payment & home delivery.
```

## 📄 Full description (4000 chars max)

```
ChickenCrew — Farm-fresh chicken, priced honest.

Order fresh chicken from your neighborhood butcher, see today's prices on a
beautiful daily board, and get it delivered to your doorstep or ready for
quick pickup. Serving Dombivli East, Thane, and nearby areas.

✨ WHY CHICKENCREW?
• Cleaned this morning — hand-cut by our butchers daily
• Locally sourced from trusted farms
• Transparent pricing — today's rates on the board, always
• Pay easy via UPI, cards, or Cash on Delivery
• Rider navigates to your exact location — no miscommunication
• Order ready before you reach the shop

🛒 WHAT YOU CAN ORDER
• Whole Chicken (with skin & skinless)
• Chicken Curry Cut (bone-in pieces)
• Boneless Breast (lean white meat)
• Chicken Legs, Wings, Liver
• Country Chicken (free-range desi murgi)

💳 PAYMENT OPTIONS
• UPI (PhonePe, Google Pay, Paytm, BHIM)
• Credit / Debit cards
• Wallets
• Cash on Delivery

📍 HOW IT WORKS
1. Browse today's board — see live prices in ₹/kg
2. Add your cuts to cart with quick quantity picker
3. Share your location — our rider navigates to you
4. Pay online OR choose Cash on Delivery
5. Get notified when your order is ready

🐓 FOR SHOP OWNERS / BUTCHERS
• Admin dashboard to update daily prices in seconds
• Manage products, view/update orders, edit shop settings
• Rider portal with passcode login & Google Maps navigation

📞 CONTACT
Call: 9619417452
Visit: Kartika Chicken Center, Trimurti Nagar, Dombivli East,
       Thane, Maharashtra 421201

Open daily 7:00 AM – 9:00 PM

Download ChickenCrew now and never queue at the shop again!
```

---

## 🎯 Content Rating (fill in the questionnaire)

Answer **NO** to all of these (it's a food ordering app):
- Violence / Blood / Gore — NO
- Sexual content — NO
- Gambling — NO
- Drugs / Tobacco / Alcohol — NO
- User-generated content — NO
- Location sharing — **YES** (for delivery — required feature)
- Personal info collection — **YES** (name, phone, address for delivery)
- Data encrypted in transit — **YES** (HTTPS)

Expected rating: **Everyone / 3+**

---

## 📋 Data Safety section

Declare the following data collected:

| Data | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Name | Yes | No | No | Fulfill delivery |
| Phone number | Yes | No | No | Contact about order |
| Address | Yes | No | Yes | Fulfill delivery |
| Approximate location | Yes | No | Yes | Rider navigation |
| Precise location | Yes | No | Yes | Rider navigation |
| Purchase history | Yes | No | No | Order management |

**Security practices:**
- ✅ Data encrypted in transit (HTTPS)
- ✅ Users can request data deletion (email `knair9843@gmail.com`)
- ✅ Follows Google Play Families Policy: N/A (not for kids)

---

## 🌐 Contact details

| Field | Value |
|---|---|
| **Email** | `knair9843@gmail.com` |
| **Phone** (optional) | `+91 9619417452` |
| **Website** | `https://karthikachickencentre.shop` |
| **Privacy policy URL** | *(see below — you need to host PRIVACY_POLICY.md publicly)* |

---

## 📑 Hosting the Privacy Policy

Google Play **requires a public Privacy Policy URL**. Easiest options:

### Option 1 — Host on your Vercel site
Copy `PRIVACY_POLICY.md` content to a new file on your website repo:
`karthikachickencentre/public/privacy.html`
Then the URL is: `https://karthikachickencentre.shop/privacy.html`

### Option 2 — Use a free service
1. Go to https://www.freeprivacypolicy.com (or https://app.termly.io)
2. Paste the `PRIVACY_POLICY.md` content
3. Publish → copy the generated URL

### Option 3 — GitHub Gist (quickest)
1. Go to https://gist.github.com → paste the content → create public gist
2. Copy the gist URL

---

## 🎨 Graphic Assets — Specs reminder

| Asset | Size | Max file size | Where |
|---|---|---|---|
| App icon | 512×512 PNG | 1 MB | "Main store listing" → "App icon" |
| Feature graphic | 1024×500 PNG | 15 MB | "Main store listing" → "Feature graphic" |
| Phone screenshots | Any 16:9, min 320px | 8 MB each | "Phone" → upload 2-8 images |
| Tablet screenshots | Optional | | Skip for now |

---

## 🔑 AAB Upload — what your helper needs from you

1. **Signed AAB:** `app-release.aab` (from `C:\ChickenCrew\android\app\build\outputs\bundle\release\`)
2. **Package name:** `shop.chickencrew.app`
3. **Signing keystore password:** (the one you set in Android Studio)
4. **Keystore file backup:** `C:\ChickenCrew\chickencrew-keystore.jks` — send to helper securely OR keep yourself and only send AAB

⚠️ **You'll need the keystore forever to update the app.** If your helper has it, make sure you ALSO have a copy.

---

## 💰 Costs

- Google Play Console registration: **₹2,000 (~$25) one-time**
- After approval, customers can download ChickenCrew for free
- No ongoing fees unless you add in-app purchases

---

## ⏱️ Timeline after upload

| Step | Typical time |
|---|---|
| Internal review (automatic) | 15 minutes |
| Production review by Google | **1–7 days** (first time) |
| Subsequent updates | Few hours |
| Live on Play Store | After approval |

---

## ✅ Final checklist for your helper

- [ ] Signed AAB uploaded
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] 4+ phone screenshots
- [ ] Short description (80 chars)
- [ ] Full description
- [ ] Privacy Policy URL added
- [ ] Contact email + website
- [ ] Content rating questionnaire completed
- [ ] Data safety declarations filled
- [ ] Target audience set (Everyone, 13+)
- [ ] Countries: India (at minimum)
- [ ] Pricing: Free
- [ ] Submit for review

Good luck! 🚀🐓
