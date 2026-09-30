'use strict';
const {fs,path,read,sharp}=require('../../atelier/lib.cjs');
const set=read(path.join(__dirname,'set.json'));
async function main(){
 const mode=process.argv[2]||'preview',folder=path.join(__dirname,'qa');fs.mkdirSync(folder,{recursive:true});
 for(let start=0;start<set.cards.length;start+=5){
  const selected=set.cards.slice(start,start+5),layers=[];
  for(const [i,c] of selected.entries())layers.push({input:await sharp(path.join(__dirname,'cards',c.key,mode+'.png')).resize({width:300}).png().toBuffer(),left:i*300,top:0});
  await sharp({create:{width:300*selected.length,height:501,channels:4,background:'#181818'}}).composite(layers).png().toFile(path.join(folder,mode+'-'+(start+1)+'.png'));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
