'use strict';
const L = require('../../atelier/lib.cjs');
const {fs, path, crypto, assert, ROOT, DATA, read, write, hash} = L;
const WORK = path.relative(ROOT, __dirname).replaceAll('\\', '/');
const C = {
  work:WORK, oldId:'776dc4d80df6962de648b1553c1ae6868ffa95a10eefe8982fe1e0e38c82ce1a',
  key:'voloden', id:'30000028', output:'VOLODEN_V4_01_NECRO', destination:WORK + '/staged',
  profile:'V4/template-stable/voloden/card.json', report:'V4/template-stable/voloden/render.json',
  psd:'V4/templates/VOLODEN_V4_01_NECRO.psd', png:'V4/cartes/VOLODEN_V4_01_NECRO.png',
  current:'V4/template-stable/current-elements.json', pack:'V4/atelier/designer-assets/',
  icons:'V4/template-stable/icon-layouts.json',
  ref:'V4/atelier/data/references.json', regression:'V4/atelier/data/regression.json',
  sourcePSD:'V3/templates/28_NECRO_VOLODEN.psd', art:'V3/assets/illustrations/28_NECRO_VOLODEN.png'
};
C.packs = ['manifest.json', 'manifest.raw.json'].map(p => C.pack + p);
C.banks = ['banks/weapon-Faucille.png', 'banks/race-CARDEMORTIS.png'];
C.newFiles = [C.psd,C.png,C.profile,C.report,...C.banks.flatMap(p => [C.pack+p,C.pack+'packed/'+p])];
C.proofs = ['plan.json','verification.json','references-before.json','publish.cjs'].map(p => WORK+'/'+p);
const TARGETS = [...C.newFiles,C.current,C.icons,...C.packs];
const JOURNAL = WORK+'/transaction.json', RECEIPT = WORK+'/published.json';
const SHA = /^[a-f0-9]{64}$/;
const clone = value => structuredClone(value);
const bytes = value => Buffer.from(JSON.stringify(value,null,2)+'\n');
const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const precision = value => JSON.parse(JSON.stringify(value),(key,v)=>typeof v==='number'?Math.round(v*1e8)/1e8:v);

