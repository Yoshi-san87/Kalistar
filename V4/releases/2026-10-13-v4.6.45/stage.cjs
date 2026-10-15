'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),config=require('./release.json');
const root=path.resolve(__dirname,'../../..'),release='V4/releases/2026-10-13-v4.6.45';
const git=(args,extra={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...extra}).trim();
assert.equal(git(['remote','get-url','origin']),config.repository);assert.equal(git(['branch','--show-current']),'main');
const parent=git(['rev-parse','HEAD']);assert.equal(git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0],parent);
assert(git(['show','HEAD:V4/site/index.html']).includes('VERSION '+config.previousVersion));
const paths=[...config.scope,release,...config.versionFiles,'.github/workflows/pages.yml'];
const scoped=p=>paths.some(x=>p===x||p.startsWith(x+'/'));
const prior=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
if(process.argv.includes('--refresh'))assert(prior.every(scoped));else assert.equal(prior.length,0);
const oldCatalogue=JSON.parse(git(['show','HEAD:V4/donnees/catalogue.json']));
const newCatalogue=JSON.parse(fs.readFileSync(path.join(root,'V4/donnees/catalogue.json'),'utf8'));
const ids=require('../../expansions/2026-10-13-froz-five-soldiers/set.json').cards.map(c=>c.id);
assert(!oldCatalogue.cards.some(c=>ids.includes(c.id)));
assert.equal(newCatalogue.cards.filter(c=>ids.includes(c.id)).length,5);
assert.deepEqual({...newCatalogue,cards:newCatalogue.cards.filter(c=>!ids.includes(c.id))},oldCatalogue);
for(const f of config.versionFiles){
 const before=git(['show','HEAD:'+f]),actual=fs.readFileSync(path.join(root,f),'utf8').trim();
 let expected=before.replaceAll(config.previousVersion,config.version).replaceAll(config.previousVersion.replaceAll('.','\\.'),config.version.replaceAll('.','\\.'));
 assert.notEqual(expected,before);assert.equal(actual,expected,'Unexpected concurrent version-file edit: '+f);
}
git(['add','--',...paths]);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);assert(staged.every(scoped));
fs.mkdirSync(path.join(__dirname,'qa'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'qa/stage.json'),JSON.stringify({version:config.version,parent,files:staged,unrelatedChangesPreserved:true},null,2)+'\n');
git(['add','--',release+'/qa/stage.json']);console.log(JSON.stringify({files:staged.length,version:config.version,parent}));
