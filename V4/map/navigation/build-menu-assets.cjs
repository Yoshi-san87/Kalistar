const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
async function main(){
  const emblem=await sharp(path.join(__dirname,'map-emblem-source.png')).trim().resize(112,112,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await sharp(emblem).extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true}).toFile(path.join(root,'../site/assets/navigation/map-v1.webp'));
  for(const id of ['kalistopolis','durane','arborium','velane']){
    const file=id==='velane'?path.join(root,'layers-1.19/velane-icon.png'):path.join(root,'layers-1.15/icons',id+'.png');
    await sharp(file).trim().resize(112,112,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true}).toFile(path.join(root,'../site/assets/map',id+'-v1.webp'));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
