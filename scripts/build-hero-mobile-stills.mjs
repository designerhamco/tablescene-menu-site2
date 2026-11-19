/** Crop actual catalog screenshots; do not redraw product UI or change customer data. */
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
// Usage: node scripts/build-hero-mobile-stills.mjs /path/to/preview-captures
const input=(process.argv[2]??'/private/tmp/artimenu-hero-captures').replace(/\/$/,'')+'/',out='public/assets/hero-mobile-v1/';
await mkdir(out,{recursive:true});
async function crop(name,source,rect,radius=0){
 let pipeline=sharp(input+source+'.png').extract(rect);
 if(radius){const {width:w,height:h}=rect;const svg=Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h+radius}" rx="${radius}" fill="white"/></svg>`);pipeline=pipeline.ensureAlpha().composite([{input:svg,blend:'dest-in'}]);}
 await pipeline.webp({quality:88,effort:5}).toFile(out+name+'.webp');
}
for(let i=1;i<=3;i++)await crop('counter-identity-'+i,'counter-'+i,{left:0,top:0,width:345,height:800});
// Stitch the contained menu's top/bottom captures, preserving the fixed identity column.
const top=await sharp(input+'counter-1.png').extract({left:345,top:34,width:902,height:646}).toBuffer();
const bottom=await sharp(input+'counter-bottom.png').extract({left:345,top:513,width:902,height:254}).toBuffer();
await sharp({create:{width:902,height:900,channels:3,background:'#fff'}}).composite([{input:top,left:0,top:0},{input:bottom,left:0,top:646}]).webp({quality:88,effort:5}).toFile(out+'counter-menu.webp');
for(const n of ['dining-cover','dining-page-1','dining-page-2','phone-cart','phone-history'])await sharp(input+n+'.png').webp({quality:90,effort:5}).toFile(out+n+'.webp');
for(const n of ['call','wine'])await crop('dining-'+n,'dining-'+n,{left:160,top:112,width:500,height:400},16);
await crop('dining-sent','dining-sent',{left:160,top:191,width:500,height:321},16);
await crop('phone-item','phone-item',{left:0,top:640,width:390,height:260},16);
await crop('phone-toast','phone-toast',{left:97,top:752,width:196,height:68},6);
await crop('phone-order-0','phone-top',{left:24,top:836,width:342,height:52},8);
await crop('phone-order-1','phone-toast',{left:24,top:836,width:342,height:52},8);
// A full-page browser capture includes its fixed Order button at y836. Replace it
// from an overlapping capture taken at scrollY675; do not paint over real menu copy.
const patch=await sharp(input+'phone-patch.png').extract({left:0,top:149,width:390,height:76}).toBuffer();
const clean=await sharp(input+'phone-full.png').composite([{input:patch,left:0,top:824}]).png().toBuffer();
const height=3314,tileHeight=900,tiles=[];
for(let y=0;y<height;y+=tileHeight){const h=Math.min(tileHeight,height-y),name='phone-menu-'+tiles.length;await sharp(clean).extract({left:0,top:y,width:390,height:h}).webp({quality:90,effort:5}).toFile(out+name+'.webp');tiles.push({file:name+'.webp',top:y,width:390,height:h});}
await writeFile(out+'capture-manifest.json',JSON.stringify({version:1,captured:'2026-11-19',source:'ArtiMenu public catalog previewOnly; current starter data',counter:{width:1280,height:800,identityWidth:345,menu:{left:345,top:34,width:902,height:733,contentHeight:900},sale:{left:968,top:143,width:96,height:18}},dining:{width:820,height:512},phone:{width:390,height:900,contentHeight:height,tiles}},null,2)+'\n');
