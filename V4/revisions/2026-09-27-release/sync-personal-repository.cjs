'use strict';
const L=require('../../atelier/lib.cjs');
const {fs,path,assert,read,hash,write,ROOT}=L;
const {execFileSync}=require('node:child_process');
const destination=path.join(ROOT,'paquets-transfert/github-personnel-20260921');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true','-C',destination,...a],{encoding:'utf8'}).trim();
const rel=f=>path.relative(ROOT,f).replaceAll('\\','/');
function inside(base,p){const f=path.resolve(base,p);assert(f.startsWith(base+path.sep));return f;}
function tree(relative){
  const f=inside(ROOT,relative),s=fs.lstatSync(f);assert(!s.isSymbolicLink());
  if(s.isDirectory())return fs.readdirSync(f).sort().filter(n=>!['staged','staging','publication','transaction','tests'].includes(n)).flatMap(n=>tree(path.join(relative,n)));
  return /\.(log|tmp)$/.test(f)?[]:[relative.replaceAll('\\','/')];
}
async function main(){
  const apply=process.argv.includes('--apply');assert(process.argv.length===(apply?3:2));
  const baseline=read(path.join(__dirname,'repository-before.json'));
  const updateFile=path.join(__dirname,'repository-remote-update.json');
  const update=fs.existsSync(updateFile)?read(updateFile):null;
  let head=update?.head||baseline.head;
  if(update){
    assert.equal(update.previous,baseline.head);
    assert.equal(git('rev-parse',head+'^'),baseline.head);
    assert.equal(git('diff','--name-status',baseline.head,head),'A\t'+update.preservedPath);
    assert.equal(git('rev-parse',head+':'+update.preservedPath),update.gitBlob);
    assert.equal(git('hash-object',inside(destination,update.preservedPath)),update.gitBlob);
  }
  const siteFile=path.join(__dirname,'repository-site-update.json');
  const site=fs.existsSync(siteFile)?read(siteFile):null;
  if(site){
    assert.equal(site.previous,head);assert.equal(git('rev-parse',site.head+'^'),head);
    assert.equal(git('diff','--name-status',head,site.head),Object.keys(site.blobs).sort().map(f=>'M\t'+f).join('\n'));
    for(const [p,h] of Object.entries(site.blobs)){assert.equal(git('rev-parse',site.head+':'+p),h);assert.equal(git('hash-object',inside(destination,p)),h);}
    for(const [p,h] of Object.entries(site.preservedLocal))assert.equal(await hash(inside(destination,p)),h);
    head=site.head;
  }
  assert.equal(git('remote','get-url','origin'),baseline.remote);assert.equal(baseline.remote,'https://github.com/Yoshi-san87/Kalistar.git');
  assert.equal(git('branch','--show-current'),'main');assert.equal(git('rev-parse','HEAD'),head);assert.equal(git('rev-parse','origin/main'),head);
  for(const [file,expected] of Object.entries(baseline.files))assert.equal(await hash(inside(destination,file)),expected,'Concurrent clone edit: '+file);
  const knownChanges=[...baseline.knownUiChanges,...Object.keys(site?.preservedLocal||{})];
  for(const line of git('status','--porcelain').split('\n').filter(Boolean))assert(knownChanges.some(f=>line.endsWith(f)),'Unexpected clone change: '+line);
  assert.equal(await hash(inside(destination,'.github/workflows/pages.yml')),'b5aeb08ef892bc028188b7c50aebe5f3ff8b82d069fa82d68d6056c9d528d89b','Workflow changed concurrently');
  const batch='V4/expansions/2026-09-27-metal-gear-mines';
  const art='V4/revisions/2026-09-27-artwork-refresh',icons='V4/revisions/2026-09-27-weapon-optics';
  const set=read(inside(ROOT,batch+'/set.json'));
  const old=read(inside(destination,'V4/donnees/catalogue.json')),next=read(inside(ROOT,'V4/donnees/catalogue.json'));
  assert.equal(next.cards.length,old.cards.length+set.cards.length);
  for(const c of old.cards)assert.deepEqual(next.cards.find(n=>n.id===c.id)?.profile,c.profile,'Existing gameplay changed '+c.id);
  const oldRefs=read(inside(destination,'V4/atelier/data/references.json')),refs=L.baseline();
  assert.equal(refs.cards.length,oldRefs.cards.length);
  for(const c of oldRefs.cards)assert.deepEqual(refs.cards.find(n=>n.key===c.key)?.card,c.card,'Reference profile changed '+c.key);
  await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
  const regression=read(inside(ROOT,'V4/atelier/data/regression.json'));
  assert(regression.passed&&regression.referenceId===refs.id);
  assert.equal(regression.results.length,refs.cards.length);assert(regression.results.every(r=>r.passed));
  const changed=new Map();
  for(const folder of [icons,art]){
    const transaction=read(inside(ROOT,folder+'/transaction.json'));assert.equal(transaction.state,'published');
    for(const c of transaction.changes){const p=rel(c.target);assert(p.startsWith('V4/'));changed.set(p,c.afterHash);}
  }
  for(const [p,h] of changed)if(!['V4/donnees/catalogue.json','V4/atelier/data/regression.json'].includes(p))assert.equal(await hash(inside(ROOT,p)),h,'Native revision changed after proof '+p);
  for(const c of set.cards){
    assert(next.cards.some(n=>n.id===c.id));
    for(const name of ['card.psd','card.png','profile.json','illustration.png','verification.json'])assert.equal(await hash(inside(ROOT,batch+'/cards/'+c.key+'/'+name)),await hash(inside(ROOT,'V4/creations/'+c.id+'/'+name)));
  }
  const artSet=read(inside(ROOT,art+'/set.json'));
  const sources=[...set.cards.map(c=>'V4/Illustrations/'+c.art),'V4/Illustrations/Kaylis_Lelan_Des_Couleurs.png','V4/Illustrations/Lanio.png'];
  assert(!sources.some(f=>/Naked/i.test(f)));
  const dirs=[batch,art,icons,'V4/revisions/2026-09-27-release',...set.cards.map(c=>'V4/creations/'+c.id),...artSet.cards.map(c=>'V4/creations/'+c.id)];
  const single=['.github/workflows/pages.yml','V4/docs/IDENTITE_VISUELLE.md','V4/site/collaborations.js','V4/site/metal-gear.test.cjs','V4/atelier/data/regression.json',...['MGS1','MGS2','MGS4'].map(k=>'V4/site/assets/factions/'+k+'.png'),...sources,...changed.keys()];
  const files=[...new Set([...dirs.flatMap(tree),...single])].filter(f=>!f.endsWith('/sync-result.json')&&!f.endsWith('/stage-paths.txt'));
  const plan=[];
  for(const file of files){const source=await hash(inside(ROOT,file)),target=inside(destination,file),before=fs.existsSync(target)?await hash(target):null;if(source!==before)plan.push({file,source,before});}
  const uiPreserved={};
  for(const f of fs.readdirSync(inside(destination,'V4/site')).filter(f=>/\.(js|css|html)$/.test(f))){const p='V4/site/'+f;if(!plan.some(c=>c.file===p))uiPreserved[p]=await hash(inside(destination,p));}
  if(apply){
    for(const c of plan){const source=inside(ROOT,c.file),target=inside(destination,c.file);assert.equal(await hash(source),c.source);assert.equal(fs.existsSync(target)?await hash(target):null,c.before);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);assert.equal(await hash(target),c.source);}
    for(const [p,h] of Object.entries(uiPreserved))assert.equal(await hash(inside(destination,p)),h,'Unrelated website file overwritten '+p);
    for(const [p,h] of Object.entries(site?.preservedLocal||{}))assert.equal(await hash(inside(destination,p)),h,'Other task QA changed '+p);
    const stage=[...new Set([...plan.map(c=>c.file),...baseline.knownUiChanges])];
    fs.writeFileSync(path.join(__dirname,'stage-paths.txt'),stage.join('\0')+'\0');
    write(path.join(__dirname,'sync-result.json'),{head,remote:baseline.remote,files:plan,uiPreserved,stage,appliedAt:new Date().toISOString()});
  }
  console.log(JSON.stringify({mode:apply?'applied':'dry-run',head,cards:next.cards.length,files:files.length,changed:plan.length,uiPreserved:Object.keys(uiPreserved).length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
