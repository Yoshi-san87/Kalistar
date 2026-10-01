'use strict';
const {fs,path,read,sharp,ROOT}=require('../../atelier/lib.cjs');
const set=read(path.join(__dirname,'set.json'));
async function main(){
 const mode=process.argv[2]||'card',folder=path.join(__dirname,'qa');fs.mkdirSync(folder,{recursive:true});
 for(let start=0;start<set.cards.length;start+=5){
  const selected=set.cards.slice(start,start+5),layers=[],height=mode==='art'?375:501;
  for(const [i,c] of selected.entries())layers.push({input:await sharp(mode==='art'?path.join(ROOT,'V4/Illustrations',c.art):path.join(__dirname,'cards',c.key,mode+'.png')).resize({width:300,height,fit:'cover'}).png().toBuffer(),left:i*300,top:0});
  await sharp({create:{width:300*selected.length,height,channels:4,background:'#181818'}}).composite(layers).png().toFile(path.join(folder,mode+'-'+(start+1)+'.png'));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
