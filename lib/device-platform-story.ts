import { heroScreenMatrix, type HeroQuad } from "./hero-cafe-motion";

export const DEVICE_STAGE_SIZE = { width:1240, height:1200 } as const;
export const DEVICE_MENU = {
  key:"cafe_real_matcha_a",
  monitor:{src:"/assets/device-platform-v2/menu-monitor.webp",width:1280,height:722},
  tablet:{src:"/assets/device-platform-v2/menu-tablet.webp",width:1024,height:697},
  phone:{src:"/assets/device-platform-v2/menu-phone.webp",width:390,height:746},
} as const;

/** Source-pixel calibration of the front-facing cutouts; bodies are never skewed. */
export const DEVICE_ASSETS = {
  monitor:{file:"monitor.webp",width:1374,height:1145,body:{x:46,y:42,width:1282,height:1062},screen:[[61,57],[1313,57],[1313,763],[61,763]] as HeroQuad,screenRadius:2},
  tablet:{file:"tablet.webp",width:1448,height:1086,body:{x:93,y:100,width:1262,height:886},screen:[[135,143],[1314,143],[1314,946],[135,946]] as HeroQuad,screenRadius:18},
  // The native notch and lower safe area stay in the photograph, outside the menu.
  phone:{file:"phone.webp",width:887,height:1774,body:{x:60,y:137,width:767,height:1516},screen:[[103,245],[783,245],[783,1545],[103,1545]] as HeroQuad,screenRadius:0},
} as const;
export type DeviceKind = keyof typeof DEVICE_ASSETS;
export const DEVICE_STAGE_ITEMS = [
  {id:"monitor",asset:"monitor",order:0},
  {id:"tablet",asset:"tablet",order:1},
  {id:"phone",asset:"phone",order:2},
] as const;
const LAYOUTS = {
  wide:{monitor:{x:210,y:30,width:900},tablet:{x:80,y:510,width:480},phone:{x:1010,y:492,width:180}},
  compact:{monitor:{x:110,y:25,width:1000},tablet:{x:40,y:700,width:560},phone:{x:930,y:680,width:230}},
} as const;

export const clampDeviceProgress = (p:number) => Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
export function deviceRevealAt(progress:number,order:number,reduced=false) {
  if(reduced)return 1;
  const t=clampDeviceProgress((clampDeviceProgress(progress)-(.05+order*.28))/.22);
  return t*t*(3-2*t);
}
export const deviceScreenMatrix = (kind:DeviceKind) => {
  const capture=DEVICE_MENU[kind];
  return heroScreenMatrix(DEVICE_ASSETS[kind].screen,capture.width,capture.height);
};

/** A static composition per viewport. Progress only changes device opacity. */
export function deviceStageFrame(width:number,height:number,copyBottom=0,gutter=0) {
  const w=Math.max(1,width),h=Math.max(1,height),compact=w<1024;
  const layout=LAYOUTS[compact?"compact":"wide"];
  const items=DEVICE_STAGE_ITEMS.map(item=>{
    const asset=DEVICE_ASSETS[item.asset],position=layout[item.asset];
    const sourceScale=position.width/asset.body.width;
    const bodyHeight=asset.body.height*sourceScale;
    return {...item,...position,height:bodyHeight,sourceScale,shadow:{
      cx:position.x+position.width*.525,cy:position.y+bodyHeight+2,
      rx:position.width*(item.asset==="monitor"?.24:.54),
      ry:position.width*(item.asset==="monitor"?.024:.026),
      contactRx:position.width*(item.asset==="monitor"?.14:.43),
      contactRy:Math.max(2.5,position.width*.006),
    }};
  });
  const bounds={
    left:Math.min(...items.map(i=>i.x))-24,
    right:Math.max(...items.map(i=>i.x+i.width))+24,
    top:Math.min(...items.map(i=>i.y)),
    bottom:Math.max(...items.map(i=>i.y+i.height))+24,
  };
  const copy=Math.max(0,Math.min(h,copyBottom)),room=Math.max(1,h-copy);
  const scale=Math.min(compact?1:1.25,Math.max(1,w-Math.max(0,gutter)*2)/(bounds.right-bounds.left),room*.92/(bounds.bottom-bounds.top));
  const x=(w-(bounds.right-bounds.left)*scale)/2-bounds.left*scale,y=copy+room*.04-bounds.top*scale;
  const monitor=items[0];
  return {compact,items,scale,x,y,floorTop:y+(monitor.y+monitor.height*.66)*scale};
}
