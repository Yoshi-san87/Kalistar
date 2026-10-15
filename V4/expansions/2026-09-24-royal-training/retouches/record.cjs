'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..');
const generated=path.join(process.env.USERPROFILE,'.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel=file=>path.relative(root,file).replaceAll('\\','/');
const specs=[
  ['darnako','darnako.request.json','darnako.png','exec-6e165685-1ab6-46fb-a650-ce661c381a9b.png',true],
  ['ruby-red-v1','ruby.request.json','ruby-red-v1.png','exec-b169c583-59ee-40ea-bfa2-dbc025737cc4.png',false],
  ['ruby','ruby-black-hair.request.json','ruby.png','exec-2318e8e3-7cc2-4a32-9b7d-6ceccda0849f.png',true],
  ['xiaomi-v1','xiaomi.request.json','xiaomi-v1.png','exec-cb6d922d-62a8-4580-a856-c68d39d86491.png',false],
  ['xiaomi','xiaomi-framing.request.json','xiaomi.png','exec-f0f08a58-ab38-4a43-9ea4-3a5031ea9f3f.png',true]
];
const file=path.join(__dirname,'provenance.json');
if(process.argv.includes('--capture')){
  assert(!fs.existsSync(file),'Provenance already captured; do not silently renew hashes.');
  const assets=specs.map(([key,requestName,output,original,selected])=>{
    const request=path.join(__dirname,requestName),image=path.join(__dirname,output),source=path.join(generated,original);
    const prompt=JSON.parse(fs.readFileSync(request,'utf8'));
    assert.equal(hash(image),hash(source));
    return {key,selected,method:'built-in-imagegen',request:{path:rel(request),sha256:hash(request)},
      inputs:prompt.referenced_image_paths.map(p=>({path:rel(p),sha256:hash(p)})),
      output:{path:rel(image),sha256:hash(image)},generatedOriginal:source};
  });
  fs.writeFileSync(file,JSON.stringify({schemaVersion:1,createdAt:new Date().toISOString(),scope:'Illustrations only; native card proofs are separate. Artistic user approval not claimed.',assets},null,2)+'\n');
}
const data=JSON.parse(fs.readFileSync(file,'utf8'));
for(const a of data.assets)for(const item of [a.request,...a.inputs,a.output])assert.equal(hash(path.join(root,item.path)),item.sha256,item.path);
console.log(JSON.stringify({assets:data.assets.length,selected:data.assets.filter(a=>a.selected).map(a=>a.key),hashes:'passed'}));
