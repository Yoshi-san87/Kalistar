'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const qa=path.join(__dirname,'qa'),publication=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));assert(publication.passed);
const selection={guide:['desktop-formation-start.png','desktop-equipment-result.png','desktop-manuscript.png','razr-equipment-start.png','razr-momo-result.png','razr-library.png','razr-manuscript.png','compact-library.png','landscape-library.png'],library:['desktop-shelves.png','desktop-open.png','razr-shelves.png','razr-open.png']};
const frames=[];
for(const [suite,names]of Object.entries(selection))for(const name of names){const file=path.join(qa,suite,name);if(!fs.existsSync(file))continue;frames.push({file:path.relative(__dirname,file).replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}
assert(frames.length>=9,'Required final captures are missing');
const root=path.resolve(__dirname,'../../..'),asset=path.join(root,'V4/site/assets/ui/library-parchment-v1.webp');
const source='C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-484b1315-06cc-4cc1-894b-564ddbd2c5d9.png';
const art=path.join(__dirname,'art');fs.mkdirSync(art,{recursive:true});fs.copyFileSync(source,path.join(art,'blank-parchment-source.png'));
fs.writeFileSync(path.join(art,'provenance.json'),JSON.stringify({mode:'built-in image_gen',transparentBackground:true,source:'blank-parchment-source.png',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),asset:'V4/site/assets/ui/library-parchment-v1.webp',assetSha256:crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex'),derivative:{tool:'sharp',height:1200,format:'webp',quality:90,alphaPreserved:true},prompt:'See README.md, Visuel du parchemin'},null,2)+'\n');
fs.writeFileSync(path.join(qa,'evidence.json'),JSON.stringify({version:'4.6.28',testedTree:publication.tree,tests:publication.tests,frames},null,2)+'\n');console.log('Saved '+frames.length+' verified captures and generated parchment source');
