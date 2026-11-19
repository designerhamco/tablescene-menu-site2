/** One photographic composition; only the complete expanded photo's outer edges soften. */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sourceCommit = 'f0cc63774aef405c007c2f22e1356a4e194e54bc';
const output = 'public/assets/hero-cafe-v5';
const width = 3072, height = 2048;
// The sharp region covers the actual 1512×762 laptop crop, not just a 16:10 test window.
const profiles = {
  lateral: [[0, 0], [4, 1], [96, 1], [100, 0]],
  vertical: [[0, 0], [1, 1], [99, 1], [100, 0]],
  clearLateral: [[0, 0], [5, 0], [15, 1], [85, 1], [95, 0], [100, 0]],
  clearVertical: [[0, 0], [1, 0], [5, 1], [95, 1], [99, 0], [100, 0]],
};
const masks = Object.entries(profiles).map(([id, stops]) => {
  const vertical = id.toLowerCase().includes('vertical');
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops.map(([offset, opacity]) => `<stop offset="${offset}%" stop-color="#fff" stop-opacity="${opacity}"/>`).join('')}</linearGradient><mask id="${id}Mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" style="mask-type:alpha"><rect width="${width}" height="${height}" fill="url(#${id})"/></mask>`;
}).join('');
// A narrow color crossfade joins the exact original to sharp outpainting. It never
// reveals the ambient layer and is not a blur/fade on the original photograph.
const seamFor = ({x,y,width,height}) => `<linearGradient id="seamX"><stop stop-color="#fff" stop-opacity="0"/><stop offset="1%" stop-color="#fff"/><stop offset="99%" stop-color="#fff"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="seamY" x2="0" y2="1"><stop stop-color="#fff" stop-opacity="0"/><stop offset="1%" stop-color="#fff"/><stop offset="99%" stop-color="#fff"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="seamXMask" style="mask-type:alpha"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#seamX)"/></mask><mask id="seamYMask" style="mask-type:alpha"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#seamY)"/></mask>`;
await mkdir(output, { recursive: true });
const assets = [];
for (const scene of ['venue', 'counter', 'dining', 'phone']) {
  const sourcePath = scene === 'venue' ? 'public/assets/hero-cafe-v2/venue-expanded.webp' : `assets/hero-photo-sources-v5/${scene}.webp`;
  const source = scene === 'venue' ? execFileSync('git', ['show', `${sourceCommit}:${sourcePath}`], { maxBuffer: 2 * 1024 * 1024 }) : await readFile(sourcePath);
  const originalPath = `public/assets/hero-cafe-v1/${scene === 'phone' ? 'phone-v3' : scene}.webp`;
  const original = await readFile(originalPath);
  // Dining's repaired POV surroundings intentionally omit generated bodies.
  // Restore the exact original tablet only, without pasting an old cropped torso
  // back over the repaired photograph. This is an asset insert, never a blur mask.
  const insert = scene === 'dining' ? {x:1248,y:757,width:825,height:560} : {x:768,y:512,width:1536,height:1024};
  const seam = seamFor(insert);
  const composition = `<g id="photo"><image width="${width}" height="${height}" href="data:image/webp;base64,${source.toString('base64')}"/><g mask="url(#seamYMask)"><image x="768" y="512" width="1536" height="1024" href="data:image/webp;base64,${original.toString('base64')}" mask="url(#seamXMask)"/></g></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${masks}${seam}<filter id="edgeBlur" filterUnits="userSpaceOnUse" x="-128" y="-128" width="3328" height="2304"><feGaussianBlur stdDeviation="48"/></filter>${composition}</defs><g mask="url(#verticalMask)"><use href="#photo" filter="url(#edgeBlur)" mask="url(#lateralMask)"/></g><g mask="url(#clearVerticalMask)"><use href="#photo" mask="url(#clearLateralMask)"/></g></svg>`;
  const file = `${scene}-composition.svg`;
  await writeFile(`${output}/${file}`, svg);
  assets.push({ scene, file, sourcePath, sourceCommit: scene === 'venue' ? sourceCommit : undefined, sourceSha256: createHash('sha256').update(source).digest('hex'), originalPath, originalInsert: insert, originalSha256: createHash('sha256').update(original).digest('hex') });
}
await writeFile(`${output}/provenance.json`, JSON.stringify({ treatment: 'one sharp original-plus-outpainting photograph; blur/fade only at full expanded outer edges', profiles, blur: 48, coordinates: { width, height }, original: { x: 768, y: 512, width: 1536, height: 1024, seamPercent: 1 }, assets }, null, 2) + '\n');
