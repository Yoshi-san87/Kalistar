'use strict';
const {fs,path,read,sharp,ROOT}=require('../../atelier/lib.cjs');
async function main(){
 const home=path.join(ROOT,'V4/expansions/2026-10-01-one-piece');
 const files=read(path.join(home,'set.json')).cards.map(c=>path.join(home,'cards',c.key,'card.png'));
 files.push(path.join(ROOT,'V4/revisions/2026-10-01-skull-face/work/skull-face/card.png'));
 const out=path.join(__dirname,'qa');fs.mkdirSync(out,{recursive:true});
 for(let start=0;start<files.length;start+=6){
  const layers=[];
  for(const [i,file] of files.slice(start,start+6).entries())layers.push({input:await sharp(file).resize(360,600).png().toBuffer(),left:(i%3)*368,top:Math.floor(i/3)*608});
  await sharp({create:{width:1104,height:1216,channels:3,background:'#161616'}}).composite(layers).png().toFile(path.join(out,'native-'+(start/6+1)+'.png'));
 }
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
