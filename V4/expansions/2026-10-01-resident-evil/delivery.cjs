'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),M=require('./model.cjs'),B=require('./build.cjs');
const {fs,path,assert,read,write,hash,ROOT}=L,home=__dirname;
async function main(){
 const set=M.validateSet(read(path.join(home,'set.json')));B.guard.publication();
 const data=await B.game(),gameProof=M.validateGame(data,set,require('../../site/engine.js').createEngine);
 assert.equal(data.cards.length,163);assert.equal(data.arenas.length,28);
 assert.equal(D.catalogue().cards.filter(c=>set.cards.some(s=>s.id===c.id)).length,0,'Delivery is pre-publication');
 assert.deepEqual(read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')),read(path.join(home,'arenas-before.json')));
 const cards=[];
 for(const c of set.cards){const out=path.join(home,'cards',c.key),v=read(path.join(out,'verification.json'));M.validateProfile(read(path.join(out,'profile.json')),c);assert(v.passed&&v.roundtrip.changed===0&&v.components.fixedDifferences===0&&v.barcode.passed&&v.typography);cards.push({id:c.id,key:c.key,png:'V4/expansions/'+M.SET+'/cards/'+c.key+'/card.png',psd:'V4/expansions/'+M.SET+'/cards/'+c.key+'/card.psd',fixedDifferences:v.components.fixedDifferences,reopenedDifferences:v.roundtrip.changed,barcode:v.barcode.passed});}
 const summary={passed:true,status:'native-verified-awaiting-parent-visual-QA-and-publication',added:25,baseline:138,gamePreviewCount:data.cards.length,arenas:data.arenas.length,publishedRE:0,gameProof,cards};
 write(path.join(home,'native-audit.json'),summary);
 function tree(dir){return fs.readdirSync(dir).sort().flatMap(n=>{const f=path.join(dir,n);assert(!fs.lstatSync(f).isSymbolicLink());return fs.statSync(f).isDirectory()?tree(f):[f];});}
 const excluded=new Set(['rejected-jill1-subject-error.png','release-manifest.json']);
 const selected=tree(home).filter(f=>!excluded.has(path.relative(home,f).replace(/\\/g,'/'))).concat(set.cards.map(c=>path.join(ROOT,M.artPath(c))));
 const files={};for(const f of selected)files[path.relative(ROOT,f).replace(/\\/g,'/')]=await hash(f);
 write(path.join(home,'release-manifest.json'),{schemaVersion:1,status:summary.status,files,excludedLocalOnly:['V4/expansions/'+M.SET+'/rejected-jill1-subject-error.png'],publicationGate:'KALISTAR_RE_PARENT_COORDINATED=2026-10-01',noGitOperations:true});
 return {passed:true,added:25,nativeCards:cards.length,publicationPending:true,manifestFiles:selected.length};
}
module.exports={main};if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
