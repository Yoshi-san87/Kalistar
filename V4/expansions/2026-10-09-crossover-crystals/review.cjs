'use strict';
const {sharp,fs,path}=require('../../atelier/lib.cjs'),M=require('./model.cjs');
async function main(){
 for(const [name,cards]of [['new-cards',M.set.cards],['batman-crystals',M.set.revisions]]){
  if(process.argv[2]&&process.argv[2]!==name)continue;
  const width=300,height=501,gap=12,columns=3,rows=Math.ceil(cards.length/columns),layers=[];
  for(const [i,c]of cards.entries())layers.push({input:await sharp(path.join(__dirname,'cards',c.key,'card.png')).resize(width,height).png().toBuffer(),left:(i%columns)*(width+gap),top:Math.floor(i/columns)*(height+gap)});
  await sharp({create:{width:columns*(width+gap)-gap,height:rows*(height+gap)-gap,channels:3,background:'#101514'}}).composite(layers).png().toFile(path.join(__dirname,name+'.png'));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
