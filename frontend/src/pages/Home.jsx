import React, { Suspense, lazy } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';

// Above-the-fold components (Navbar + Hero) load with the main bundle.
// Below-the-fold sections are code-split so they don't block LCP/FCP.
const TodayPrice = lazy(() => import('../components/TodayPrice'));
const Shop = lazy(() => import('../components/Shop'));
const VisitShop = lazy(() => import('../components/VisitShop'));
const Reviews = lazy(() => import('../components/Reviews'));
const Footer = lazy(() => import('../components/Footer'));
const CartDrawer = lazy(() => import('../components/CartDrawer'));

// Lightweight skeleton — shown only briefly while a section's JS chunk
// streams in. No heavy markup; just reserved height to avoid CLS.
const SectionSkeleton = ({ height = '420px' }) => (
  <div style={{ minHeight: height }} aria-hidden="true" />
);

const Home = () => {
  return (
    <div className="min-h-screen bg-[#FAF4EC]">
      <Navbar />
      <Hero />
      <Suspense fallback={<SectionSkeleton height="500px" />}>
        <TodayPrice />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="600px" />}>
        <Shop />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="500px" />}>
        <VisitShop />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="400px" />}>
        <Reviews />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="200px" />}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <CartDrawer />
      </Suspense>
    </div>
  );
};

export default Home;
