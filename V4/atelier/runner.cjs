const {spawn} = require('node:child_process');
const L = require('./lib.cjs');
const {fs,path,assert,ROOT,DATA,read,write,jobDir,baseline,protectedCheck,rendererHash,diff} = L;
function command(exe,args,log){return new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{cwd:__dirname,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';
  child.stdout.on('data',b=>{output+=b; if(log)fs.appendFileSync(log,b);});
  child.stderr.on('data',b=>{output+=b; if(log)fs.appendFileSync(log,b);});
  child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(Error(output.slice(-2500)||'Processus interrompu.')));
});}
function status(id,patch){const file=path.join(jobDir(id),'status.json');write(file,{...(fs.existsSync(file)?read(file):{}),...patch,updatedAt:new Date().toISOString()});}
async function verifyItem(job,item,ref){
  const dir=path.join(jobDir(job.id),item.key),native=read(path.join(dir,'native.json'));
  assert.equal(native.width,897);assert.equal(native.height,1497);assert.equal(native.resolution,300);
  const layers=native.reopened,get=n=>{const l=layers.find(l=>l.name===n);assert.ok(l,n);return l;};
  for(const [side,values,modes] of [['ATK',item.card.atk,item.card.magic],['DEF',item.card.defense,item.card.barriers]])for(let i=0;i<6;i++){
    const die=6-i,v=values[i],l=get(`${side} D${die} - valeur`);
    assert.equal(l.visible,typeof v==='number');if(typeof v==='number')assert.equal(l.text,String(v));
    else assert.equal(get(`${side} D${die} - effet ${v}`).visible,true);
    assert.equal(get(`${side} D${die} - ${side==='ATK'?'HALO MAGIQUE':'BARRIERE'}`).visible,typeof v==='number'&&modes.includes(die));
  }
  for(const [layer,field,max,x,y] of [['NOM','name',470,449.5,129.5],['TITLE','title',590,448.5,1100],['JOB','job',170,292,1172.5]]){
    const l=get(layer);assert.equal(l.text,item.card[field]);assert.equal(l.kind,'LayerKind.TEXT');
    assert.ok(l.ink[2]-l.ink[0]<=max+1,layer+' trop large');
    assert.ok(Math.abs((l.ink[0]+l.ink[2])/2-x)<=1&&Math.abs((l.ink[1]+l.ink[3])/2-y)<=1,layer+' decentre');
  }
  const desc=get('DESCRIPTION');assert.equal(desc.text.replace(/\r/g,' '),item.card.description);
  assert.ok(desc.ink[0]>=149&&desc.ink[2]<=750&&desc.ink[1]>=1251&&desc.ink[3]<=1387,'Recit hors cadre');
  for(let p=1;p<=5;p++){const l=get('POSITION SLOT '+p);assert.equal(l.visible,p<=item.card.positions.length);if(l.visible)assert.equal(l.text,String([...item.card.positions].sort()[p-1]));}
  const roundtrip=await diff(path.join(dir,'card.png'),path.join(dir,'reopened.png'));assert.equal(roundtrip.changed,0,'PSD reouvert different');
  let fixed=null;const comparison=await diff(path.join(ROOT,ref.cards.find(c=>c.key===item.key).png),path.join(dir,'card.png'),native.rectangles);
  if(job.kind==='regression')assert.equal(comparison.changed,0,item.key+' : regression de pixels');
  else {
    fixed=await diff(path.join(dir,'fixed-before.png'),path.join(dir,'fixed-after.png'));assert.equal(fixed.changed,0,'Cadre fixe modifie');
    assert.equal(comparison.outside,0,'Pixels modifies hors des composants autorises');
  }
  const barcode=JSON.parse(await command(L.PYTHON,[path.join(__dirname,'barcode.py'),path.join(dir,'card.png'),item.card.id]));
  assert.equal(barcode.passed,true,'Code-barres non lisible');
  const result={key:item.key,passed:true,comparison,roundtrip,fixed,barcode,photoshop:native.photoshop};
  write(path.join(dir,'verification.json'),result);return result;
}
async function execute(id){
  const dir=jobDir(id),job=read(path.join(dir,'request.json')),ref=baseline();
  const lock=path.join(DATA,'render.lock');let fd;
  try {
    fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,id}));
    status(id,{state:'checking',message:'Verification des references'});
    await protectedCheck(ref);assert.equal(job.referenceId,ref.id);
    const engine=await rendererHash();assert.equal(job.rendererHash,engine,'Moteur modifie depuis la mise en file.');
    if(job.kind!=='regression'){
      const gate=read(path.join(DATA,'regression.json'));
      assert.equal(gate.passed,true);assert.equal(gate.referenceId,ref.id);assert.equal(gate.rendererHash,engine,'Reverification du moteur requise.');
    }
    write(path.join(DATA,'active.json'),{id});status(id,{state:'rendering',message:'Composition Photoshop'});
    await command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(__dirname,'bridge.ps1')],path.join(dir,'photoshop.log'));
    const native=read(path.join(dir,'native-results.json'));assert.equal(native.length,job.items.length);
    const results=[];
    for(const item of job.items){
      status(id,{state:'verifying',message:'Controle de '+item.card.name});
      const outcome=native.find(n=>n.key===item.key);
      if(!outcome?.rendered)results.push({key:item.key,passed:false,error:outcome?.error||'Rendu absent'});
      else try{results.push(await verifyItem(job,item,ref));}catch(e){results.push({key:item.key,passed:false,error:e.message});}
    }
    await protectedCheck(ref);assert.equal(await rendererHash(),engine,'Moteur modifie pendant le rendu.');
    const passed=results.every(r=>r.passed),report={passed,referenceId:ref.id,rendererHash:engine,checkedAt:new Date().toISOString(),results};
    write(path.join(dir,'verification.json'),report);
    if(job.kind==='regression')write(path.join(DATA,'regression.json'),report);
    if(!passed)throw Error(results.filter(r=>!r.passed).map(r=>r.key+' : '+r.error).join('\n'));
    status(id,{state:'verified',message:job.kind==='regression'?`${results.length} references identiques`:'Brouillon controle',passed:true});
  }catch(e){status(id,{state:'failed',message:e.message,passed:false});}
  finally{
    // Only the temporary PSD in this validated job directory can be removed.
    const scratch=path.join(dir,'roundtrip.psd');if(job.kind==='regression'&&fs.existsSync(scratch))fs.unlinkSync(scratch);
    if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}
  }
  return read(path.join(dir,'status.json'));
}
async function createJob(kind,entry,patch={},upload=null){
  const ref=baseline(),id=L.crypto.randomUUID(),items=kind==='regression'?ref.cards:[entry];
  if(kind!=='regression'&&kind!=='draft')throw Error('Type de travail invalide.');
  const request={id,kind,referenceId:ref.id,rendererHash:await rendererHash(),createdAt:new Date().toISOString(),items:items.map(e=>({
    key:e.key,psd:e.psd,card:kind==='regression'?e.card:L.validatePatch(e,patch),registry:e.registry,fonts:e.fonts,artworkLayer:e.artworkLayer,upload:kind==='draft'?upload:null
  }))};
  if(upload){if(!L.ID.test(upload)||!fs.existsSync(path.join(DATA,'uploads',upload+'.png')))throw Error('Illustration absente.');}
  write(path.join(jobDir(id),'request.json'),request);status(id,{id,kind,key:entry?.key||null,createdAt:request.createdAt,state:'queued',message:'En attente'});
  return id;
}
module.exports={execute,createJob,status,verifyItem};
if(require.main===module)(async()=>{
  const id=await createJob('regression');console.log('Regression '+id);
  const result=await execute(id);console.log(result);if(result.state!=='verified')process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
