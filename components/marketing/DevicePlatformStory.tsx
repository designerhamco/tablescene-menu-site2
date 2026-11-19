/* eslint-disable @next/next/no-img-element -- Calibrated photographs and static menu captures use measured screen quads. */
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { DEVICE_ASSETS, DEVICE_CAPTURE_SIZE, DEVICE_PAPER_CARDS, DEVICE_TEMPLATE_SCENES, clampDeviceProgress, devicePaperAt, deviceScreenClipPath, deviceScreenMatrix, deviceStageFrame, deviceTemplateSequenceAt } from "@/lib/device-platform-story";
import MarketingCopyReveal from "./MarketingCopyReveal";
import styles from "./DevicePlatformStory.module.css";

const ASSETS="/assets/device-platform-v2/";
const SCREEN_MATRICES={monitor:deviceScreenMatrix("monitor"),tablet:deviceScreenMatrix("tablet"),phone:deviceScreenMatrix("phone")};
function CopyFields({link,headingId}:{link:boolean;headingId?:string}) {
  return <>
    <h2 id={headingId} tabIndex={headingId?-1:undefined} className="type-section-title">{link?<>웹 링크 하나로, <br className={styles.copyBreak}/>어디서든 자유롭게.</>:<>하나의 메뉴판, <br className={styles.copyBreak}/>모든 디바이스에서.</>}</h2>
    <p className="type-body-lg site-copy-muted">{link?<>화면이 크든 작든, 폴더블이든 걱정 없이 <br className={styles.copyBreak}/>반응형 웹 기술로 자연스럽게 보여집니다.</>:<>PC부터 태블릿, 스마트폰까지. <br className={styles.copyBreak}/>우리 매장의 메뉴를 어디서나 보여주세요.</>}</p>
  </>;
}

