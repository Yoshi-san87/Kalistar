'use strict';

const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sourceDirectory=__dirname,arenaRoot=path.resolve(__dirname,'../..');
const checkout=path.resolve(__dirname,'../../../..');
const backupDirectory='C:/Users/guill/Documents/Kalistar-sauvegardes/astraball-arenas-pixel-v1';
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const relative=file=>path.relative(checkout,file).split(path.sep).join('/');
const webpOptions=Object.freeze({quality:90,effort:6});

function inside(directory,file){
  const rel=path.relative(directory,file);
  return rel===''||(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));
}

// Resolve existing junctions even when the final directory has not been created.
async function physicalPath(file){
  try{return await fs.realpath(file);}
  catch(error){
    if(error.code!=='ENOENT')throw error;
    const parent=path.dirname(file);
    if(parent===file)throw error;
    return path.join(await physicalPath(parent),path.basename(file));
  }
}

async function checkExisting(file,bytes){
  let stat;
  try{stat=await fs.lstat(file);}
  catch(error){if(error.code==='ENOENT')return false;throw error;}
  if(!stat.isFile())throw Error('Refusing non-regular destination: '+file);
  const existing=await fs.readFile(file);
  if(!existing.equals(bytes))throw Error('Refusing to overwrite different bytes: '+file+' (existing '+sha(existing)+', expected '+sha(bytes)+')');
  return true;
}

async function writeExact(file,bytes){
  await fs.mkdir(path.dirname(file),{recursive:true});
  try{await fs.writeFile(file,bytes,{flag:'wx'});}
  catch(error){if(error.code!=='EEXIST')throw error;}
  if(!await checkExisting(file,bytes))throw Error('Missing output after write: '+file);
}

function validateJobs(spec){
  if(!Array.isArray(spec.jobs)||!spec.jobs.length)throw Error('prompts.json must contain a nonempty jobs array');
  const ids=new Set();
  for(const job of spec.jobs){
    if(!job||typeof job.id!=='string'||!/^[a-z][a-z0-9-]*$/.test(job.id)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(job.id))throw Error('Invalid arena id');
    if(ids.has(job.id))throw Error('Duplicate arena id: '+job.id);
    ids.add(job.id);
    if(typeof job.prompt!=='string'||!job.prompt.trim())throw Error('Missing prompt: '+job.id);
    if(job.ref!==null&&(typeof job.ref!=='string'||!job.ref.trim()||path.isAbsolute(job.ref)||!inside(checkout,path.resolve(checkout,job.ref))))throw Error('Expected a checkout-relative reference or explicit null: '+job.id);
    if(typeof job.source!=='string'||!path.isAbsolute(job.source)||path.extname(job.source).toLowerCase()!=='.png')throw Error('Expected an absolute source PNG path: '+job.id);
  }
}

function record(file,bytes,meta){
  return {file,bytes:bytes.length,sha256:sha(bytes),width:meta.width,height:meta.height};
}

async function exportWebp(sharp,bytes,width,height){
  const output=await sharp(bytes).resize({width,height,fit:'inside',kernel:'nearest'}).webp(webpOptions).toBuffer();
  const meta=await sharp(output).metadata();
  if(meta.format!=='webp'||meta.width!==width||meta.height!==height)throw Error('Unexpected WebP output dimensions or format');
  return {bytes:output,meta};
}

function previewHtml(jobs){
  // IDs have already been restricted to ASCII letters, digits and hyphens.
  const items=jobs.map(job=>'<figure><a href="../../assets/arenas-pixel-v1/'+job.id+'.webp"><img src="../../assets/arenas-pixel-v1/'+job.id+'-small.webp" width="384" height="256" loading="lazy" alt="'+job.id+'"></a><figcaption>'+job.id+'</figcaption></figure>').join('\n');
  return '<!doctype html>\n<html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Arenes pixel - apercu de production</title><style>body{margin:24px;background:#f1f3f2;color:#202624;font:15px system-ui,sans-serif}h1{font-size:22px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:18px}figure{margin:0;border:1px solid #bac4c0;border-radius:4px;overflow:hidden;background:white}img{display:block;width:100%;height:auto;aspect-ratio:3/2;image-rendering:pixelated}figcaption{padding:10px;overflow-wrap:anywhere}a:focus-visible{display:block;outline:3px solid #006b62;outline-offset:-3px}</style>'+
    '<h1>Arenes pixel</h1><main>'+items+'</main></html>\n';
}

