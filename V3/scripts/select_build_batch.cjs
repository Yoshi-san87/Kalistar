const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json'),'utf8'));
const geometry=JSON.parse(fs.readFileSync(path.join(root,'donnees/asset_geometry.json'),'utf8'));
const missingOnly=process.argv.includes('--missing');
const excluded=process.argv.filter(s=>s.startsWith('--exclude=')).map(s=>s.slice(10));
const ready=[],waiting=[];
for(const c of cards){
 const files=['illustrations/'+c.slug,'armes/'+String(c.weapon_index).padStart(2,'0'),'races/'+c.race,'factions/'+c.faction,'barcodes/'+c.id,'cristaux/'+c.element].concat([...c.atk,...c.defense].filter(x=>typeof x==='string').map(x=>'effets/'+x));
 const missing=files.filter(x=>!fs.existsSync(path.join(root,'assets',x+'.png')));
 if(excluded.includes(c.slug)||missing.length||!geometry.flags[c.faction])waiting.push({slug:c.slug,missing});
 else if(!missingOnly||!fs.existsSync(path.join(root,'cartes',c.slug+'.png')))ready.push(c.id);
}
fs.writeFileSync(path.join(root,'donnees/build_config.json'),JSON.stringify({ids:ready},null,2));
console.log(JSON.stringify({ready:ready.length,ids:ready,waiting},null,2));
