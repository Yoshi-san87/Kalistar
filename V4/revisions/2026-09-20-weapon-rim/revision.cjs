const L=require('../../atelier/lib.cjs');
const R=require('../../atelier/designer-render.cjs');
const {fs,path,ROOT,DATA,read,write,assert,sharp,hash}=L;
const work=__dirname,revision='2026-09-20-weapon-rim';
const rel=f=>path.relative(ROOT,f).replaceAll('\\','/');
const file=f=>path.join(work,f);
const pixels=f=>sharp(f).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const rectangles=[[89,1112,116,1140]];
async function prepare(){
  await L.protectedCheck();await R.verifyAssets();
  assert.ok(!fs.existsSync(file('plan.json')),'Preparation already exists');
  const refs=L.baseline(),manifest=read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json'));
  write(file('references-before.json'),refs);write(file('designer-before.json'),manifest);
  const items=refs.cards.map(c=>({key:c.key,psd:c.psd,png:c.png}));
  for(const route of ['current.json','current-elements.json'])items.push({key:route==='current.json'?'master-electro':'master-elements',psd:read(path.join(ROOT,'V4/template-stable',route)).template});
  for(const i of items){i.layer='FOND INFERIEUR V4 - echelle uniforme 83.7897%';i.component='frame-clean.png';}
  const before=await pixels(file('frame-before-native.png')),after=await pixels(file('frame-after-native.png'));
  const changed=[];
  for(let p=0;p<before.data.length;p+=4)if(!before.data.subarray(p,p+4).equals(after.data.subarray(p,p+4))){
    const x=(p/4)%897,y=Math.floor(p/4/897);assert.ok(rectangles.some(r=>x>=r[0]&&x<r[2]&&y>=r[1]&&y<r[3]));changed.push(p);
  }
  assert.ok(changed.length>0&&changed.length<500);
  const assets=[];
  for(const family of ['default','electro'])for(const suffix of ['','-black','-white']){
    const target='V4/atelier/designer-assets/frame/'+family+suffix+'.png',dest='assets/'+family+suffix+'.png';
    const a=await pixels(path.join(ROOT,target));
    for(const p of changed){
      assert.ok(a.data.subarray(p,p+4).equals(before.data.subarray(p,p+4)),'Native frame differs: '+target+' at '+p/4);
      after.data.copy(a.data,p,p,p+4);
    }
    fs.mkdirSync(file('assets'),{recursive:true});await sharp(a.data,{raw:a.info}).png().toFile(file(dest));
    assets.push({target,source:dest,beforeHash:await hash(path.join(ROOT,target)),afterHash:await hash(file(dest))});
  }
  const cloud='V4/propositions/collaborations/cloud-ff7-01/CLOUD_FF7_V4_01';
  if(fs.existsSync(path.join(ROOT,cloud+'.psd')))items.push({key:'cloud-trial',psd:cloud+'.psd',png:cloud+'.png',layer:'CADRE V4 - structure validee',component:'assets/electro.png'});
  for(const i of items){fs.mkdirSync(file('staged/'+i.key),{recursive:true});i.beforePsdHash=await hash(path.join(ROOT,i.psd));if(i.png)i.beforePngHash=await hash(path.join(ROOT,i.png));}
  write(file('plan.json'),{revision,rectangles,sourceHash:await hash(file('frame-clean.png')),items,assets,frameChangedPixels:changed.length});
  console.log({prepared:items.length,frameChangedPixels:changed.length});
}
async function stage(){
  const lock=path.join(DATA,'render.lock');let fd;
  try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,revision}));
    await L.protectedCheck(read(file('references-before.json')));
    console.log(await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(work,'../2026-09-18-branches/bridge.ps1'),'-Script',file('batch.jsx')],file('render.log')));
  }finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
}
async function verify(){
  const plan=read(file('plan.json')),refs=read(file('references-before.json'));await L.protectedCheck(refs);
  assert.equal(await hash(file('frame-clean.png')),plan.sourceHash);
  const results=[];
  for(const i of plan.items){
    const dir=file('staged/'+i.key),native=read(path.join(dir,'native.json'));
    assert.equal(native.width,897);assert.equal(native.height,1497);assert.equal(native.resolution,300);assert.equal(native.lockPreserved,true);
    assert.deepEqual(native.reopened,native.before,i.key+' layers changed');
    const comparison=await L.diff(i.png?path.join(ROOT,i.png):path.join(dir,'before.png'),path.join(dir,'card.png'),rectangles);
    assert.equal(comparison.outside,0,i.key+' outside medallion');assert.ok(comparison.changed>0&&comparison.changed<500);
    const roundtrip=await L.diff(path.join(dir,'card.png'),path.join(dir,'reopened.png'));assert.equal(roundtrip.changed,0);
    results.push({key:i.key,comparison,roundtrip,psdHash:await hash(path.join(dir,'card.psd')),pngHash:await hash(path.join(dir,'card.png'))});
  }
  write(file('verification.json'),{passed:true,checkedAt:new Date().toISOString(),originalReferenceId:refs.id,results});
  console.log({verified:results.length,outside:0,reopened:0,pixels:[...new Set(results.map(r=>r.comparison.changed))]});
}
async function publish(){
  const plan=read(file('plan.json')),audit=read(file('verification.json')),old=read(file('references-before.json'));
  assert.ok(audit.passed&&audit.results.length===plan.items.length);assert.equal(L.baseline().id,old.id);
  assert.ok(!fs.existsSync(file('published.json')),'Already published');await L.protectedCheck(old);await R.verifyAssets();
  const lock=path.join(DATA,'render.lock'),backups=new Map(),changed=new Set();let fd;
  function backup(target){if(backups.has(target))return;const src=path.join(ROOT,target),dst=file('originals/'+target);assert.ok(!fs.existsSync(dst));fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);backups.set(target,rel(dst));}
  function install(source,target){backup(target);const dest=path.join(ROOT,target),temp=dest+'.rim-revision.tmp';assert.ok(!fs.existsSync(temp));fs.copyFileSync(source,temp);fs.renameSync(temp,dest);changed.add(target);}
  function json(target,value){backup(target);write(path.join(ROOT,target),value);changed.add(target);}
  try{
    fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,revision,phase:'publish'}));
    for(const i of plan.items){
      const r=audit.results.find(r=>r.key===i.key),dir=file('staged/'+i.key);
      assert.equal(await hash(path.join(ROOT,i.psd)),i.beforePsdHash);assert.equal(await hash(path.join(dir,'card.psd')),r.psdHash);
      assert.equal(await hash(path.join(dir,'card.png')),r.pngHash);
      if(i.png)assert.equal(await hash(path.join(ROOT,i.png)),i.beforePngHash);
    }
    for(const a of plan.assets){assert.equal(await hash(path.join(ROOT,a.target)),a.beforeHash);assert.equal(await hash(file(a.source)),a.afterHash);}
    for(const i of plan.items){install(file('staged/'+i.key+'/card.psd'),i.psd);if(i.png)install(file('staged/'+i.key+'/card.png'),i.png);}
    for(const a of plan.assets)install(file(a.source),a.target);
    for(const route of ['current.json','current-elements.json']){
      const target='V4/template-stable/'+route,value=read(path.join(ROOT,target));
      value.weaponRimRevision={id:revision,audit:rel(file('verification.json')),source:rel(file('frame-clean.png'))};json(target,value);
    }
    const next=structuredClone(old);
    for(const target of changed)if(target in next.protectedFiles)next.protectedFiles[target]=await hash(path.join(ROOT,target));
    for(const f of ['frame-clean.png','plan.json','verification.json'])next.protectedFiles[rel(file(f))]=await hash(file(f));
    next.id=L.crypto.createHash('sha256').update(JSON.stringify(next.protectedFiles)).digest('hex');next.parentReferenceId=old.id;next.createdAt=new Date().toISOString();
    next.revision={id:revision,reason:'Suppression du trait blanc parasite du medaillon arme',audit:rel(file('verification.json'))};
    const m=read(file('designer-before.json'));m.referenceId=next.id;
    for(const a of plan.assets)m.hashes[a.target.replace('V4/atelier/designer-assets/','')]=a.afterHash;
    m.weaponRimRevision={id:revision,audit:rel(file('verification.json')),changedPixels:plan.frameChangedPixels};
    json('V4/atelier/designer-assets/manifest.json',m);
    backup('V4/atelier/data/regression.json');json('V4/atelier/data/references.json',next);
    await L.protectedCheck(next);await R.verifyAssets();
    write(file('published.json'),{revision,referenceId:next.id,previousReferenceId:old.id,backups:Object.fromEntries(backups),changed:[...changed],nativeRegressionRequired:true});
    console.log({publishedCards:old.cards.length,trial:true,masters:2,referenceId:next.id});
  }catch(e){for(const [target,b] of [...backups].reverse())fs.copyFileSync(path.join(ROOT,b),path.join(ROOT,target));throw e;}
  finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
}
(async()=>{const action=process.argv[2];assert.ok(['prepare','stage','verify','publish'].includes(action));await ({prepare,stage,verify,publish})[action]();})().catch(e=>{console.error(e);process.exitCode=1;});
