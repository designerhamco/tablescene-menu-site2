/** Apply shared responsive full-photo edge profiles to finished photographs.
 * No original rectangle, foreground insert, or source-photo stitching exists here. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const output='public/assets/hero-cafe-v8';
const edgeProfiles=JSON.parse(await readFile('lib/hero-photo-edge-profiles.json','utf8'));
const {width,height}=edgeProfiles;
function masksFor(policy){
 const profiles={lateral:policy.lateral,vertical:edgeProfiles.vertical,clearLateral:policy.clearLateral,clearVertical:edgeProfiles.clearVertical};
 return Object.entries(profiles).map(([id,stops])=>{
  const vertical=id.toLowerCase().includes('vertical');
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical?0:1}" y2="${vertical?1:0}">${stops.map(([offset,opacity])=>`<stop offset="${offset}%" stop-color="#fff" stop-opacity="${opacity}"/>`).join('')}</linearGradient><mask id="${id}Mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" style="mask-type:alpha"><rect width="${width}" height="${height}" fill="url(#${id})"/></mask>`;
 }).join('');
}
const geometry=JSON.parse(await readFile('lib/hero-photo-geometry.json','utf8'));
await mkdir(output,{recursive:true});const assets=[];
for(const scene of ['venue','counter','dining','phone']){
 const sourcePath=`assets/hero-photo-sources-v7/${geometry[scene].source}`,source=await readFile(sourcePath),metadata=await sharp(source).metadata();
 if(metadata.width*height!==metadata.height*width)throw new Error(`${scene}: expected finished3:1 photograph`);
 // Encode the complete approved photograph once; never restore an old rectangle.
 const display=await sharp(source).rotate().webp({quality:95,effort:5}).toBuffer();
 for(const [profile,policy] of Object.entries(edgeProfiles.variants)){
  const padding=profile==='normal'?128:policy.blur*3;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${masksFor(policy)}<filter id="edgeBlur" filterUnits="userSpaceOnUse" x="-${padding}" y="-${padding}" width="${width+padding*2}" height="${height+padding*2}"><feGaussianBlur stdDeviation="${policy.blur}"/></filter><image id="photo" width="${width}" height="${height}" href="data:image/webp;base64,${display.toString('base64')}"/></defs><g mask="url(#verticalMask)"><use href="#photo" filter="url(#edgeBlur)" mask="url(#lateralMask)"/></g><g mask="url(#clearVerticalMask)"><use href="#photo" mask="url(#clearLateralMask)"/></g></svg>`;
  const file=`${scene}${profile==='normal'?'':`-${profile}`}-composition.svg`;await writeFile(`${output}/${file}`,svg);
  assets.push({scene,profile,file,sourcePath,sourceSha256:createHash('sha256').update(source).digest('hex'),nativeWidth:metadata.width,nativeHeight:metadata.height,displayBytes:display.length,embeddedPhotographs:1});
 }
}
await writeFile(`${output}/provenance.json`,JSON.stringify({treatment:'one finished3:1 photograph; responsive effects at complete photograph outer edges only',edgeProfiles,coordinates:{width,height},originalPlane:{x:1536,y:256,width:1536,height:1024},assets},null,2)+'\n');
