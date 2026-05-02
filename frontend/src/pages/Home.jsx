import React, { Suspense, lazy } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import SundayWheelBanner from '../components/SundayWheelBanner';

// Above-the-fold components (Navbar + Hero) load with the main bundle.
// Below-the-fold sections are code-split so they don't block LCP/FCP.
const Shop = lazy(() => import('../components/Shop'));
const TodayPrice = lazy(() => import('../components/TodayPrice'));
const WhyChooseUs = lazy(() => import('../components/WhyChooseUs'));
const Reviews = lazy(() => import('../components/Reviews'));
const VisitShop = lazy(() => import('../components/VisitShop'));
const FinalCTA = lazy(() => import('../components/FinalCTA'));
const Footer = lazy(() => import('../components/Footer'));
const CartDrawer = lazy(() => import('../components/CartDrawer'));
const StickyCartBar = lazy(() => import('../components/StickyCartBar'));

// Lightweight skeleton — shown only briefly while a section's JS chunk
// streams in. No heavy markup; just reserved height to avoid CLS.
const SectionSkeleton = ({ height = '420px' }) => (
  <div style={{ minHeight: height }} aria-hidden="true" />
);

// Homepage order (Swiggy/Licious style):
// Navbar → Hero → Best Sellers (Shop) → Today's Price → Why Choose Us
// → Customer Reviews → Visit Shop → Final CTA → Footer
const Home = () => {
  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <Navbar />
      <SundayWheelBanner />
      <Hero />
      <Suspense fallback={<SectionSkeleton height="600px" />}>
        <Shop />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="500px" />}>
        <TodayPrice />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="400px" />}>
        <WhyChooseUs />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="400px" />}>
        <Reviews />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="500px" />}>
        <VisitShop />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="280px" />}>
        <FinalCTA />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="200px" />}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <CartDrawer />
      </Suspense>
      <Suspense fallback={null}>
        <StickyCartBar />
      </Suspense>
    </div>
  );
};

export default Home;
