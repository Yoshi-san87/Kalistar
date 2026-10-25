'use strict';

const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const checkout=path.resolve(__dirname,'../../../..');
const backupDirectory='C:/Users/guill/Documents/Kalistar-sauvegardes/astraball-arenas-pixel-v1/flags';
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const relative=file=>path.relative(checkout,file).split(path.sep).join('/');
const mappings=Object.freeze([
  ['durane','Durane','Durane'],
  ['woodland','WoodLand','Woodland'],
  ['arborium','Arborium','Arborium'],
  ['vulkar','Vulkar','Vulkar'],
  ['cryptown','Cryptown','Cryptown'],
  ['thalassea','Thalassea','Thalassea'],
  ['zarok','Zarok','Zarok'],
].map(entry=>Object.freeze(entry)));

function inside(directory,file){
  const rel=path.relative(directory,file);
  return rel===''||(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));
}

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
  if(!(await fs.readFile(file)).equals(bytes))throw Error('Refusing to overwrite different bytes: '+file);
  return true;
}

async function writeExact(file,bytes,boundary){
  if(!inside(boundary,await physicalPath(file)))throw Error('Output escapes its directory: '+file);
  await fs.mkdir(path.dirname(file),{recursive:true});
  try{await fs.writeFile(file,bytes,{flag:'wx'});}
  catch(error){if(error.code!=='EEXIST')throw error;}
  assert(await checkExisting(file,bytes),'Missing file after exact copy: '+file);
}

function record(file,bytes,metadata={}){
  return {file,bytes:bytes.length,sha256:sha(bytes),...metadata};
}

async function main(){
  assert(path.isAbsolute(backupDirectory),'The configured external backup path requires Windows');
  const realCheckout=await fs.realpath(checkout),realBackup=await physicalPath(backupDirectory);
  assert(!inside(realCheckout,realBackup)&&!inside(realBackup,realCheckout),'Backup must be separate from the checkout');
  const sourceRoot=path.join(checkout,'V4/atelier/designer-assets');
  const manifestFile=path.join(sourceRoot,'manifest.json');
  const referencesFile=path.join(checkout,'V4/atelier/data/references.json');
  const manifestBytes=await fs.readFile(manifestFile),referencesBytes=await fs.readFile(referencesFile);
  const manifest=JSON.parse(manifestBytes.toString('utf8')),references=JSON.parse(referencesBytes.toString('utf8'));
  const sharp=require(path.join(modules,'sharp'));
  const report={
    schema:1,
    operation:'Exact copies of locked native Atelier faction PNGs; no image generation, crop or re-encoding',
    componentManifest:record(relative(manifestFile),manifestBytes),
    referenceRegistry:record(relative(referencesFile),referencesBytes),
    backupRoot:backupDirectory,
    flags:[],
    unmapped:[
      {cityId:'kalistopolis',city:'Kalistopolis',faction:null,url:null,reason:'No validated faction flag mapping found in the current reference cards or native bank'},
      {cityId:'velane',city:'Velane',faction:null,url:null,reason:'No validated faction flag mapping found in the current reference cards or native bank'},
    ],
    venues:{astrium:{cityId:'kalistopolis',faction:null,url:null}},
    qa:'Source identity verified; Pixi placement and visual integration remain pending',
  };
  for(const {city} of report.unmapped){
    assert(!manifest.factions[city]&&!references.cards.some(card=>card.card.faction===city),'New faction evidence requires explicit mapping review: '+city);
  }
  const writes=[],inputs=[{file:manifestFile,bytes:manifestBytes},{file:referencesFile,bytes:referencesBytes}];
  for(const [cityId,city,faction] of mappings){
    const entry=manifest.factions[faction];
    assert(entry,'Missing native faction: '+faction);
    assert.equal(entry.file,'packed/banks/faction-'+faction+'.png');
    const card=references.cards.find(item=>item.key===entry.sourceCard);
    assert(card,'Missing reference card: '+entry.sourceCard);
    assert.equal(card.card.faction,faction,'Reference card faction mismatch');
    const profileFile=path.resolve(checkout,card.profile);
    assert(inside(realCheckout,await fs.realpath(profileFile)),'Profile escapes checkout');
    const profileBytes=await fs.readFile(profileFile);
    assert.equal(JSON.parse(profileBytes.toString('utf8')).faction,faction,'Current profile faction mismatch');
    const sourceFile=path.join(sourceRoot,entry.file);
    assert(inside(realCheckout,await fs.realpath(sourceFile)),'Native source escapes checkout');
    const bytes=await fs.readFile(sourceFile),lockedSha256=manifest.hashes[entry.file];
    assert.equal(sha(bytes),lockedSha256,'Native component differs from its locked hash: '+faction);
    const meta=await sharp(bytes).metadata();
    assert.equal(meta.format,'png');assert.equal(meta.width,entry.width);assert.equal(meta.height,entry.height);
    const dimensions={width:meta.width,height:meta.height};
    const url='assets/arena-flags-v1/'+cityId+'.png';
    const outputFile=path.join(checkout,'V4/astraball',url),backupFile=path.join(backupDirectory,cityId+'.png');
    report.flags.push({
      cityId,city,faction,url,sourceCard:card.key,
      sourceProfile:record(relative(profileFile),profileBytes),
      lockedSha256,
      source:record(relative(sourceFile),bytes,dimensions),
      output:record(relative(outputFile),bytes,dimensions),
      backup:record(backupFile,bytes,dimensions),
    });
    inputs.push({file:sourceFile,bytes},{file:profileFile,bytes:profileBytes});
    writes.push({file:backupFile,bytes,boundary:realBackup},{file:outputFile,bytes,boundary:realCheckout});
  }
  const text=Buffer.from(JSON.stringify(report,null,2)+'\n');
  writes.push(
    {file:path.join(backupDirectory,'flags.json'),bytes:text,boundary:realBackup},
    {file:path.join(__dirname,'flags.json'),bytes:text,boundary:realCheckout},
  );
  // Validate the whole batch before creating files; existing different bytes are preserved.
  for(const {file,bytes,boundary} of writes){
    assert(inside(boundary,await physicalPath(file)),'Output escapes through a junction: '+file);
    await checkExisting(file,bytes);
  }
  for(const {file,bytes} of inputs)assert((await fs.readFile(file)).equals(bytes),'Input changed during preparation: '+file);
  for(const {file,bytes,boundary} of writes)await writeExact(file,bytes,boundary);
  console.log(JSON.stringify({flags:report.flags.length,bytes:report.flags.reduce((total,flag)=>total+flag.output.bytes,0),manifest:relative(path.join(__dirname,'flags.json')),backup:backupDirectory,unmapped:['kalistopolis','velane','astrium']},null,2));
}

if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
