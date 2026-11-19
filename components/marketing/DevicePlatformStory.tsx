/* eslint-disable @next/next/no-img-element -- Pixel-calibrated cutout artwork uses optimized local WebP assets. */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DEVICE_ASSETS, DEVICE_MENU, DEVICE_STAGE_SIZE, clampDeviceProgress, deviceRevealAt, deviceScreenMatrix, deviceStageFrame } from "@/lib/device-platform-story";
import MarketingCopyReveal from "./MarketingCopyReveal";
import styles from "./DevicePlatformStory.module.css";

const ASSETS="/assets/device-platform-v2/";
const SCREEN_MATRICES={monitor:deviceScreenMatrix("monitor"),tablet:deviceScreenMatrix("tablet"),phone:deviceScreenMatrix("phone")};
export default function DevicePlatformStory(){
  const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),visual=useRef<HTMLDivElement>(null),copy=useRef<HTMLDivElement>(null);
  const reduced=useReducedMotion(),shadowId=useId().replaceAll(":","");
  const [view,setView]=useState({progress:0,width:1200,height:800,copyBottom:0,gutter:0});
  useEffect(()=>{
    const update=()=>{
      if(!root.current||!stage.current||!visual.current)return;
      const top=root.current.parentElement?parseFloat(getComputedStyle(root.current.parentElement).scrollMarginTop)||0:0;
      const scrollRange=Math.max(1,root.current.offsetHeight-stage.current.offsetHeight);
      const progress=clampDeviceProgress((top-root.current.getBoundingClientRect().top)/scrollRange);
      setView({progress,width:visual.current.clientWidth,height:visual.current.clientHeight,copyBottom:copy.current?.offsetHeight??0,gutter:copy.current?parseFloat(getComputedStyle(copy.current).paddingLeft)||0:0});
    };
    let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;update();});};
    const resize=new ResizeObserver(schedule);if(visual.current)resize.observe(visual.current);if(stage.current)resize.observe(stage.current);if(copy.current)resize.observe(copy.current);
    window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);update();
    const anchor=requestAnimationFrame(()=>{if(location.hash==="#device-platform"){root.current?.parentElement?.scrollIntoView({block:"start",behavior:"instant"});schedule();}});
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(anchor);resize.disconnect();window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);};
  },[]);
  const frame=deviceStageFrame(view.width,view.height,view.copyBottom,view.gutter);
  const reveal=(order:number)=>deviceRevealAt(view.progress,order,Boolean(reduced));
  const linkCopy=view.progress>=.48;
  return <section id="device-platform" className={styles.section} aria-labelledby="device-platform-heading" data-device-section data-reduced={Boolean(reduced)}>
    <div ref={root} className={styles.story} data-device-platform data-progress={view.progress.toFixed(3)} data-reduced={Boolean(reduced)} data-menu-template={DEVICE_MENU.key} data-layout={frame.compact?"compact":"wide"}>
      <div ref={stage} className={styles.stage}>
        <div ref={copy} className={`site-marketing-container ${styles.copy}`} data-device-copy>
          <MarketingCopyReveal>
            <motion.div key={String(linkCopy)} className="site-stack-title" data-device-message={linkCopy?"link":"devices"} initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.35}}>
              <h2 id="device-platform-heading" className="type-section-title">{linkCopy?<>웹 링크 하나로, <br className={styles.copyBreak}/>어디서든 자유롭게.</>:<>하나의 메뉴판, <br className={styles.copyBreak}/>모든 디바이스에서.</>}</h2>
              <p className="type-body-lg site-copy-muted">{linkCopy?<>화면이 크든 작든, 폴더블이든 걱정 없이 <br className={styles.copyBreak}/>반응형 웹 기술로 자연스럽게 보여집니다.</>:<>PC부터 태블릿, 스마트폰까지. <br className={styles.copyBreak}/>우리 매장의 메뉴를 어디서나 보여주세요.</>}</p>
            </motion.div>
          </MarketingCopyReveal>
        </div>
        <div ref={visual} className={styles.visual} role="img" aria-label="같은 아티메뉴 메뉴판을 정면 PC 모니터, 태블릿, 스마트폰에서 보여주는 장면">
          <div className={styles.canvas} data-device-frame aria-hidden="true" style={{width:DEVICE_STAGE_SIZE.width,height:DEVICE_STAGE_SIZE.height,transform:`translate(${frame.x}px,${frame.y}px) scale(${frame.scale})`}}>
            <svg className={styles.shadows} viewBox={`0 0 ${DEVICE_STAGE_SIZE.width} ${DEVICE_STAGE_SIZE.height}`} aria-hidden="true">
              <defs>
                <filter id={`${shadowId}-ambient`} x="-60%" y="-600%" width="220%" height="1300%"><feGaussianBlur stdDeviation="11"/></filter>
                <filter id={`${shadowId}-contact`} x="-30%" y="-400%" width="160%" height="900%"><feGaussianBlur stdDeviation="2.5"/></filter>
              </defs>
              {frame.items.map(item=><g key={item.id} opacity={reveal(item.order)}>
                <ellipse cx={item.shadow.cx} cy={item.shadow.cy+2} rx={item.shadow.rx} ry={item.shadow.ry} fill="#34302c" opacity=".20" filter={`url(#${shadowId}-ambient)`}/>
                <ellipse cx={item.x+item.width/2} cy={item.shadow.cy-2} rx={item.shadow.contactRx} ry={item.shadow.contactRy} fill="#282522" opacity=".30" filter={`url(#${shadowId}-contact)`}/>
              </g>)}
            </svg>
            {frame.items.map(item=>{
              const asset=DEVICE_ASSETS[item.asset],capture=DEVICE_MENU[item.asset],amount=reveal(item.order);
              return <div className={styles.reveal} key={item.id} data-device-item={item.id} data-reveal={amount.toFixed(3)} style={{opacity:amount}}>
                <div className={styles.device} data-device-body style={{left:item.x,top:item.y,width:item.width,height:item.height}}>
                  <div className={styles.source} style={{left:-asset.body.x*item.sourceScale,top:-asset.body.y*item.sourceScale,width:asset.width,height:asset.height,transform:`scale(${item.sourceScale})`}}>
                    <img className={styles.devicePhoto} src={`${ASSETS}${asset.file}`} width={asset.width} height={asset.height} alt="" loading="lazy"/>
                    <div className={styles.screen} data-device-screen style={{width:capture.width,height:capture.height,transform:SCREEN_MATRICES[item.asset],borderRadius:asset.screenRadius}}>
                      <img src={capture.src} width={capture.width} height={capture.height} alt="" loading="lazy"/>
                    </div>
                  </div>
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  </section>;
}
