import { heroScreenMatrix, type HeroPoint, type HeroQuad } from "./hero-cafe-motion";

/** The user's 1200 × 1200 reference is the fixed composition coordinate system. */
export const DEVICE_STAGE_SIZE = 1200;
export const DEVICE_MENU = {
  key: "cafe_real_matcha_a",
  desktop: "/assets/device-platform-v1/menu-desktop.webp",
  mobile: "/assets/device-platform-v1/menu-mobile.webp",
} as const;
const laptopScreen: HeroQuad = [[48,380.88],[715,65.39],[715,578.7],[48,898.09]];
const tabletScreen: HeroQuad = [[119.08,480.98],[1005.05,61.75],[1650.77,385.16],[766.82,805.59]];
const phoneScreen: HeroQuad = [[177.03,323.91],[670.61,91.58],[1533.71,519.29],[1047.59,760.66]];

// Measured from the two long, straight edges of the supplied floor (1200px space).
export const DEVICE_FLOOR_AXES = { u:[1,-.4570714769647698], v:[1,.4934841628959276] } as const;
function floorPlane(center:HeroPoint,uWidth:number,vWidth:number):HeroQuad {
  const u:HeroPoint=[uWidth,uWidth*DEVICE_FLOOR_AXES.u[1]],v:HeroPoint=[vWidth,vWidth*DEVICE_FLOOR_AXES.v[1]];
  const origin:HeroPoint=[center[0]-(u[0]+v[0])/2,center[1]-(u[1]+v[1])/2];
  return [origin,[origin[0]+u[0],origin[1]+u[1]],[origin[0]+u[0]+v[0],origin[1]+u[1]+v[1]],[origin[0]+v[0],origin[1]+v[1]]];
}
// Outer edge-line intersections, rather than the inset display corners. The laptop
// uses its keyboard/base plane; its upright display follows the same body transform.
const laptopPlane:HeroQuad=[[41,960],[744,618],[1233,875],[517,1224]];
const tabletPlane:HeroQuad=[[-3.1,514.17],[1055.08,13.76],[1776.89,373.3],[717.04,875.1]];
const phonePlane:HeroQuad=[[-42.8,310.62],[549.41,7.33],[1762.57,612.07],[1135.94,908.32]];
export const DEVICE_ASSETS = {
  laptop: { file: "laptop.webp", width: 1254, height: 1254, screen: laptopScreen, plane:laptopPlane },
  tablet: { file: "tablet.webp", width: 1768, height: 890, screen: tabletScreen, plane:tabletPlane },
  phone: { file: "phone.webp", width: 1721, height: 914, screen: phoneScreen, plane:phonePlane },
} as const;
type Device = { id:string; asset?:keyof typeof DEVICE_ASSETS; order:number; plane:HeroQuad; shadow:HeroQuad };
function device(id:string,asset:Device["asset"],order:number,center:HeroPoint,uWidth:number,vWidth:number):Device {
  const plane=floorPlane(center,uWidth,vWidth);
  return {id,asset,order,plane,shadow:floorPlane([center[0],center[1]+12],uWidth,vWidth)};
}

// Flat devices share the floor's two axes. Both tablets are identical translated
// copies; no independently guessed screen quadrilateral can skew their bodies.
export const DEVICE_STAGE_ITEMS: readonly Device[] = [
  device("upper-tablet","tablet",1,[880,200],330,225),
  device("laptop","laptop",0,[558,529],345,232),
  device("phone","phone",2,[210,780],103,202),
  device("right-tablet","tablet",3,[892,790],330,225),
  device("menu-card",undefined,4,[477,1015],230,144),
];

export const clampDeviceProgress = (p:number) => Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
const ease = (p:number) => { const t=clampDeviceProgress(p);return t*t*(3-2*t); };
export function deviceRevealAt(progress:number,order:number,reduced=false,wide=false) {
  const start=wide?[.015,.13,.34,.47,.72][order]:.03+order*.17;
  return reduced?1:ease((clampDeviceProgress(progress)-start)/(wide?.11:.16));
}

/** Align a device's physical base plane to the floor; its screen remains nested. */
export function devicePlaneMatrix(source:HeroQuad,target:HeroQuad):string {
  const rows:number[][]=[];
  source.forEach(([x,y],i)=>{const [u,v]=target[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
  for(let i=0;i<8;i++){
    let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;
    [rows[i],rows[pivot]]=[rows[pivot],rows[i]];
    if(Math.abs(rows[i][i])<1e-10)throw new Error("Invalid device plane");
    const d=rows[i][i];rows[i]=rows[i].map(v=>v/d);
    for(let j=0;j<8;j++)if(j!==i){const f=rows[j][i];rows[j]=rows[j].map((v,k)=>v-f*rows[i][k]);}
  }
  const h=rows.map(row=>row[8]);
  return `matrix3d(${[h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1].join(",")})`;
}
export const deviceScreenMatrix = (quad:HeroQuad,phone=false) => heroScreenMatrix(quad,phone?390:1280,phone?844:800);

const MOBILE_CAMERA: readonly { at:number; focus:HeroPoint; span:number }[] = [
  {at:0,focus:[600,600],span:1200},
  {at:.16,focus:[560,390],span:710},
  {at:.33,focus:[880,200],span:670},
  {at:.50,focus:[210,780],span:480},
  {at:.67,focus:[892,790],span:690},
  {at:.84,focus:[477,1015],span:650},
  {at:.98,focus:[600,600],span:1200},
];
export function deviceStageCamera(progress:number,width:number,height:number,reduced=false) {
  const w=Math.max(1,width),h=Math.max(1,height),p=clampDeviceProgress(progress);
  if(w>=1024){const side=w*1.05;return {scale:side/1200,x:(w-side)/2,y:(h-side)/2};}
  let focus:HeroPoint=[600,600],span=1200;
  if(!reduced){
    const right=MOBILE_CAMERA.findIndex(k=>k.at>=p);
    const b=MOBILE_CAMERA[right<0?MOBILE_CAMERA.length-1:right],a=MOBILE_CAMERA[Math.max(0,(right<0?MOBILE_CAMERA.length-1:right)-1)];
    const t=ease((p-a.at)/Math.max(.00001,b.at-a.at));
    focus=[a.focus[0]+(b.focus[0]-a.focus[0])*t,a.focus[1]+(b.focus[1]-a.focus[1])*t];span=a.span+(b.span-a.span)*t;
  }
  const scale=Math.max(Math.min(w/span,h/Math.min(span,800)),Math.max(w,h)/1200),side=1200*scale;
  const position=(available:number,point:number)=>side<=available?(available-side)/2:Math.max(available-side,Math.min(0,available/2-point*scale));
  return {scale,x:position(w,focus[0]),y:position(h,focus[1])};
}
