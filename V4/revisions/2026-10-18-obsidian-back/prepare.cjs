'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..');
const runtime=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/_obsidian.cjs'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
  const provenance=JSON.parse(fs.readFileSync(path.join(__dirname,'provenance.json'),'utf8'));
  const source=path.join(__dirname,'sources/obsidian-original.png');
  const previous=path.join(__dirname,'sources/previous-back.webp');
  const previousOriginal=path.join(root,'V3/site/assets/back.webp');
  assert.equal(sha(source),provenance.original.sha256);
  assert.equal(sha(previous),provenance.previous.sha256);
  assert.equal(sha(previousOriginal),provenance.previous.sha256);
  const target=path.join(root,'V4/site/assets/back-obsidian-v1.webp');
  await runtime('sharp')(source).resize(897,1497,{fit:'contain',background:'#000000'}).webp({quality:92,effort:6}).toFile(target);
  assert.equal(sha(target),provenance.output.sha256,'export must match the approved runtime image');
  const backup=path.resolve(root,'../..','sauvegardes-personnelles/creation/2026-10-18-obsidian-back');
  fs.mkdirSync(backup,{recursive:true});
  const backups=[source,previous,target,path.join(__dirname,'provenance.json')];
  for(const from of backups){
    const to=path.join(backup,path.basename(from));
    if(fs.existsSync(to))assert.equal(sha(to),sha(from));else fs.copyFileSync(from,to);
    assert.equal(sha(from),sha(to));
  }
  console.log(JSON.stringify({output:provenance.output,backup,previousPreserved:sha(previousOriginal)===provenance.previous.sha256}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
