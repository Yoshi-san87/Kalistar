const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
 const record=read('donnees/harmonisation_integration_20260914.json'),cards=read('donnees/cartes.json');
 assert.equal(Object.keys(record.assets).length,57,'Expected 34 paintings, 19 races, guitar, dormant crystal, two stone auras');
 assert.equal(Object.keys(record.assets).filter(x=>x.startsWith('illustrations/')).length,34);
 const assets=[];
 for(const [file,entry] of Object.entries(record.assets)){
  const canonical=path.join(root,'assets',file),stage=path.join(root,'assets/revisions-20260914',file);
  assert.equal(hash(canonical),entry.sha256,file);assert.equal(hash(stage),entry.sha256,file+' staging changed after integration');
  if(!file.startsWith('illustrations/')){
   const m=await sharp(canonical).metadata();assert(m.hasAlpha,file+' real alpha');
   const {data,info}=await sharp(canonical).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const corners=[0,info.width-1,info.width*(info.height-1),info.width*info.height-1].map(p=>data[p*4+3]);
   assert(corners.every(a=>a<=1),file+' alpha corners');
   if(file.startsWith('effets/'))assert.equal(data[(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*4+3],0,file+' transparent aura center');
   assets.push({file,trueAlpha:true,corners});
  }
 }
 for(const [file,sha] of Object.entries(record.contracts))assert.equal(hash(path.join(root,file)),sha,file+' gameplay unchanged');
 for(const [slug,sha] of Object.entries(record.protected))assert.equal(hash(path.join(root,'assets/illustrations',slug+'.png')),sha,slug+' protected');
 const exports=[];
 for(const c of cards){
  const rel='illustrations/'+c.slug+'.png';
  const before=path.join(root,'sources/avant-harmonisation-20260914/assets',rel);
  const after=path.join(root,'assets',rel);
  if(record.protected[c.slug])assert.equal(hash(after),hash(before),c.slug);
  else assert.notEqual(hash(after),hash(before),c.slug+' expected revised illustration');
  const dependencies=['scripts/build_cards.jsx','scripts/version_band.jsx','donnees/asset_geometry.json','assets/'+rel,
   'assets/races/'+c.race+'.png','assets/armes/'+String(c.weapon_index).padStart(2,'0')+'.png','assets/cristaux/'+c.element+'.png'];
  if(c.element!=='NONE')dependencies.push('assets/effets/'+c.element+'.png');
  const latest=Math.max(...dependencies.map(f=>fs.statSync(path.join(root,f)).mtimeMs));
  for(const [dir,ext] of [['templates','psd'],['impression','tif'],['cartes','png']])
   assert(fs.statSync(path.join(root,dir,c.slug+'.'+ext)).mtimeMs>=latest,c.slug+' stale '+ext);
  const print=path.join(root,'cartes',c.slug+'.png'),game=path.join(root,'site/assets/cards',c.slug+'-full.png');
  const cropped=await sharp(print).extract({left:50,top:50,width:797,height:1388}).raw().toBuffer();
  assert(cropped.equals(await sharp(game).raw().toBuffer()),c.slug+' game crop must use new print');
  const art=await sharp(after).resize({width:1024,withoutEnlargement:true}).webp({quality:94}).toBuffer();
  assert.equal(crypto.createHash('sha256').update(art).digest('hex'),hash(path.join(root,'site/assets/cards',c.slug+'-art.webp')),c.slug+' popup illustration must be current');
  exports.push({slug:c.slug,currentPsdTiffPng:true,currentGameCrop:true,currentPopupArtwork:true});
 }
 const report={checkedAt:new Date().toISOString(),revision:'20260914',illustrationsEdited:34,illustrationsProtected:Object.keys(record.protected),assets,contractsUnchanged:Object.keys(record.contracts),exports};
 fs.writeFileSync(path.join(root,'verification/harmonisation-final.json'),JSON.stringify(report,null,2));
 console.log('57 revised assets, 7 protected illustrations, 41 current native/game exports: passed.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
