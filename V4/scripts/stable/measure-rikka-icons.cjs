const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const work = path.resolve(__dirname,'../../template-stable/rikka-revision-02');
async function measure(name) {
  const {data,info} = await sharp(path.join(work,name+'-before.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let mass=0,mx=0,my=0,green=0,gx=0,gy=0;
  const bounds=[info.width,info.height,0,0], opaque=[];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const i=(y*info.width+x)*4,[r,g,b,a]=data.subarray(i,i+4); if(!a)continue;
    mass+=a;mx+=(x+.5)*a;my+=(y+.5)*a;
    if(a>=32){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);opaque.push([x+.5,y+.5]);}
    if(a>=128&&g>r*1.15&&g>b*1.2){green++;gx+=x+.5;gy+=y+.5;}
  }
  const centroid=[mx/mass,my/mass],greenCentroid=green?[gx/green,gy/green]:null;
  return {name,bounds,centroid,greenCentroid,maxRadiusFromCentroid:Math.max(...opaque.map(([x,y])=>Math.hypot(x-centroid[0],y-centroid[1])))};
}
(async()=>{const measurements=[];for(const n of ['dodge','clover'])measurements.push(await measure(n));fs.writeFileSync(path.join(work,'measurements.json'),JSON.stringify(measurements,null,2));console.log(JSON.stringify(measurements,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
