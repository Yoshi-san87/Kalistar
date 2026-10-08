'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,sharp}=L,set=require('./set.json');
async function main(){
 const dir=path.join(__dirname,'visual-proof');fs.mkdirSync(dir,{recursive:true});
 const limit=process.argv.includes('--available')?set.cards.findIndex(c=>!fs.existsSync(path.join(__dirname,'cards',c.key,'render/reopened.png'))):-1;
 const available=limit<0?set.cards:set.cards.slice(0,Math.floor(limit/6)*6);
 for(let i=0;i<available.length;i+=6){
  const cards=available.slice(i,i+6),layers=[];
  for(const [n,c]of cards.entries())layers.push({input:await sharp(path.join(__dirname,'cards',c.key,'card.png')).resize(330,551,{fit:'contain',background:'#111413'}).png().toBuffer(),left:n%3*330,top:Math.floor(n/3)*551});
  await sharp({create:{width:990,height:Math.ceil(cards.length/3)*551,channels:4,background:'#111413'}}).composite(layers).png().toFile(path.join(dir,'cards-'+(i/6+1)+'.png'));
 }console.log(available.length+' native cards in proof sheets.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
