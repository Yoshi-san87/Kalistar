'use strict';
const L=require('../../atelier/lib.cjs');
const {fs,path,read,write,hash,assert,sharp}=L;
const {C,absolute,loadProof,freezeEntry,catalogueEntry}=require('./publish.cjs');
const OUT=C.destination+'/publication';

async function prepare(){
  assert.ok(!fs.existsSync(path.join(L.DATA,'render.lock')),'Attendre la fin du rendu natif');
  for(const name of ['transaction.json','published.json'])assert.ok(!fs.existsSync(absolute(C.work+'/'+name)));
  const {plan,audit,old,native,card,packs,inputs,snapshot}=await loadProof();
  const install=new Map(),banks=[];
  function add(from,to){install.set(to,{from,to});}
  function json(to,value){const from=OUT+'/'+to;write(absolute(from),value);add(from,to);}
  const profileBytes=fs.readFileSync(absolute(C.profile));assert.deepEqual(read(absolute(C.profile)),card);
  const profileHash=L.crypto.createHash('sha256').update(profileBytes).digest('hex');assert.equal(profileHash,audit.profileHash);inputs.set(C.profile,profileHash);
  fs.mkdirSync(path.dirname(absolute(OUT+'/'+C.profile)),{recursive:true});fs.writeFileSync(absolute(OUT+'/'+C.profile),profileBytes);add(OUT+'/'+C.profile,C.profile);
  add(C.destination+'/card.psd',C.psd);add(C.destination+'/card.png',C.png);json(C.report,native);
  add(C.destination+'/icon-layouts.json',C.icons);
  const entry=freezeEntry(card,native);write(absolute(C.destination+'/reference-entry.json'),entry);
  const current=snapshot(C.current);assert.ok(!current.cards.some(c=>c.key===C.key));json(C.current,{...current,cards:[...current.cards,catalogueEntry(card)]});
  const specs=[['weapon-bank.png','weapons','Faucille',C.banks[0],['ARME - CONTENU','ARME - EMAIL']],['race-bank.png','races','CARDEMORTIS',C.banks[1],['RACE - CONTENU','RACE - EMAIL']]];
  for(const [input,group,value,file,sourceLayers] of specs){
    const source=C.destination+'/'+input,sourceHash=await hash(absolute(source));inputs.set(source,sourceHash);
    const {data,info}=await sharp(absolute(source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,897);assert.equal(info.height,1497);assert.equal(info.channels,4);
    let left=897,top=1497,right=-1,bottom=-1;
    for(let y=0;y<1497;y++)for(let x=0;x<897;x++)if(data[(y*897+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    assert.ok(right>=left&&bottom>=top,'Banque vide');const exports=[];
    for(let i=0;i<2;i++){
      const margin=i?4:0,x=Math.max(0,left-margin),y=Math.max(0,top-margin),width=Math.min(896,right+margin)-x+1,height=Math.min(1496,bottom+margin)-y+1;
      const relative=(i?'':'packed/')+file,to=C.pack+relative,from=OUT+'/'+to;
      assert.ok(!fs.existsSync(absolute(to)),'Nouvelle banque deja presente : '+to);fs.mkdirSync(path.dirname(absolute(from)),{recursive:true});
      await sharp(data,{raw:info}).extract({left:x,top:y,width,height}).png().toFile(absolute(from));
      const result=await sharp(absolute(from)).ensureAlpha().raw().toBuffer();
      for(let row=0;row<height;row++)assert.ok(result.subarray(row*width*4,(row+1)*width*4).equals(data.subarray(((y+row)*897+x)*4,((y+row)*897+x+width)*4)));
      const sha256=await hash(absolute(from));add(from,to);
      packs[i][group][value]={file:relative,left:x,top:y,width,height,sourceLayers,sourceCard:C.key,...(i?{}:{nativeExportFile:file})};
      packs[i].hashes={...packs[i].hashes,[relative]:sha256};exports.push({to,sha256,left:x,top:y,width,height,margin});
    }
    banks.push({source,sourceHash,exports});
  }
  for(let i=0;i<packs.length;i++){
    packs[i].sources.push({key:C.key,psd:C.psd,png:C.png,profile:C.profile});json(C.packs[i],packs[i]);
  }
  plan.install=[...install.values()];plan.protect=[...new Set([...C.newFiles,...C.proofs,...Object.keys(plan.sourceHashes)])];
  const installHashes={};for(const item of plan.install)installHashes[item.to]=await hash(absolute(item.from));
  await L.protectedCheck(old);for(const [file,expected] of inputs)assert.equal(await hash(absolute(file)),expected,'Entree changee pendant preparation : '+file);
  write(absolute(C.work+'/publication-inputs.json'),{revision:plan.revision,referenceId:old.id,scope:'voloden-and-two-new-banks-only',banks,installHashes,
    fullPackComparisonPerformed:false,regressionRequired:true,auditRefreshRequired:true});
  write(absolute(C.work+'/plan.json'),plan);
  return {stagedCanonicalId:C.id,newBanks:2,newBankFiles:4,auditRefreshRequired:true,regressionRequired:true};
}
module.exports={prepare};
if(require.main===module)Promise.resolve().then(()=>{assert.ok(process.argv.length===3&&process.argv[2]==='--prepare','Usage : node prepare-publication.cjs --prepare');return prepare();}).then(console.log).catch(error=>{console.error(error);process.exitCode=1;});
