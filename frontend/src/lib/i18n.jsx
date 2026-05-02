// Lightweight i18n: EN ↔ HI for ChickenCrew customer-facing UI.
// No heavy library — just a Context with a tiny dictionary.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DICT = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.shop': 'Shop',
    'nav.todays_price': "Today's Price",
    'nav.admin_login': 'Admin Login',
    'nav.admin': 'Admin',
    'nav.rider': 'Rider',
    'nav.cart': 'Cart',
    'nav.get_app': 'Get App',
    // Hero
    'hero.eyebrow': 'FRESH · LOCAL · DAILY',
    'hero.title': "Today's catch, cut and ready in 20 min.",
    'hero.subtitle':
      'Hand-cut farm-fresh chicken delivered to your door. UPI, cards, or cash on delivery — your call.',
    'hero.cta_shop': 'Shop now',
    'hero.cta_call': 'Call shop',
    // Today's Price
    'price.eyebrow': 'DAILY BOARD',
    'price.live_badge': '🔥 LIVE TODAY',
    'price.title': "Today's Price",
    'price.fresh_today': 'Fresh Today',
    'price.per_kg': '₹ / kg',
    'price.loading': "Loading today's board…",
    'price.empty': 'No prices published yet for today.',
    'price.error': "Couldn't reach the board. Check your connection.",
    'price.retry': 'Retry',
    'price.disclaimer':
      '* Prices may vary slightly based on market rates. Updated daily by our shop.',
    'price.updated': 'Updated',
    'price.just_now': 'just now',
    // Shop
    'shop.eyebrow': 'OUR CUTS',
    'shop.title': 'Pick your pieces',
    'shop.subtitle':
      "Hand-cut by our butchers each morning. Add to cart, pay by UPI, and we'll get it ready.",
    'shop.add': 'Add',
    'shop.empty': 'No products available right now.',
    'shop.error': "Couldn't load products. Check your connection.",
    'shop.today': 'TODAY',
    'shop.fresh_badge': 'FRESH',
    // Footer
    'footer.shop': 'Shop',
    'footer.contact': 'Contact',
    'footer.address': 'Address',
    'footer.tagline': 'Farm-fresh, hand-cut, delivered daily.',
    // Offline
    'offline.title': 'No Internet',
    'offline.subtitle': 'Seems like you are not connected to the internet',
    'offline.refresh': 'Refresh',
    'offline.checking': 'Checking…',
    // Install
    'install.title': 'Get the ChickenCrew App',
    'install.subtitle':
      'Faster checkout, live order updates, works even on slow connections.',
    'install.android_step1': 'Open Chrome on your Android phone',
    'install.android_step2': 'Visit karthikachickencentre.shop',
    'install.android_step3': 'Tap the Install button when prompted',
    'install.android_btn': 'Install Now',
    'install.ios_title': 'On iPhone / iPad (Safari)',
    'install.ios_step1': 'Tap the Share icon at the bottom',
    'install.ios_step2': 'Scroll and tap "Add to Home Screen"',
    'install.ios_step3': 'Tap "Add" — done!',
    'install.desktop_title': 'On Computer',
    'install.desktop_text':
      'Click the install icon (⊕) on the right of the address bar.',
    'install.qr_title': 'Or scan to install on phone',
    'install.close': 'Close',
    // Hero (extra)
    'hero.eyebrow_long': 'FSSAI CERTIFIED · 100% HYGIENIC',
    'hero.title_a': 'Fresh Chicken',
    'hero.title_b': 'Delivered to Your Door',
    'hero.subtitle_long':
      'Hygienic, fresh, and never frozen. Hand-cleaned every morning and delivered the same day.',
    'hero.cta_primary': 'Order Now',
    'hero.cta_secondary': "See today's price",
    'hero.stat_local': 'Locally sourced',
    'hero.stat_fresh': 'Fresh stock',
    'hero.stat_upi': 'Easy payment',
    'hero.open_today': 'Open today!',
    // Trust badges & Why Choose Us
    'trust.hygienic': '100% Hygienic',
    'trust.never_frozen': 'Never Frozen',
    'trust.same_day': 'Same-Day Delivery',
    'trust.fssai': 'FSSAI Certified',
    'why.eyebrow': 'WHY CHICKENCREW',
    'why.title': 'Trusted by 1000+ families',
    'why.fresh_title': 'Fresh, never frozen',
    'why.fresh_desc': 'Hand-cleaned at the shop every morning. Delivered the same day.',
    'why.hygiene_title': 'Hygienic packaging',
    'why.hygiene_desc': 'Sealed, food-grade packaging — no contamination, no ice melt.',
    'why.fast_title': 'Fast same-day delivery',
    'why.fast_desc': 'Pick a 2-hour slot. Order before 6 PM, get it the same evening.',
    'why.pay_title': 'Pay your way',
    'why.pay_desc': 'UPI, card, or cash on delivery. ₹20 delivery fee on orders below ₹299.',
    // Visit Shop
    'visit.eyebrow': 'VISIT US',
    'visit.title': 'Find our shop',
    'visit.tap_for_map': 'Tap to open in Google Maps',
    'visit.directions': 'Directions',
    'visit.call': 'Call shop',
    'visit.hours_label': 'Open daily',
    'visit.hours_value': '7:00 AM – 10:00 PM',
    'nav.visit': 'Visit Us',
  },
  hi: {
    'nav.home': 'होम',
    'nav.shop': 'दुकान',
    'nav.todays_price': 'आज का भाव',
    'nav.admin_login': 'एडमिन लॉगिन',
    'nav.admin': 'एडमिन',
    'nav.rider': 'राइडर',
    'nav.cart': 'कार्ट',
    'nav.get_app': 'ऐप पाएं',
    'hero.eyebrow': 'ताज़ा · स्थानीय · रोज़',
    'hero.title': 'आज का चिकन, 20 मिनट में काटकर तैयार।',
    'hero.subtitle':
      'फार्म-फ्रेश हाथ से कटा चिकन आपके दरवाज़े पर। UPI, कार्ड या कैश ऑन डिलीवरी — आपकी पसंद।',
    'hero.cta_shop': 'अभी ऑर्डर करें',
    'hero.cta_call': 'दुकान पर कॉल करें',
    'price.eyebrow': 'दैनिक बोर्ड',
    'price.live_badge': '🔥 आज का भाव',
    'price.title': 'आज का भाव',
    'price.fresh_today': 'आज ताज़ा',
    'price.per_kg': '₹ / किलो',
    'price.loading': 'आज का बोर्ड लोड हो रहा है…',
    'price.empty': 'आज के लिए अभी कोई भाव प्रकाशित नहीं किया गया।',
    'price.error': 'बोर्ड तक नहीं पहुँच सका। अपना कनेक्शन जाँचें।',
    'price.retry': 'दोबारा करें',
    'price.disclaimer':
      '* भाव बाज़ार दर के अनुसार थोड़ा बदल सकते हैं। हमारी दुकान रोज़ अपडेट करती है।',
    'price.updated': 'अपडेट',
    'price.just_now': 'अभी',
    'shop.eyebrow': 'हमारे कट',
    'shop.title': 'अपनी पसंद चुनें',
    'shop.subtitle':
      'हर सुबह हमारे कसाई हाथ से काटते हैं। कार्ट में डालें, UPI से भुगतान करें, हम तैयार रखेंगे।',
    'shop.add': 'जोड़ें',
    'shop.empty': 'अभी कोई उत्पाद उपलब्ध नहीं।',
    'shop.error': 'उत्पाद लोड नहीं हो सके। कनेक्शन जाँचें।',
    'shop.today': 'आज',
    'shop.fresh_badge': 'ताज़ा',
    'footer.shop': 'दुकान',
    'footer.contact': 'संपर्क',
    'footer.address': 'पता',
    'footer.tagline': 'फार्म-फ्रेश, हाथ से कटा, रोज़ डिलीवर।',
    'offline.title': 'इंटरनेट नहीं है',
    'offline.subtitle': 'लगता है आप इंटरनेट से कनेक्ट नहीं हैं',
    'offline.refresh': 'रीफ्रेश',
    'offline.checking': 'जाँच हो रही है…',
    'install.title': 'ChickenCrew ऐप पाएं',
    'install.subtitle':
      'तेज़ चेकआउट, लाइव ऑर्डर अपडेट, धीमे नेटवर्क पर भी काम करता है।',
    'install.android_step1': 'अपने एंड्रॉइड फ़ोन पर Chrome खोलें',
    'install.android_step2': 'karthikachickencentre.shop पर जाएँ',
    'install.android_step3': 'जब प्रॉम्प्ट आए तब "Install" पर टैप करें',
    'install.android_btn': 'अभी इंस्टॉल करें',
    'install.ios_title': 'iPhone / iPad (Safari)',
    'install.ios_step1': 'नीचे शेयर आइकॉन पर टैप करें',
    'install.ios_step2': '"Add to Home Screen" पर टैप करें',
    'install.ios_step3': '"Add" पर टैप करें — हो गया!',
    'install.desktop_title': 'कंप्यूटर पर',
    'install.desktop_text':
      'एड्रेस बार के दाईं ओर इंस्टॉल आइकॉन (⊕) पर क्लिक करें।',
    'install.qr_title': 'या फ़ोन पर इंस्टॉल करने के लिए स्कैन करें',
    'install.close': 'बंद करें',
    'hero.eyebrow_long': 'FSSAI प्रमाणित · 100% हाइजीनिक',
    'hero.title_a': 'फ्रेश चिकन,',
    'hero.title_b': 'आपके दरवाज़े पर।',
    'hero.subtitle_long':
      'हाइजीनिक, ताज़ा और कभी फ़्रोज़न नहीं। रोज़ सुबह हाथ से साफ़ किया, उसी दिन डिलीवर।',
    'hero.cta_primary': 'अभी ऑर्डर करें',
    'hero.cta_secondary': 'आज का भाव देखें',
    'hero.stat_local': 'स्थानीय रूप से',
    'hero.stat_fresh': 'ताज़ा स्टॉक',
    'hero.stat_upi': 'आसान भुगतान',
    'hero.open_today': 'आज खुला है!',
    'trust.hygienic': '100% हाइजीनिक',
    'trust.never_frozen': 'कभी फ़्रोज़न नहीं',
    'trust.same_day': 'सेम-डे डिलीवरी',
    'trust.fssai': 'FSSAI प्रमाणित',
    'why.eyebrow': 'क्यों ChickenCrew',
    'why.title': '1000+ परिवारों का भरोसा',
    'why.fresh_title': 'ताज़ा, कभी फ़्रोज़न नहीं',
    'why.fresh_desc': 'हर सुबह दुकान पर हाथ से साफ़। उसी दिन डिलीवर।',
    'why.hygiene_title': 'हाइजीनिक पैकेजिंग',
    'why.hygiene_desc': 'सीलबंद, फ़ूड-ग्रेड पैकेजिंग — कोई संदूषण नहीं।',
    'why.fast_title': 'तेज़ सेम-डे डिलीवरी',
    'why.fast_desc': '2-घंटे का स्लॉट चुनें। शाम 6 बजे से पहले ऑर्डर करें।',
    'why.pay_title': 'अपनी पसंद से भुगतान',
    'why.pay_desc': 'UPI, कार्ड या COD। ₹299 से कम पर ₹20 डिलीवरी फ़ीस।',
    'visit.eyebrow': 'हमसे मिलें',
    'visit.title': 'हमारी दुकान खोजें',
    'visit.tap_for_map': 'Google Maps में खोलने के लिए टैप करें',
    'visit.directions': 'दिशा',
    'visit.call': 'दुकान पर कॉल',
    'visit.hours_label': 'रोज़ खुला',
    'visit.hours_value': 'सुबह 7:00 – रात 10:00',
    'nav.visit': 'मिलें',
  },
};

const I18nContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('cc_lang') || 'en';
    } catch (_) {
      return 'en';
    }
  });

  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem('cc_lang', l); } catch (_) {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const value = useMemo(() => {
    const t = (key) => DICT[lang]?.[key] ?? DICT.en[key] ?? key;
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
export const useT = () => useI18n().t;
