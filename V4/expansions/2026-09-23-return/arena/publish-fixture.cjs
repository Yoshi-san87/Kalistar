'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {createPublisher,HOME,BANNER,HOMES}=require('./publish.cjs');
const {collaborationArenas}=require('../../../atelier/game-catalog.cjs');
const elements=require('../../../../V3/donnees/elements.json');
const spec=require('./spec.json'),manifest=require('./manifest.json');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const clone=value=>structuredClone(value);
const registryPath='V4/donnees/arenes-collaborations.json',catalogue='V4/donnees/catalogue.json',lock='V4/atelier/data/render.lock';
const targets={arena:'V4/site/assets/arenes/replicant-village.png',faction:'V4/site/assets/factions/Replicant.png'};
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-replicant-publisher-'));
  t.after(()=>{
    if(path.dirname(path.resolve(root))!==path.resolve(os.tmpdir())||!path.basename(root).startsWith('kalistar-replicant-publisher-'))throw Error('Unsafe fixture cleanup');
    fs.rmSync(root,{recursive:true,force:true});
  });
  const file=p=>path.join(root,p);
  const write=(p,bytes)=>{fs.mkdirSync(path.dirname(file(p)),{recursive:true});fs.writeFileSync(file(p),bytes);};
  const put=(p,value)=>write(p,JSON.stringify(value,null,2)+'\n');
  const read=p=>JSON.parse(fs.readFileSync(file(p),'utf8').replace(/^\uFEFF/,''));
  const old={id:'legacy-arena',collaboration:'legacy',name:'Ancien lieu',subtitle:'Conserver exactement',image:'/jeu/assets/arenes/legacy.png',element:'NONE',elementBonus:0,homeCharacters:[],homeAttack:10,homeDefense:10,source:'Existing fixture source',extension:{keep:['one','two']}};
  const before=Buffer.from('\uFEFF[\r\n\t'+JSON.stringify(old)+' \r\n]\r\n');
  write(registryPath,before);put(HOME+'/spec.json',spec);put(HOME+'/manifest.json',manifest);
  const cards=HOMES.map((characterId,i)=>({kind:'created',id:String(49990000+i),profile:{id:String(49990000+i),characterId,faction:'Replicant',element:'AERO'}}));
  put(catalogue,{cards});put('V4/atelier/data/references.json',{cards:[]});
  const arena=Buffer.from('fixture arena image'),full=Buffer.from('fixture full rgba flag'),packed=Buffer.from('fixture packed rgba flag'),source=Buffer.from('fixture generated flag'),outline=Buffer.from('fixture native outline');
  write(spec.source,arena);write(BANNER+'/flag-Replicant.png',full);write(BANNER+'/flag-Replicant-packed.png',packed);write(BANNER+'/flag-source.png',source);
  write('V4/propositions/collaborations/cloud-ff7-01/flag-FF7.png',outline);
  put(HOME+'/verification.json',{passed:true,sha256:sha(arena)});
  put(HOME+'/art-review.json',{reviewed:true,assets:{village:{sha256:sha(arena)},'faction-Replicant':{sha256:sha(full),packedSha256:sha(packed)}}});
  put(BANNER+'/faction.json',{id:'Replicant',label:'Replicant',packedGeometry:{left:672,top:829,width:98,height:223},sourceHash:sha(source),flagHash:sha(packed),outlineHash:sha(outline),bonusField:'faction',bonusStat:'ATK',membersScope:'living-board-only',isolatedFrom:['NieR'],source:BANNER+'/flag-source.png',fullFlag:{file:BANNER+'/flag-Replicant.png',width:109,height:230,sha256:sha(full)}});
  put(BANNER+'/verification.json',{passed:true,alphaMismatch:0,packedAlphaMismatch:0,fullPixelMismatch:0,packedHash:sha(packed),fullHash:sha(full),sourceHash:sha(source)});
  const buildCatalog=async({published=[]}={})=>{
    const cards=[{id:'30000000',characterId:'sentinel-legacy',faction:'Chroma',origin:'approved'},...published.map(c=>({...c.profile,id:c.id,origin:'published'}))];
    return{cards,elements,arenas:collaborationArenas(read(registryPath),new Set(cards.map(c=>c.characterId)),elements,[])};
  };
  const decodeImage=async(bytes,kind)=>({format:'png',width:kind==='arena'?1672:109,height:kind==='arena'?941:230,hasAlpha:kind==='faction'});
  const options={root,buildCatalog,decodeImage};
  const optionsPublisher=()=>createPublisher(options);
  return{root,file,write,put,read,before,old,options,optionsPublisher,publisher:optionsPublisher(),home:HOME,banner:BANNER,registryPath,catalogue,lock,targets,source:spec.source,buildCatalog,cards};
}
module.exports={fixture,sha,clone,spec,manifest,HOME,BANNER,HOMES};
