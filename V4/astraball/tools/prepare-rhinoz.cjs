'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp=require(path.join(modules,'sharp')),root=path.resolve(__dirname,'..');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
  const spec=JSON.parse(fs.readFileSync(path.join(root,'sources/rhinoz-v1/prompts-v2.json'),'utf8')),files=[];
  for(const arena of spec.arenas){
    const source='sources/rhinoz-v1/'+arena.file,file='assets/'+arena.file.replace(/\.png$/,'.webp');
    await sharp(path.join(root,source)).resize(1536,1024,{fit:'fill'}).webp({quality:87,effort:6}).toFile(path.join(root,file));
    files.push({file,source,sourceSha256:hash(path.join(root,source)),sha256:hash(path.join(root,file)),bytes:fs.statSync(path.join(root,file)).size,width:1536,height:1024});
  }
  const report={tool:'Built-in image_gen; deterministic Sharp resize/WebP export',files};
  fs.writeFileSync(path.join(root,'sources/rhinoz-v1/media-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