async function main(){
  const promptsFile=path.join(sourceDirectory,'prompts.json');
  const promptsBytes=await fs.readFile(promptsFile),spec=JSON.parse(promptsBytes.toString('utf8'));
  validateJobs(spec);
  if(!path.isAbsolute(backupDirectory))throw Error('The configured external backup path requires Windows');
  const realCheckout=await fs.realpath(checkout),realBackup=await physicalPath(backupDirectory);
  if(inside(realCheckout,realBackup)||inside(realBackup,realCheckout))throw Error('Backup must be separate from the active checkout');
  const sharp=require(path.join(modules,'sharp'));
  const inputs=[];

  // Complete input validation before copying or exporting any file.
  for(const job of spec.jobs){
    const bytes=await fs.readFile(job.source),meta=await sharp(bytes).metadata();
    if(meta.format!=='png'||!meta.width||!meta.height||(meta.pages||1)!==1)throw Error('Expected a single-frame PNG: '+job.id);
    if(meta.width*2!==meta.height*3)throw Error('Source ratio must be exactly 3:2, without crop or stretch: '+job.id+' ('+meta.width+'x'+meta.height+')');
    if(meta.orientation&&meta.orientation!==1)throw Error('Source must have normal orientation: '+job.id);
    let reference=null;
    if(job.ref!==null){
      const refFile=path.resolve(checkout,job.ref);
      if(!inside(realCheckout,await fs.realpath(refFile)))throw Error('Reference escapes checkout: '+job.ref);
      const refBytes=await fs.readFile(refFile),refMeta=await sharp(refBytes).metadata();
      reference=record(relative(refFile),refBytes,refMeta);
    }
    inputs.push({job,bytes,meta,reference});
  }

  const writes=new Map();
  function queue(file,bytes,external=false){
    const prior=writes.get(file);
    if(prior&&!prior.bytes.equals(bytes))throw Error('Conflicting output path: '+file);
    writes.set(file,{bytes,boundary:external?realBackup:realCheckout});
  }
  queue(path.join(backupDirectory,'prompts.json'),promptsBytes,true);
  const report={
    schema:1,
    generator:spec.generator||'Unspecified in prompts.json',
    pipeline:'Deterministic Sharp resize/WebP export; no image generation',
    sharpVersion:sharp.versions.sharp,libvipsVersion:sharp.versions.vips,
    prompts:{file:relative(promptsFile),bytes:promptsBytes.length,sha256:sha(promptsBytes)},
    backupRoot:backupDirectory,
    export:{full:[1536,1024],preview:[384,256],fit:'inside',kernel:'nearest',...webpOptions},
    qa:'Image export only; visual and runtime QA pending',
    jobs:[],
  };
  for(const {job,bytes,meta,reference} of inputs){
    const original=path.join(sourceDirectory,'originals',job.id+'.png');
    const backup=path.join(backupDirectory,'originals',job.id+'.png');
    const full=path.join(arenaRoot,'assets/arenas-pixel-v1',job.id+'.webp');
    const preview=path.join(arenaRoot,'assets/arenas-pixel-v1',job.id+'-small.webp');
    // The original input buffer is copied unchanged, never decoded/re-encoded.
    queue(backup,bytes,true);queue(original,bytes);
    const fullExport=await exportWebp(sharp,bytes,1536,1024);
    const smallExport=await exportWebp(sharp,bytes,384,256);
    queue(full,fullExport.bytes);queue(preview,smallExport.bytes);
    report.jobs.push({
      id:job.id,prompt:job.prompt,ref:job.ref,reference,
      source:record(job.source,bytes,meta),
      original:record(relative(original),bytes,meta),
      backup:record(backup,bytes,meta),
      full:record(relative(full),fullExport.bytes,fullExport.meta),
      preview:record(relative(preview),smallExport.bytes,smallExport.meta),
    });
  }
  queue(path.join(sourceDirectory,'preview.html'),Buffer.from(previewHtml(report.jobs)));
  const provenance=Buffer.from(JSON.stringify(report,null,2)+'\n');
  queue(path.join(backupDirectory,'provenance.json'),provenance,true);
  queue(path.join(sourceDirectory,'provenance.json'),provenance);

  // Preflight every destination; a conflicting existing image prevents all writes.
  for(const [file,{bytes,boundary}] of writes){
    if(!inside(boundary,await physicalPath(file)))throw Error('Output escapes its directory through a junction: '+file);
    await checkExisting(file,bytes);
  }
  if(!(await fs.readFile(promptsFile)).equals(promptsBytes))throw Error('prompts.json changed during preparation; retry with a stable input');
  for(const {job,bytes} of inputs){
    if(!(await fs.readFile(job.source)).equals(bytes))throw Error('Source changed during preparation: '+job.id);
  }
  // Exclusive writes also protect against files created after preflight.
  for(const [file,{bytes}] of writes)await writeExact(file,bytes);
  console.log(JSON.stringify({arenas:report.jobs.length,backup:backupDirectory,provenance:relative(path.join(sourceDirectory,'provenance.json')),preview:relative(path.join(sourceDirectory,'preview.html'))},null,2));
}

if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
