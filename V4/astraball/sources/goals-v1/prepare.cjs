const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.KALISTAR_NODE_MODULES
  ?path.join(process.env.KALISTAR_NODE_MODULES,'sharp')
  :'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const inputs=require('./inputs.json'),source=process.argv[2],root=path.resolve(__dirname,'../..');
if(!source)throw Error('Pass the built-in generated_images directory');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
(async()=>{
  const originals=path.join(__dirname,'originals'),output=path.join(root,'assets/goals-v1');
  fs.mkdirSync(originals,{recursive:true});fs.mkdirSync(output,{recursive:true});
  const jobs=[];
  for(const job of inputs.jobs){
    const bytes=fs.readFileSync(path.join(source,job.file));
    fs.writeFileSync(path.join(originals,job.id+'.png'),bytes);
    // Encoding and uniform downsampling only: preserve the generated alpha and artwork.
    const result=await sharp(bytes).resize(512,768,{kernel:'nearest'}).webp({lossless:true}).toBuffer();
    fs.writeFileSync(path.join(output,job.id+'.webp'),result);
    const metadata=await sharp(result).metadata();
    if(!metadata.hasAlpha)throw Error('Goal must retain transparency: '+job.id);
    jobs.push({id:job.id,originalSha256:hash(bytes),url:'assets/goals-v1/'+job.id+'.webp',
      sha256:hash(result),bytes:result.length,width:metadata.width,height:metadata.height});
  }
  fs.writeFileSync(path.join(__dirname,'provenance.json'),JSON.stringify({mode:inputs.mode,jobs},null,2)+'\n');
  console.log(JSON.stringify(jobs,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
