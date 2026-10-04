'use strict';
const L = require('../../atelier/lib.cjs');
const {fs,path,ROOT,sharp,write,hash,assert} = L;
const {metrics} = require('../2026-09-27-weapon-optics/calibrate.cjs');
const sources = require('./sources.cjs');
const out = path.join(ROOT,'V4/site/assets/base-weapons');
const svg = (body,size=256) => '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 256 256"><g fill="white">'+body+'</g></svg>';
async function build({definitions=sources,directory=__dirname,radii={}}={}) {
  fs.mkdirSync(directory,{recursive:true});
  fs.mkdirSync(out,{recursive:true});
  const report=[];
  for(let index=0;index<definitions.length;index++){
    const [family,original]=definitions[index], code=String(index).padStart(2,'0');
    let body=original;
    if(!body){
      const source=fs.readFileSync(path.join(ROOT,'V4/revisions/2026-10-03-flail-glyph/assets/flail-delapouite.svg'),'utf8');
      body='<g transform="scale(.5)">'+source.slice(source.indexOf('>')+1,source.lastIndexOf('</svg>'))+'</g>';
    }
    const raw=await sharp(Buffer.from(svg(body))).resize(1024,1024).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const m=metrics(raw,.25,[512,512]), center=m.optical.map(v=>v/4);
    let radius=0;
    for(let y=0;y<raw.info.height;y++)for(let x=0;x<raw.info.width;x++){
      if(!raw.data[(y*raw.info.width+x)*4+3])continue;
      radius=Math.max(radius,Math.hypot((x+.5)/4-center[0],(y+.5)/4-center[1]));
    }
    const scale=(radii[family]||41.5)/radius;
    const drawing='<g transform="translate(48 47.5) scale('+scale.toFixed(8)+') translate('+(-center[0]).toFixed(8)+' '+(-center[1]).toFixed(8)+')" fill="white">'+body+'</g>';
    const calibrated='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="95" viewBox="0 0 96 95">'+drawing+'</svg>';
    const dest=path.join(out,code+'.svg');fs.writeFileSync(dest,calibrated+'\n');
    const proof=metrics(await sharp(Buffer.from(calibrated)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),.25,[48,47.5]);
    assert(proof.fullRadius<=44);assert(proof.opticalError<.8);
    report.push({family,code,sha256:await hash(dest),...proof});
  }
  const email=path.join(ROOT,'V4/revisions/2026-09-27-weapon-optics/inspection/Tome-email.png');
  await sharp(email).extract({left:89,top:1116,width:96,height:95}).png().toFile(path.join(out,'enamel.png'));
  write(path.join(directory,'geometry.json'),{native:{width:897,height:1497,center:[137,1163.5]},safeRadius:44,enamelSource:path.relative(ROOT,email),enamelHash:await hash(email),icons:report});
  const layers=[];
  const manifest=L.read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json'));
  for(let i=0;i<report.length;i++){
    const x=(i%5)*240,y=Math.floor(i/5)*250;
    const before=await sharp(path.join(ROOT,'V4/atelier/designer-assets',manifest.weapons[report[i].family].file)).resize(96,95).png().toBuffer();
    const composed=await sharp(path.join(out,'enamel.png')).composite([{input:path.join(out,report[i].code+'.svg')}]).png().toBuffer();
    const after=await sharp(composed).resize(144,143).png().toBuffer();
    layers.push({input:before,left:x+6,top:y+52},{input:after,left:x+94,top:y+28});
    layers.push({input:Buffer.from('<svg width="240" height="40"><text x="12" y="26" fill="white" font-family="Arial" font-size="17">'+report[i].family+'</text></svg>'),left:x,top:y+177});
  }
  await sharp({create:{width:1200,height:1000,channels:4,background:'#10231f'}}).composite(layers).png().toFile(path.join(directory,'comparison.png'));
  console.log({icons:report.length,maxRadius:Math.max(...report.map(r=>r.fullRadius)),maxOpticalError:Math.max(...report.map(r=>r.opticalError))});
}
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={build};
