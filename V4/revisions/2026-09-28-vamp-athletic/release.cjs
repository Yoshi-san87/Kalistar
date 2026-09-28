'use strict';
const L=require('../../atelier/lib.cjs'), {fs,path,assert,read,write,hash,ROOT}=L;
const {execFileSync}=require('node:child_process');
const repo=path.join(ROOT,'paquets-transfert/github-personnel-20260921');
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
const rel=f=>path.relative(ROOT,f).replaceAll('\\','/');
function files(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    assert(!e.isSymbolicLink());
    if(['stage-paths.txt','sync.json','public'].includes(e.name)||/\.log$/.test(e.name))return [];
    const f=path.join(dir,e.name);return e.isDirectory()?files(f):[f];
  });
}
async function main(){
  assert.equal(git('remote','get-url','origin'),'https://github.com/Yoshi-san87/Kalistar.git');
  assert.equal(git('branch','--show-current'),'main');assert.equal(git('rev-parse','HEAD'),git('rev-parse','origin/main'));
  assert.equal(git('diff','--cached','--name-only'),'');
  const dirty=execFileSync('git',['-C',repo,'status','--porcelain','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  assert(dirty.every(s=>(s[0]===' '||s.startsWith('??'))&&s.slice(3).startsWith('V4/site/verification/')));
  assert.equal((await require('./revise.cjs').preflight()).state,'published');
  await L.protectedCheck();require('../../expansions/2026-09-28-vamp/build.cjs').guard.assertExisting();
  assert(read(path.join(__dirname,'qa/local/report.json')).passed);
  const proof=read(path.join(__dirname,'verified.json'));
  for(const c of proof.staged){assert.equal(await hash(c.target),c.afterHash);assert.equal(await hash(path.join(repo,rel(c.target))),c.beforeHash);}
  const snapshot=read(path.join(ROOT,'V4/expansions/2026-09-28-vamp/existing-created.snapshot.json'));
  for(const [f,h]of Object.entries(snapshot.files))assert.equal(await hash(path.join(repo,f)),h);
  const destinations=[...proof.staged.map(c=>c.target),...files(__dirname)];
  assert.equal(new Set(destinations).size,destinations.length);
  for(const f of files(__dirname))assert(!fs.existsSync(path.join(repo,rel(f))));
  const head=git('rev-parse','HEAD');
  for(const f of destinations){const dst=path.join(repo,rel(f));fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(f,dst);assert.equal(await hash(dst),await hash(f));}
  fs.writeFileSync(path.join(__dirname,'stage-paths.txt'),destinations.map(rel).join('\0')+'\0');
  write(path.join(__dirname,'sync.json'),{head,files:destinations.map(rel)});
  console.log(JSON.stringify({head,files:destinations.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
