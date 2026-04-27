"use client";

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import Navbar from './components/layout/Navbar';
import Home from './original-pages/Home';
import DiningPlan from './original-pages/services/DiningPlan';
import ProAiPlan from './original-pages/services/ProAiPlan';
import ProV10Plan from './original-pages/services/ProV1.0Plan';
import DesignCustomizing from './original-pages/services/DesignCustomizing';
import FoodVisualArt from './original-pages/branding/FoodVisualArt';
import GoodsPackage from './original-pages/branding/GoodsPackage';
import Store from './original-pages/Store';
import ScrollToTopButton from './components/ui/ScrollToTop';
import Footer from './components/layout/Footer';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const ReloadNextRoute = () => {
  useEffect(() => {
    window.location.reload();
  }, []);

  return null;
};

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      {/* Added 'relative' to ensure any absolute/fixed children or libraries requiring a positioned ancestor find one immediately */}
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 relative">
        <Navbar />
        <ScrollToTopButton />
        
        <main className="relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services/signature" element={<DiningPlan />} />
            <Route path="/services/full-option" element={<ProAiPlan />} />
            <Route path="/services/pro-v1" element={<ProV10Plan />} />
            <Route path="/tablescene-pro" element={<ProAiPlan />} />
            <Route path="/services/design-customizing" element={<DesignCustomizing />} />
            <Route path="/branding/food-visual-art" element={<FoodVisualArt />} />
            <Route path="/branding/goods-package" element={<GoodsPackage />} />
            <Route path="/apply" element={<ReloadNextRoute />} />
            <Route path="/store" element={<Store />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
