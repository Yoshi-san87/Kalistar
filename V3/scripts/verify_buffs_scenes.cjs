'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'sources/avant-buffs-scenes-20260914');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const targets=[7,12,16,23,25,26,27,32,35,36,39];
function checkGeometry(actual,expected,label){
 // ExtendScript serializes doubles to 14 significant decimal digits.
 assert.deepEqual(actual.alphaBounds,expected.alphaBounds,label+' bounds');
 for(const key of ['r','aspect'])assert(Math.abs(actual[key]-expected[key])<1e-12,label+' '+key);
}
async function main(){
 const cards=read(path.join(root,'donnees/cartes.json')),old=read(path.join(backup,'donnees/cartes.json'));
 const record=read(path.join(root,'donnees/revision_buffs_scenes_integration.json'));
 assert.equal(Object.keys(record.assets).length,51,'11 scenes, 19 races, 20 weapons and 1 stone required');
 assert.equal(Object.keys(record.protected).length,30);
 const mutable=new Set(['title','text','source','story_scene','prompt','visual_revision','source_art','art_action']);
 for(let i=0;i<41;i++){
  const c=cards[i],before=old[i];assert.equal(c.id,before.id);assert.equal(c.slug,before.slug);
  if(!targets.includes(i+1))assert.deepEqual(c,before,'Unrequested profile changed: '+c.slug);
  else for(const key of Object.keys(before)){
   if(mutable.has(key)||i===35&&['weapon','weapon_index'].includes(key))continue;
   assert.deepEqual(c[key],before[key],'Unrequested gameplay change: '+c.slug+' '+key);
  }
 }
 assert.equal(cards[35].weapon,'Arc');assert.equal(cards[35].weapon_index,5);
 for(const file of ['armes.json','elements.json','regles.json','decks_demo.json','arenes.json'])assert.deepEqual(read(path.join(root,'donnees',file)),read(path.join(backup,'donnees',file)),file);
 assert.equal(hash(path.join(root,'site/local-db.js')),hash(path.join(backup,'site/local-db.js')),'Database implementation changed');
 for(const family of ['cristaux','effets'])for(const file of fs.readdirSync(path.join(backup,'assets',family)).filter(f=>f.endsWith('.png'))){
  if(family==='effets'&&file==='MINERO.png')continue;
  assert.equal(hash(path.join(root,'assets',family,file)),hash(path.join(backup,'assets',family,file)),'Unrequested asset changed: '+family+'/'+file);
 }
 const demo=read(path.join(root,'donnees/regles_demo.json'));
 assert.deepEqual(demo.buffPolicy.defenseOrder,['ward','luck','reraise']);assert.equal(demo.buffPolicy.automatic,true);
 assert.equal(demo.physical.targets,'living-ally-including-self');assert.equal(demo.schema,6);
 for(const [slug,expected]of Object.entries(record.protected))assert.equal(hash(path.join(root,'assets/illustrations',slug+'.png')),expected,slug);
 const assets=[];
 for(const [rel,entry]of Object.entries(record.assets)){
  const file=path.join(root,'assets',rel);assert.equal(hash(file),entry.sha256,rel);
  assert.equal(hash(file),hash(path.join(root,'assets/revisions-buffs-scenes-20260914',rel)),'Staging/canonical differ: '+rel);
  const m=await sharp(file).metadata();assert.equal(m.width,entry.width);assert.equal(m.height,entry.height);
  if(!rel.startsWith('illustrations/')){
   assert(m.hasAlpha,rel+' lacks alpha');
   const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   for(const p of [0,info.width-1,info.width*(info.height-1),info.width*info.height-1])assert(data[p*4+3]<=1,rel+' opaque corner');
   if(rel.startsWith('armes/'))for(let p=0;p<data.length;p+=4)if(data[p+3])assert(data[p]===255&&data[p+1]===255&&data[p+2]===255,rel+' nonwhite weapon');
   if(rel==='effets/MINERO.png')assert(data[(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*4+3]>250,'Hollow stone');
  }
  assets.push({file:rel,sha256:entry.sha256,dimensions:[m.width,m.height],alpha:m.hasAlpha});
 }
 const geometry=read(path.join(root,'donnees/asset_geometry.json')),prints=[];
 const evaluate=file=>JSON.parse(JSON.stringify(vm.runInNewContext(fs.readFileSync(file,'utf8'),{},{timeout:1000})));
 for(const c of cards){
  const stamp=evaluate(path.join(root,'verification',c.slug+'_render_inputs.txt'));
  assert.equal(stamp.revision,'buffs-scenes-20260914');assert.equal(stamp.id,c.id);
  const w=String(c.weapon_index).padStart(2,'0');
  checkGeometry(stamp.weapon,geometry.icons.weapons[w],c.slug+' weapon placement');
  checkGeometry(stamp.race,geometry.icons.races[c.race],c.slug+' race placement');
  const inputs=['scripts/build_cards.jsx','scripts/version_band.jsx','assets/illustrations/'+c.slug+'.png','assets/races/'+c.race+'.png','assets/armes/'+w+'.png'];
  if(c.element==='MINERO')inputs.push('assets/effets/MINERO.png');
  const latest=Math.max(...inputs.map(x=>fs.statSync(path.join(root,x)).mtimeMs));
  for(const [folder,ext]of [['cartes','png'],['templates','psd'],['impression','tif']])assert(fs.statSync(path.join(root,folder,c.slug+'.'+ext)).mtimeMs>=latest,'Stale '+folder+' '+c.slug);
  const expected=await sharp(path.join(root,'cartes',c.slug+'.png')).extract({left:50,top:50,width:797,height:1388}).raw().toBuffer();
  const game=await sharp(path.join(root,'site/assets/cards',c.slug+'-full.png')).raw().toBuffer();
  assert(expected.equals(game),'Game crop differs: '+c.slug);
  prints.push({slug:c.slug,fresh:true,placement:true,gameCropPixelExact:true});
 }
 const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'site/data.js'),'utf8'),scope);
 const bundle=JSON.parse(JSON.stringify(scope.window.KALISTAR_DATA));
 assert.deepEqual(bundle.cards,cards.map(({previous_art,art,reference,source_art,...c})=>c));assert.deepEqual(bundle.demo,demo);
 const report={revision:'buffs-scenes-20260914',checkedAt:new Date().toISOString(),cards:41,characters:40,assets,prints,protectedIllustrations:30,unchangedNumericProfiles:41,weaponCorrection:'Elenion: fleau to arc, matrix unchanged',buffCategories:5,defenseOrder:demo.buffPolicy.defenseOrder,databasePreserved:true,ok:true};
 fs.writeFileSync(path.join(root,'verification/buffs-scenes-final.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS 51 assets, 41 fresh print/game/PSD exports, 30 preserved illustrations, profile/BDD contracts and stacked buffs.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
