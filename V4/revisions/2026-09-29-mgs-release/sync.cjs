'use strict';
const L = require('../../atelier/lib.cjs');
const {fs,path,assert,read,write,hash,ROOT} = L;
const {execFileSync} = require('node:child_process');
const repo = path.join(ROOT,'paquets-transfert/github-personnel-20260921');
const git = (...args) => execFileSync('git',['-c','core.longpaths=true','-C',repo,...args],{encoding:'utf8'}).trim();
const rel = f => path.relative(ROOT,f).replaceAll('\\','/');
const fortune = path.join(ROOT,'V4/expansions/2026-09-29-fortune');
const pair = path.join(ROOT,'V4/expansions/2026-09-29-fatman-naomi');
const raiden = path.join(ROOT,'V4/revisions/2026-09-29-raiden-painterly');
const active = ['V4/donnees/catalogue.json','V4/donnees/arenes-collaborations.json'];
const newIds = ['49467210','49508137','49592640'];
function tree(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    assert(!e.isSymbolicLink());
    if(['publication','staging','stage-paths.txt','sync.json','public'].includes(e.name)||/\.log$/.test(e.name))return [];
    const f=path.join(dir,e.name);return e.isDirectory()?tree(f):[rel(f)];
  });
}
async function main() {
  assert.equal(git('remote','get-url','origin'),'https://github.com/Yoshi-san87/Kalistar.git');
  assert.equal(git('branch','--show-current'),'main');
  const before=read(path.join(fortune,'release-before.json')),head=git('rev-parse','HEAD');
  assert.equal(head,before.head);assert.equal(head,git('rev-parse','origin/main'));
  assert.equal(git('diff','--cached','--name-only'),'');
  const dirty=execFileSync('git',['-C',repo,'status','--porcelain','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  assert(dirty.every(s=>(s[0]===' '||s.startsWith('??'))&&s.slice(3).startsWith('V4/site/verification/')));
  for(const [f,h] of Object.entries(before.originals))assert.equal(await hash(path.join(repo,f)),h,f);
  await L.protectedCheck();require('../../expansions/2026-09-29-fatman-naomi/build.cjs').guard.publication();
  require('../../expansions/2026-09-29-fortune/build.cjs').guard.preparation('fortune',true);
  for(const home of [fortune,pair,raiden])assert(read(path.join(home,'qa/local/report.json')).passed);
  const oldSnapshot=read(path.join(fortune,'existing-created.snapshot.json'));
  for(const [f,h]of Object.entries(oldSnapshot.files))assert.equal(await hash(path.join(repo,f)),h,f);
  const old=read(path.join(repo,active[0])),current=read(path.join(ROOT,active[0]));
  assert.equal(current.referenceId,old.referenceId);assert.equal(current.schemaVersion,old.schemaVersion);
  assert.deepEqual(current.cards.filter(c=>!newIds.includes(c.id)&&c.id!=='49382016'),old.cards.filter(c=>c.id!=='49382016'));
  assert.deepEqual(current.cards.filter(c=>newIds.includes(c.id)).map(c=>c.id).sort(),newIds.toSorted());
  const expected=structuredClone(before.arenas);
  expected.find(a=>a.id==='mgs2-big-shell').homeCharacters.push('fortune-mgs','fatman-mgs');
  expected.find(a=>a.id==='mgs1-shadow-moses').homeCharacters.push('naomi-hunter-mgs');
  assert.deepEqual(read(path.join(ROOT,active[1])),expected);
  const proof=read(path.join(raiden,'verified.json'));
  const replacements=proof.staged.filter(c=>!active.includes(rel(c.target)));
  for(const c of replacements){assert.equal(await hash(c.target),c.afterHash);assert.equal(await hash(path.join(repo,rel(c.target))),c.beforeHash);}
  const revised=read(path.join(raiden,'staging/V4/donnees/catalogue.json'));
  assert.deepEqual(current.cards.find(c=>c.id==='49382016'),revised.cards.find(c=>c.id==='49382016'));
  const files=[...active,...replacements.map(c=>rel(c.target)),
    ...['Fortune_MGS2_Big_Shell.png','Fatman_MGS2_Heliport.png','Naomi_MGS1_Medical.png'].map(n=>'V4/Illustrations/'+n),
    ...newIds.flatMap(id=>tree(path.join(ROOT,'V4/creations',id))),...tree(fortune),...tree(pair),...tree(raiden),...tree(__dirname)];
  assert.equal(new Set(files).size,files.length);
  const replaceable=new Set([...active,...replacements.map(c=>rel(c.target))]);
  for(const f of files)if(!replaceable.has(f))assert(!fs.existsSync(path.join(repo,f)),'Unexpected existing destination '+f);
  const siteFiles=fs.readdirSync(path.join(repo,'V4/site'),{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>path.join(e.parentPath,e.name));
  const uiBefore=await Promise.all(siteFiles.map(hash));
  const sources={};for(const f of files)sources[f]=await hash(path.join(ROOT,f));
  for(const f of files){const dst=path.join(repo,f);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(ROOT,f),dst);assert.equal(await hash(dst),sources[f]);}
  assert.deepEqual(await Promise.all(siteFiles.map(hash)),uiBefore);
  fs.writeFileSync(path.join(__dirname,'stage-paths.txt'),files.join('\0')+'\0');
  write(path.join(__dirname,'sync.json'),{head,files,hashes:sources,preservedUI:true});
  console.log(JSON.stringify({head,files:files.length,addedCards:newIds,updatedCard:'49382016',preservedUI:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
