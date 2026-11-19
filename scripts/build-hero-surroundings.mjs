/** Native image-edge composition: one shared treatment, no per-photo cutouts. */
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const sourceCommit='f0cc63774aef405c007c2f22e1356a4e194e54bc';
const output='public/assets/hero-cafe-v4';
const profiles={
 lateral:[[0,0],[18,0],[42,1],[58,1],[82,0],[100,0]],
 vertical:[[0,0],[12,0],[23,1],[77,1],[88,0],[100,0]],
 clearLateral:[[0,0],[25,0],[35,1],[65,1],[75,0],[100,0]],
 clearVertical:[[0,0],[18,0],[25,1],[69,1],[75,0],[100,0]],
};
const masks=Object.entries(profiles).map(([id,stops])=>{
 const vertical=id.toLowerCase().includes('vertical');
 return `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical?0:1}" y2="${vertical?1:0}">${stops.map(([offset,opacity])=>`<stop offset="${offset}%" stop-color="#fff" stop-opacity="${opacity}"/>`).join('')}</linearGradient><mask id="${id}Mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024" style="mask-type:alpha"><rect width="1536" height="1024" fill="url(#${id})"/></mask>`;
}).join('');
await mkdir(output,{recursive:true});
const manifest=[];
for(const scene of ['venue','counter','dining','phone']){
 const sourcePath=`public/assets/hero-cafe-v2/${scene}-expanded.webp`;
 const bytes=execFileSync('git',['show',`${sourceCommit}:${sourcePath}`],{maxBuffer:2*1024*1024});
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><defs>${masks}<filter id="edgeBlur" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1736" height="1224"><feGaussianBlur stdDeviation="32"/></filter><image id="photo" width="1536" height="1024" href="data:image/webp;base64,${bytes.toString('base64')}"/></defs><g mask="url(#verticalMask)"><use href="#photo" filter="url(#edgeBlur)" mask="url(#lateralMask)" opacity=".65"/></g><g mask="url(#clearVerticalMask)"><use href="#photo" mask="url(#clearLateralMask)"/></g></svg>`;
 const file=`${scene}-surroundings.svg`;
 await writeFile(`${output}/${file}`,svg);
 manifest.push({scene,file,sourceCommit,sourcePath,sourceSha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(`${output}/provenance.json`,JSON.stringify({treatment:'shared outer-edge blur and fade; no localized masks or center cutouts',profiles,blur:32,coordinates:{width:1536,height:1024},mappingToOriginal:{scale:2,x:-768,y:-512},assets:manifest},null,2)+'\n');