function absolute(file) {
  assert.ok(typeof file==='string' && /^(V3|V4)\//.test(file) && !/[\\:\x00-\x1f]/.test(file),'Chemin relatif invalide');
  const parts=file.split('/'); assert.ok(parts.every(p=>p&&p!=='.'&&p!=='..'&&!/[. ]$/.test(p)));
  let target=ROOT;
  for(const part of parts){target=path.join(target,part);if(fs.existsSync(target))assert.ok(!fs.lstatSync(target).isSymbolicLink(),'Lien interdit : '+file);}
  return target;
}
const currentHash = async file => fs.existsSync(absolute(file)) ? hash(absolute(file)) : null;
function catalogueEntry(card) {
  return {key:C.key,element:card.element,profile:C.profile,output:C.output,psd:C.psd,png:C.png,artwork:card.artworkSource,artworkUnchanged:card.artworkUnchanged};
}
function freezeEntry(card,native) {
  const names=new Set(native.reopened.map(l=>l.name)),registry=clone(native.registry);
  assert.ok(registry && Array.isArray(registry.banks),'Registry natif obligatoire');
  registry.elements=[card.element];
  registry.banks=registry.banks.map(b=>({field:b.field,variants:Object.fromEntries(Object.entries(b.variants).filter(([,layers])=>layers.every(n=>names.has(n))))}));
  registry.effectLayouts=(registry.effectLayouts||[]).filter(l=>names.has(l.layer));
  registry.effectSupports=(registry.effectSupports||[]).filter(s=>s.layers.every(n=>names.has(n)));
  for(const bank of registry.banks)assert.ok(bank.variants[card[bank.field]]?.length,'Banque native manquante : '+bank.field);
  const options={atk:[],defense:[]};
  for(const [side,prefix] of [['atk','ATK'],['defense','DEF']])for(let i=0;i<6;i++){
    const start=prefix+' D'+(6-i)+' - effet ',effects=[...names].filter(n=>n.startsWith(start)).map(n=>n.slice(start.length));
    options[side].push(effects);if(typeof card[side][i]==='string')assert.ok(effects.includes(card[side][i]),'Effet natif absent');
  }
  const artworkLayer=registry.banks.find(b=>b.field==='artwork')?.variants[card.artwork]?.[0];assert.ok(artworkLayer);
  return {key:C.key,card:clone(card),profile:C.profile,png:C.png,psd:C.psd,registry,options,artworkLayer,
    fonts:[...new Set(native.reopened.filter(l=>l.kind==='LayerKind.TEXT').map(l=>l.font??null))]};
}

async function loadProof() {
  const inputs=new Map();
  function snapshot(file){const buffer=fs.readFileSync(absolute(file));inputs.set(file,digest(buffer));return JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/,''));}
  const plan=snapshot(WORK+'/plan.json'),audit=snapshot(WORK+'/verification.json'),old=snapshot(WORK+'/references-before.json');
  assert.equal(old.id,C.oldId);assert.equal(Object.keys(old.protectedFiles).length,176);assert.deepEqual(L.baseline(),old);
  assert.equal(plan.referenceId,old.id);assert.ok(typeof plan.revision==='string'&&/^[a-z0-9-]+$/.test(plan.revision));
  for(const key of ['key','psd','png','profile','report','destination'])assert.equal(plan[key],C[key]);
  assert.ok(!old.cards.some(c=>c.key===C.key||c.card.id===C.id));
  assert.equal(audit.passed,true);assert.equal(audit.revision,plan.revision);assert.equal(audit.originalReferenceId,old.id);
  assert.equal(audit.modelId,C.id);assert.equal(audit.sourcesUnchanged,true);
  assert.equal(audit.fixed?.changed,0);assert.equal(audit.roundtrip?.changed,0);assert.equal(audit.barcode?.passed,true);assert.equal(audit.barcode.expected,C.id);
  assert.equal(audit.repeat?.changed,0);assert.equal(audit.illustration?.changed,0);
  assert.deepEqual(Object.keys(plan.sourceHashes).sort(),[C.sourcePSD,C.art,'V3/donnees/cartes.json'].sort());
  if(audit.sourceSnapshot)assert.deepEqual(audit.sourceSnapshot,plan.sourceHashes);
  for(const [file,expected] of Object.entries(plan.sourceHashes)){assert.ok(SHA.test(expected));assert.equal(await hash(absolute(file)),expected);inputs.set(file,expected);}
  for(const [name,key] of [['card.psd','psdHash'],['card.png','pngHash'],['native.json','nativeHash']]){
    const file=C.destination+'/'+name;assert.ok(SHA.test(audit[key]));assert.equal(await hash(absolute(file)),audit[key]);inputs.set(file,audit[key]);
  }
  const native=snapshot(C.destination+'/native.json');assert.equal(inputs.get(C.destination+'/native.json'),audit.nativeHash);
  assert.equal(native.width,897);assert.equal(native.height,1497);assert.equal(native.resolution,300);
  for(const key of ['before','after','reopened'])assert.ok(Array.isArray(native[key])&&native[key].length);
  const card=native.card;assert.ok(card);assert.equal(card.id,C.id);assert.equal(card.output,C.output);assert.equal(card.profile,C.profile);
  assert.deepEqual(snapshot(C.profile),card);assert.equal(inputs.get(C.profile),audit.profileHash,'Profil different du rendu verifie');
  assert.equal(card.artworkSource,C.art);assert.equal(card.sourcePSD,C.sourcePSD);assert.equal(card.artworkUnchanged,true);
  const catalogue=read(absolute('V3/donnees/cartes.json')),canonical=(Array.isArray(catalogue)?catalogue:catalogue.cards).find(c=>c.id===C.id);assert.ok(canonical);
  for(const field of ['name','element','race','faction','weapon','weapon_index','positions','atk','defense','magic','barriers'])assert.deepEqual(card[field],canonical[field],'Mecanique V3 modifiee : '+field);
  assert.equal(card.race,'CARDEMORTIS');assert.equal(card.weapon,'Faucille');assert.equal(card.element,'NECRO');
  const oldIcons=snapshot(C.icons),icons=snapshot(C.destination+'/icon-layouts.json');
  assert.equal(inputs.get(C.destination+'/icon-layouts.json'),audit.layoutHash,'Calibration differente de la preuve');
  assert.ok(!Object.hasOwn(oldIcons.weapon,'Faucille')&&!Object.hasOwn(oldIcons.race,'CARDEMORTIS'));
  assert.ok(icons.weapon?.Faucille&&icons.race?.CARDEMORTIS);
  const existing=clone(icons);delete existing.weapon.Faucille;delete existing.race.CARDEMORTIS;
  assert.deepEqual(existing,oldIcons,'Ancien calibrage ou metadata modifie');
  assert.deepEqual(precision(native.iconLayouts),precision(icons),'Calibrage non identique au rendu audite');
  const packs=C.packs.map(snapshot);
  for(const pack of packs){
    assert.equal(pack.referenceId,old.id);assert.ok(!Object.hasOwn(pack.weapons,card.weapon)&&!Object.hasOwn(pack.races,card.race));
    assert.ok(!pack.sources.some(s=>s.key===C.key));assert.ok(pack.factions[card.faction]&&pack.elements[card.element]);
    for(const [file,expected] of Object.entries(pack.hashes||{})){assert.equal(await hash(absolute(C.pack+file)),expected);inputs.set(C.pack+file,expected);}
  }
  await L.protectedCheck(old);
  return {plan,audit,old,native,card,packs,inputs,snapshot};
}

