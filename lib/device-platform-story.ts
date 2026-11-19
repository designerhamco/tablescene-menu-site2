import { heroScreenMatrix, type HeroQuad } from "./hero-cafe-motion";

/** Measured inner glass edge, including the phone notch, in original photograph pixels. */
const PHONE_SCREEN_CONTOUR = [[103,501],[104,248],[110,228],[121,210],[139,193],[156,184],[172,179],[189,177],[271,178],[277,185],[279,198],[286,210],[299,221],[318,226],[573,226],[587,223],[595,219],[604,211],[611,200],[614,184],[620,178],[698,177],[722,181],[742,190],[743,192],[751,196],[770,217],[778,233],[783,254],[783,1537],[777,1560],[767,1577],[753,1592],[751,1592],[748,1596],[741,1599],[740,1601],[721,1609],[706,1612],[181,1612],[159,1607],[143,1599],[135,1592],[133,1592],[122,1581],[120,1576],[115,1571],[107,1554],[103,1535]] as const;

/** Photograph coordinates stay independent of the actual customer-menu renderer. */
export const DEVICE_ASSETS = {
  monitor:{file:"monitor.webp",width:1374,height:1145,body:{x:46,y:42,width:1282,height:1062},screen:[[61,57],[1313,57],[1313,763],[61,763]] as HeroQuad,screenRadius:2},
  tablet:{file:"tablet.webp",width:1448,height:1086,body:{x:93,y:100,width:1262,height:886},screen:[[135,143],[1314,143],[1314,946],[135,946]] as HeroQuad,screenRadius:18},
  phone:{file:"phone.webp",width:887,height:1774,body:{x:60,y:137,width:767,height:1516},screen:[[102,177],[784,177],[784,1612],[102,1612]] as HeroQuad,screenRadius:0,screenContour:PHONE_SCREEN_CONTOUR},
} as const;
export type DeviceKind = keyof typeof DEVICE_ASSETS;
export const DEVICE_STAGE_ITEMS = ["monitor","tablet","phone"] as const;
export const DEVICE_CAPTURE_SIZE = {
  monitor:{width:1280,height:722},tablet:{width:1024,height:697},phone:{width:390,height:821},
} as const;
const screenPack = (id:string) => Object.fromEntries(DEVICE_STAGE_ITEMS.map(kind=>[
  kind,{...DEVICE_CAPTURE_SIZE[kind],src:kind==="phone"?`/assets/device-screen-correction-v1/${id}-phone.webp`:`/assets/device-template-scroll-v1/${id}-${kind}.webp`},
])) as Record<DeviceKind,{src:string;width:number;height:number}>;

/** Only static captures are used, including the tablet-shaped paper thumbnails. */
export const DEVICE_TEMPLATE_SCENES = [
  {id:"matcha",name:"REAL MATCHA",key:"cafe_real_matcha_a",screens:{
    monitor:{...DEVICE_CAPTURE_SIZE.monitor,src:"/assets/device-platform-v2/menu-monitor.webp"},
    tablet:{...DEVICE_CAPTURE_SIZE.tablet,src:"/assets/device-platform-v2/menu-tablet.webp"},
    phone:{...DEVICE_CAPTURE_SIZE.phone,src:"/assets/device-screen-correction-v1/matcha-phone.webp"},
  }},
  {id:"mellow",name:"MELLOW",key:"cafe_mocha_forest_a",screens:screenPack("mellow")},
  {id:"crema",name:"MELLO CREMA",key:"cafe_sunday_line_a",screens:screenPack("crema")},
  {id:"rosy",name:"ROSY ORANGE",key:"cafe_round_focus_a",screens:screenPack("rosy")},
] as const;
export const DEVICE_PAPER_CENTER_INDEX = DEVICE_TEMPLATE_SCENES.length*3;
export const DEVICE_PAPER_CARDS = Array.from({length:28},(_,index)=>({index,sceneIndex:index%DEVICE_TEMPLATE_SCENES.length}));
export const clampDeviceProgress = (p:number) => Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
const smooth = (value:number) => { const t=clampDeviceProgress(value);return t*t*(3-2*t); };

export function deviceTemplateSequenceAt(progress:number) {
  const timeline=clampDeviceProgress(progress)*(DEVICE_TEMPLATE_SCENES.length-1);
  const base=Math.min(DEVICE_TEMPLATE_SCENES.length-1,Math.floor(timeline));
  const position=base+smooth((timeline-base-.23)/.54);
  const next=Math.min(DEVICE_TEMPLATE_SCENES.length-1,base+1);
  const mix=smooth((position-base-.82)/.18);
  const weights=DEVICE_TEMPLATE_SCENES.map((_,index)=>index===base?1-mix:index===next?mix:0);
  if(base===next)weights[base]=1;
  return {position,weights,activeIndex:mix>=.5?next:base};
}

export const deviceScreenMatrix = (kind:DeviceKind) => heroScreenMatrix(
  DEVICE_ASSETS[kind].screen,DEVICE_CAPTURE_SIZE[kind].width,DEVICE_CAPTURE_SIZE[kind].height,
);

