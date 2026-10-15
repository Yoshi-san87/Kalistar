const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const project = path.dirname(root);
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'donnees', name + '.json'), 'utf8'));
const palette = [[16,36,124],[9,83,80],[26,63,117],[51,28,108],[66,21,66],[9,66,76]];
const story = {JULIENNE:'julienne',KAYLIS:'kaylis',LANIO:'lanio',MALABA:'malaba',GEN:'gen'};

async function main() {
  const cards = read('cartes');
  const missing = [];
  for (const [index, c] of cards.entries()) {
    const dest = path.join(root, 'assets/illustrations', c.slug + '.png');
    const scene = story[c.name] && path.join(root, 'assets/illustrations/story', story[c.name] + '.png');
    const old = c.source_art && (path.isAbsolute(c.source_art) ? c.source_art : path.resolve(project, c.source_art));
    if (scene && fs.existsSync(scene)) fs.copyFileSync(scene, dest);
    else if (!fs.existsSync(dest) && old && fs.existsSync(old)) fs.copyFileSync(old, dest);
    if (!fs.existsSync(dest)) missing.push(c.slug);
    const vector = path.join(root, 'assets/barcodes', c.id + '.svg');
    if (!fs.existsSync(vector)) throw new Error('Run build_barcodes.py first: ' + vector);
    const bw = await sharp(vector).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const {width, height, channels} = bw.info;
    const out = Buffer.from(bw.data);
    for (let y=0;y<height;y++) {
      const phase = (y/(height-1)*5+index*.43)%6;
      const start = Math.floor(phase), mix = phase-start;
      const color = palette[start].map((v,k)=>Math.round(v*(1-mix)+palette[(start+1)%6][k]*mix));
      for(let x=0;x<width;x++) {
        const offset=(y*width+x)*channels;
        if(bw.data[offset]<128) for(let k=0;k<3;k++) out[offset+k]=color[k];
      }
    }
    await sharp(vector).png().toFile(path.join(root,'assets/barcodes_noir_blanc',c.id+'.png'));
    await sharp(out,{raw:{width,height,channels}}).png().toFile(path.join(root,'assets/barcodes',c.id+'.png'));
  }
  fs.writeFileSync(path.join(root,'verification','inputs-status.json'),JSON.stringify({total:cards.length,missingIllustrations:missing},null,2));
  console.log(cards.length+' barcodes ready. Missing illustrations: '+missing.join(', '));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
