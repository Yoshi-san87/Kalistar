const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..'),batch='V4/template-stable/elements-02/';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const write=(p,v)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2));};
async function hash(p){const h=crypto.createHash('sha256');for await(const b of fs.createReadStream(path.join(root,p)))h.update(b);return h.digest('hex');}
(async()=>{
 if(fs.existsSync(path.join(root,batch,'manifest.json')))throw Error('Batch already prepared; preserve profiles and source hashes.');
 const roster=read('V3/donnees/cartes.json'),previous=read('V4/template-stable/current-elements.json'),electro=read('V4/template-stable/current.json');
 const names=['KAYLIS','ELENION','SERAPHINA','VALAZAR','MALABA'];
 const editorial={
  KAYLIS:{title:'LA PREMI\u00c8RE BR\u00c8CHE',job:'\u00c9VASION'},
  ELENION:{title:'LA FL\u00c8CHE DU SERMENT'},
  SERAPHINA:{job:'M\u00c9DIATRICE',description:"Seraphina laisse le sceau se dissoudre entre ses doigts. Pour une nuit, aucune dette de sang ne franchira cette porte. Demain, elle devra r\u00e9pondre de ce r\u00e9pit."},
  VALAZAR:{job:'N\u00c9CROMANCIEN',description:"Valazar suit du doigt une ligne de cendre. Il ne cherche pas \u00e0 rappeler le mort, seulement son nom. M\u00eame Cryptown a des oublis qu'il refuse."},
  MALABA:{description:"Baba l\u00e8ve sa chope et plaisante avec la salle. Ses \u00e9paules occupent presque tout le comptoir. Pourtant, \u00e0 la Gueule Fumante, personne ne sait faire autant de place aux autres."}
 };
 const cards=names.map(name=>{
  const v=roster.find(c=>c.name===name),c={schemaVersion:4};
  for(const k of ['id','name','title','job','race','element','faction','weapon','positions','atk','defense','magic','barriers','slug','hue','color','weapon_index'])c[k]=v[k];
  Object.assign(c,{description:v.text,artwork:name,artworkSource:v.art,artworkUnchanged:true,sourcePSD:`V3/templates/${v.slug}.psd`,output:`${name}_V4_01_${v.element}`,profile:batch+name.toLowerCase()+'/card.json'},editorial[name]);
  write(c.profile,c);return c;
 });
 const flags={};
 for(const faction of new Set(cards.map(c=>c.faction))){
  const source=`V3/assets/factions/${faction}.png`,file=path.join(root,source),meta=await sharp(file).metadata();
  const left=Math.round(meta.width*.08),top=Math.round(meta.height*.145),crop={left,top,width:meta.width-2*left,height:meta.height-top};
  const output=batch+`resources/flag-${faction}.png`;fs.mkdirSync(path.dirname(path.join(root,output)),{recursive:true});
  const data=await sharp(file).extract(crop).png().toBuffer();await sharp(data).trim().png().toFile(path.join(root,output));flags[faction]={source,output,crop};
 }
 const palette={GEO:{hue:35,saturation:38,lightness:-8},HEMATO:{hue:343,saturation:52,lightness:-10},NECRO:{hue:274,saturation:42,lightness:-14},RAINBOW:{spectrum:[[0,'171726'],[850,'494275'],[1550,'398294'],[2250,'82A184'],[3100,'C8AA77'],[3650,'C48CBA'],[4096,'EFE2EA']]},NONE:{hue:210,saturation:5,lightness:-30}};
 const manifest={schemaVersion:4,batch:'elements-02',baseRegistry:'V4/template-stable/registry-electro-03f.json',template:previous.template,registry:'V4/template-stable/registry-elements-05.json',fixedMaster:'V4/template-stable/elements-01/fixed-master.png',cards,flags,palette,branchPalette:{NONE:{hue:210,saturation:0,lightness:-52}},crystalBoxes:{NONE:{width:116,height:144}},geometry:read('V3/donnees/asset_geometry.json'),protectedFiles:{}};
 manifest.effectLayouts=[{layer:'ATK D6 - effet death',width:49.53,height:78,anchor:[0.49708225310358656,0.3991686358319086],center:[142,147],safeRadius:49}];
 const paths=new Set([previous.template,previous.registry,electro.template,electro.registry,'V4/template-stable/current.json','V3/donnees/cartes.json','V3/site/index.html','V3/site/engine.js']);
 for(const c of previous.cards){paths.add(c.psd);paths.add(c.png);paths.add(c.profile);}
 for(const c of electro.cards){paths.add(`V4/templates/${c.output}.psd`);paths.add(`V4/cartes/${c.output}.png`);paths.add(c.profile);}
 for(const c of cards){paths.add(c.sourcePSD);paths.add(c.artworkSource);}
 for(const p of paths)manifest.protectedFiles[p]=await hash(p);
 write(batch+'manifest.json',manifest);write(batch+'render-config.json',{names:['KAYLIS']});
 write(manifest.registry,{schemaVersion:5,template:manifest.template,canvas:[897,1497],resolution:300,baseRegistry:previous.registry,elements:palette,branchPalette:manifest.branchPalette,crystalBoxes:manifest.crystalBoxes,bindings:cards.map(c=>({key:c.name.toLowerCase(),element:c.element,profile:c.profile,output:c.output})),renderer:['V4/scripts/stable/elements-common.jsx','V4/scripts/stable/render-elements-02.jsx']});
 console.log(JSON.stringify({cards:cards.map(c=>[c.name,c.element]),protectedSources:paths.size}));
})().catch(e=>{console.error(e);process.exitCode=1;});
