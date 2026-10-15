'use strict';
const {fs,path,sharp,read,assert}=require('../../atelier/lib.cjs');
async function main(stage=process.argv[2]||'preview'){
  assert(['preview','card'].includes(stage));
  const out=path.join(__dirname,'proofs');fs.mkdirSync(out,{recursive:true});
  const cards=read(path.join(__dirname,'set.json')).cards;
  for(const faction of [...new Set(cards.map(c=>c.faction))]){
    const group=cards.filter(c=>c.faction===faction),parts=[];
    for(const [i,c] of group.entries())parts.push({input:await sharp(path.join(__dirname,'cards',c.key,stage+'.png')).resize(360,601).png().toBuffer(),left:i*368,top:0});
    const file=path.join(out,stage+'-'+faction+'.jpg');
    await sharp({create:{width:group.length*368,height:601,channels:3,background:'#171d1c'}}).composite(parts).jpeg({quality:94}).toFile(file);
    console.log(file);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
