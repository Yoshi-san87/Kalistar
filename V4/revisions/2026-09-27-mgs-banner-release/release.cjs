'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,assert,read,write,hash,ROOT}=L;
const {execFileSync}=require('node:child_process');
const revision='V4/revisions/2026-09-27-mgs-banner-refinement';
const repo=path.join(ROOT,'paquets-transfert/github-personnel-20260921');
const model=require('../2026-09-27-mgs-banner-refinement/model.cjs');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true','-C',repo,...a],{encoding:'utf8'}).trim();
const relative=f=>path.relative(ROOT,f).replaceAll('\\','/');
const active=['V4/donnees/catalogue.json','V4/docs/IDENTITE_VISUELLE.md',...['MGS1','MGS2','MGS4'].map(k=>'V4/site/assets/factions/'+k+'.png'),...model.specs().flatMap(c=>['card.png','card.psd','profile.json','creation.json','verification.json'].map(n=>'V4/creations/'+c.id+'/'+n))];
const protectedFiles=['V4/atelier/data/references.json','V4/atelier/designer-assets/manifest.json'];
async function hashes(base,files){const o={};for(const f of files)o[f]=await hash(path.join(base,f));return o;}
function tree(f){const p=path.join(ROOT,f);if(fs.statSync(p).isDirectory())return fs.readdirSync(p).filter(n=>!['staging','staged','tests','publication','transaction','attempts'].includes(n)).flatMap(n=>tree(f+'/'+n));return /\.(log|tmp|lock)$/.test(f)||/\/(stage-paths.txt|sync.json)$/.test(f)?[]:[f];}
async function main(){
  const action=process.argv[2];assert(['capture','sync'].includes(action));
  assert.equal(git('remote','get-url','origin'),'https://github.com/Yoshi-san87/Kalistar.git');assert.equal(git('branch','--show-current'),'main');
  const beforeFile=path.join(__dirname,'before.json');
  if(action==='capture'){
    assert(!fs.existsSync(beforeFile));assert.equal(git('rev-parse','HEAD'),git('rev-parse','origin/main'));
    const originals=await hashes(ROOT,active);assert.deepEqual(await hashes(repo,active),originals);
    write(beforeFile,{head:git('rev-parse','HEAD'),status:git('status','--porcelain'),originals,protected:await hashes(ROOT,protectedFiles),gameplay:read(path.join(ROOT,'V4/donnees/catalogue.json')).cards.map(c=>({id:c.id,profile:c.profile}))});
    console.log('Captured personal repository and 11-card revision targets.');return;
  }
  const before=read(beforeFile),head=git('rev-parse','HEAD');assert.equal(git('rev-parse','origin/main'),head);
  // Another user task owns elemental-roll and may have published while PSDs rendered.
  if(head!==before.head){
    git('merge-base','--is-ancestor',before.head,head);
    const allowed=['V4/site/elemental-roll.js','V4/site/elemental-roll.css','V4/site/elemental-roll.browser.test.cjs'];
    const intervening=git('diff','--name-only',before.head,head).split('\n').filter(Boolean);
    assert(intervening.every(f=>allowed.includes(f)),'Unexpected concurrent publication');
  }
  const dirty=execFileSync('git',['-C',repo,'status','--porcelain','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  assert(dirty.every(s=>(s[0]===' '||s.slice(0,2)==='??')&&s.slice(3).startsWith('V4/site/verification/')),'Unrelated source edits or staged changes');
  assert.deepEqual(await hashes(repo,active),before.originals);assert.deepEqual(await hashes(ROOT,protectedFiles),before.protected);
  const tx=read(path.join(ROOT,revision,'transaction.json'));assert.equal(tx.state,'published');
  for(const c of tx.changes){const f=relative(c.target);assert(active.includes(f),'Unexpected active target '+f);assert.equal(c.beforeHash,before.originals[f]);assert.equal(await hash(c.target),c.afterHash);}
  const current=read(path.join(ROOT,'V4/donnees/catalogue.json')).cards;assert.equal(current.length,113);
  for(const old of before.gameplay){const next=current.find(c=>c.id===old.id),spec=model.specs().find(c=>c.id===old.id);assert(next);if(spec)model.profileGuard(old.profile,next.profile,spec);else assert.deepEqual(next.profile,old.profile);}
  await L.protectedCheck();
  const files=[...new Set([...active,...tree(revision),...tree(relative(__dirname))])],copied=[];
  for(const f of files){const src=path.join(ROOT,f),dst=path.join(repo,f),h=await hash(src);if(fs.existsSync(dst)&&await hash(dst)===h)continue;fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);assert.equal(await hash(dst),h);copied.push(f);}
  fs.writeFileSync(path.join(__dirname,'stage-paths.txt'),copied.join('\0')+'\0');
  write(path.join(__dirname,'sync.json'),{head,initialHead:before.head,files:copied,cards:113,protectedUnchanged:true});console.log(JSON.stringify({copied:copied.length,cards:113}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
