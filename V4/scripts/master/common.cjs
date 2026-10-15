const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const deps = 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const sharp = require(deps + 'sharp');
const root = path.resolve(__dirname, '../..');
const layout = require('./layout.json');
const {width: W, height: H} = layout.canvas;
const output = path.join(root, 'master');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const clamp = (v, lo=0, hi=1) => Math.min(hi, Math.max(lo, v));
function inside(x, y, points) {
  let result = false;
  for (let i=0, j=points.length-1; i<points.length; j=i++) {
    const [xi,yi]=points[i], [xj,yj]=points[j];
    if ((yi>y)!==(yj>y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) result=!result;
  }
  return result;
}
function disk(x,y,cx,cy,r) { return clamp(r + .5 - Math.hypot(x-cx,y-cy)); }
async function raw(file) { return sharp(file).ensureAlpha().raw().toBuffer(); }
async function save(name, data, width=W, height=H) {
  const dest=path.join(output,name); fs.mkdirSync(path.dirname(dest),{recursive:true});
  await sharp(data,{raw:{width,height,channels:4}}).png().toFile(dest); return dest;
}
async function maskPng(name, mask) {
  const data=Buffer.alloc(W*H*4);
  for(let i=0;i<W*H;i++){data[i*4]=data[i*4+1]=data[i*4+2]=255;data[i*4+3]=mask[i];}
  return save(name,data);
}
function dilate(mask,r) {
  const out=Buffer.alloc(mask.length);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(mask[y*W+x])
    for(let j=-r;j<=r;j++)for(let k=-r;k<=r;k++)
      if(j*j+k*k<=r*r && x+k>=0 && x+k<W && y+j>=0 && y+j<H)out[(y+j)*W+x+k]=255;
  return out;
}
module.exports={fs,path,crypto,sharp,root,layout,W,H,output,hash,clamp,inside,disk,raw,save,maskPng,dilate};
