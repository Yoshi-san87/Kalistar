const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
async function main(){
 const folder=process.argv.includes('--final')?'cartes':'verification/harmonisation-prototype/cartes';
 const selected=process.argv.find(x=>x.startsWith('--ids='))?.slice(6).split(',').map(Number);
 const out=path.join(root,'verification/harmonisation-previews');fs.mkdirSync(out,{recursive:true});
 for(const file of fs.readdirSync(path.join(root,folder)).filter(x=>x.endsWith('.png')&&(!selected||selected.includes(Number(x.slice(0,2)))))){
  const src=path.join(root,folder,file),slug=path.basename(file,'.png');
  await sharp(src).resize(718).jpeg({quality:95}).toFile(path.join(out,slug+'.jpg'));
  await sharp(src).extract({left:60,top:1050,width:777,height:238}).resize(1166).png().toFile(path.join(out,slug+'-details.png'));
 }
 console.log(out);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
