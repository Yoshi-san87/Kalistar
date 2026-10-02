'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(runtime,'__weapon_media__.cjs'))('sharp');
const root=path.resolve(__dirname,'..'),bank=path.join(root,'atelier/designer-assets'),out=path.join(__dirname,'assets/equipment');
const box={left:76,top:1103,width:122,height:122},center={x:137,y:1163.5};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const manifest=JSON.parse(await fs.readFile(path.join(bank,'manifest.json'),'utf8'));
  const layouts=JSON.parse(await fs.readFile(path.join(root,'template-stable/icon-layouts.json'),'utf8'));
  if(layouts.weapon.Hache.center[0]!==center.x||layouts.weapon.Hache.center[1]!==center.y)throw Error('Native anchor changed; review before regenerating.');
  await fs.mkdir(out,{recursive:true});
  const frame=await fs.readFile(path.join(bank,manifest.frame.file));
  const cropped=await sharp(frame).extract(box).ensureAlpha().raw().toBuffer();
  // Only mask the extraction boundary. Copper pixels come from the approved frame.
  const rim=Buffer.from(cropped);
  for(let y=0;y<122;y++)for(let x=0;x<122;x++){
    const distance=Math.hypot(x+.5-61,y+.5-60.5),i=(y*122+x)*4+3;
    const alpha=Math.max(0,Math.min(1,61-distance))*Math.max(0,Math.min(1,distance-47.5));
    rim[i]=Math.round(rim[i]*alpha);
  }
  const rimPng=await sharp(rim,{raw:{width:122,height:122,channels:4}}).png().toBuffer();
  await sharp(rimPng).webp({lossless:true}).toFile(path.join(out,'rim.webp'));
  const sources={[manifest.frame.file]:hash(frame),'manifest.json':hash(await fs.readFile(path.join(bank,'manifest.json')))};
  for(const [family,key] of [['Hache','axe'],['Instrument','flute']]){
    const entry=manifest.weapons[family],bytes=await fs.readFile(path.join(bank,entry.file));
    sources[entry.file]=hash(bytes);
    const body=await sharp({create:{width:122,height:122,channels:4,background:'#00000000'}})
      .composite([{input:bytes,left:entry.left-box.left,top:entry.top-box.top},{input:rimPng}]).png().toBuffer();
    await sharp(body).webp({lossless:true}).toFile(path.join(out,key+'.webp'));
  }
  const derived={};for(const file of ['rim.webp','axe.webp','flute.webp'])derived[file]=hash(await fs.readFile(path.join(out,file)));
  const proof=path.join(__dirname,'verification/weapons');await fs.mkdir(proof,{recursive:true});
  await fs.writeFile(path.join(proof,'media-provenance.json'),JSON.stringify({version:1,center,box,native:{width:897,height:1497},innerRadius:47.5,sourceRevision:manifest.weaponOpticsRevision,sourceHashes:sources,derivedHashes:derived},null,2));
  console.log('Derived two native medallions; approved sources untouched.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
