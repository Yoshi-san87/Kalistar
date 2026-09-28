'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,assert,read,write,hash,ROOT}=L;
const {execFileSync}=require('node:child_process');
const repo=path.join(ROOT,'paquets-transfert/github-personnel-20260921'),home=__dirname;
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-C',repo,...args],{encoding:'utf8'}).trim();
const active=['V4/donnees/catalogue.json','V4/donnees/arenes-collaborations.json'];
const relative=f=>path.relative(ROOT,f).replaceAll('\\','/');
async function hashes(base,files){const out={};for(const f of files)out[f]=await hash(path.join(base,f));return out;}
function tree(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  assert(!e.isSymbolicLink());if(['publication','stage-paths.txt','sync.json'].includes(e.name)||/\.log$/.test(e.name))return [];
  const f=path.join(dir,e.name);return e.isDirectory()?tree(f):[relative(f)];
});}
async function main(){
  const action=process.argv[2];assert(['capture','sync'].includes(action));
  assert.equal(git('remote','get-url','origin'),'https://github.com/Yoshi-san87/Kalistar.git');assert.equal(git('branch','--show-current'),'main');
  const head=git('rev-parse','HEAD');assert.equal(head,git('rev-parse','origin/main'));
  assert.equal(git('diff','--cached','--name-only'),'');
  const beforeFile=path.join(home,'release-before.json');
  if(action==='capture'){
    assert(!fs.existsSync(beforeFile));const originals=await hashes(ROOT,active);assert.deepEqual(await hashes(repo,active),originals);
    write(beforeFile,{head,originals,arenas:read(path.join(ROOT,active[1]))});console.log('Captured Kalistar personal repository.');return;
  }
  const before=read(beforeFile);assert.equal(head,before.head);assert.deepEqual(await hashes(repo,active),before.originals);
  const dirty=execFileSync('git',['-C',repo,'status','--porcelain','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  assert(dirty.every(s=>(s[0]===' '||s.startsWith('??'))&&s.slice(3).startsWith('V4/site/verification/')));
  const build=require('./build.cjs');build.guard.publication();await L.protectedCheck();
  assert(read(path.join(home,'qa/local/report.json')).passed);
  const arenas=read(path.join(ROOT,active[1])),expected=structuredClone(before.arenas);
  expected.find(a=>a.id==='mgs2-big-shell').homeCharacters.push('vamp-mgs');assert.deepEqual(arenas,expected);
  const snapshot=read(path.join(home,'existing-created.snapshot.json'));
  for(const [f,h] of Object.entries(snapshot.files))assert.equal(await hash(path.join(repo,f)),h,'Existing clone card changed: '+f);
  const files=[...active,'V4/Illustrations/Vamp_MGS2_Bassin.png',...tree(path.join(ROOT,'V4/creations/49173082')),...tree(home)];
  for(const f of files){const src=path.join(ROOT,f),dst=path.join(repo,f);if(!active.includes(f))assert(!fs.existsSync(dst),'Existing destination '+f);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);assert.equal(await hash(src),await hash(dst));}
  fs.writeFileSync(path.join(home,'stage-paths.txt'),files.join('\0')+'\0');write(path.join(home,'sync.json'),{head,files});console.log(JSON.stringify({files:files.length,head}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