export default function DevicePlatformStory(){
  const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),visual=useRef<HTMLDivElement>(null),copy=useRef<HTMLDivElement>(null);
  const [view,setView]=useState({progress:0,width:1200,height:800,copyBottom:0,copyGap:24,gutter:0,reduced:false});
  const reduced=view.reduced;
  useEffect(()=>{
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>{
      if(!root.current||!stage.current||!visual.current||!copy.current)return;
      const top=root.current.parentElement?parseFloat(getComputedStyle(root.current.parentElement).scrollMarginTop)||0:0;
      const scrollRange=Math.max(1,root.current.offsetHeight-stage.current.offsetHeight);
      const progress=preference.matches?0:clampDeviceProgress((top-root.current.getBoundingClientRect().top)/scrollRange);
      const copyStyle=getComputedStyle(copy.current);
      const textHeight=Math.max(...Array.from(copy.current.querySelectorAll<HTMLElement>("[data-device-copy-measure]")).map(node=>node.offsetHeight));
      setView({progress,reduced:preference.matches,width:visual.current.clientWidth,height:visual.current.clientHeight,
        copyBottom:parseFloat(copyStyle.paddingTop)+textHeight,copyGap:parseFloat(copyStyle.paddingBottom),gutter:parseFloat(copyStyle.paddingLeft)||0});
    };
    let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;update();});};
    const resize=new ResizeObserver(schedule);
    for(const node of [visual.current,stage.current,copy.current,...Array.from(copy.current?.querySelectorAll("[data-device-copy-measure]")??[])])if(node)resize.observe(node);
    window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);preference.addEventListener("change",schedule);update();
    const anchor=requestAnimationFrame(()=>{if(location.hash==="#device-platform"){root.current?.parentElement?.scrollIntoView({block:"start",behavior:"instant"});schedule();}});
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(anchor);resize.disconnect();window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);preference.removeEventListener("change",schedule);};
  },[]);
  const frame=deviceStageFrame(view.width,view.height,view.copyBottom,view.gutter,view.copyGap);
  const sequence=deviceTemplateSequenceAt(view.progress),active=DEVICE_TEMPLATE_SCENES[sequence.activeIndex];
  const linkCopy=view.progress>=.48;
  return <section id="device-platform" className={styles.section} aria-labelledby="device-platform-heading" data-device-section data-reduced={Boolean(reduced)}>
    <div ref={root} className={styles.story} data-device-platform data-progress={view.progress.toFixed(4)} data-reduced={Boolean(reduced)} data-menu-template={active.key} data-template-index={sequence.activeIndex} data-template-position={sequence.position.toFixed(4)} data-image-mode="static" data-layout={frame.compact?"compact":"wide"}>
      <div ref={stage} className={styles.stage}>
        <div ref={copy} className={`site-marketing-container ${styles.copy}`} data-device-copy>
          <MarketingCopyReveal>
            <motion.div key={String(linkCopy)} className="site-stack-title" data-device-message={linkCopy?"link":"devices"} initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.35}}>
              <CopyFields link={linkCopy} headingId="device-platform-heading"/>
            </motion.div>
          </MarketingCopyReveal>
          <div className={styles.copyMeasurements} aria-hidden="true">
            {[false,true].map(link=><div key={String(link)} className="site-stack-title" data-device-copy-measure><CopyFields link={link}/></div>)}
          </div>
        </div>
        <div ref={visual} className={styles.visual} role="img" aria-label="네 가지 디자인의 정지 이미지를 PC·태블릿·스마트폰에서 함께 보여주는 장면">
          <div className={styles.canvas} data-device-frame aria-hidden="true" style={{width:frame.width,height:frame.height,transform:`translate(${frame.x}px,${frame.y}px) scale(${frame.scale})`}}>
            <div className={styles.paperScene} data-device-paper-scene style={{perspective:frame.paper.perspective,perspectiveOrigin:`50% ${frame.paper.centerY}px`}}>
              {DEVICE_PAPER_CARDS.map(card=>{
                const photo=DEVICE_TEMPLATE_SCENES[card.sceneIndex].screens.tablet;
                const paper=devicePaperAt(frame.paper,card.index,sequence.position);
                return <div key={card.index} className={styles.paperCard} data-device-paper={card.index} data-paper-template={DEVICE_TEMPLATE_SCENES[card.sceneIndex].id} data-paper-depth={paper.z.toFixed(3)} data-paper-angle={paper.theta.toFixed(4)} style={{left:frame.width/2-frame.paper.cardWidth/2,top:frame.paper.centerY-frame.paper.cardHeight/2,width:frame.paper.cardWidth,height:frame.paper.cardHeight,transform:paper.transform,visibility:paper.visible?"visible":"hidden","--paper-blur":`${paper.blur}px`} as CSSProperties}>
                  <div className={styles.paperBack}/><div className={styles.paperFront}><img src={photo.src} width={photo.width} height={photo.height} alt="" loading="lazy" decoding="async"/></div>
                </div>;
              })}
            </div>
            {frame.items.map(item=>{
              const asset=DEVICE_ASSETS[item.asset],capture=DEVICE_CAPTURE_SIZE[item.asset],shadow=item.shadow;
              return <div className={styles.deviceLayer} key={item.id} data-device-item={item.id} data-device-template={active.key}>
                <div className={styles.shadow} data-device-shadow style={{left:item.x+(item.width-shadow.ambientWidth)/2,top:frame.floor-shadow.ambientHeight/2+1.5,width:shadow.ambientWidth,height:shadow.ambientHeight}}/>
                <div className={styles.contactShadow} data-device-contact-shadow style={{left:item.x+(item.width-shadow.contactWidth)/2,top:frame.floor-shadow.contactHeight/2+.35,width:shadow.contactWidth,height:shadow.contactHeight}}/>
                <div className={styles.device} data-device-body style={{left:item.x,top:item.y,width:item.width,height:item.height}}>
                  <div className={styles.source} style={{left:-asset.body.x*item.sourceScale,top:-asset.body.y*item.sourceScale,width:asset.width,height:asset.height,transform:`scale(${item.sourceScale})`}}>
                    <img className={styles.devicePhoto} src={`${ASSETS}${asset.file}`} width={asset.width} height={asset.height} alt="" loading="lazy" decoding="async"/>
                    <div className={styles.screen} data-device-screen style={{width:capture.width,height:capture.height,transform:SCREEN_MATRICES[item.asset],borderRadius:asset.screenRadius,clipPath:deviceScreenClipPath(item.asset)}}>
                      {DEVICE_TEMPLATE_SCENES.map((scene,index)=><img key={scene.id} src={scene.screens[item.asset].src} width={capture.width} height={capture.height} alt="" loading="lazy" decoding="async" data-device-screen-scene={scene.id} style={{opacity:sequence.weights[index]}}/>)}
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
