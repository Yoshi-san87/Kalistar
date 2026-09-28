'use strict';
const {fs,path,assert,read,write,hash,ROOT}=require('../../atelier/lib.cjs');
const {execFileSync}=require('node:child_process');
const repo=path.join(ROOT,'paquets-transfert/github-personnel-20260921');
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-C',repo,...args],{encoding:'utf8'}).trim();
const rel=f=>path.relative(ROOT,f).replaceAll('\\','/');
function tree(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  assert(!e.isSymbolicLink());const f=path.join(dir,e.name);
  return e.isDirectory()?tree(f):['stage-paths.txt','release.json'].includes(e.name)||/\.log$/.test(e.name)?[]:[rel(f)];
});}
async function main(){
  const proof=read(path.join(__dirname,'installation.json'));
  assert.equal(git('remote','get-url','origin'),'https://github.com/Yoshi-san87/Kalistar.git');
  assert.equal(git('branch','--show-current'),'main');const head=git('rev-parse','HEAD');
  assert.equal(head,'b2848f51e6483bcdeacfaccf51c28fd31b840a7f');assert.equal(git('rev-parse','origin/main'),head);
  assert.equal(git('diff','--cached','--name-only'),'');
  const dirty=execFileSync('git',['-C',repo,'status','--porcelain','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  assert(dirty.every(s=>(s[0]===' '||s.startsWith('??'))&&s.slice(3).startsWith('V4/site/verification/')),'Unrelated edits');
  const arenaFile='V4/donnees/arenes-collaborations.json';
  assert.equal(await hash(path.join(repo,arenaFile)),proof.arenasBeforeHash);
  assert(read(path.join(__dirname,'qa/local/report.json')).passed);
  for(const [f,h] of Object.entries(proof.before)){assert.equal(await hash(path.join(ROOT,f)),h);assert.equal(await hash(path.join(repo,f)),h);}
  const files=[arenaFile,...proof.outputs.map(o=>o.target),...tree(__dirname)];
  for(const f of files){
    const source=path.join(ROOT,f),target=path.join(repo,f);
    if(f!==arenaFile)assert(!fs.existsSync(target),'Existing target '+f);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
    assert.equal(await hash(source),await hash(target));
  }
  fs.writeFileSync(path.join(__dirname,'stage-paths.txt'),files.join('\0')+'\0');
  write(path.join(__dirname,'release.json'),{base:head,files,unchangedCards:true});
  console.log(JSON.stringify({files:files.length,base:head}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