async function publication() {
  const state=await loadProof(),{plan,audit,old,native,card,packs,inputs,snapshot}=state;
  assert.ok(Array.isArray(plan.install)&&Array.isArray(plan.protect)&&audit.installHashes);
  assert.deepEqual(plan.install.map(i=>i.to).sort(),[...TARGETS].sort(),'Liste exacte des installations requise');
  assert.deepEqual(Object.keys(audit.installHashes).sort(),[...TARGETS].sort());
  const operations=new Map();
  for(const item of plan.install){
    absolute(item.from);assert.ok(item.from.startsWith(C.destination+'/'));
    const expected=audit.installHashes[item.to];assert.ok(SHA.test(expected));assert.equal(await hash(absolute(item.from)),expected);inputs.set(item.from,expected);
    operations.set(item.to,{to:item.to,from:item.from,hash:expected,...(item.to.endsWith('.json')?{value:read(absolute(item.from))}:{})});
  }
  assert.equal(operations.get(C.psd).hash,audit.psdHash);assert.equal(operations.get(C.png).hash,audit.pngHash);
  assert.deepEqual(operations.get(C.profile).value,card);assert.deepEqual(operations.get(C.report).value,native);
  assert.equal(operations.get(C.icons).hash,audit.layoutHash);
  assert.equal(operations.get(C.profile).hash,audit.profileHash);
  const entry=freezeEntry(card,native);
  assert.deepEqual(snapshot(C.destination+'/reference-entry.json'),entry);
  const current=snapshot(C.current),nextCurrent=operations.get(C.current).value;
  assert.deepEqual(nextCurrent,{...current,cards:[...current.cards,catalogueEntry(card)]},'Catalogue non additif');
  for(let i=0;i<packs.length;i++){
    const prior=packs[i],next=operations.get(C.packs[i]).value,unchanged=clone(next);
    assert.equal(next.referenceId,old.id);assert.ok(['ready','complete'].includes(packs[0].status));
    assert.deepEqual(next.sources,[...prior.sources,{key:C.key,psd:C.psd,png:C.png,profile:C.profile}]);
    for(const [group,value,file,layers] of [['weapons','Faucille',C.banks[0],['ARME - CONTENU','ARME - EMAIL']],['races','CARDEMORTIS',C.banks[1],['RACE - CONTENU','RACE - EMAIL']]]){
      const descriptor=next[group][value],relative=(i?'':'packed/')+file;assert.ok(descriptor);
      assert.equal(descriptor.file,relative);assert.equal(descriptor.sourceCard,C.key);assert.deepEqual(descriptor.sourceLayers,layers);
      for(const key of ['left','top','width','height'])assert.ok(Number.isInteger(descriptor[key]));
      assert.ok(descriptor.left>=0&&descriptor.top>=0&&descriptor.width>0&&descriptor.height>0&&descriptor.left+descriptor.width<=897&&descriptor.top+descriptor.height<=1497);
      const meta=await L.sharp(absolute(operations.get(C.pack+relative).from)).metadata();assert.equal(meta.width,descriptor.width);assert.equal(meta.height,descriptor.height);
      assert.equal(next.hashes[relative],operations.get(C.pack+relative).hash);
      delete unchanged[group][value];delete unchanged.hashes[relative];
    }
    unchanged.sources.pop();if(!prior.hashes&&Object.keys(unchanged.hashes).length===0)delete unchanged.hashes;
    assert.deepEqual(unchanged,prior,'Ancien composant ou metadata du pack modifie');
  }
  const protect=new Set(plan.protect),required=[...C.newFiles,...C.proofs,...Object.keys(plan.sourceHashes)];
  assert.equal(protect.size,plan.protect.length);
  assert.deepEqual([...protect].sort(),[...new Set(required)].sort(),'Protections exactes requises');
  const next=clone(old);next.cards.push(entry);
  for(const op of operations.values()){
    op.beforeHash=await currentHash(op.to);
    if(C.newFiles.includes(op.to))assert.ok(op.beforeHash===null||(op.to===C.profile&&op.beforeHash===op.hash),'Nouvelle cible deja presente : '+op.to);
    if(Object.hasOwn(old.protectedFiles,op.to))assert.ok([C.current,C.icons].includes(op.to),'Ancienne source protegee interdite');
  }
  for(const file of protect){next.protectedFiles[file]=operations.get(file)?.hash||await hash(absolute(file));if(!operations.has(file))inputs.set(file,next.protectedFiles[file]);}
  next.protectedFiles[C.current]=operations.get(C.current).hash;
  next.protectedFiles[C.icons]=operations.get(C.icons).hash;
  for(const [file,expected] of Object.entries(old.protectedFiles))if(![C.current,C.icons].includes(file))assert.equal(next.protectedFiles[file],expected);
  next.id=digest(Buffer.from(JSON.stringify(next.protectedFiles)));next.parentReferenceId=old.id;next.createdAt=new Date().toISOString();
  next.revision={id:plan.revision,reason:'Integration canonique V3 de Voloden, illustration conservee',audit:WORK+'/verification.json'};
  for(const file of C.packs){const op=operations.get(file);op.value.referenceId=next.id;op.buffer=bytes(op.value);op.hash=digest(op.buffer);}
  function generated(to,value){const buffer=bytes(value);operations.set(to,{to,buffer,hash:digest(buffer)});}
  generated(C.regression,{passed:false,referenceId:next.id,previousReferenceId:old.id,regressionRequired:true,results:[]});generated(C.ref,next);
  for(const file of [C.regression,C.ref])operations.get(file).beforeHash=await currentHash(file);
  return {...state,next,operations};
}

