const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json'),'utf8'));
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
async function sheet(items,file,columns,width,height){
 const out=[];
 for(let i=0;i<items.length;i++){
  const x=(i%columns)*width,y=Math.floor(i/columns)*height;
  const image=await sharp(items[i].file).resize(width-14,height-38,{fit:'contain',background:'#132021'}).png().toBuffer();
  out.push({input:image,left:x+7,top:y+7});
  const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="26"><rect width="100%" height="100%" fill="#132021"/><text x="8" y="17" font-family="Arial" font-size="12" fill="#edf0e7">${escape(items[i].label)}</text></svg>`);
  out.push({input:label,left:x,top:y+height-26});
 }
 await sharp({create:{width:columns*width,height:Math.ceil(items.length/columns)*height,channels:3,background:'#132021'}}).composite(out).jpeg({quality:91}).toFile(path.join(root,'verification',file));
}
async function main(){
 if(process.argv.includes('--buffs-scenes')){
  const targets=[7,12,16,23,25,26,27,32,35,36,39];
  const revised=targets.map(id=>cards.find(c=>Number(c.id)===30000000+id));
  await sheet(revised.map(c=>({file:path.join(root,'site/assets/cards',c.slug+'-full.png'),label:c.name})),'buffs-scenes-cartes.jpg',4,280,504);
  const highlights=[12,7,35,39].map(id=>revised.find(c=>Number(c.id)===30000000+id));
  await sheet(highlights.map(c=>({file:path.join(root,'site/assets/cards',c.slug+'-full.png'),label:c.name})),'buffs-scenes-apercu.jpg',4,340,616);
  const races=fs.readdirSync(path.join(root,'assets/races')).filter(f=>f.endsWith('.png')).map(f=>({file:path.join(root,'assets/races',f),label:f.slice(0,-4)}));
  await sheet(races,'buffs-scenes-races.jpg',5,180,200);
  console.log('Current revision sheets: 11 cards, 4 highlights, '+races.length+' races.');return;
 }
 if(process.argv.includes('--revisions')){
  const entries=cards.map(c=>({file:path.join(root,'assets/revisions-20260914/illustrations',c.slug+'.png'),label:c.slug})).filter(x=>fs.existsSync(x.file));
  for(let start=0;start<entries.length;start+=14)await sheet(entries.slice(start,start+14),'revision-art-'+(start+1)+'.jpg',4,300,406);
  const races=fs.readdirSync(path.join(root,'assets/revisions-20260914/races')).filter(x=>x.endsWith('.png')).map(f=>({file:path.join(root,'assets/revisions-20260914/races',f),label:f.slice(0,-4)}));
  if(races.length)await sheet(races,'revision-races.jpg',5,180,200);
  console.log('Revisions inspected: '+entries.length+' illustrations, '+races.length+' races.');return;
 }
 for(let start=0;start<cards.length;start+=14){
  const entries=cards.slice(start,start+14).map(c=>({file:path.join(root,'assets/illustrations',c.slug+'.png'),label:c.slug}));
  if(entries.every(x=>fs.existsSync(x.file)))await sheet(entries,'illustrations-'+(start+1)+'.jpg',4,300,406);
 }
 const ready=cards.map(c=>({file:path.join(root,'site/assets/cards',c.slug+'-full.png'),label:c.slug})).filter(x=>fs.existsSync(x.file));
 for(let start=0;start<ready.length;start+=15)await sheet(ready.slice(start,start+15),'cards-'+(start+1)+'.jpg',5,240,429);
 const weapons=Array.from({length:20},(_,i)=>({file:path.join(root,'assets/armes',String(i).padStart(2,'0')+'.png'),label:String(i).padStart(2,'0')}));
 await sheet(weapons,'weapons-contact.jpg',5,160,185);
 const highlights=[12,21,22,34].map(id=>cards.find(c=>Number(c.id)===30000000+id)).map(c=>({file:path.join(root,'site/assets/cards',c.slug+'-full.png'),label:c.name}));
 if(highlights.every(x=>fs.existsSync(x.file)))await sheet(highlights,'harmonisation-apercu.jpg',4,340,616);
 console.log('Inspection sheets generated. Card exports currently ready: '+ready.length);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
