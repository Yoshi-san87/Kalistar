'use strict';
const L=require('../../atelier/lib.cjs');
const {fs,path,assert,hash,read,write,ROOT}=L;
const {execFileSync}=require('node:child_process');
const repo=path.join(ROOT,'paquets-transfert/github-personnel-20260921');
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-C',repo,...args],{encoding:'utf8'}).trim();
async function main(){
  const target=path.join(__dirname,'repository-site-update.json');assert(!fs.existsSync(target));
  const previous='a6c5ac0f2618b302c8d863a6880d645c5d042753',head='fa4204246f9d55d6b53b5bced0bc52826bdd6d44';
  const files=['V4/site/elemental-roll.browser.test.cjs','V4/site/elemental-roll.css','V4/site/elemental-roll.js'];
  assert.equal(git('remote','get-url','origin'),'https://github.com/Yoshi-san87/Kalistar.git');
  assert.equal(git('rev-parse','HEAD'),head);assert.equal(git('rev-parse','origin/main'),head);
  assert.equal(git('rev-parse',head+'^'),previous);
  assert.equal(git('diff','--name-status',previous,head),files.map(f=>'M\t'+f).join('\n'));
  const blobs={};for(const f of files){blobs[f]=git('rev-parse',head+':'+f);assert.equal(git('hash-object',path.join(repo,f)),blobs[f]);}
  const preservedLocal={};
  for(const line of git('status','--porcelain').split('\n')){
    const f=line.slice(line.startsWith('M ')?2:3);
    if(/^V4\/site\/verification\/elemental-[a-z-]+\.png$/.test(f))preservedLocal[f]=await hash(path.join(repo,f));
  }
  assert.equal(Object.keys(preservedLocal).length,7);
  for(const [f,h] of Object.entries(read(path.join(__dirname,'repository-before.json')).files))assert.equal(await hash(path.join(repo,f)),h);
  write(target,{previous,head,blobs,preservedLocal,method:'Other task published three animation files; retain its seven uncommitted QA images untouched and unstaged.'});
  console.log(JSON.stringify({head,files,untouchedLocalFiles:Object.keys(preservedLocal).length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
