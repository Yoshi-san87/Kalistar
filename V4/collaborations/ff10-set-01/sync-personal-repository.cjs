'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const destination=path.join(root,'paquets-transfert/github-personnel-20260921');
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-C',destination,...args],{encoding:'utf8'}).trim();
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
function inside(base,relative){const file=path.resolve(base,relative);assert.ok(file.startsWith(base+path.sep));return file;}
function tree(relative){
  const source=inside(root,relative),stat=fs.lstatSync(source);assert.ok(!stat.isSymbolicLink());
  if(stat.isDirectory())return fs.readdirSync(source).sort().flatMap(n=>tree(path.join(relative,n)));
  return [relative.replace(/\\/g,'/')];
}
function main(){
  assert.ok(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--apply');
  assert.equal(git('remote','get-url','origin'),'https://github.com/Yoshi-san87/Kalistar.git');
  assert.equal(git('branch','--show-current'),'main');
  assert.equal(git('status','--porcelain'),'','Personal repository must be clean before scoped synchronization.');
  assert.equal(git('rev-parse','HEAD'),git('rev-parse','origin/main'));
  const set=read(path.join(__dirname,'set.json'));
  const old=read(inside(destination,'V4/donnees/catalogue.json')),next=read(inside(root,'V4/donnees/catalogue.json'));
  assert.equal(next.cards.length,old.cards.length+11);
  assert.equal(next.referenceId,old.referenceId);
  for(const card of old.cards)if(card.id!=='49055457')assert.deepEqual(next.cards.find(c=>c.id===card.id),card,'Existing card drift: '+card.id);
  assert.deepEqual(next.cards.find(c=>c.id==='49055457').profile,old.cards.find(c=>c.id==='49055457').profile);
  for(const card of set.cards)assert.ok(next.cards.some(c=>c.id===card.id&&c.profile?.faction==='FF10'));
  const directories=['V4/collaborations/ff10-set-01','V4/revisions/2026-09-25-kaylis-training','V4/creations/49055457',...set.cards.map(c=>'V4/creations/'+c.id)];
  const single=['V4/donnees/catalogue.json','V4/donnees/arenes-collaborations.json','V4/site/collaborations.js','V4/atelier/game-catalog.cjs','V4/docs/IDENTITE_VISUELLE.md','V4/site/assets/factions/FF10.png',...set.arenas.map(id=>'V4/site/assets/arenes/'+id+'.png')];
  const files=[...new Set([...directories.flatMap(tree),...single])].filter(f=>!f.endsWith('.log')&&!f.endsWith('.tmp'));
  const plan=files.map(file=>({file,source:hash(inside(root,file)),before:fs.existsSync(inside(destination,file))?hash(inside(destination,file)):null}));
  const changed=plan.filter(p=>p.source!==p.before);
  const ui=['V4/site/app.js','V4/site/style.css','V4/site/collection-binder.js','V4/site/collection-binder.css'].filter(f=>fs.existsSync(inside(destination,f))).map(file=>({file,hash:hash(inside(destination,file))}));
  if(process.argv[2]==='--apply'){
    for(const item of changed){
      const source=inside(root,item.file),target=inside(destination,item.file);
      assert.equal(hash(source),item.source);
      assert.equal(fs.existsSync(target)?hash(target):null,item.before,'Concurrent destination change: '+item.file);
      fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
      assert.equal(hash(target),item.source);
    }
    for(const item of ui)assert.equal(hash(inside(destination,item.file)),item.hash,'UI overwritten');
  }
  console.log(JSON.stringify({mode:process.argv[2]==='--apply'?'applied':'dry-run',head:git('rev-parse','HEAD'),files:plan.length,changed:changed.length,uiPreserved:ui.map(x=>x.file),scope:directories.concat(single)},null,2));
}
if(require.main===module)main();
