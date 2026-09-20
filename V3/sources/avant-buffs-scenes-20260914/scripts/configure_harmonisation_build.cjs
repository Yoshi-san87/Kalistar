const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json'),'utf8'));
const prototype=process.argv.includes('--prototype');
const arg=process.argv.find(x=>x.startsWith('--ids='));
const selected=arg?arg.slice(6).split(',').map(Number):null;
const ready=process.argv.includes('--ready');
const record=ready?JSON.parse(fs.readFileSync(path.join(root,'donnees/harmonisation_integration_20260914.json'),'utf8')):null;
const remaining=process.argv.includes('--remaining');
function isReady(c){return !ready||record.protected[c.slug]||record.assets['illustrations/'+c.slug+'.png'];}
function needsRender(c){
 if(!remaining)return true;
 const files=['scripts/build_cards.jsx','scripts/version_band.jsx','donnees/asset_geometry.json',
  'assets/illustrations/'+c.slug+'.png','assets/races/'+c.race+'.png','assets/armes/'+String(c.weapon_index).padStart(2,'0')+'.png',
  'assets/cristaux/'+c.element+'.png'];
 if(c.element!=='NONE')files.push('assets/effets/'+c.element+'.png');
 const latest=Math.max(...files.map(f=>fs.statSync(path.join(root,f)).mtimeMs));
 const png=path.join(root,'cartes',c.slug+'.png');
 return !fs.existsSync(png)||fs.statSync(png).mtimeMs<latest;
}
const ids=cards.filter(c=>(!selected||selected.includes(Number(c.id)-30000000))&&isReady(c)&&needsRender(c)).map(c=>c.id);
if(!ids.length)throw new Error('No cards selected');
const config={ids};
if(prototype){
 config.outputPrefix='verification/harmonisation-prototype/';
 for(const dir of ['templates','impression','cartes','verification'])fs.mkdirSync(path.join(root,config.outputPrefix,dir),{recursive:true});
}
fs.writeFileSync(path.join(root,'donnees/build_config.json'),JSON.stringify(config,null,2));
console.log(JSON.stringify(config));
