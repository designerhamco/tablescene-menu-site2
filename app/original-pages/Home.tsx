import React from 'react';
import TemplateShowcase from '../components/home/TemplateShowcase';
import {
  BrandHero,
  AiFeaturesSection,
  AutoLayoutSection,
  CustomizationSection,
  DeviceEverywhereSection,
  ProductHero,
  ResourceCtaSection,
  SalesAndLanguageSection,
  StoreScenesSection,
} from '../components/home/HomeProductStory';

const Home = () => {
  return (
    <>
      <section id="hero" className="relative"><BrandHero /></section>
      <div className="relative -mt-10 overflow-hidden rounded-t-[2rem] bg-zinc-950 md:-mt-16 md:rounded-t-[3rem]">
        <section id="templates" className="relative"><TemplateShowcase /></section>
        <section id="automatic" className="relative"><ProductHero /></section>
        <section id="layout" className="relative"><AutoLayoutSection /></section>
        <section id="customize" className="relative"><CustomizationSection /></section>
        <section id="features" className="relative"><SalesAndLanguageSection /></section>
        <section id="devices" className="relative"><DeviceEverywhereSection /></section>
      </div>
      <div className="relative -mt-10 overflow-hidden rounded-t-[2rem] bg-white md:-mt-16 md:rounded-t-[3rem]">
        <section id="ai" className="relative"><AiFeaturesSection /></section>
        <section id="store-scenes" className="relative"><StoreScenesSection /></section>
        <section id="resources" className="relative"><ResourceCtaSection /></section>
      </div>
    </>
  );
};

export default Home;
