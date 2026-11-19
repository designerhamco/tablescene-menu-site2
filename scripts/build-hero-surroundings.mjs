/** Apply one shared full-photo edge treatment to already-finished photographs.
 * No original rectangle, foreground insert, or source-photo stitching exists here. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const output='public/assets/hero-cafe-v7';
const width=4608,height=1536;
const profiles={
 lateral:[[0,0],[12,0],[26,1],[74,1],[88,0],[100,0]],
 vertical:[[0,0],[8,0],[14,1],[86,1],[92,0],[100,0]],
 clearLateral:[[0,0],[22,0],[29,1],[71,1],[78,0],[100,0]],
 clearVertical:[[0,0],[12,0],[16,1],[84,1],[88,0],[100,0]],
};
const masks=Object.entries(profiles).map(([id,stops])=>{
 const vertical=id.toLowerCase().includes('vertical');
 return `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical?0:1}" y2="${vertical?1:0}">${stops.map(([offset,opacity])=>`<stop offset="${offset}%" stop-color="#fff" stop-opacity="${opacity}"/>`).join('')}</linearGradient><mask id="${id}Mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" style="mask-type:alpha"><rect width="${width}" height="${height}" fill="url(#${id})"/></mask>`;
}).join('');
const geometry=JSON.parse(await readFile('lib/hero-photo-geometry.json','utf8'));
await mkdir(output,{recursive:true});const assets=[];
for(const scene of ['venue','counter','dining','phone']){
 const sourcePath=`assets/hero-photo-sources-v7/${geometry[scene].source}`,source=await readFile(sourcePath),metadata=await sharp(source).metadata();
 if(metadata.width*height!==metadata.height*width)throw new Error(`${scene}: expected finished3:1 photograph`);
 // Encode the complete approved photograph once; never restore an old rectangle.
 const display=await sharp(source).rotate().webp({quality:95,effort:5}).toBuffer();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${masks}<filter id="edgeBlur" filterUnits="userSpaceOnUse" x="-128" y="-128" width="4864" height="1792"><feGaussianBlur stdDeviation="48"/></filter><image id="photo" width="${width}" height="${height}" href="data:image/webp;base64,${display.toString('base64')}"/></defs><g mask="url(#verticalMask)"><use href="#photo" filter="url(#edgeBlur)" mask="url(#lateralMask)"/></g><g mask="url(#clearVerticalMask)"><use href="#photo" mask="url(#clearLateralMask)"/></g></svg>`;
 const file=`${scene}-composition.svg`;await writeFile(`${output}/${file}`,svg);
 assets.push({scene,file,sourcePath,sourceSha256:createHash('sha256').update(source).digest('hex'),nativeWidth:metadata.width,nativeHeight:metadata.height,displayBytes:display.length,embeddedPhotographs:1});
}
await writeFile(`${output}/provenance.json`,JSON.stringify({treatment:'one finished3:1 photograph; effects at complete photograph outer edges only',profiles,blur:48,coordinates:{width,height},originalPlane:{x:1536,y:256,width:1536,height:1024},assets},null,2)+'\n');
