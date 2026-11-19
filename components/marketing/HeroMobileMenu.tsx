/* eslint-disable @next/next/no-img-element -- Captured product UI is pre-encoded at its authored viewport. */
'use client';

import {useEffect,type CSSProperties} from 'react';
import {ArrowLeftRight,ArrowUpDown} from '@/app/components/ui/site-arrow';
import {HERO_CAFE_SCREENS,heroPulseAt,type HeroScreenRect} from '@/lib/hero-cafe-motion';
import {HERO_COUNTER_CAPTURE as COUNTER,HERO_PHONE_CAPTURE as PHONE,HERO_MOBILE_ASSETS as ASSETS,mobileCounterAt,mobileDiningAt,mobilePhoneAt} from '@/lib/hero-mobile-stills';
import base from './HomeHeroMotion.module.css';
import styles from './HeroMobileMenu.module.css';

type Props={kind:'counter'|'dining'|'phone';seconds:number;reduced:boolean;onDetail?:(point:readonly[number,number])=>void;onSaleTarget?:(rect:HeroScreenRect|null)=>void};
type CueProps={x:number;y:number;time:number;start:number;end:number;gesture?:'click'|'swipe-x'|'swipe-y';id:string;width:number;height:number};
function Cue({x,y,time,start,end,gesture='click',id,width,height}:CueProps){
  if(time<start||time>=end)return null;
  const progress=(time-start)/(end-start),pulse=heroPulseAt(progress),shift=(progress-.5)*-24;
  return <span className={base.cue} data-gesture={gesture} data-hero-cue={id} style={{left:`${x/width*100}%`,top:`${y/height*100}%`,transform:`translate(-50%,-50%) ${gesture==='swipe-x'?`translateX(${shift}px)`:gesture==='swipe-y'?`translateY(${shift}px)`:''}`,opacity:gesture==='click'?.35+.65*pulse:1}}>
    {gesture==='click'?<i className={base.cueRipple} style={{transform:`scale(${1+(1-pulse)*1.3})`,opacity:pulse}}/>:gesture==='swipe-x'?<ArrowLeftRight/>:<ArrowUpDown/>}
  </span>;
}
function Still({name,style,className=''}:{name:string;style?:CSSProperties;className?:string}){
  return <img src={`${ASSETS}${name}.webp`} alt="" draggable={false} className={`${styles.still} ${className}`} style={style}/>;
}
function Scrollbar({offset,contentHeight,height,left,top}:{offset:number;contentHeight:number;height:number;left:number;top:number}){
  const thumb=height*height/contentHeight;
  return <span className={styles.scrollbar} data-still-scrollbar style={{left,top,height}}><i style={{height:thumb,transform:`translateY(${offset/contentHeight*height}px)`}}/></span>;
}
function Counter({seconds:t,reduced,onDetail,onSaleTarget}:Props){
  const state=mobileCounterAt(reduced?0:t),sale=COUNTER.sale;
  useEffect(()=>{
    const u=(sale.left+sale.width/2)/COUNTER.width,v=(sale.top+sale.height/2)/COUNTER.height,q=HERO_CAFE_SCREENS.counter;
    onDetail?.([q[0][0]*(1-u)*(1-v)+q[1][0]*u*(1-v)+q[2][0]*u*v+q[3][0]*(1-u)*v,q[0][1]*(1-u)*(1-v)+q[1][1]*u*(1-v)+q[2][1]*u*v+q[3][1]*(1-u)*v]);
    onSaleTarget?.(!reduced&&t>=27?{left:sale.left/1280,top:sale.top/800,width:sale.width/1280,height:sale.height/800}:null);
  },[t,reduced,onDetail,onSaleTarget,sale]);
  useEffect(()=>()=>onSaleTarget?.(null),[onSaleTarget]);
  return <div className={styles.surface} data-hero-still="counter" data-still-offset={state.offset.toFixed(2)}>
    {state.slides.map((opacity,index)=>opacity>0?<Still key={index} name={`counter-identity-${index+1}`} style={{width:345,height:800,opacity}}/>:null)}
    <div className={styles.menuWindow} style={{left:345,top:34,width:902,height:733}}><Still name="counter-menu" style={{width:902,height:900,transform:`translateY(${-state.offset}px)`}}/></div>
    {state.scrolling?<><Scrollbar offset={state.offset} contentHeight={900} height={733} left={1241} top={34}/><Cue id="menu-scroll" x={1011} y={464} time={t} start={5} end={27} gesture="swipe-y" width={1280} height={800}/></>:null}
  </div>;
}
function Dining({seconds:t,reduced}:Props){
  const state=mobileDiningAt(reduced?0:t);
  const names=['dining-cover','dining-page-1','dining-page-2'];
  return <div className={styles.surface} data-hero-still="dining" data-still-phase={state.modal>0?state.dialog:state.pages[2]>0?'page-2':state.pages[1]>0?'page-1':'cover'}>
    {state.pages.map((opacity,index)=>opacity>0?<Still name={names[index]} key={index} style={{opacity,transform:index>0&&opacity<1?`translateX(${(1-state.turn)*80}px)`:undefined}}/>:null)}
    {state.modal>0?<><div className={styles.dim} style={{opacity:state.modal*.35}}/><Still name={`dining-${state.dialog}`} className={styles.dialog} style={{left:160,top:state.dialog==='sent'?191:112,width:500,height:state.dialog==='sent'?321:400,opacity:state.modal,transform:`translateY(${(1-state.modal)*410}px)`}}/></>:null}
    {!reduced?<>
      <Cue id="page1" x={426} y={266} time={t} start={4} end={8} gesture="swipe-x" width={820} height={512}/>
      <Cue id="page2" x={426} y={266} time={t} start={9} end={13} gesture="swipe-x" width={820} height={512}/>
      <Cue id="call" x={764} y={450} time={t} start={15} end={21} width={820} height={512}/>
      <Cue id="wine" x={410} y={377} time={t} start={22} end={27} width={820} height={512}/>
      <Cue id="send" x={410} y={455} time={t} start={28} end={34} width={820} height={512}/>
    </>:null}
  </div>;
}
function Phone({seconds:t,reduced}:Props){
  const state=mobilePhoneAt(reduced?0:t);
  return <div className={styles.surface} data-hero-still="phone" data-still-offset={state.offset.toFixed(2)} data-still-phase={state.history>0?'history':state.cart>0?'cart':state.item>0?'item':state.added?'added':'menu'}>
    {state.cart<1?<>
      <div className={styles.phoneContent} style={{height:PHONE.contentHeight,transform:`translateY(${-state.offset}px)`}}>
        {[0,1,2,3].filter(index=>index*900<state.offset+PHONE.height+1&&Math.min((index+1)*900,PHONE.contentHeight)>state.offset-1).map(index=><Still key={index} name={`phone-menu-${index}`} style={{top:index*900,width:390,height:Math.min(900,PHONE.contentHeight-index*900)}}/>)}
      </div>
      <Still name={`phone-order-${state.added?1:0}`} style={{left:24,top:836,width:342,height:52}}/>
      {state.scrolling?<><Scrollbar offset={state.offset} contentHeight={PHONE.contentHeight} height={800} left={383} top={20}/><Cue id="menu-scroll" x={261} y={513} time={t} start={9} end={20} gesture="swipe-y" width={390} height={900}/></>:null}
      {state.item>0?<><div className={styles.dim} style={{opacity:state.item*.35}}/><Still name="phone-item" className={styles.dialog} style={{top:640,width:390,height:260,opacity:state.item,transform:`translateY(${(1-state.item)*270}px)`}}/></>:null}
      {state.toast>0?<Still name="phone-toast" className={styles.dialog} style={{left:97,top:752,width:196,height:68,opacity:state.toast,transform:`translateY(${(1-state.toast)*12}px)`}}/>:null}
    </>:null}
    {state.cart>0?<Still name="phone-cart" style={{opacity:state.cart}}/>:null}
    {state.history>0?<Still name="phone-history" style={{opacity:state.history}}/>:null}
    {!reduced?<>
      <Cue id="item" x={350} y={653} time={t} start={22} end={29} width={390} height={900}/>
      <Cue id="add" x={195} y={851} time={t} start={29} end={36} width={390} height={900}/>
      <Cue id="cart" x={195} y={862} time={t} start={36} end={43} width={390} height={900}/>
      <Cue id="order" x={195} y={674} time={t} start={53} end={62} width={390} height={900}/>
    </>:null}
  </div>;
}
export default function HeroMobileMenu(props:Props){
  return props.kind==='counter'?<Counter {...props}/>:props.kind==='dining'?<Dining {...props}/>:<Phone {...props}/>;
}
