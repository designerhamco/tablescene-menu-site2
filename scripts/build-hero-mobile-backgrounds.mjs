/** Flatten the existing approved edge treatment once, avoiding SVG filter layers on phones. */
import {readFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const output='public/assets/hero-mobile-v1';
const geometry=JSON.parse(await readFile('lib/hero-photo-geometry.json','utf8'));
const profiles=JSON.parse(await readFile('lib/hero-photo-edge-profiles.json','utf8'));
const width=2304,height=768,policy=profiles.variants.normal;
function sample(stops,t){
 for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){
  const [a,x]=stops[i-1],[b,y]=stops[i];return x+(y-x)*Math.max(0,Math.min(1,(t-a)/(b-a)));
 }
 return stops.at(-1)[1];
}
async function mask(xStops,yStops){
 const data=Buffer.alloc(width*height*4,255);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data[(y*width+x)*4+3]=Math.round(255*sample(xStops,x/(width-1)*100)*sample(yStops,y/(height-1)*100));
 return sharp(data,{raw:{width,height,channels:4}}).png().toBuffer();
}
await mkdir(output,{recursive:true});
const softMask=await mask(policy.lateral,profiles.vertical),clearMask=await mask(policy.clearLateral,profiles.clearVertical);
for(const scene of ['venue','counter','dining','phone']){
 const photo=await sharp(`assets/hero-photo-sources-v7/${geometry[scene].source}`).rotate().resize(width,height).png().toBuffer();
 const soft=await sharp(photo).blur(policy.blur/2).ensureAlpha().composite([{input:softMask,blend:'dest-in'}]).png().toBuffer();
 const clear=await sharp(photo).ensureAlpha().composite([{input:clearMask,blend:'dest-in'}]).png().toBuffer();
 await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite([{input:soft},{input:clear}]).webp({quality:85,effort:5}).toFile(`${output}/${scene}-background.webp`);
 if(scene!=='venue'){
  // Source masks use native4344px photo coordinates; CSS maps them to4608px first.
  const logical=await sharp(`public/assets/hero-cafe-v7/${scene}-screen-mask.png`).resize(4608,1536).png().toBuffer();
  await sharp(logical).extract({left:1536,top:256,width:1536,height:1024}).resize(768,512).png().toFile(`${output}/${scene}-mask.png`);
 }
}
await sharp('public/assets/hero-cafe-v1/venue.webp').resize({width:640}).webp({quality:75}).toFile(`${output}/ambient.webp`);
