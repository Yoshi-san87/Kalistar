'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { sharp } = require('../../../atelier/lib.cjs');
const root = path.resolve(__dirname, '../../../..');
const file = name => path.join(__dirname, name);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = p => sha(fs.readFileSync(p));
const write = (name, data) => fs.writeFileSync(file(name), JSON.stringify(data,null,2)+'\n');
const FLAG = {left:672,top:829,width:98,height:223};
const CROP = {left:5,top:0,width:98,height:223};
async function main() {
  const outline = path.join(root,'V4/propositions/collaborations/cloud-ff7-01/flag-FF7.png');
  const pilot = path.join(root,'V4/collaborations/nier-pilot-01/flag-NieR-packed.png');
  const outlineBefore = hash(outline), pilotBefore = hash(pilot);
  const source = await sharp(file('flag-source.png')).flatten({background:'#151719'}).resize(109,230,{fit:'fill'}).png().toBuffer();
  const render = () => sharp(source).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
  const full = await render(), repeated = await render();
  assert.ok(full.equals(repeated),'Non-deterministic flag pixels');
  const packed = await sharp(full).extract(CROP).png().toBuffer();
  const fullPixels = await sharp(full).ensureAlpha().raw().toBuffer();
  const outlinePixels = await sharp(outline).ensureAlpha().raw().toBuffer();
  const packedPixels = await sharp(packed).ensureAlpha().raw().toBuffer();
  const pilotPixels = await sharp(pilot).ensureAlpha().raw().toBuffer();
  let alphaMismatch=0, packedAlphaMismatch=0, fullPixelMismatch=0, nonzero=0, transparent=0;
  for(let i=3;i<fullPixels.length;i+=4) if(fullPixels[i]!==outlinePixels[i]) alphaMismatch++;
  for(let y=0;y<223;y++) for(let x=0;x<98;x++) {
    const i=(y*98+x)*4, j=(y*109+x+5)*4;
    for(let c=0;c<4;c++) if(packedPixels[i+c]!==fullPixels[j+c]) fullPixelMismatch++;
    if(packedPixels[i+3]!==pilotPixels[i+3]) packedAlphaMismatch++;
    if(packedPixels[i+3]) nonzero++; else transparent++;
  }
  assert.equal(alphaMismatch,0,'Alpha contour differs from native full flag');
  assert.equal(packedAlphaMismatch,0,'Packed alpha differs from approved NieR geometry');
  assert.equal(fullPixelMismatch,0,'Packed RGB/alpha differs from exact native crop');
  assert.ok(nonzero>10000 && transparent>1000,'Expected visible pennant and transparent exterior');
  const stats = await sharp(packed).stats();
  assert.ok(stats.channels.slice(0,3).every(c=>c.stdev>20),'Flag is blank');
  fs.writeFileSync(file('flag-Replicant.png'),full);
  fs.writeFileSync(file('flag-Replicant-packed.png'),packed);
  const faction={id:'Replicant',label:'Replicant',packedGeometry:FLAG,sourceHash:hash(file('flag-source.png')),flagHash:sha(packed),outlineHash:outlineBefore,
    bonusField:'faction',bonusStat:'ATK',membersScope:'living-board-only',isolatedFrom:['NieR','FF7','FF8','Chroma'],
    fullFlag:{file:'V4/expansions/2026-09-23-return/banner/flag-Replicant.png',width:109,height:230,sha256:sha(full)},
    extraction:CROP,source:'V4/expansions/2026-09-23-return/banner/flag-source.png'};
  write('faction.json',faction);
  assert.equal(hash(outline),outlineBefore); assert.equal(hash(pilot),pilotBefore);
  const report={passed:true,fullDimensions:[109,230],packedDimensions:[98,223],packedGeometry:FLAG,sourceHash:faction.sourceHash,
    fullHash:sha(full),packedHash:sha(packed),nativeOutline: path.relative(root,outline).replace(/\\/g,'/'),outlineHash:outlineBefore,
    pilotPackedHash:pilotBefore,alphaMismatch,packedAlphaMismatch,fullPixelMismatch,repeatedRenderByteIdentical:true,
    testedFullPixels:109*230,testedPackedPixels:98*223,nonzeroPixels:nonzero,transparentPixels:transparent,
    rgbStandardDeviations:stats.channels.slice(0,3).map(c=>c.stdev),sharedInputsPreserved:true,published:false};
  write('verification.json',report); console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
