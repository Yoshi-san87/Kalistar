'use strict';
const {fs,path,assert,hash,write,ROOT}=require('../../atelier/lib.cjs');
const {execFileSync}=require('node:child_process');
const clone=path.join(ROOT,'paquets-transfert/github-personnel-20260921');
const git=(...a)=>execFileSync('git',['-C',clone,...a],{encoding:'utf8'}).trim();
async function main(){
  const out=path.join(__dirname,'repository-before.json');assert(!fs.existsSync(out),'Snapshot already exists');
  assert.equal(git('remote','get-url','origin'),'https://github.com/Yoshi-san87/Kalistar.git');
  assert.equal(git('branch','--show-current'),'main');
  assert.equal(git('rev-parse','HEAD'),git('rev-parse','origin/main'));
  const known=['V4/site/collaborations.js','V4/site/collaborations.test.cjs','V4/site/collection-binder.js','V4/site/collection-versions.test.cjs','V4/site/metal-gear.test.cjs'];
  const status=git('status','--porcelain');
  for(const line of status.split('\n').filter(Boolean))assert(known.some(f=>line.endsWith(f)),'Unexpected clone edit '+line);
  const files={};
  for(const f of [...known,'V4/site/app.js','V4/site/deck-builder.js','V4/site/deck-builder.css','V4/site/battle-ui.css','V4/donnees/catalogue.json','V4/atelier/data/references.json'])files[f]=await hash(path.join(clone,f));
  write(out,{head:git('rev-parse','HEAD'),remote:git('remote','get-url','origin'),files,knownUiChanges:known,status});
  console.log(JSON.stringify({head:git('rev-parse','HEAD'),files:Object.keys(files).length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
