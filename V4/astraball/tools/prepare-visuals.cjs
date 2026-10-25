'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.KALISTAR_NODE_MODULES?path.join(process.env.KALISTAR_NODE_MODULES,'sharp'):'sharp');
const root=path.resolve(__dirname,'..'),source=path.join(root,'sources/visuals-v2');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
  const spec=JSON.parse(fs.readFileSync(path.join(source,'prompts.json'),'utf8')),files=[];
  for(const ball of spec.balls){
    const input=path.join(source,ball.id+'.png'),file='assets/balls-v1/'+ball.id+'.webp',output=path.join(root,file);
    const meta=await sharp(input).metadata();if(!meta.hasAlpha)throw Error('Missing transparent ball '+ball.id);
    await sharp(input).trim({threshold:12}).resize(240,240,{fit:'contain',background:'#00000000'}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).webp({quality:88,alphaQuality:100,effort:6}).toFile(output);
    files.push({file,source:'sources/visuals-v2/'+ball.id+'.png',sourceSha256:hash(input),sha256:hash(output),bytes:fs.statSync(output).size});
  }
  const input=path.join(source,'arena-horizontal-v1.png'),file='assets/arena-horizontal-v1.webp',output=path.join(root,file);
  await sharp(input).resize(1536,1024,{fit:'fill'}).webp({quality:88,effort:6}).toFile(output);
  files.push({file,source:'sources/visuals-v2/arena-horizontal-v1.png',sourceSha256:hash(input),sha256:hash(output),bytes:fs.statSync(output).size});
  const report={tool:'Built-in image_gen, deterministic Sharp trim/resize/WebP export',files};
  fs.writeFileSync(path.join(source,'media-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