export function deviceScreenClipPath(kind:DeviceKind) {
  const asset=DEVICE_ASSETS[kind];
  if(!("screenContour" in asset))return undefined;
  const [[left,top],[right],,[,bottom]]=asset.screen;
  return `polygon(${asset.screenContour.map(([x,y])=>`${((x-left)/(right-left)*100).toFixed(4)}% ${((y-top)/(bottom-top)*100).toFixed(4)}%`).join(",")})`;
}

/** Approved grounded draft, fitted as one artwork unit below measured site copy. */
export function deviceStageFrame(width:number,height:number,copyBottom=0,gutter=0,copyGap=24) {
  const w=Math.max(1,width),h=Math.max(1,height),copy=Math.max(0,Math.min(h-1,copyBottom));
  const proportions=w<640
    ? {monitor:{width:.76,center:.53},tablet:{width:.36,center:.205},phone:{width:.16,center:.87}}
    : w<1024
      ? {monitor:{width:.63,center:.53},tablet:{width:.30,center:.17},phone:{width:.135,center:.86}}
      : {monitor:{width:.52,center:.52},tablet:{width:.26,center:.15},phone:{width:.105,center:.88}};
  const monitorScale=w*proportions.monitor.width/DEVICE_ASSETS.monitor.body.width;
  const monitorScreenHeight=(DEVICE_ASSETS.monitor.screen[2][1]-DEVICE_ASSETS.monitor.screen[0][1])*monitorScale;
  const commonScreenY=copy+Math.max(0,copyGap)+monitorScreenHeight/2+(w<640?60:w<1024?78:88);
  const bodies=DEVICE_STAGE_ITEMS.map(kind=>{
    const asset=DEVICE_ASSETS[kind],body=asset.body,dimensions=proportions[kind];
    const bodyWidth=w*dimensions.width,sourceScale=bodyWidth/body.width;
    return {id:kind,asset:kind,width:bodyWidth,height:body.height*sourceScale,sourceScale,
      x:w*dimensions.center-((asset.screen[0][0]+asset.screen[2][0])/2-body.x)*sourceScale,
      y:commonScreenY-((asset.screen[0][1]+asset.screen[2][1])/2-body.y)*sourceScale};
  });
  const floor=bodies[0].y+bodies[0].height;
  const items=bodies.map(item=>({...item,y:floor-item.height,shadow:{
    ambientWidth:item.width*(item.id==="monitor"?.57:.98),ambientHeight:Math.max(14,item.width*.043),
    contactWidth:item.width*(item.id==="monitor"?.29:item.id==="tablet"?.86:.70),contactHeight:Math.max(3,item.width*.012),
  }}));
  const artHeight=Math.max(w<640?500:Math.min(720,Math.max(600,w*.68)),floor+48);
  const halfExtent=Math.max(...items.flatMap(item=>[w/2-item.x,item.x+item.width-w/2]));
  const widthFit=Math.max(1,w-2*Math.max(0,Math.min(w/2-1,gutter)))/(2*halfExtent);
  const resolutionFit=Math.min(...items.map(item=>1.25/item.sourceScale));
  const scale=Math.min(1,(h-copy)/Math.max(1,artHeight-copy),widthFit,resolutionFit);
  const cardWidth=(w>=1024?290:Math.max(150,Math.min(236,w*.25)))*.9,cardHeight=cardWidth*697/1024;
  const centerY=commonScreenY;
  const perspective=w<640?560:900;
  const inwardOffset=w*(w<1024?.02:.03);
  const monitorRight=items[0].x+items[0].width;
  const clusteredItems=items.map(item=>({...item,x:item.id==="tablet"?item.x+inwardOffset:item.id==="phone"?Math.min(item.x-inwardOffset,monitorRight-item.width*.18):item.x}));
  return {compact:w<1024,width:w,height:artHeight,items:clusteredItems,floor,scale,x:(w-w*scale)/2,y:copy*(1-scale),
    paper:{cardWidth,cardHeight,centerY,perspective,farDepth:perspective*.48,depthBend:perspective*2.7,radius:w*.88,angleStep:cardWidth*.92/(w*.88),curveDrop:w<640?4:8,monitorLeft:items[0].x-w/2,monitorRight:monitorRight-w/2}};
}

export function devicePaperAt(paper:ReturnType<typeof deviceStageFrame>["paper"],index:number,position:number) {
  const theta=Math.atan((index-DEVICE_PAPER_CENTER_INDEX-position)*paper.angleStep);
  const x=paper.radius*Math.sin(theta),z=-paper.farDepth+paper.depthBend*(1-Math.cos(theta));
  const y=paper.curveDrop*(theta/.64)**2,yaw=-theta*180/Math.PI;
  const projectedX=x*paper.perspective/Math.max(1,paper.perspective-z);
  const distance=Math.max(0,paper.monitorLeft-projectedX,projectedX-paper.monitorRight);
  const proximity=1-smooth(distance/(paper.cardWidth*1.5));
  return {visible:Math.abs(theta)<=.90,theta,z,blur:Number((.65+3.35*proximity).toFixed(4)),
    transform:`translate3d(${x.toFixed(4)}px,${y.toFixed(4)}px,${z.toFixed(4)}px) rotateY(${yaw.toFixed(4)}deg)`};
}
