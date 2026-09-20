const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json')));
async function main(){
 const composite=[];
 for(let i=0;i<cards.length;i++){
  const input=await sharp(path.join(root,'cartes',cards[i].slug+'.png')).resize(360).toBuffer();
  composite.push({input,left:24+i%4*378,top:24+Math.floor(i/4)*625});
 }
 await sharp({create:{width:1536,height:3149,channels:3,background:'#171d1b'}}).composite(composite).jpeg({quality:93}).toFile(path.join(root,'APERCU_20_CARTES.jpg'));
 for(const c of cards.slice(12))await sharp(path.join(root,'cartes',c.slug+'.png')).jpeg({quality:92}).toFile(path.join(root,'verification/revision',c.slug+'.jpg'));
 console.log('20-card contact sheet and 8 full-size QA images ready.');
}
main().catch(e=>{console.error(e);process.exit(1)});
