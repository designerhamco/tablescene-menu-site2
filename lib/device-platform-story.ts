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

export const DEVICE_ASSETS = {
  laptop: { file: "laptop.webp", width: 1254, height: 1254, screen: laptopScreen },
  tablet: { file: "tablet.webp", width: 1768, height: 890, screen: tabletScreen },
  phone: { file: "phone.webp", width: 1721, height: 914, screen: phoneScreen },
} as const;
type Device = { id:string; asset?:keyof typeof DEVICE_ASSETS; order:number; screen:HeroQuad; shadow:HeroQuad };

// Positions, sizes, overlaps and the intentionally cropped bottom tablet follow the supplied reference.
export const DEVICE_STAGE_ITEMS: readonly Device[] = [
  { id:"upper-tablet", asset:"tablet", order:1, screen:[[626,212],[906,82],[1113,186],[839,314]], shadow:[[618,208],[909,70],[1136,186],[848,328]] },
  { id:"laptop", asset:"laptop", order:0, screen:[[285,278],[603,123],[605,371],[285,527]], shadow:[[269,552],[621,389],[853,516],[500,686]] },
  { id:"upright-menu", order:2, screen:[[634,265],[889,164],[890,397],[633,477]], shadow:[[626,478],[845,386],[895,414],[682,511]] },
  { id:"phone", asset:"phone", order:3, screen:[[80,753],[184,715],[343,801],[238,844]], shadow:[[58,747],[183,699],[366,806],[242,863]] },
  { id:"right-tablet", asset:"tablet", order:4, screen:[[634,795],[964,667],[1147,788],[826,897]], shadow:[[610,801],[964,647],[1176,783],[823,923]] },
  { id:"menu-card", order:5, screen:[[290,1017],[488,942],[664,1015],[464,1103]], shadow:[[292,1035],[488,957],[668,1034],[467,1120]] },
  { id:"bottom-tablet", asset:"tablet", order:6, screen:[[556,1190],[910,1090],[1105,1204],[765,1314]], shadow:[[527,1207],[910,1072],[1133,1209],[741,1357]] },
];

export const clampDeviceProgress = (p:number) => Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
const ease = (p:number) => { const t=clampDeviceProgress(p);return t*t*(3-2*t); };
export function deviceRevealAt(progress:number,order:number,reduced=false) {
  return reduced?1:ease((clampDeviceProgress(progress)-(.04+order*.12))/.13);
}

/** Map a restored flat device's four screen corners onto the unchanged reference geometry. */
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
  {at:.14,focus:[560,390],span:710},
  {at:.27,focus:[865,200],span:670},
  {at:.39,focus:[760,325],span:550},
  {at:.51,focus:[212,780],span:480},
  {at:.63,focus:[900,790],span:690},
  {at:.75,focus:[477,1015],span:650},
  {at:.87,focus:[820,970],span:1040},
  {at:.97,focus:[600,600],span:1200},
];
export function deviceStageCamera(progress:number,width:number,height:number,reduced=false) {
  const w=Math.max(1,width),h=Math.max(1,height),p=clampDeviceProgress(progress);
  if(w>=1024){const side=Math.min(h,w*.68);return {scale:side/1200,x:w-side,y:(h-side)/2};}
  let focus:HeroPoint=[600,600],span=1200;
  if(!reduced){
    const right=MOBILE_CAMERA.findIndex(k=>k.at>=p);
    const b=MOBILE_CAMERA[right<0?MOBILE_CAMERA.length-1:right],a=MOBILE_CAMERA[Math.max(0,(right<0?MOBILE_CAMERA.length-1:right)-1)];
    const t=ease((p-a.at)/Math.max(.00001,b.at-a.at));
    focus=[a.focus[0]+(b.focus[0]-a.focus[0])*t,a.focus[1]+(b.focus[1]-a.focus[1])*t];span=a.span+(b.span-a.span)*t;
  }
  const scale=Math.min(w/span,h/Math.min(span,800)),side=1200*scale;
  const position=(available:number,point:number)=>side<=available?(available-side)/2:Math.max(available-side,Math.min(0,available/2-point*scale));
  return {scale,x:position(w,focus[0]),y:position(h,focus[1])};
}
