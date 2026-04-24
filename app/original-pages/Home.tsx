import React from 'react';
import Hero from '../components/home/Hero';
import ServiceOverview from '../components/home/Services';
import AllInOneFlow from '../components/home/AllInOneFlow';
import DeviceSelection from '../components/home/DeviceSelection';
import Portfolio from '../components/home/Portfolio';
import Pricing from '../components/home/Pricing';
import CTA from '../components/home/CTA';
import FAQ from '../components/common/FAQ';
import NavigationDots from '../components/ui/NavigationDots';

const SECTIONS = [
  { id: 'hero', label: 'Intro' },
  { id: 'services', label: 'Service' },
  { id: 'allinone', label: 'Connect' },
  { id: 'devices', label: 'Device' },
  { id: 'pricing', label: 'Plans' },
  { id: 'portfolio', label: 'Works' },
  { id: 'faq', label: 'Q&A' },
];

const Home = () => {
  return (
    <>
      <NavigationDots sections={SECTIONS} />
      <section id="hero" className="relative"><Hero /></section>
      <section id="services" className="relative"><ServiceOverview /></section>
      <section id="allinone" className="relative"><AllInOneFlow /></section>
      <section id="devices" className="relative"><DeviceSelection /></section>
      <section id="pricing" className="relative"><Pricing /></section>
      <section id="portfolio" className="relative"><Portfolio /></section>
      <section id="faq" className="relative"><FAQ showSupport={false} /></section>
      <CTA />
    </>
  );
};

export default Home;
