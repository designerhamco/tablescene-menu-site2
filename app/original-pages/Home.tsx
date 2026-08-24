import React from 'react';
import TemplateShowcase from '../components/home/TemplateShowcase';
import {
  CustomizationSection,
  DeviceEverywhereSection,
  ProductHero,
  SalesAndLanguageSection,
  ServiceGuideSection,
} from '../components/home/HomeProductStory';
import FAQ from '../components/common/FAQ';
import NavigationDots from '../components/ui/NavigationDots';

const SECTIONS = [
  { id: 'hero', label: 'Intro' },
  { id: 'customize', label: 'Customize' },
  { id: 'features', label: 'Feature' },
  { id: 'templates', label: 'Template' },
  { id: 'devices', label: 'Device' },
  { id: 'plans', label: 'Service' },
  { id: 'faq', label: 'Q&A' },
];

const Home = () => {
  return (
    <>
      <NavigationDots sections={SECTIONS} />
      <section id="hero" className="relative"><ProductHero /></section>
      <section id="customize" className="relative"><CustomizationSection /></section>
      <section id="features" className="relative"><SalesAndLanguageSection /></section>
      <section id="templates" className="relative"><TemplateShowcase /></section>
      <section id="devices" className="relative"><DeviceEverywhereSection /></section>
      <section id="plans" className="relative"><ServiceGuideSection /></section>
      <section id="faq" className="relative"><FAQ /></section>
    </>
  );
};

export default Home;
