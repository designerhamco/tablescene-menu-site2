"use client";

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import Navbar from './components/layout/Navbar';
import Home from './original-pages/Home';
import BasicServicePage from './original-pages/services/BasicServicePage';
import DisplayServicePage from './original-pages/services/DisplayServicePage';
import OrderServiceReviewContent from './components/services/OrderServiceReviewContent';
import CustomServicePage from './original-pages/services/CustomServicePage';
import VisualStudioPage from './original-pages/branding/VisualStudioPage';
import GoodsPackagePage from './original-pages/branding/GoodsPackagePage';
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
            <Route path="/services/basic" element={<BasicServicePage />} />
            <Route path="/services/display" element={<DisplayServicePage />} />
            <Route path="/services/menu" element={<BasicServicePage />} />
            <Route path="/services/screen" element={<DisplayServicePage />} />
            <Route path="/services/order" element={<OrderServiceReviewContent />} />
            <Route path="/services/custom" element={<CustomServicePage />} />
            <Route path="/custom" element={<ReloadNextRoute />} />
            <Route path="/services/signature" element={<BasicServicePage />} />
            <Route path="/services/full-option" element={<DisplayServicePage />} />
            <Route path="/services/pro-v1" element={<OrderServiceReviewContent />} />
            <Route path="/tablescene-pro" element={<DisplayServicePage />} />
            <Route path="/services/design-customizing" element={<CustomServicePage />} />
            <Route path="/branding/visual-studio" element={<VisualStudioPage />} />
            <Route path="/branding/food-visual-art" element={<VisualStudioPage />} />
            <Route path="/branding/goods-package" element={<GoodsPackagePage />} />
            <Route path="/apply" element={<ReloadNextRoute />} />
            <Route path="/apply/*" element={<ReloadNextRoute />} />
            <Route path="/store" element={<Store />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
