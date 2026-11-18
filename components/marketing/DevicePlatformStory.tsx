/* eslint-disable @next/next/no-img-element -- Authored mockup layers use exact source-pixel projection and optimized local WebP assets. */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "@/app/components/ui/site-arrow";
import { buttonVariants } from "@/app/components/ui/button";
import { DEVICE_ASSETS, DEVICE_MENU, DEVICE_STAGE_BACKGROUND, DEVICE_STAGE_ITEMS, clampDeviceProgress, devicePlaneMatrix, deviceRevealAt, deviceScreenMatrix, deviceStageFrame } from "@/lib/device-platform-story";
import styles from "./DevicePlatformStory.module.css";

const ASSETS="/assets/device-platform-v1/";
const ITEMS=DEVICE_STAGE_ITEMS.map(item=>{
  const asset=DEVICE_ASSETS[item.asset],phone=item.asset==="phone";
  return {...item,asset,phone,photoMatrix:devicePlaneMatrix(asset.plane,item.plane),screenMatrix:deviceScreenMatrix(asset.screen,phone)};
});
export default function DevicePlatformStory(){
  const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),visual=useRef<HTMLDivElement>(null),copy=useRef<HTMLDivElement>(null);
  const reduced=useReducedMotion(),shadowId=useId().replaceAll(":","");
  const [view,setView]=useState({progress:0,width:1200,height:1200,copyBottom:0});
  useEffect(()=>{
    const update=()=>{
      if(!root.current||!stage.current||!visual.current)return;
      const top=root.current.parentElement?parseFloat(getComputedStyle(root.current.parentElement).scrollMarginTop)||0:0;
      const scrollRange=Math.max(1,root.current.offsetHeight-stage.current.offsetHeight);
      const progress=clampDeviceProgress((top-root.current.getBoundingClientRect().top)/scrollRange);
      setView({progress,width:visual.current.clientWidth,height:visual.current.clientHeight,copyBottom:copy.current?.offsetHeight??0});
    };
    let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;update();});};
    const resize=new ResizeObserver(schedule);if(visual.current)resize.observe(visual.current);if(stage.current)resize.observe(stage.current);if(copy.current)resize.observe(copy.current);
    window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);update();
    // Resolve the section permalink after hydration, before the earlier hero can start its clock.
    const anchor=requestAnimationFrame(()=>{if(location.hash==="#device-platform"){root.current?.parentElement?.scrollIntoView({block:"start",behavior:"instant"});schedule();}});
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(anchor);resize.disconnect();window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);};
  },[]);
  const frame=deviceStageFrame(view.width,view.height,view.copyBottom);
  const frameTransform=`translate(${frame.x}px,${frame.y}px) scale(${frame.scale})`;
  const reveal=(order:number)=>deviceRevealAt(view.progress,order,Boolean(reduced));
  return <section id="device-platform" className={styles.section} style={{backgroundColor:DEVICE_STAGE_BACKGROUND}} aria-labelledby="device-platform-heading" data-device-section>
    <div ref={root} className={styles.story} data-device-platform data-progress={view.progress.toFixed(3)} data-reduced={Boolean(reduced)} data-menu-template={DEVICE_MENU.key}>
      <div ref={stage} className={styles.stage}>
        <div ref={copy} className={`site-marketing-container ${styles.copy}`} data-device-copy>
          <div className="site-stack-title">
            <h2 id="device-platform-heading" className="type-section-title">하나의 메뉴판, <br className={styles.copyBreak}/>모든 디바이스에서.</h2>
            <p className="type-body site-copy-muted">PC부터 태블릿, 스마트폰까지. <br className={styles.copyBreak}/>우리 매장의 메뉴를 어디서나 보여주세요.</p>
          </div>
        </div>
        <div ref={visual} className={styles.visual} role="img" aria-label="같은 아티메뉴 메뉴판을 노트북, 태블릿, 스마트폰에서 보여주는 장면">
          <div className={styles.floorViewport} aria-hidden="true">
            <img className={styles.floor} src={`${ASSETS}floor.webp`} width={1200} height={1200} alt="" loading="lazy" style={{transform:frameTransform}}/>
          </div>
          <div className={styles.canvas} data-device-frame aria-hidden="true" style={{transform:frameTransform}}>
            <svg className={styles.shadows} viewBox="0 0 1200 1200" aria-hidden="true">
              <defs><filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter></defs>
              {DEVICE_STAGE_ITEMS.map(item=><polygon key={item.id} points={item.shadow.map(p=>p.join(",")).join(" ")} fill="#202020" opacity={reveal(item.order)*.17} filter={`url(#${shadowId})`}/>)}
            </svg>
            {ITEMS.map(item=>{
              const amount=reveal(item.order),{asset,phone}=item;
              return <div className={styles.reveal} key={item.id} data-device-item={item.id} data-reveal={amount.toFixed(3)} style={{opacity:amount}}>
                <div className={styles.device} style={{width:asset.width,height:asset.height,transform:item.photoMatrix}}>
                  <img className={styles.devicePhoto} src={`${ASSETS}${asset.file}`} width={asset.width} height={asset.height} alt="" loading="lazy"/>
                  <div className={styles.screen} style={{width:phone?390:1280,height:phone?844:800,transform:item.screenMatrix,borderRadius:phone?2:10}}>
                    <img src={phone?DEVICE_MENU.mobile:DEVICE_MENU.desktop} width={phone?390:1280} height={phone?844:800} alt="" loading="lazy"/>
                  </div>
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
    <div className={`site-marketing-container ${styles.action}`}>
      <Link href="/templates?plan=basic" className={buttonVariants({variant:"outline",size:"lg"})}>더 많은 디자인 보기<ArrowRight size={16} aria-hidden="true"/></Link>
    </div>
  </section>;
}