async function copy(from,to,expected){
  const target=absolute(to),temp=target+'.'+crypto.randomUUID()+'.tmp';fs.mkdirSync(path.dirname(target),{recursive:true});
  try{fs.copyFileSync(absolute(from),temp,fs.constants.COPYFILE_EXCL);assert.equal(await hash(temp),expected);fs.renameSync(temp,target);}
  finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
async function rollback(journal){
  assert.equal(journal.work,WORK);assert.equal(journal.oldId,C.oldId);assert.ok(['preparing','applying','rolled-back'].includes(journal.phase));
  if(journal.phase!=='preparing'){
    for(const row of journal.files){
      assert.ok([...TARGETS,C.ref,C.regression,RECEIPT].includes(row.to));assert.ok(SHA.test(row.hash));
      assert.ok([row.beforeHash,row.hash].includes(await currentHash(row.to)),'Modification tierce : '+row.to);
      if(row.beforeHash!==null){assert.equal(row.backup,WORK+'/originals/'+row.to);assert.equal(await hash(absolute(row.backup)),row.beforeHash);}
    }
    for(const row of [...journal.files].reverse())if(await currentHash(row.to)!==row.beforeHash){
      if(row.beforeHash===null)fs.unlinkSync(absolute(row.to));else await copy(row.backup,row.to,row.beforeHash);
    }
  }
  journal.phase='rolled-back';write(absolute(JOURNAL),journal);
}
async function publish(){
  assert.ok(!fs.existsSync(absolute(JOURNAL))&&!fs.existsSync(absolute(RECEIPT)),'Transaction deja presente');
  const {plan,old,next,operations,inputs,packs}=await publication();
  const receipt=bytes({revision:plan.revision,previousReferenceId:old.id,referenceId:next.id,addedId:C.id,regressionRequired:true,
    installedHashes:Object.fromEntries([...operations].map(([file,op])=>[file,op.hash])),publishedAt:new Date().toISOString()});
  operations.set(RECEIPT,{to:RECEIPT,buffer:receipt,hash:digest(receipt),beforeHash:null});
  const journal={work:WORK,oldId:old.id,referenceId:next.id,phase:'preparing',files:[...operations.values()].map(op=>({to:op.to,hash:op.hash,beforeHash:op.beforeHash,backup:op.beforeHash===null?null:WORK+'/originals/'+op.to,prepared:WORK+'/transaction/'+op.to}))};
  write(absolute(JOURNAL),journal);
  try{
    for(const row of journal.files){
      const op=operations.get(row.to);assert.equal(await currentHash(row.to),row.beforeHash);
      if(row.backup){fs.mkdirSync(path.dirname(absolute(row.backup)),{recursive:true});fs.copyFileSync(absolute(row.to),absolute(row.backup),fs.constants.COPYFILE_EXCL);assert.equal(await hash(absolute(row.backup)),row.beforeHash);}
      assert.ok(!fs.existsSync(absolute(row.prepared)));fs.mkdirSync(path.dirname(absolute(row.prepared)),{recursive:true});
      if(op.buffer)fs.writeFileSync(absolute(row.prepared),op.buffer,{flag:'wx'});else fs.copyFileSync(absolute(op.from),absolute(row.prepared),fs.constants.COPYFILE_EXCL);
      assert.equal(await hash(absolute(row.prepared)),row.hash);
    }
    await L.protectedCheck(old);for(const [file,expected] of inputs)assert.equal(await hash(absolute(file)),expected,'Entree changee : '+file);
    journal.phase='applying';write(absolute(JOURNAL),journal);
    for(const row of journal.files){assert.equal(await currentHash(row.to),row.beforeHash);await copy(row.prepared,row.to,row.hash);}
    await L.protectedCheck(next);for(const row of journal.files)assert.equal(await hash(absolute(row.to)),row.hash);
    for(const pack of packs)for(const [file,expected] of Object.entries(pack.hashes||{}))assert.equal(await hash(absolute(C.pack+file)),expected,'Ancien composant modifie : '+file);
    journal.phase='committed';write(absolute(JOURNAL),journal);return {added:C.id,approvedCards:next.cards.length,referenceId:next.id,regressionRequired:true};
  }catch(error){try{await rollback({...journal,phase:journal.phase==='committed'?'applying':journal.phase});}catch(failure){throw new AggregateError([error,failure],'Rollback incomplet; conserver le verrou');}throw error;}
}
async function main(){
  assert.ok(process.argv.length===3&&['--publish','--rollback'].includes(process.argv[2]),'Usage : node publish.cjs --publish | --rollback');
  const lock=path.join(DATA,'render.lock'),owner=crypto.randomUUID(),fd=fs.openSync(lock,'wx');
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,kind:'revision',revision:WORK,owner}));
    if(process.argv[2]==='--rollback'){await rollback(read(absolute(JOURNAL)));console.log({rolledBack:true});}else console.log(await publish());
  }finally{fs.closeSync(fd);const phase=fs.existsSync(absolute(JOURNAL))?read(absolute(JOURNAL)).phase:null;
    if(!phase||['rolled-back','committed'].includes(phase)){try{if(read(lock).owner===owner)fs.unlinkSync(lock);}catch(error){console.error('Verifier le verrou : '+error.message);}}
  }
}
module.exports={C,absolute,loadProof,freezeEntry,catalogueEntry};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
