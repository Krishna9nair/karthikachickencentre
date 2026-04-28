import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import TodayPrice from '../components/TodayPrice';
import Shop from '../components/Shop';
import VisitShop from '../components/VisitShop';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';

const Home = () => {
  return (
    <div className="min-h-screen bg-[#FAF4EC]">
      <Navbar />
      <Hero />
      <TodayPrice />
      <Shop />
      <VisitShop />
      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Home;
