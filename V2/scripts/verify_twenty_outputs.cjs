const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json')));
const normalize=s=>s.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
(async()=>{
 const results=[];
 for(const c of cards){
  const raw=fs.readFileSync(path.join(root,'verification',c.slug+'_layers.txt'),'utf8').replace(/\r\n|\r|\n/g,'\\n');
  const layers=vm.runInNewContext(raw,{}, {timeout:1000});
  assert.equal(layers.NOM,c.name);assert.equal(normalize(layers['TITRE DE VERSION']),normalize(c.title));
  assert.equal(normalize(layers['DESCRIPTION NARRATIVE']),normalize(c.text));
  for(const side of ['ATK','DEF'])for(let i=0;i<6;i++){const v=(side==='ATK'?c.atk:c.defense)[i];if(typeof v==='number')assert.equal(layers[side+' D'+(6-i)+' - valeur'],String(v));}
  assert.equal(layers['AVANTAGE ELEMENTAIRE'].startsWith('+'+c.advantage+' '),true);
  const a=await sharp(path.join(root,'assets/armes',String(c.weapon_index).padStart(2,'0')+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:n}=a.info;
  for(const p of [0,w-1,w*(h-1),w*h-1])assert.equal(a.data[p*n+n-1],0);
  results.push({id:c.id,editableText:true,numericStats:true,elementText:true,weaponTransparentCorners:true});
 }
 const src=path.join(root,'archives/avant-ajustements-2026-09-14/assets/illustrations/electro.png');
 assert(fs.readFileSync(src).equals(fs.readFileSync(path.join(root,'assets/illustrations/electro.png'))));
 fs.writeFileSync(path.join(root,'verification/controle_20_contenus.json'),JSON.stringify({cards:results,momoArtUnchanged:true},null,2));
 const composite=[];
 for(let i=0;i<20;i++){
  const input=await sharp(path.join(root,'verification/pdf20',`card-${String(i+1).padStart(2,'0')}.png`)).resize(300).toBuffer();
  composite.push({input,left:10+(i%4)*310,top:10+Math.floor(i/4)*510});
 }
 await sharp({create:{width:1250,height:2560,channels:3,background:'#151b17'}}).composite(composite).jpeg({quality:90}).toFile(path.join(root,'verification/pdf20/contact.jpg'));
 console.log('All 20 text records and numeric stats match. Weapon transparency and unchanged Momo reference verified. PDF contact ready.');
})().catch(e=>{console.error(e);process.exit(1)});
