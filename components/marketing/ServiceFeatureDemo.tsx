"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Bell, Check, ShoppingBag } from "@/app/components/ui/site-icon";
import type { VisualKind } from "./MarketingVisual";
import styles from "./ServiceFeatureDemo.module.css";

const photos = ["/menu-templates/cafe_design_a/black-sesame-featured.jpg", "/menu-templates/cafe_design_a/nutty-cream-featured.jpg", "/menu-templates/cafe_design_a/malcha.jpg"];
function Photo({ index = 0 }: { index?: number }) {
  return <Image src={photos[index]} alt="" width={720} height={720} sizes="(max-width:767px) 70vw, 24vw" className={styles.photo}/>;
}

/** Replaceable, local illustration; it never sends orders or staff requests. */
export default function ServiceFeatureDemo({ kind, playing }: { kind: VisualKind; playing: boolean }) {
  const [seconds, setSeconds] = useState(45);
  useEffect(() => {
    if (!playing || kind !== "sale") return;
    const timer = window.setInterval(() => setSeconds(value => value === 0 ? 59 : value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing, kind]);
  return <div className={styles.demo} data-kind={kind} data-playing={playing} aria-hidden="true">
    {kind === "featured" ? <div className={styles.featured}>
      <div className={styles.featuredPhoto} data-demo-motion><Photo/></div>
      <div className={styles.copy}><span className={`type-caption ${styles.chip}`}>SIGNATURE</span><strong className="type-content-title">가장 먼저<br/>만나는 한 잔.</strong><span className="type-body-sm">흑임자 크림 라떼</span><b className="type-subsection-title">6.5</b></div>
    </div> : null}
    {kind === "gallery" ? <div className={styles.photos}>
      {[0,1,2].map(index => <div key={index} data-demo-motion><Photo index={index}/></div>)}
    </div> : null}
    {kind === "prices" ? <div className={styles.paper}>
      <div className={`${styles.priceHeading} type-caption`}><span>COFFEE</span><span>HOT</span><span>ICE</span></div>
      {["아메리카노", "카페라떼", "흑임자 라떼"].map((name,index) => <div className={`${styles.priceRow} type-body-sm`} key={name} data-demo-motion><strong>{name}</strong><span>{["4.5","5.0","6.5"][index]}</span><span>{["5.0","5.5","7.0"][index]}</span></div>)}
    </div> : null}
    {kind === "sale" ? <div className={styles.sale}>
      <div className={styles.salePhoto}><Photo index={1}/></div>
      <div className={styles.copy}><span className={`type-caption ${styles.chip}`}>TIME SALE</span><strong className="type-body-sm">너티 크림 라떼</strong><span className="type-body-sm"><del>6,800원</del></span><b className="type-subsection-title">5,500원</b><span className={`type-body-sm ${styles.timer}`} data-demo-motion>02 : 18 : {String(seconds).padStart(2,"0")}</span></div>
    </div> : null}
    {kind === "widgets" ? <div className={styles.widget} data-demo-motion><span className={`type-caption ${styles.chip}`}>오늘의 추천</span><strong className="type-subsection-title">커피 한 잔,<br/>작은 즐거움.</strong><span className="type-body-sm">갓 구운 디저트와 함께하세요.</span><span className={styles.ornament}/></div> : null}
    {kind === "advertising" ? <div className={styles.ad}>
      <div data-demo-motion><Photo index={2}/></div><div className={styles.adCopy}><span className="type-caption">NEW SEASON</span><strong className="type-subsection-title">초록빛 한 잔의 여유</strong><span className="type-body-sm">매장의 새로운 소식을 전하세요.</span></div>
    </div> : null}
    {kind === "call" || kind === "order" ? <div className={styles.operation}>
      <div className={`${styles.operationHeader} type-caption`}><span>ARTIMENU</span><span>Table 1</span></div>
      <div className={styles.product}><div><Photo/></div><strong className="type-body-sm">흑임자 크림 라떼<br/><span>6,500원</span></strong></div>
      <div className={`${styles.action} type-body-sm`}>{kind === "call" ? <Bell/> : <ShoppingBag/>}{kind === "call" ? "직원 호출" : "메뉴 담기"}</div>
      <div className={styles.sheet} data-demo-motion><strong className="type-body-sm">{kind === "call" ? "무엇을 도와드릴까요?" : "취향대로 골라주세요"}</strong><span className="type-caption"><Check/>{kind === "call" ? "물 부탁드려요" : "ICE · 수량 1개"}</span></div>
    </div> : null}
  </div>;
}
