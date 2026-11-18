/* eslint-disable @next/next/no-img-element -- Authored mockup layers use exact source-pixel projection and optimized local WebP assets. */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "@/app/components/ui/site-arrow";
import { buttonVariants } from "@/app/components/ui/button";
import { DEVICE_ASSETS, DEVICE_MENU, DEVICE_STAGE_ITEMS, clampDeviceProgress, devicePlaneMatrix, deviceRevealAt, deviceScreenMatrix, deviceStageCamera } from "@/lib/device-platform-story";
import styles from "./DevicePlatformStory.module.css";

const ASSETS="/assets/device-platform-v1/";
const ITEMS=DEVICE_STAGE_ITEMS.map(item=>{
  const asset=item.asset?DEVICE_ASSETS[item.asset]:null,phone=item.asset==="phone";
  return {...item,asset,phone,photoMatrix:asset?devicePlaneMatrix(asset.screen,item.screen):undefined,screenMatrix:deviceScreenMatrix(asset?.screen??item.screen,phone)};
});
export default function DevicePlatformStory(){
  const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),visual=useRef<HTMLDivElement>(null);
  const reduced=useReducedMotion(),shadowId=useId().replaceAll(":","");
  const [view,setView]=useState({progress:0,width:1200,height:1200});
  useEffect(()=>{
    const update=()=>{
      if(!root.current||!stage.current||!visual.current)return;
      const top=parseFloat(getComputedStyle(stage.current).top)||0;
      const progress=clampDeviceProgress((top-root.current.getBoundingClientRect().top)/Math.max(1,root.current.offsetHeight-stage.current.offsetHeight));
      setView({progress,width:visual.current.clientWidth,height:visual.current.clientHeight});
    };
    let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;update();});};
    const resize=new ResizeObserver(schedule);if(visual.current)resize.observe(visual.current);if(stage.current)resize.observe(stage.current);
    window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);update();
    // Resolve the section permalink after hydration, before the earlier hero can start its clock.
    const anchor=requestAnimationFrame(()=>{if(location.hash==="#device-platform"){root.current?.parentElement?.scrollIntoView({block:"start",behavior:"instant"});schedule();}});
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(anchor);resize.disconnect();window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);};
  },[]);
  const camera=deviceStageCamera(view.progress,view.width,view.height,Boolean(reduced));
  const reveal=(order:number)=>deviceRevealAt(view.progress,order,Boolean(reduced));
  return <section id="device-platform" className={styles.section} aria-labelledby="device-platform-heading" data-device-section>
    <div ref={root} className={styles.story} data-device-platform data-progress={view.progress.toFixed(3)} data-reduced={Boolean(reduced)} data-menu-template={DEVICE_MENU.key}>
      <div ref={stage} className={styles.stage}>
        <div ref={visual} className={styles.visual} role="img" aria-label="같은 아티메뉴 메뉴판을 노트북, 태블릿, 스마트폰에서 보여주는 장면">
          <div className={styles.canvas} aria-hidden="true" style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`}}>
            <img className={styles.floor} src={`${ASSETS}floor.webp`} width={1200} height={1200} alt="" loading="lazy"/>
            <svg className={styles.shadows} viewBox="0 0 1200 1200" aria-hidden="true">
              <defs><filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter></defs>
              {DEVICE_STAGE_ITEMS.map(item=><polygon key={item.id} points={item.shadow.map(p=>p.join(",")).join(" ")} fill="#202020" opacity={reveal(item.order)*.17} filter={`url(#${shadowId})`}/>)}
            </svg>
            {ITEMS.map(item=>{
              const amount=reveal(item.order),{asset,phone}=item;
              return <div className={styles.reveal} key={item.id} data-device-item={item.id} data-reveal={amount.toFixed(3)} style={{opacity:amount,transform:`translateY(${(1-amount)*38}px)`}}>
                {asset?<div className={styles.device} style={{width:asset.width,height:asset.height,transform:item.photoMatrix}}>
                  <img className={styles.devicePhoto} src={`${ASSETS}${asset.file}`} width={asset.width} height={asset.height} alt="" loading="lazy"/>
                  <div className={styles.screen} style={{width:phone?390:1280,height:phone?844:800,transform:item.screenMatrix,borderRadius:phone?2:10}}>
                    <img src={phone?DEVICE_MENU.mobile:DEVICE_MENU.desktop} width={phone?390:1280} height={phone?844:800} alt="" loading="lazy"/>
                  </div>
                </div>:<div className={`${styles.screen} ${styles.menuPlane}`} style={{width:1280,height:800,transform:item.screenMatrix}}>
                  <img src={DEVICE_MENU.desktop} width={1280} height={800} alt="" loading="lazy"/>
                </div>}
                {item.id==="right-tablet"?<svg className={styles.stylus} viewBox="0 0 1200 1200" aria-hidden="true"><path d="M1003 627 1197 733" stroke="#bbb" strokeWidth="5" opacity=".25"/><path d="m1004 625 188 102" stroke="#e5e5e5" strokeWidth="6" strokeLinecap="round"/><path d="m1004 623 188 102" stroke="#fff" strokeWidth="4" strokeLinecap="round"/><path d="m1003 624-7-7 10 3" fill="#e5e5e5"/></svg>:null}
              </div>;
            })}
          </div>
        </div>
        <div className={`site-marketing-container ${styles.copy}`}>
          <div className="site-stack-title">
            <h2 id="device-platform-heading" className="type-section-title">하나의 메뉴판,<br/>모든 디바이스에서.</h2>
            <p className="type-body site-copy-muted">PC부터 태블릿, 스마트폰까지.<br/>우리 매장의 메뉴를 어디서나 보여주세요.</p>
          </div>
        </div>
      </div>
    </div>
    <div className={`site-marketing-container ${styles.action}`}>
      <Link href="/templates?plan=basic" className={buttonVariants({variant:"outline",size:"lg"})}>더 많은 디자인 보기<ArrowRight size={16} aria-hidden="true"/></Link>
    </div>
  </section>;
}
