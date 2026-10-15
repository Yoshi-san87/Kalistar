'use strict';
const {fs,path,ROOT,sharp,hash,write,assert}=require('../../atelier/lib.cjs');
const {metrics}=require('../2026-09-27-weapon-optics/calibrate.cjs');
const {body}=require('./projectile.cjs');
async function main(){
  const raw=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><g fill="white">'+body+'</g></svg>')).resize(1024,1024).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const center=metrics(raw,.25,[512,512]).optical.map(v=>v/4);let radius=0;
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++)if(raw.data[(y*1024+x)*4+3])radius=Math.max(radius,Math.hypot((x+.5)/4-center[0],(y+.5)/4-center[1]));
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="95" viewBox="0 0 96 95"><g fill="white" transform="translate(48 47.5) scale('+(41.5/radius).toFixed(8)+') translate('+(-center[0]).toFixed(8)+' '+(-center[1]).toFixed(8)+')">'+body+'</g></svg>\n';
  const file=path.join(ROOT,'V4/site/assets/base-weapons/09.svg');fs.writeFileSync(file,svg);
  const proof=metrics(await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),.25,[48,47.5]);
  assert(proof.fullRadius<=44);assert(proof.opticalError<.8);
  write(path.join(__dirname,'projectile-geometry.json'),{family:'Projectile',code:'09',sha256:await hash(file),...proof});
  await sharp({create:{width:480,height:475,channels:4,background:'#0c2030'}}).composite([{input:await sharp(Buffer.from(svg)).resize(480,475).png().toBuffer()}]).png().toFile(path.join(__dirname,'projectile-preview.png'));
  console.log(proof);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
