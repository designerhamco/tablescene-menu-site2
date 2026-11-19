/** Offline measurement of blank device screens; never alters the photographs. */
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
function fitLine(points){const n=points.length,s=points.reduce((a,[x,y])=>[a[0]+x,a[1]+y,a[2]+x*x,a[3]+x*y],[0,0,0,0]);const a=(n*s[3]-s[0]*s[1])/(n*s[2]-s[0]*s[0]);return[a,(s[1]-a*s[0])/n];}
function grayQuad(data,w,h,roi,maximum=249){
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=[];
 const gray=i=>{const r=data[i*3],g=data[i*3+1],b=data[i*3+2];return Math.min(r,g,b)>170&&Math.max(r,g,b)<maximum&&Math.max(r,g,b)-Math.min(r,g,b)<24;};
 const [l,t,r,b]=roi.map(Math.round);
 for(let y=t;y<b;y++)for(let x=l;x<r;x++){
  const start=y*w+x;if(seen[start]||!gray(start))continue;let head=0,tail=1;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],ix=i%w,iy=(i-ix)/w;for(const j of [ix>l?i-1:-1,ix<r-1?i+1:-1,iy>t?i-w:-1,iy<b-1?i+w:-1])if(j>=0&&!seen[j]&&gray(j)){seen[j]=1;queue[tail++]=j;}}
  if(tail>best.length)best=Array.from(queue.subarray(0,tail));
 }
 assert.ok(best.length>1000,'blank phone screen must be measurable');
 let minX=w,maxX=0,minY=h,maxY=0;const rows=new Map(),cols=new Map();
 for(const i of best){const x=i%w,y=(i-x)/w;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);const rr=rows.get(y)||[w,0];rr[0]=Math.min(rr[0],x);rr[1]=Math.max(rr[1],x);rows.set(y,rr);const cc=cols.get(x)||[h,0];cc[0]=Math.min(cc[0],y);cc[1]=Math.max(cc[1],y);cols.set(x,cc);}
 const middle=(v,min,max)=>v>min+(max-min)*.2&&v<max-(max-min)*.2;
 const lr=[0,1].map(side=>fitLine([...rows].filter(([y])=>middle(y,minY,maxY)).map(([y,x])=>[y,x[side]])));
 const tb=[0,1].map(side=>fitLine([...cols].filter(([x])=>middle(x,minX,maxX)).map(([x,y])=>[x,y[side]])));
 const corner=(side,edge)=>{const[c,d]=lr[side],[a,b]=tb[edge],x=(c*b+d)/(1-c*a);return[x,a*x+b];};
 return {quad:[corner(0,0),corner(1,0),corner(1,1),corner(0,1)],pixels:best};
}

const sources={venue:'venue.jpg',counter:'counter.jpg',dining:'dining.jpg',phone:'phone.jpg'};
const regions={venue:[[880,250,1080,410],[1060,240,1280,410],[1270,220,1535,410],[1300,450,1410,530]],counter:[[980,220,1420,480]],dining:[[900,220,1340,510]],phone:[[1050,180,1290,530],[950,280,1070,350]]};
const geometry={};
for(const[scene,file]of Object.entries(sources)){
 const {data,info}=await sharp(`assets/hero-photo-sources-v7/${file}`).rotate().removeAlpha().raw().toBuffer({resolveWithObject:true});
 const screens=regions[scene].map((roi,index)=>grayQuad(data,info.width,info.height,roi.map(value=>value*info.width/2172),scene==='phone'&&index===1?256:249));
 geometry[scene]={source:file,width:info.width,height:info.height,nativeScreens:screens.map(s=>s.quad),screens:screens.map(s=>s.quad.map(([x,y])=>[Number((x*4608/info.width-1536).toFixed(4)),Number((y*1536/info.height-256).toFixed(4))]))};
 if(scene!=='venue'){
  const rgba=Buffer.alloc(info.width*info.height*4);
  for(const i of screens[0].pixels){rgba[i*4]=255;rgba[i*4+1]=255;rgba[i*4+2]=255;rgba[i*4+3]=255;}
  await sharp(rgba,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(`public/assets/hero-cafe-v7/${scene}-screen-mask.png`);
 }
 console.log(scene,JSON.stringify(geometry[scene].screens));
}
await writeFile('lib/hero-photo-geometry.json',JSON.stringify(geometry,null,2)+'\n');
