'use strict';
const {path,sharp}=require('../../atelier/lib.cjs'),S=require('./specs.cjs');
async function main(){
  const width=300,height=501,gap=12,images=[];
  for(const [i,c] of S.cards.entries())images.push({input:await sharp(path.join(__dirname,'cards',c.key,'card.png')).resize(width,height).png().toBuffer(),left:gap+(i%3)*(width+gap),top:gap+Math.floor(i/3)*(height+gap)});
  await sharp({create:{width:3*(width+gap)+gap,height:2*(height+gap)+gap,channels:3,background:'#0c1715'}}).composite(images).jpeg({quality:95}).toFile(path.join(__dirname,'cards-overview.jpg'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
