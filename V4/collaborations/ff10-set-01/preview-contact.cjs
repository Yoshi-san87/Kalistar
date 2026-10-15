'use strict';
const assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs');
const M = require('./model.cjs');
const { fs, path, sharp, write, hash } = L;
const DEFAULT = ['tidus-epee','jecht','yuna','lulu','rikku','yunalesca','kimahri','seymour'];
async function main(keys = process.argv.slice(2)) {
  const native = keys.includes('--native'); keys = keys.filter(k => k !== '--native');
  if (!keys.length) keys = DEFAULT;
  const set = M.validateSet(require('./set.json'));
  assert.ok(keys.length > 0 && keys.every(k => set.cards.some(c => c.key === k)));
  assert.equal(new Set(keys).size, keys.length);
  const width = 300, height = Math.round(1497 * width / 897), gap = 12, label = 32, columns = 4;
  const rows = Math.ceil(keys.length / columns), layers = [], inputs = [];
  for (const [i, key] of keys.entries()) {
    const file = path.join(__dirname,'cards',key,native ? 'card.png' : 'preview.png');
    if (native) {
      const proof = L.read(path.join(__dirname,'cards',key,'verification.json'));
      assert.equal(proof.passed,true); assert.equal(proof.hashes['card.png'],await hash(file));
    }
    const metadata = await sharp(file).metadata();
    assert.deepEqual([metadata.width,metadata.height], [897,1497]);
    const x = gap + (i % columns) * (width + gap), y = gap + Math.floor(i / columns) * (height + label + gap);
    layers.push({ input: await sharp(file).resize(width,height).png().toBuffer(), left:x, top:y });
    const text = Buffer.from('<svg width="'+width+'" height="'+label+'"><rect width="100%" height="100%" fill="#171b1d"/><text x="150" y="22" text-anchor="middle" fill="#edf0ee" font-size="15" font-family="Arial">'+key+'</text></svg>');
    layers.push({input:text,left:x,top:y+height});
    const source = path.join(__dirname,M.artPath(set.cards.find(c => c.key === key)));
    inputs.push({key,preview:path.relative(L.ROOT,file).replace(/\\/g,'/'),previewHash:await hash(file),illustrationHash:await hash(source)});
  }
  const target = path.join(__dirname, (native ? 'native' : 'preview')+'-contact-'+String(keys.length).padStart(2,'0')+'.jpg');
  await sharp({create:{width:columns*(width+gap)+gap,height:rows*(height+label+gap)+gap,channels:3,background:'#101416'}}).composite(layers).jpeg({quality:94,chromaSubsampling:'4:4:4'}).toFile(target);
  write(target.replace(/\.jpg$/,'.json'), {purpose:native ? 'Verified native card contact sheet' : 'Framing preview, not native PSD evidence',photoshopRun:native,inputs,outputHash:await hash(target)});
  console.log(target);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
