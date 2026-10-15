const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..');
const work=path.join(root,'V4/template-stable/elements-02');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
(async()=>{
 const proof=read(path.join(work,'valazar/optical-proof.json'));
 assert.deepEqual(proof.after,proof.before,'Repeated calibration moved the icon');
 const original=await sharp(path.join(root,'V4/cartes/VALAZAR_V4_01_NECRO.png')).ensureAlpha().raw().toBuffer();
 const repeated=await sharp(path.join(work,'valazar/repeat-optical.png')).ensureAlpha().raw().toBuffer();
 assert.ok(original.equals(repeated),'Repeated calibration changed pixels');
 const {data,info}=await sharp(path.join(work,'valazar/death-isolated.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let maxRadius=0,weight=0,sx=0,sy=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const alpha=data[(y*info.width+x)*4+3];if(alpha<32)continue;
  maxRadius=Math.max(maxRadius,Math.hypot(x+.5-proof.layout.center[0],y+.5-proof.layout.center[1]));
  weight+=alpha;sx+=(x+.5)*alpha;sy+=(y+.5)*alpha;
 }
 assert.ok(weight>0,'Empty icon');
 assert.ok(maxRadius<=proof.layout.safeRadius+1,'Death overflows safe circle');
 const opticalError=Math.hypot(sx/weight-proof.layout.center[0],sy/weight-proof.layout.center[1]);
 assert.ok(opticalError<1.5,'Death optical anchor does not follow visible mass');
 const kaylis=read(path.join(work,'kaylis/render.json'));
 const maps=kaylis.reopened.filter(l=>l.name.endsWith(' - reflets prismatiques'));
 assert.equal(maps.length,7,'Six spheres and one branch adjustment');
 for(const layer of maps){assert.equal(layer.kind,'LayerKind.GRADIENTMAP');assert.equal(layer.grouped,true);}
 const result={passed:true,death:{maxRadius,opticalError,repeatPixelDifference:0},nativeRainbowMaps:maps.length};
 fs.writeFileSync(path.join(work,'optical-verification.json'),JSON.stringify(result,null,2));
 console.log(result);
})().catch(e=>{console.error(e);process.exitCode=1;});
