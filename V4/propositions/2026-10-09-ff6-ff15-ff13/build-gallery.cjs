'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {sharp}=require('../../atelier/lib.cjs');
const plan=require('./prompts.json'),provenance=require('./provenance.json');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
 assert.equal(plan.items.length,29);assert.equal(provenance.items.length,29);
 const out=path.join(__dirname,'preview');fs.mkdirSync(out,{recursive:true});
 const items=[];
 for(const item of plan.items){
  const p=provenance.items.find(p=>p.number===item.number),file=path.join(__dirname,item.file);
  assert.equal(p.file,item.file);assert.equal(hash(file),p.sha256);
  const meta=await sharp(file).metadata();assert.equal(meta.width,p.width);assert.equal(meta.height,p.height);
  const thumb='preview/'+item.slug+'.webp';
  await sharp(file).resize({width:560,withoutEnlargement:true}).webp({quality:87}).toFile(path.join(__dirname,thumb));
  items.push({...item,status:'generated-awaiting-user-selection',width:p.width,height:p.height,sha256:p.sha256,thumb,
   promptSource:item.number===2?'02-terra-transe-attempts.json#/attempts/1/prompt':'prompts.json#/items/'+(item.number-1)+'/prompt'});
 }
 assert.equal(new Set(items.map(i=>i.sha256)).size,29);
 const figures=items.map(i=>`<figure data-group="${i.group}"><a class="art" href="${i.file}" target="_blank" rel="noopener" aria-label="${escape(i.name)}, illustration originale"><img src="${i.thumb}" width="${i.width}" height="${i.height}" alt="${escape(i.name+' : '+i.title)}" loading="lazy"></a><figcaption><h2><span>${String(i.number).padStart(2,'0')}</span>${escape(i.name)}</h2><p>${escape(i.title)}</p>${i.number===2?'<small>Transe : interpr&eacute;tation v&ecirc;tue</small>':''}</figcaption></figure>`).join('\n');
 const css=fs.readFileSync(path.join(__dirname,'gallery.css'),'utf8');
 const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Kalistar | Final Fantasy VI, XV et XIII</title><style>${css}</style></head><body><header><div><h1>Kalistar / Final Fantasy</h1><p><span id="count" aria-live="polite">29 illustrations</span> &middot; Propositions</p></div><div class="controls"><label for="group">Collection</label><select id="group"><option value="">Toutes</option><option value="FFVI">Final Fantasy VI &middot; 14</option><option value="FFXV">Final Fantasy XV &middot; 7</option><option value="FFXIII">Final Fantasy XIII &middot; 8</option></select></div></header><main>${figures}</main><footer><a href="ensemble.jpg" target="_blank" rel="noopener">Vue d'ensemble</a><a href="ffvi.jpg" target="_blank" rel="noopener">FFVI</a><a href="ffxv.jpg" target="_blank" rel="noopener">FFXV</a><a href="ffxiii.jpg" target="_blank" rel="noopener">FFXIII</a></footer><script>const select=document.getElementById('group');select.addEventListener('change',()=>{let count=0;document.querySelectorAll('figure').forEach(figure=>{figure.hidden=!!select.value&&figure.dataset.group!==select.value;if(!figure.hidden)count++});document.getElementById('count').textContent=count+' illustrations'});</script></body></html>`;
 fs.writeFileSync(path.join(__dirname,'index.html'),html+'\n');
 for(const group of ['', 'FFVI','FFXV','FFXIII']){
  const list=group?items.filter(i=>i.group===group):items,cols=group?4:6,w=270,h=395,pad=16,rows=Math.ceil(list.length/cols),layers=[];
  for(let n=0;n<list.length;n++){
   const i=list[n],left=pad+(n%cols)*(w+pad),top=pad+Math.floor(n/cols)*(h+pad);
   layers.push({input:await sharp(path.join(__dirname,i.file)).resize(w,340,{fit:'contain',background:'#101513'}).toBuffer(),left,top});
   const label=`<svg width="270" height="55"><text x="0" y="25" fill="#f0ece4" font-size="17" font-family="Georgia">${escape(String(i.number).padStart(2,'0')+' '+i.name)}</text><text x="0" y="46" fill="#b8c6bc" font-size="12" font-family="Arial">${i.group}</text></svg>`;
   layers.push({input:Buffer.from(label),left,top:top+340});
  }
  await sharp({create:{width:pad+cols*(w+pad),height:pad+rows*(h+pad),channels:3,background:'#101513'}}).composite(layers).jpeg({quality:90}).toFile(path.join(__dirname,group?group.toLowerCase()+'.jpg':'ensemble.jpg'));
 }
 const manifest={status:'illustrations-only-awaiting-user-selection',count:29,groups:{FFVI:14,FFXV:7,FFXIII:8},tool:'built-in image_gen',catalogueChanged:false,items:items.map(({prompt,...i})=>i)};
 fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({count:items.length,groups:manifest.groups,originalsUnchanged:items.every(i=>hash(path.join(__dirname,i.file))===i.sha256)}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
