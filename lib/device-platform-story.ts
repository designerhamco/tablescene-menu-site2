import { heroScreenMatrix, type HeroPoint, type HeroQuad } from "./hero-cafe-motion";

/** The user's 1200 × 1200 reference is the fixed composition coordinate system. */
export const DEVICE_STAGE_SIZE = 1200;
/** Measured RGB of the supplied floor's outer background, independent of UI surfaces. */
export const DEVICE_STAGE_BACKGROUND = "#f0f0f1";
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
type Device = { id:string; asset:keyof typeof DEVICE_ASSETS; order:number; plane:HeroQuad; shadow:HeroQuad };
function device(id:string,asset:Device["asset"],order:number,center:HeroPoint,uWidth:number,vWidth:number):Device {
  const plane=floorPlane(center,uWidth,vWidth);
  return {id,asset,order,plane,shadow:floorPlane([center[0],center[1]+12],uWidth,vWidth)};
}

// One laptop, one tablet and one phone share the floor's two physical axes.
export const DEVICE_STAGE_ITEMS: readonly Device[] = [
  device("laptop","laptop",0,[558,529],345,232),
  device("right-tablet","tablet",1,[892,790],330,225),
  device("phone","phone",2,[210,780],103,202),
];

export const clampDeviceProgress = (p:number) => Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
const ease = (p:number) => { const t=clampDeviceProgress(p);return t*t*(3-2*t); };
export function deviceRevealAt(progress:number,order:number,reduced=false) {
  return reduced?1:ease((clampDeviceProgress(progress)-(.05+order*.28))/.22);
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

/** A single responsive composition: scrolling never changes scale or position. */
export function deviceStageFrame(width:number,height:number,copyBottom=0) {
  const w=Math.max(1,width),h=Math.max(1,height);
  const copy=Math.max(0,Math.min(h,copyBottom)),room=Math.max(1,h-copy);
  // Physical devices occupy y=95…930. Fit all three below the measured title,
  // with breathing room, rather than enlarging a square to fill the viewport.
  const scale=Math.min(w*(w<768?1.05:.9)/DEVICE_STAGE_SIZE,room*.92/(930-95));
  return {scale,x:(w-DEVICE_STAGE_SIZE*scale)/2,y:copy+room*.04-95*scale};
}
