const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../..');
const staging = path.join(root, 'V3/assets/revisions-buffs-scenes-20260914/armes');
const read = file => fs.readFileSync(path.join(root, file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const names = Object.keys(JSON.parse(read('V3/donnees/armes.json')));
const pad = i => String(i).padStart(2, '0');
const xml = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const size = 512;

function protectedFiles() {
  return ['V3/donnees/armes.json', 'V3/donnees/cartes.json',
    ...Array.from({length:20}, (_, i) => `V3/assets/armes/${pad(i)}.png`)]
    .map(file => ({file, sha256:hash(read(file))}));
}

function components(values, width, height, threshold) {
  const visited = new Uint8Array(values.length), groups = [];
  for (let start = 0; start < values.length; start++) {
    if (visited[start] || values[start] < threshold) continue;
    const pixels = [start];
    visited[start] = 1;
    let touchesEdge = false, peak = 0;
    for (let q = 0; q < pixels.length; q++) {
      const p = pixels[q], x = p % width, y = Math.floor(p / width);
      touchesEdge ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;
      peak = Math.max(peak, values[p]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, n = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited[n] || values[n] < threshold) continue;
        visited[n] = 1;
        pixels.push(n);
      }
    }
    groups.push({pixels, touchesEdge, peak});
  }
  return groups;
}

async function extractHistorical(index) {
  const source = `V1/assets/armes/${pad(index)}.jpg`;
  const {data, info} = await sharp(read(source)).removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width, 46);
  assert.equal(info.height, 46);
  const whiteness = Buffer.alloc(46 * 46);
  for (let p = 0; p < whiteness.length; p++) {
    whiteness[p] = Math.min(data[p * info.channels], data[p * info.channels + 1], data[p * info.channels + 2]);
  }
  // V2's native white-glyph extraction, with edge-connected frame rejection.
  const threshold = index === 14 ? 45 : 80;
  const minPeak = index === 14 ? 90 : 125;
  const alphaRange = index === 14 ? [45,95] : [85,135];
  const groups = components(whiteness, 46, 46, threshold);
  const keep = new Uint8Array(whiteness.length);
  const accepted = groups.filter(g => !g.touchesEdge && g.pixels.length >= 2 && g.peak >= minPeak);
  for (const group of accepted) for (const p of group.pixels) keep[p] = 1;
  for (let p = 0; p < whiteness.length; p++) if (!keep[p]) whiteness[p] = 0;
  const expanded = await sharp(whiteness, {raw:{width:46,height:46,channels:1}})
    .resize(size, size, {kernel:'cubic'}).raw().toBuffer({resolveWithObject:true});
  const rgba = Buffer.alloc(size * size * 4, 255);
  for (let p = 0; p < size * size; p++) {
    const t = Math.max(0, Math.min(1, (expanded.data[p * expanded.info.channels] - alphaRange[0]) / (alphaRange[1] - alphaRange[0])));
    rgba[p * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
  }
  return {
    bytes:await sharp(rgba, {raw:{width:size,height:size,channels:4}}).png().toBuffer(),
    source, source_sha256:hash(read(source)),
    extraction:{source_size:[46,46], threshold, component_min_area:2, component_min_peak:minPeak,
      frame_components_removed:groups.filter(g => g.touchesEdge).length,
      glyph_components_retained:accepted.length, interpolation:'cubic', alpha_smoothstep:alphaRange,
      transform:'identity; no mirror, no rotation, no crop', foreground_rgb:[255,255,255]}
  };
}

function guitarSvg() {
  // The repo already renders native SVG glyphs with sharp (V2/prepare_assets.cjs).
  // The headstock points upper-left after rotation; the body remains lower-right.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
    <defs><mask id="cut"><rect width="100" height="100" fill="white"/>
      <circle cx="50" cy="61" r="4.5" fill="black"/>
      <path d="M44 73h12" stroke="black" stroke-width="2.3" stroke-linecap="round"/>
    </mask></defs>
    <g transform="rotate(-43 50 50)" fill="white">
      <g mask="url(#cut)">
        <path d="M46.5 13Q50 11 53.5 13L54 25L52.8 28V48H47.2V28L46 25Z"/>
        <path d="M47 43C41 39 35 43 35 50C35 55 40 57 37 63C26 75 33 89 50 90C67 89 74 75 63 63C60 57 65 55 65 50C65 43 59 39 53 43V50H47Z"/>
      </g>
      <path d="M43.5 15H47M53 15H56.5M43.5 19.5H47M53 19.5H56.5M43.5 24H47M53 24H56.5" stroke="white" stroke-width="2.3" stroke-linecap="round"/>
    </g>
  </svg>`;
}

async function alphaQA(bytes) {
  const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let transparent = 0, opaque = 0, partial = 0, nonWhite = 0, edgeMax = 0, alphaMin = 255, alphaMax = 0;
  let left = info.width, top = info.height, right = -1, bottom = -1;
  const alpha = new Uint8Array(info.width * info.height);
  for (let p = 0; p < alpha.length; p++) {
    const a = data[p * 4 + 3], x = p % info.width, y = Math.floor(p / info.width);
    alpha[p] = a;
    alphaMin = Math.min(alphaMin, a); alphaMax = Math.max(alphaMax, a);
    if (a === 0) transparent++; else if (a === 255) opaque++; else partial++;
    if (a > 0 && (data[p*4] !== 255 || data[p*4+1] !== 255 || data[p*4+2] !== 255)) nonWhite++;
    if (a >= 128) {left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if (x === 0 || y === 0 || x === info.width-1 || y === info.height-1) edgeMax = Math.max(edgeMax,a);
  }
  assert.equal(alphaMin, 0); assert.equal(alphaMax, 255);
  assert.equal(edgeMax, 0); assert.equal(nonWhite, 0);
  assert(opaque > 1000 && transparent > alpha.length * .5);
  const thumb = await sharp(bytes).resize(90,90).raw().toBuffer({resolveWithObject:true});
  let visibleAt90 = 0;
  for (let p=0;p<90*90;p++) if (thumb.data[p*4+3]>=128) visibleAt90++;
  return {width:info.width,height:info.height,channels:info.channels,alpha_min:alphaMin,alpha_max:alphaMax,
    fully_transparent_pixels:transparent,fully_opaque_pixels:opaque,antialiased_pixels:partial,
    nonwhite_visible_pixels:nonWhite,border_alpha_max:edgeMax,alpha_bounds_128:[left,top,right,bottom],
    opaque_components:components(alpha,info.width,info.height,128).map(c=>c.pixels.length).sort((a,b)=>b-a),
    visible_pixels_at_90:visibleAt90,technical_status:'passed'};
}

async function contactSheet(indexes) {
  const cols = 5, cellW = 145, cellH = 150, width = cols * cellW, height = Math.ceil(indexes.length / cols) * cellH;
  for (const theme of ['dark','checker']) {
    const layers = [];
    for (let n=0;n<indexes.length;n++) {
      const i=indexes[n], x=n%cols*cellW, y=Math.floor(n/cols)*cellH;
      const background = theme === 'dark'
        ? `<rect width="90" height="90" fill="#232a2d"/><circle cx="45" cy="45" r="44" fill="${n%2?'#3d314c':'#28413d'}"/>`
        : '<defs><pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#8c8c8c"/><path d="M0 0h9v9H0zM9 9h9v9H9z" fill="#606060"/></pattern></defs><rect width="90" height="90" fill="url(#p)"/>';
      layers.push({input:Buffer.from(`<svg width="90" height="90">${background}</svg>`),left:x+27,top:y+12});
      layers.push({input:await sharp(path.join(staging,`${pad(i)}.png`)).resize(90,90).png().toBuffer(),left:x+27,top:y+12});
      layers.push({input:Buffer.from(`<svg width="145" height="42"><text x="72" y="18" text-anchor="middle" font-family="Arial" font-size="13" fill="white">${pad(i)} ${xml(names[i])}</text><text x="72" y="36" text-anchor="middle" font-family="Arial" font-size="11" fill="#b9c4c2">90 x 90 px</text></svg>`),left:x,top:y+105});
    }
    await sharp({create:{width,height,channels:3,background:'#232a2d'}}).composite(layers).png()
      .toFile(path.join(staging,'qa',`weapons-${indexes.length}-90px-${theme}.png`));
  }
}

async function main() {
  const before = protectedFiles();
  fs.mkdirSync(path.join(staging,'qa'),{recursive:true});
  const first = Number(process.argv[2] ?? 0), last = Number(process.argv[3] ?? 19);
  assert(Number.isInteger(first) && Number.isInteger(last) && first >= 0 && last < 20 && first <= last);
  const results = [];
  for (let i=first; i<=last; i++) {
    let item;
    if (i === 11) {
      const sourceSvg = guitarSvg();
      item = {bytes:await sharp(Buffer.from(sourceSvg)).png().toBuffer(),
        source:'V3/scripts/revision_weapons_extract.cjs#guitarSvg',native_svg:sourceSvg,
        extraction:{method:'native SVG glyph in established V2 SVG/sharp workflow',
          historical_instrument:'harp; replaced by explicit user request for generic guitar',
          transform:'guitar headstock upper-left; body lower-right; rotation -43 degrees',foreground_rgb:[255,255,255]}};
    } else item = await extractHistorical(i);
    const file = `V3/assets/revisions-buffs-scenes-20260914/armes/${pad(i)}.png`;
    const qa = await alphaQA(item.bytes);
    fs.writeFileSync(path.join(root,file),item.bytes);
    const {bytes,...provenance} = item;
    results.push({index:i,category:names[i],file,sha256:hash(bytes),...provenance,qa});
  }
  const available = Array.from({length:20},(_,i)=>i).filter(i=>fs.existsSync(path.join(staging,`${pad(i)}.png`)));
  await contactSheet(available);
  assert.deepEqual(protectedFiles(),before,'No canonical asset or gameplay data may change during extraction');
  console.log(JSON.stringify({results,available,protected_files_unchanged:before,contact_sheets:[
    `V3/assets/revisions-buffs-scenes-20260914/armes/qa/weapons-${available.length}-90px-dark.png`,
    `V3/assets/revisions-buffs-scenes-20260914/armes/qa/weapons-${available.length}-90px-checker.png`]},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
