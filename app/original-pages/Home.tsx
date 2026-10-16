import React from 'react';
import TemplateShowcase from '../components/home/TemplateShowcase';
import {
  BrandHero,
  AiFeaturesSection,
  AutoLayoutSection,
  CustomizationSection,
  DeviceEverywhereSection,
  MultiPageSection,
  ProductHero,
  SalesAndLanguageSection,
  StoreScenesSection,
} from '../components/home/HomeProductStory';

const Home = () => {
  return (
    <>
      <section id="hero" className="relative"><BrandHero /></section>
      <div className="relative bg-white text-zinc-950">
        <section id="templates" className="relative"><TemplateShowcase /></section>
        <section id="automatic" className="relative"><ProductHero /></section>
        <section id="layout" className="relative"><AutoLayoutSection /></section>
        <section id="customize" className="relative"><CustomizationSection /></section>
        <section id="features" className="relative"><SalesAndLanguageSection /></section>
        <section id="multi-page" className="relative"><MultiPageSection /></section>
        <section id="devices" className="relative"><DeviceEverywhereSection /></section>
      </div>
      <div className="relative overflow-hidden rounded-t-[2rem] bg-zinc-950 text-white md:rounded-t-[3rem]">
        <section id="ai" className="relative"><AiFeaturesSection inverted /></section>
        <section id="store-scenes" className="relative"><StoreScenesSection inverted /></section>
      </div>
    </>
  );
};

export default Home;
