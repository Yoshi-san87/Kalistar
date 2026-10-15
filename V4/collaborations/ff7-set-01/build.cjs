'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const {fs,path,assert,read,write,sharp,crypto,ROOT}=L;
const home=__dirname,set=read(path.join(home,'set.json')),file=n=>path.join(home,n),cloud=path.join(ROOT,set.cloudSource);
const snapshotFiles=['V4/atelier/data/references.json','V4/atelier/data/regression.json','V4/atelier/designer-assets/manifest.json'];
async function snapshots(){const result={};for(const p of snapshotFiles)result[p]=await L.hash(path.join(ROOT,p));return result;}
async function bridge(script){return R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(ROOT,'V4/revisions/2026-09-18-branches/bridge.ps1'),'-Script',file(script)],file('photoshop.log'));}
async function locked(fn){const lock=path.join(L.DATA,'render.lock');let fd;try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,kind:'ff7-production'}));return await fn();}finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}}
async function projectile(){
  if(!fs.existsSync(file('weapon-email-native.png')))await locked(()=>bridge('weapon-email.jsx'));
  const email=await sharp(file('weapon-email-native.png')).extract({left:89,top:1116,width:96,height:95}).png().toBuffer();
  const source=path.join(ROOT,'V3/assets/revisions-buffs-scenes-20260914/armes/09.png');
  const rgba=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=[512,512,-1,-1];
  for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(rgba.data[(y*512+x)*4+3]){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}
  const icon=await sharp(source).extract({left:b[0],top:b[1],width:b[2]-b[0]+1,height:b[3]-b[1]+1}).resize(70,70,{fit:'inside'}).png().toBuffer();
  const m=await sharp(icon).metadata(),left=Math.round((96-m.width)/2),top=Math.round((95-m.height)/2);
  const p=await sharp(icon).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let y=0;y<p.info.height;y++)for(let x=0;x<p.info.width;x++)if(p.data[(y*p.info.width+x)*4+3])assert.ok(Math.hypot(x+left-47.5,y+top-47)<=39,'Projectile contour outside medallion');
  await sharp(email).composite([{input:icon,left,top}]).png().toFile(file('weapon-projectile.png'));
  write(file('weapon-projectile.json'),{source:'V3/assets/revisions-buffs-scenes-20260914/armes/09.png',left:89,top:1116,width:96,height:95,sourceUnchanged:true,visibleRadiusLimit:39});
}
async function prepare(){
  await L.protectedCheck();const manifest=await R.verifyAssets();await projectile();
  const taken=new Set(D.catalogue().cards.map(c=>c.id));
  const flagSpec=read(path.join(cloud,'faction.json')).packedGeometry;
  const weapons=read(path.join(ROOT,'V3/donnees/armes.json'));
  for(const spec of set.cards){
    const dir=file('cards/'+spec.key),render=path.join(dir,'render');fs.mkdirSync(render,{recursive:true});
    let id=fs.existsSync(path.join(dir,'profile.json'))?read(path.join(dir,'profile.json')).id:null;
    if(!id)do{id=String(crypto.randomInt(40000043,50000000));}while(taken.has(id));
    assert.ok(!taken.has(id),'Existing publication; do not overwrite '+id);taken.add(id);
    const data=Object.fromEntries(D.FIELDS.filter(k=>k in spec).map(k=>[k,spec[k]]));data.job=data.job.toUpperCase();
    const donor=D.validate({...data,faction:'Chroma',weapon:spec.weapon==='Projectile'?'Dague':spec.weapon},{final:true});
    const profile={...D.profileCard(donor,id),faction:'FF7',weapon:spec.weapon,weapon_index:Object.keys(weapons).indexOf(spec.weapon),characterId:spec.key+'-ff7',collaboration:'FF7',officialCollaboration:false,advantage:30,disadvantage:30,source:'Kalistar x FF7 - set prive non officiel',visual_revision:'V4-ff7-set-01'};
    write(path.join(dir,'profile.json'),profile);fs.copyFileSync(file('illustrations/'+spec.key+'.png'),path.join(dir,'illustration.png'));
    const layers=await R.components(donor,{id,positionsText:true});
    layers[0]={...layers[0],input:await sharp(path.join(dir,'illustration.png')).resize(R.ART.width,R.ART.height,{fit:'cover'}).png().toBuffer()};
    const fi=layers.findIndex(l=>l.name==='FACTION - Chroma');
    layers[fi]={...layers[fi],...flagSpec,input:path.join(cloud,'flag-FF7-packed.png'),name:'FACTION - FF7 - meteor'};
    if(spec.weapon==='Projectile'){
      const wi=layers.findIndex(l=>l.name==='ARME - Dague');
      layers[wi]={input:file('weapon-projectile.png'),left:89,top:1116,width:96,height:95,name:'ARME - Projectile'};
    }
    await sharp(await R.composite(layers)).composite(await R.previewText(donor)).png().toFile(path.join(dir,'preview.png'));
    const nativeLayers=layers.filter(l=>!l.name.startsWith('POSITION SLOT '));
    const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
    for(const [index,l]of nativeLayers.entries()){
      const name='component-'+String(index).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(path.join(render,name));
      plan.layers.push({file:name,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
    }
    await sharp(await R.composite(nativeLayers)).toFile(path.join(render,'expected-components.png'));write(path.join(render,'composition.json'),plan);
  }
  const dir=file('cards/cloud');fs.mkdirSync(dir,{recursive:true});
  const existingCloud=D.catalogue().cards.find(c=>c.id==='47208326');
  const profile=existingCloud?existingCloud.profile:{...read(path.join(cloud,'profile.json')),collaboration:'FF7',officialCollaboration:false,source:'Kalistar x FF7 - set prive non officiel'};
  if(!existingCloud){delete profile.testOnly;delete profile.published;}write(path.join(dir,'profile.json'),profile);
  if(existingCloud){
    fs.copyFileSync(path.join(ROOT,existingCloud.png),path.join(dir,'card.png'));fs.copyFileSync(path.join(ROOT,existingCloud.psd),path.join(dir,'card.psd'));
    fs.copyFileSync(path.join(ROOT,path.dirname(existingCloud.png),'illustration.png'),path.join(dir,'illustration.png'));
  }else for(const [a,b]of [['CLOUD_FF7_V4_01.png','card.png'],['CLOUD_FF7_V4_01.psd','card.psd'],['illustration.png','illustration.png']])fs.copyFileSync(path.join(cloud,a),path.join(dir,b));
  write(file('preparation.json'),{referenceId:L.baseline().id,snapshot:await snapshots(),componentHashes:Object.keys(manifest.hashes).length,cards:10,cloudSource:set.cloudSource});
  const published=['cloud',...set.cards.map(c=>c.key)].map(key=>{const profile=read(file('cards/'+key+'/profile.json'));return {id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'};});
  const catalog=await buildCatalog({published}),engine=createEngine(catalog),deck=published.map(p=>p.id);
  assert.deepEqual(engine.validatePlayableDeck(deck),[]);
  write(file('deck.json'),{id:'ff7-set-01',name:'FF7 - Les voix de la planete',cards:deck,coverage:[1,2,3,4,5].map(p=>published.filter(c=>c.profile.positions.includes(p)).length)});
  console.log({prepared:10,coverage:read(file('deck.json')).coverage});
}
async function componentDiff(dir,plan){
  const render=path.join(dir,'render'),p=async f=>sharp(f).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const a=await p(path.join(render,'expected-components.png')),b=await p(path.join(render,'without-text.png'));assert.deepEqual(a.info,b.info);
  const frame=await p(path.join(render,plan.layers[1].file)),fixed=new Uint8Array(897*1497);
  for(let i=0;i<fixed.length;i++)fixed[i]=frame.data[i*4+3]===255?1:0;
  for(const l of plan.layers.slice(2)){
    const v=await p(path.join(render,l.file));
    for(let y=0;y<v.info.height;y++)for(let x=0;x<v.info.width;x++)if(v.data[(y*v.info.width+x)*4+3])fixed[(y+l.top)*897+x+l.left]=0;
  }
  const result={changed:0,maxChannelDelta:0,severePixels:0,fixedDifferences:0};
  for(let i=0;i<fixed.length;i++){let d=0;for(let c=0;c<4;c++)d=Math.max(d,Math.abs(a.data[i*4+c]-b.data[i*4+c]));if(d){result.changed++;result.maxChannelDelta=Math.max(result.maxChannelDelta,d);if(d>2)result.severePixels++;if(fixed[i])result.fixedDifferences++;}}
  assert.equal(result.fixedDifferences,0);assert.equal(result.severePixels,0);return result;
}
async function verify(){
  const results=[];
  for(const key of ['cloud',...set.cards.map(c=>c.key)]){
    const dir=file('cards/'+key),profile=read(path.join(dir,'profile.json'));let components,roundtrip;
    if(key==='cloud'){
      const proof=read(path.join(cloud,'weapon-rim-verification.json'));assert.ok(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);
      assert.equal(await L.hash(path.join(dir,'card.png')),proof.pngHash);assert.equal(await L.hash(path.join(dir,'card.psd')),proof.psdHash);
      components={fixedDifferences:0,severePixels:0,preservedApprovedCloud:true};roundtrip=proof.roundtrip;
    }else{
      const native=read(path.join(dir,'render/native.json')),plan=read(path.join(dir,'render/composition.json'));
      assert.equal(native.width,897);assert.equal(native.height,1497);assert.equal(native.resolution,300);
      for(const e of native.expected){const l=native.layers.find(l=>l.name===e.name);assert.equal(l?.kind,'LayerKind.TEXT');assert.equal(l.text,e.value);assert.ok(Math.abs((l.ink[0]+l.ink[2])/2-e.center[0])<=1&&Math.abs((l.ink[1]+l.ink[3])/2-e.center[1])<=1);}
      for(const spec of plan.layers){const l=native.layers.find(l=>l.name===spec.name);assert.equal(l?.kind,'LayerKind.SMARTOBJECT');assert.ok(l.visible);}
      const desc=native.layers.find(l=>l.name==='DESCRIPTION');assert.equal(desc.text.replace(/\r/g,' '),profile.description);assert.ok(desc.ink[1]>=1251&&desc.ink[3]<=1387);
      components=await componentDiff(dir,plan);roundtrip=await L.diff(path.join(dir,'card.png'),path.join(dir,'render/reopened.png'));assert.equal(roundtrip.changed,0);
    }
    const barcode=JSON.parse(await R.command(L.PYTHON,[path.join(ROOT,'V4/atelier/barcode.py'),path.join(dir,'card.png'),profile.id]));assert.ok(barcode.passed);
    const hashes={};for(const name of ['card.png','card.psd'])hashes[name]=await L.hash(path.join(dir,name));
    const report={passed:true,key,modelId:profile.id,referenceId:L.baseline().id,profileHash:await L.hash(path.join(dir,'profile.json')),hashes,components,roundtrip,barcode,checkedAt:new Date().toISOString()};
    write(path.join(dir,'verification.json'),report);results.push(report);
    await sharp(path.join(dir,'card.png')).extract({left:50,top:50,width:797,height:1388}).resize({width:320}).toFile(path.join(dir,'small-preview.png'));
  }
  await L.protectedCheck();await R.verifyAssets();assert.deepEqual(await snapshots(),read(file('preparation.json')).snapshot);
  const tiles=[];for(let i=0;i<results.length;i++)tiles.push({input:await sharp(file('cards/'+results[i].key+'/small-preview.png')).resize({width:230}).png().toBuffer(),left:(i%5)*242+8,top:Math.floor(i/5)*414+8});
  await sharp({create:{width:1210,height:828,channels:4,background:'#101719'}}).composite(tiles).png().toFile(file('set-preview.png'));
  write(file('verification.json'),{passed:true,cards:results.length,referenceId:L.baseline().id,approvedSourcesUnchanged:true,results});
  console.log({verified:results.length,protectedSources:'unchanged',barcodes:true});
}
(async()=>{
  const action=process.argv[2]||'prepare';
  if(action==='prepare')await prepare();
  else if(action==='render')console.log(await locked(()=>bridge('compose.jsx')));
  else if(action==='verify')await verify();
  else throw Error('Expected prepare, render or verify');
})().catch(e=>{console.error(e);process.exitCode=1;});
