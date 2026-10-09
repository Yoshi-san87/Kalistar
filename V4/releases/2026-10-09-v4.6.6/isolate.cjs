'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),batch='V4/expansions/2026-10-09-crossover-crystals';
const M=require('../../expansions/2026-10-09-crossover-crystals/model.cjs');
function run(cmd,args,options={}){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...options});if(r.status!==0)throw Error(r.stderr||r.error||cmd);return r.stdout;}
function stage(){
 assert.equal(run('git',['diff','--cached','--name-only']).trim(),'','Index reserved for this release');
 const files=[batch,'V4/releases/2026-10-09-v4.6.6','V4/site/assets/factions/XMEN.png','V4/donnees/catalogue.json',
  'V4/site/factions.js','V4/site/factions.test.cjs','V4/site/collaborations.js','V4/site/collection-binder.js','V4/site/README.md',
  'V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs',
  'V4/expansions/2026-10-09-gotham/integration.test.cjs','V4/expansions/2026-10-09-gotham-completion/integration.test.cjs',
  'V4/releases/2026-10-02-pages-portability/portable.test.cjs',...M.all().map(c=>'V4/creations/'+c.id),...M.set.cards.map(c=>c.artworkSource),
  ...['provenance.json','Gambit-01.provenance.json','prompts.json'].map(f=>'V4/propositions/2026-10-07-xmen/'+f)];
 run('git',['add','--',...files,':!'+batch+'/art/xmen-banner-source.png']);
 run('git',['add','-f','--','V4/releases/2026-10-09-v4.6.6/qa',batch+'/photoshop.log']);
 // Stage only our two CI additions, preserving concurrent equipment/performance edits.
 let workflow=run('git',['show','HEAD:.github/workflows/pages.yml']),eol=workflow.includes('\r\n')?'\r\n':'\n';
 const additions=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8').split(/\r?\n/);
 const name=additions.find(l=>l.includes('- name: Fetch crossover approved'));
 const media=additions.find(l=>l.includes('run: git lfs pull')&&l.includes('crossover-crystals'));
 const test=additions.find(l=>l.includes('node --test V4/expansions/2026-10-09-crossover-crystals/'));
 assert(name&&media&&test);
 workflow=workflow.replace('      - name: Install equipment media verifier',name+eol+media+eol+'      - name: Install equipment media verifier');
 const anchor='          node --test V4/expansions/2026-10-09-gotham-completion/integration.test.cjs';
 assert(workflow.includes(anchor));workflow=workflow.replace(anchor,anchor+eol+test);
 const oid=run('git',['hash-object','-w','--stdin'],{input:workflow}).trim();
 run('git',['update-index','--cacheinfo','100644,'+oid+',.github/workflows/pages.yml']);
 console.log('Scoped index ready:',run('git',['write-tree']).trim());
}
function exportIndex(){
 const dest=path.join(root,'paquets-transfert','qa-v4.6.6-staged');assert(!fs.existsSync(dest),'Do not overwrite QA snapshots');
 fs.mkdirSync(dest,{recursive:true});
 run('git',['-c','core.longpaths=true','checkout-index','--all','--prefix='+dest.replaceAll('\\','/')+'/'],{env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1'}});
 const workflow=fs.readFileSync(path.join(dest,'.github/workflows/pages.yml'),'utf8');
 const globs=[...workflow.matchAll(/--include="([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.includes('$('));
 globs.push(run(process.execPath,['V4/deploy/build.cjs','--lfs-paths'],{cwd:dest}).trim());
 let hydrated=0;
 for(const file of new Set(globs.flatMap(s=>s.split(',')).flatMap(pattern=>fs.globSync(pattern,{cwd:dest})))){
  const target=path.join(dest,file),pointer=fs.readFileSync(target,'utf8'),match=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/m.exec(pointer);
  if(!match)continue;
  const oid=match[1],object=path.join(root,'.git/lfs/objects',oid.slice(0,2),oid.slice(2,4),oid);assert(fs.existsSync(object),'LFS object missing: '+file);
  fs.copyFileSync(object,target);hydrated++;
 }
 fs.writeFileSync(path.join(dest,'qa-snapshot.json'),JSON.stringify({tree:run('git',['write-tree']).trim(),head:run('git',['rev-parse','HEAD']).trim(),hydrated},null,2));
 console.log('Isolated staged snapshot:',dest,'Hydrated:',hydrated);
}
if(process.argv[2]==='stage')stage();else if(process.argv[2]==='export')exportIndex();else throw Error('Use stage or export');
