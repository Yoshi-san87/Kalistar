'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),M=require('./model.cjs'),B=require('./build.cjs');
const {fs,path,assert,read,write,hash,ROOT}=L,home=__dirname;
async function main(){
 const set=M.validateSet(read(path.join(home,'set.json')));B.guard.publication();
 const art=await require('./art-audit.cjs').audit(),data=await B.game(),gameProof=M.validateGame(data,set,require('../../site/engine.js').createEngine);
 assert.equal(D.catalogue().cards.filter(c=>set.cards.some(s=>s.id===c.id)).length,0,'Pre-publication delivery only');
 assert.equal(data.cards.length,D.catalogue().cards.length+set.cards.length);
 assert.deepEqual(read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')),read(path.join(home,'arenas-before.json')));
 const cards=[];
 for(const c of set.cards){
  const out=path.join(home,'cards',c.key),v=read(path.join(out,'verification.json')),n=read(path.join(out,'render/native.json'));M.validateProfile(read(path.join(out,'profile.json')),c);
  assert(v.passed&&v.roundtrip.changed===0&&v.components.fixedDifferences===0&&v.barcode.passed&&v.typography);
  const lines=n.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length;assert(lines<=4);
  cards.push({id:c.id,key:c.key,png:'V4/expansions/'+M.SET+'/cards/'+c.key+'/card.png',psd:'V4/expansions/'+M.SET+'/cards/'+c.key+'/card.psd',fixedDifferences:0,reopenedDifferences:0,barcode:true,descriptionLines:lines});
 }
 const summary={passed:true,status:'native-verified-unpublished',added:11,baseline:D.catalogue().cards.length,gamePreviewCount:data.cards.length,arenas:data.arenas.length,gameProof,art,cards};
 write(path.join(home,'native-audit.json'),summary);
 function tree(dir){return fs.readdirSync(dir).sort().flatMap(n=>{const f=path.join(dir,n);assert(!fs.lstatSync(f).isSymbolicLink());return fs.statSync(f).isDirectory()?tree(f):[f];});}
 const selected=tree(home).filter(f=>path.basename(f)!=='release-manifest.json').concat(set.cards.map(c=>path.join(ROOT,M.artPath(c))));
 const files={};for(const f of selected)files[path.relative(ROOT,f).replace(/\\/g,'/')]=await hash(f);
 write(path.join(home,'release-manifest.json'),{schemaVersion:1,status:summary.status,files,noGitOperations:true,publication:'Reserved to parent coordinated release'});
 return {passed:true,added:11,nativeCards:cards.length,publicationPending:true,manifestFiles:selected.length};
}
module.exports={main};if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
