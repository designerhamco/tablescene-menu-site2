import React from 'react';
import TemplateShowcase from '../components/home/TemplateShowcase';
import {
  BrandHero,
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
  { id: 'automatic', label: 'Automatic' },
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
      <section id="hero" className="relative"><BrandHero /></section>
      <div className="relative -mt-10 overflow-hidden rounded-t-[2rem] bg-zinc-950 md:-mt-16 md:rounded-t-[3rem]">
        <section id="automatic" className="relative"><ProductHero /></section>
        <section id="customize" className="relative"><CustomizationSection /></section>
        <section id="features" className="relative"><SalesAndLanguageSection /></section>
      </div>
      <div className="relative -mt-10 overflow-hidden rounded-t-[2rem] bg-white md:-mt-16 md:rounded-t-[3rem]">
        <section id="templates" className="relative"><TemplateShowcase /></section>
        <section id="devices" className="relative"><DeviceEverywhereSection /></section>
        <section id="plans" className="relative"><ServiceGuideSection /></section>
        <section id="faq" className="relative"><FAQ homeDark showSupport={false} /></section>
      </div>
    </>
  );
};

export default Home;
