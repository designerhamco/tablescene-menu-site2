/** Native SVG composition: retain the existing raster unchanged, mask unsafe anatomy. */
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const sourceCommit='f0cc63774aef405c007c2f22e1356a4e194e54bc';
const output='public/assets/hero-cafe-v3';
const rect=(x,y,width,height,fill='#000')=>`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
// All gradients paint black with changing alpha over white. Overlaps can only hide more.
const gradients=[['in',1,0,0,1],['out',1,0,1,0],['down',0,1,0,1],['up',0,1,1,0]].map(([id,x,y,a,b])=>`<linearGradient id="${id}" x1="0" y1="0" x2="${x}" y2="${y}"><stop stop-color="#000" stop-opacity="${a}"/><stop offset="1" stop-color="#000" stop-opacity="${b}"/></linearGradient>`).join('');
const fade=(x,y,w,h,id)=>rect(x,y,w,h,`url(#${id})`);
const edges=fade(0,0,60,1024,'out')+fade(1476,0,60,1024,'in')+fade(0,0,1536,40,'up')+fade(0,984,1536,40,'down');
// The original photograph/UI owns the center. Never expose a second blank device.
const center=rect(384,256,768,512)+fade(304,256,80,512,'in')+fade(1152,256,80,512,'out')+fade(384,176,768,80,'down')+fade(384,768,768,80,'up');
const privacy={
 venue:'',
 counter:rect(1050,620,486,404)+fade(990,620,60,404,'in')+fade(1050,560,486,60,'down'),
 dining:rect(0,0,440,1024)+fade(440,0,80,1024,'out')+rect(1000,0,390,1024)+fade(920,0,80,1024,'in')+fade(1390,0,60,1024,'out')+rect(0,740,1536,284)+fade(0,680,1536,60,'down'),
 phone:rect(0,0,384,1024)+fade(384,0,128,1024,'out')+rect(0,688,1536,336)+fade(0,608,1536,80,'down'),
};
await mkdir(output,{recursive:true});
const manifest=[];
for(const [scene,cut] of Object.entries(privacy)){
 const sourcePath=`public/assets/hero-cafe-v2/${scene}-expanded.webp`;
 const bytes=execFileSync('git',['show',`${sourceCommit}:${sourcePath}`],{maxBuffer:2*1024*1024});
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><defs>${gradients}<mask id="surroundings" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024" style="mask-type:luminance">${rect(0,0,1536,1024,'#fff')}${edges}${center}${cut}</mask></defs><image width="1536" height="1024" href="data:image/webp;base64,${bytes.toString('base64')}" mask="url(#surroundings)"/></svg>`;
 const file=`${scene}-surroundings.svg`;
 await writeFile(`${output}/${file}`,svg);
 manifest.push({scene,file,sourceCommit,sourcePath,sourceSha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(`${output}/provenance.json`,JSON.stringify({coordinates:{width:1536,height:1024},mappingToOriginal:{scale:2,x:-768,y:-512},assets:manifest},null,2)+'\n');
