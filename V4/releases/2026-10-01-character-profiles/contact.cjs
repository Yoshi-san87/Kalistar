'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,ROOT,sharp}=L;
const ids=['49800101','49800105','49800106','49800109','49800111','49700105','49700118','49600110','49600114','49600102','45951088','49800201'];
async function main(){
 const out=path.join(__dirname,'qa');fs.mkdirSync(out,{recursive:true});
 for(let page=0;page<2;page++){
  const overlays=[];
  for(const [i,id] of ids.slice(page*6,page*6+6).entries())overlays.push({input:await sharp(path.join(ROOT,'V4/creations',id,'card.png')).resize(360,600).png().toBuffer(),left:8+(i%3)*368,top:8+Math.floor(i/3)*608});
  await sharp({create:{width:1104,height:1216,channels:3,background:'#111111'}}).composite(overlays).png().toFile(path.join(out,'native-'+(page+1)+'.png'));
 }
 return {sheets:2,cards:ids.length};
}
if(require.main===module)main().then(console.log).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main,ids};
