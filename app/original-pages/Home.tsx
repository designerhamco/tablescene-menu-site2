import React from 'react';
import Hero from '../components/home/Hero';
import ServiceOverview from '../components/home/Services';
import AllInOneFlow from '../components/home/AllInOneFlow';
import DeviceSelection from '../components/home/DeviceSelection';
import ServicePlans from '../components/home/ServicePlans';
import TemplateShowcase from '../components/home/TemplateShowcase';
import FAQ from '../components/common/FAQ';
import NavigationDots from '../components/ui/NavigationDots';

const SECTIONS = [
  { id: 'hero', label: 'Intro' },
  { id: 'services', label: 'Service' },
  { id: 'allinone', label: 'Connect' },
  { id: 'devices', label: 'Device' },
  { id: 'plans', label: 'Plans' },
  { id: 'templates', label: 'Template' },
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
      <section id="plans" className="relative"><ServicePlans /></section>
      <section id="templates" className="relative"><TemplateShowcase /></section>
      <section id="faq" className="relative"><FAQ showSupport={false} /></section>
    </>
  );
};

export default Home;
