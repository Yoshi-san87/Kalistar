const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const root = path.resolve(__dirname, '..');
const file = p => path.join(root, p);
const source = file('cartes/MOMO_ELECTRO_V4_01-base-validee.png');
const generated = file('propositions/MOMO-retouches-02-generation-brute.png');
const output = file('cartes/MOMO_ELECTRO_V4_02-retouches.png');
const patches = [];

// Only assembly masks are calculated here. All new artwork comes from imagegen.
async function disk(name, sx, sy, sr, dx, dy, radius) {
  const size = radius * 2;
  const mask = Buffer.alloc(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x + .5 - radius, y + .5 - radius);
      mask[y * size + x] = Math.round(255 * Math.min(1, Math.max(0, (radius - distance) / 1.5)));
    }
  }
  const rgb = await sharp(generated)
    .extract({left: sx - sr, top: sy - sr, width: sr * 2, height: sr * 2})
    .resize(size, size, {fit: 'fill'}).removeAlpha().raw().toBuffer();
  const input = await sharp(rgb, {raw: {width: size, height: size, channels: 3}})
    .joinChannel(mask, {raw: {width: size, height: size, channels: 1}}).png().toBuffer();
  patches.push({input, left: Math.round(dx - radius), top: Math.round(dy - radius)});
  return {name, source: [sx, sy, sr], destination: [dx, dy, radius]};
}

async function main() {
  const width = 797, height = 1388;
  const metadata = await sharp(generated).metadata();
  const placements = [];
  // Preserve the original electric coronas; replace only their inner faces.
  placements.push(await disk('ATK 202', 111, 113, 68, 91.5, 97, 56));
  placements.push(await disk('ATK 167', 123, 379, 43, 105.5, 321.5, 35));
  placements.push(await disk('ATK 84', 122, 625, 43, 105.5, 526.5, 35));
  placements.push(await disk('ATK 29', 123, 850, 43, 105.5, 723.5, 35));
  placements.push(await disk('DEF 200 barrier', 841, 115, 99, 705.5, 100, 85));
  placements.push(await disk('DEF 167 barrier', 814, 380, 73, 683, 321.5, 61));
  placements.push(await disk('DEF 59 barrier', 812, 740, 72, 682.5, 626.5, 61));
  placements.push(await disk('DEF 100 physical', 813, 620, 58, 683.5, 526.5, 47));
  placements.push(await disk('DEF 11 physical', 812, 850, 59, 683.5, 723.5, 47));
  placements.push(await disk('ATK clover', 125, 500, 53, 105.5, 425.5, 44));
  placements.push(await disk('DEF clover', 817, 500, 53, 684.5, 425.5, 44));
  placements.push(await disk('ATK potion', 123, 738, 53, 105.5, 626.5, 44));

  const cleanPositions = await sharp(path.join(root, '../V3/cartes/01_ELECTRO_MOMO.png'))
    .extract({left: 170, top: 988, width: 132, height: 80}).png().toBuffer();
  patches.push({input: cleanPositions, left: 120, top: 938});
  const positions = [
    {value: 3, left: 152, top: 1112, width: 53, height: 70, x: 136},
    {value: 4, left: 221, top: 1112, width: 53, height: 70, x: 204},
  ];
  for (const p of positions) {
    const input = await sharp(generated).extract({left:p.left, top:p.top, width:p.width, height:p.height})
      .resize(56, 56, {fit:'fill'}).png().toBuffer();
    patches.push({input, left:p.x, top:950});
  }

  const panel = await sharp(generated)
    .extract({left:0, top:1198, width:metadata.width, height:metadata.height-1198})
    .resize(width, height-1018, {fit:'fill'}).png().toBuffer();
  patches.push({input:panel, left:0, top:1018});
  const assembled = await sharp(source).composite(patches).png().toBuffer();
  const labelPatches = [];
  // Shift generated labels with their clear background padding, covering the old glyphs.
  for (const box of [
    {left:164,top:1108,width:151,height:27},
    {left:509,top:1108,width:91,height:27},
  ]) {
    labelPatches.push({input:await sharp(assembled).extract(box).png().toBuffer(),left:box.left,top:box.top-4});
  }
  await sharp(assembled).composite(labelPatches).withMetadata({density:300}).png().toFile(output);
  await sharp({create:{width:897,height:1497,channels:3,background:'#000000'}})
    .composite([{input:output,left:50,top:50}]).withMetadata({density:300})
    .png().toFile(file('impression/MOMO_ELECTRO_V4_02-RGB.png'));

  const preserved = [
    {name:'Momo illustration',left:265,top:180,width:357,height:838},
    {name:'barcode',left:82,top:798,width:22,height:210},
    {name:'Chroma flag',left:641,top:785,width:82,height:215},
    {name:'MOMO title',left:180,top:45,width:440,height:63},
  ];
  for (const region of preserved) {
    const {name,...box} = region;
    const before = await sharp(source).extract(box).removeAlpha().raw().toBuffer();
    const after = await sharp(output).extract(box).removeAlpha().raw().toBuffer();
    if (!before.equals(after)) throw new Error('Protected pixels changed: ' + name);
  }
  await sharp(output).extract({left:0,top:1018,width,height:370}).png()
    .toFile(file('verification/retouches-02-bas.png'));
  await sharp(output).extract({left:50,top:922,width:240,height:110}).resize(720,330)
    .png().toFile(file('verification/retouches-02-positions.png'));
  const sizes = [200,280,397];
  const items = [];
  let x=12;
  for (const w of sizes) {
    const h=Math.round(height*w/width);
    items.push({input:await sharp(output).resize(w,h).png().toBuffer(),left:x,top:12});
    x+=w+16;
  }
  await sharp({create:{width:x,height:716,channels:3,background:'#11191b'}})
    .composite(items).png().toFile(file('verification/retouches-02-petits-formats.png'));
  fs.writeFileSync(file('donnees/retouches-02.json'), JSON.stringify({
    status:'visual-design-revision-not-final-print-template',
    method:'built-in imagegen, regional assembly over locked original',
    prompt:'donnees/prompt-retouches-02.txt',
    baseline:'cartes/MOMO_ELECTRO_V4_01-base-validee.png',
    generated:'propositions/MOMO-retouches-02-generation-brute.png',
    output:'cartes/MOMO_ELECTRO_V4_02-retouches.png',
    dimensions:[width,height],printCanvas:[897,1497],ppi:300,
    preservedPixelIdentical:preserved.map(p=>p.name),
    sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
    positions:positions.map(p=>({value:p.value,bounds:[p.x,950,p.x+56,1006]})),
    firstBadgeGapFromBarcodeRail:12,
    placements,professionAndRaceOpticalShiftY:-4,statsChanged:false,v3SiteDatabaseChanged:false,
    previousPsdUpdated:false,printProofRequired:true
  },null,2));
  console.log('Retouches saved. Original illustration, title, barcode and flag checks passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
