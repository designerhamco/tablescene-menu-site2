import { HERO_COUNTER_TIMELINE, HERO_PHONE_TIMELINE, heroTween } from './hero-cafe-motion';

/** Decide before mounting a native preview, including short touch-phone landscape. */
export const HERO_MOBILE_MEDIA = '(max-width: 767px), (pointer: coarse) and (max-height: 600px)';
export const HERO_MOBILE_ASSETS = '/assets/hero-mobile-v1/';
export const HERO_COUNTER_CAPTURE = {
  width:1280,height:800,identityWidth:345,
  menu:{left:345,top:34,width:902,height:733,contentHeight:900},
  sale:{left:968,top:143,width:96,height:18},
} as const;
export const HERO_PHONE_CAPTURE = {width:390,height:900,contentHeight:3314,tileHeight:900} as const;

export function mobileCounterAt(t:number) {
  const second=heroTween(t,1.3,1.9),third=heroTween(t,3,3.7);
  const maximum=HERO_COUNTER_CAPTURE.menu.contentHeight-HERO_COUNTER_CAPTURE.menu.height;
  const offset=maximum*heroTween(t,...HERO_COUNTER_TIMELINE.browse)*(1-heroTween(t,...HERO_COUNTER_TIMELINE.focus));
  return {slides:[1-second,second*(1-third),third],offset,scrolling:t>=5&&t<27};
}
export function mobileDiningAt(t:number) {
  const first=heroTween(t,4,6),second=heroTween(t,9,11);
  return {pages:[1-first,first*(1-second),second],turn:t>=9&&t<11?second:t>=4&&t<6?first:1,
    modal:heroTween(t,18,20),dialog:t>=31?'sent':t>=25?'wine':'call'} as const;
}
export function mobilePhoneAt(t:number) {
  const offset=(HERO_PHONE_CAPTURE.contentHeight-HERO_PHONE_CAPTURE.height)*heroTween(t,...HERO_PHONE_TIMELINE.browse);
  const item=heroTween(t,28,29)*(1-heroTween(t,35,36));
  const toast=heroTween(t,35,35.5)*(1-heroTween(t,39,40));
  const cart=heroTween(t,42,43),history=heroTween(t,60,62);
  return {offset,item,toast,cart,history,added:t>=35,scrolling:t>=9&&t<20};
}
