const L = require('./lib.cjs');
const { fs, path, crypto, ROOT, DATA, read, write, baseline } = L;
const HOME = path.join(DATA, 'designer');
const CATALOGUE = path.join(ROOT, 'V4/donnees/catalogue.json');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const FIELDS = ['name', 'title', 'job', 'description', 'element', 'race', 'weapon', 'faction', 'positions', 'atk', 'defense', 'magic', 'barriers', 'upload', 'crop'];
const LABELS = {ELECTRO:'Electricite', HYDRO:'Eau', AERO:'Air', PYRO:'Feu', CRYO:'Glace', LUXO:'Lumiere', MINERO:'Roche', HERBO:'Plantes', RAINBOW:'Arc-en-ciel', GEO:'Terre', HEMATO:'Sang', NECRO:'Tenebres', NONE:'Sans cristal'};
const EFFECTS = {
  atk: [ ['retry','Trefle','clover'], ['mana','Potion magique','flask-conical'], ['guard','Bouclier +60','shield-plus'], ['revive','Reraise','heart'], ['buff_atk','ATK physique +60','swords'], ['death','Mort','skull'] ],
  defense: [ ['retry','Trefle','clover'], ['dodge','Esquive','wind'] ]
};
function options() {
  const cards = baseline().cards.map(c=>c.card);
  const choices = field => [...new Set(cards.map(c=>c[field]))].sort().map(value=>({value,label:value}));
  return {elements:Object.entries(LABELS).map(([value,label])=>({value,label,color:'#'+cards.find(c=>c.element===value).color})), races:choices('race'), weapons:choices('weapon'), factions:choices('faction'), effects:Object.fromEntries(Object.entries(EFFECTS).map(([side,list])=>[side,list.map(([value,label,icon])=>({value,label,icon}))]))};
}
function defaults() {
  return {name:'',title:'',job:'',description:'',element:'ELECTRO',race:'ROBOT',weapon:'Instrument',faction:'Chroma',positions:[3],atk:[200,165,130,95,60,25],defense:[200,165,130,95,60,25],magic:[],barriers:[],upload:null,crop:{zoom:1,x:0,y:0}};
}
function validate(input, { final = false, checkUpload = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k=>!FIELDS.includes(k))) throw Error('Fiche de carte invalide.');
  const p = {...defaults(),...input}, opts = options();
  for (const field of ['name','title','job','description']) {
    if (typeof p[field] !== 'string' || /[<>\x00-\x1f\x7f\u2028\u2029]/.test(p[field])) throw Error('Texte invalide : '+field);
    p[field]=p[field].trim().replace(/\s+/g,' ');
    if (p[field].length > ({name:30,title:60,job:22,description:320})[field]) throw Error('Texte trop long : '+field);
  }
  if (final && !p.name) throw Error('Donne un nom a ta carte.');
  if (final && (!p.title || !p.job)) throw Error('Ajoute un titre de version et un metier avant de creer la carte.');
  for (const [field,key] of [['element','elements'],['race','races'],['weapon','weapons'],['faction','factions']]) {
    if (!opts[key].some(o=>o.value===p[field])) throw Error('Composant non calibre : '+field);
  }
  for (const side of ['atk','defense']) {
    if (!Array.isArray(p[side]) || p[side].length!==6) throw Error('Six faces requises pour '+side+'.');
    p[side]=p[side].map(v=>{
      if (Number.isInteger(v) && v>=0 && v<=999) return v;
      if (opts.effects[side].some(o=>o.value===v)) return v;
      throw Error('Valeur ou effet invalide : '+side);
    });
  }
  for (const field of ['positions','magic','barriers']) {
    const max=field==='positions'?5:6,v=p[field];
    if (!Array.isArray(v) || (field==='positions'&&!v.length) || v.length>max || new Set(v).size!==v.length || v.some(n=>!Number.isInteger(n)||n<1||n>max)) throw Error('Positions ou modes invalides.');
    p[field]=v.slice().sort((a,b)=>field==='positions'?a-b:b-a);
  }
  if (p.element==='NONE' && (p.magic.length||p.barriers.length)) throw Error('Sans cristal : ni magie ni barriere.');
  for (const [field,side] of [['magic','atk'],['barriers','defense']]) if (p[field].some(d=>typeof p[side][6-d]!=='number')) throw Error('Un effet ne peut pas recevoir un mode numerique.');
  if(final && p.atk.includes('revive') && !p.positions.includes(5))throw Error('Le Reraise demande la position P5 (Support).');
  if(final && p.atk.includes('guard') && !p.positions.some(p=>p===1||p===5))throw Error('Le bouclier attribue demande P1 ou P5.');
  if (p.upload!==null && (typeof p.upload!=='string'||!UUID.test(p.upload))) throw Error('Illustration invalide.');
  if (checkUpload && p.upload && !fs.existsSync(path.join(DATA,'uploads',p.upload+'.png'))) throw Error('Illustration introuvable. Reimporte le fichier.');
  if (!p.crop || typeof p.crop!=='object' || Array.isArray(p.crop) || Object.keys(p.crop).some(k=>!['zoom','x','y'].includes(k))) throw Error('Cadrage invalide.');
  for(const [key,min,max] of [['zoom',1,3],['x',-1,1],['y',-1,1]]) if(typeof p.crop[key]!=='number'||!Number.isFinite(p.crop[key])||p.crop[key]<min||p.crop[key]>max)throw Error('Cadrage hors limites.');
  p.crop={...p.crop}; return p;
}
function catalogue() {
  const ref=baseline();
  const existing=fs.existsSync(CATALOGUE)?read(CATALOGUE):{schemaVersion:4,cards:[]};
  const approved=ref.cards.map(c=>({id:c.card.id,kind:'approved',key:c.key,name:c.card.name,title:c.card.title,element:c.card.element,profile:c.card,png:c.png,psd:c.psd,pngUrl:'/media/reference/'+c.key+'.png',psdUrl:null}));
  return {schemaVersion:4,referenceId:ref.id,cards:[...approved,...existing.cards.filter(c=>c.kind==='created')]};
}
function initialize() {
  fs.mkdirSync(HOME,{recursive:true});
  write(CATALOGUE,catalogue());
}
function folder(id) {if(!UUID.test(id))throw Error('Identifiant invalide.');return path.join(HOME,'jobs',id);}
function draftList(){const dir=path.join(HOME,'drafts');return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>UUID.test(f.slice(0,-5))&&f.endsWith('.json')).map(f=>read(path.join(dir,f))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)):[];}
function saveDraft(input){
  const p=validate(input.profile),id=input.id||crypto.randomUUID();if(!UUID.test(id))throw Error('Brouillon invalide.');
  const target=path.join(HOME,'drafts',id+'.json'),prior=fs.existsSync(target)?read(target):null;
  if(prior && prior.revision!==input.revision){const e=Error('Brouillon modifie dans une autre fenetre.');e.statusCode=409;throw e;}
  const result={id,revision:(prior?.revision||0)+1,profile:p,updatedAt:new Date().toISOString()};write(target,result);return result;
}
function profileCard(p,id){
  const ref=baseline(),base=ref.cards.find(c=>c.card.element===p.element).card;
  const weapon=ref.cards.find(c=>c.card.weapon===p.weapon).card;
  const role=p.atk.includes('revive')?5:p.atk.includes('guard')?(p.positions.includes(1)?1:5):p.positions[0];
  return {...p,schemaVersion:4,id,characterId:'atelier-'+id,slug:'V4_'+id,output:'KALISTAR_V4_'+id,text:p.description,color:base.color,hue:base.hue,weapon_index:weapon.weapon_index,role,sentry:true,canGuard:p.atk.includes('guard'),canHeal:p.atk.includes('revive'),advantage:base.advantage??30,disadvantage:base.disadvantage??30,source:'Atelier V4',visual_revision:'V4-designer-1'};
}
function status(id){return read(path.join(folder(id),'status.json'));}
function setStatus(id,state,extra={}){const file=path.join(folder(id),'status.json');const prior=fs.existsSync(file)?read(file):{id,createdAt:new Date().toISOString()};const next={...prior,...extra,state,updatedAt:new Date().toISOString()};write(file,next);return next;}
function create(input,{testOnly=false}={}){
  if(!UUID.test(input.requestId||''))throw Error('Identifiant de creation invalide.');
  const p=validate(input.profile,{final:true}),requestFile=path.join(HOME,'requests',input.requestId+'.json');
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
  if(fs.existsSync(requestFile)){
    const prior=read(requestFile);if(prior.fingerprint!==fingerprint)throw Error('Cette demande correspond deja a une autre carte.');
    const saved=read(path.join(folder(prior.id),'request.json'));
    if(saved.requestId!==input.requestId||saved.card.id!==prior.modelId)throw Error('Reservation de creation incoherente.');
    const stateFile=path.join(folder(prior.id),'status.json');
    if(!fs.existsSync(stateFile))setStatus(prior.id,'queued',{message:'Creation reservee, reprise du suivi.'});
    return status(prior.id);
  }
  const taken=new Set(catalogue().cards.map(c=>c.id));const reservations=path.join(HOME,'requests');
  if(fs.existsSync(reservations))for(const f of fs.readdirSync(reservations)){if(f.endsWith('.json'))taken.add(read(path.join(reservations,f)).modelId);}
  let modelId;do{modelId=String(crypto.randomInt(40000043,50000000));}while(taken.has(modelId));
  const id=crypto.randomUUID(),dir=folder(id);fs.mkdirSync(dir,{recursive:true});
  write(path.join(dir,'request.json'),{id,requestId:input.requestId,profile:p,card:profileCard(p,modelId),referenceId:baseline().id,...(testOnly?{testOnly:true}:{})});
  // A recoverable job is queued only after its idempotency reservation exists.
  write(requestFile,{id,modelId,fingerprint});return setStatus(id,'queued',{message:'Carte en attente de composition.'});
}
async function publish(id){
  const dir=folder(id),s=status(id),request=read(path.join(dir,'request.json'));
  if(request.testOnly)throw Error('Une carte de controle ne peut pas etre publiee.');
  if(s.state==='published')return s.result;
  if(s.state!=='verified')throw Error('La carte doit etre verifiee avant publication.');
  const verification=read(path.join(dir,'verification.json'));
  if(!verification.passed || verification.modelId!==request.card.id)throw Error('Controle incomplet.');
  if(await L.hash(path.join(dir,'request.json'))!==verification.requestHash)throw Error('La fiche a change depuis sa verification.');
  for(const name of ['card.png','card.psd']) if(await L.hash(path.join(dir,name))!==verification.hashes[name])throw Error('Le rendu a change depuis sa verification.');
  const cat=catalogue(),prior=cat.cards.find(c=>c.id===request.card.id);
  if(prior && prior.creationJob!==id)throw Error('Cet identifiant appartient deja a une autre carte.');
  await require('./game-catalog.cjs').buildCatalog({published:[...cat.cards.filter(c=>c.kind==='created'&&c.id!==request.card.id),{id:request.card.id,profile:request.card,pngUrl:'/media/created/'+request.card.id+'.png',psdUrl:'/media/created/'+request.card.id+'.psd'}]});
  const rel='V4/creations/'+request.card.id,target=path.join(ROOT,rel);
  // The index is the commit point: a partial staging directory never enters the game.
  if(!fs.existsSync(target)){
    const stage=path.join(ROOT,'V4/creations','.staging-'+id);fs.mkdirSync(stage,{recursive:true});
    for(const name of ['card.png','card.psd','verification.json'])fs.copyFileSync(path.join(dir,name),path.join(stage,name));
    if(fs.existsSync(path.join(dir,'illustration.png')))fs.copyFileSync(path.join(dir,'illustration.png'),path.join(stage,'illustration.png'));
    write(path.join(stage,'profile.json'),request.card);write(path.join(stage,'creation.json'),{job:id,createdAt:new Date().toISOString()});fs.renameSync(stage,target);
  }else if(read(path.join(target,'creation.json')).job!==id)throw Error('Dossier de carte deja utilise.');
  for(const name of ['card.png','card.psd'])if(await L.hash(path.join(target,name))!==verification.hashes[name])throw Error('Copie de publication incomplete.');
  const entry={id:request.card.id,kind:'created',creationJob:id,name:request.card.name,title:request.card.title,element:request.card.element,profile:request.card,png:rel+'/card.png',psd:rel+'/card.psd',pngUrl:'/media/created/'+request.card.id+'.png',psdUrl:'/media/created/'+request.card.id+'.psd',createdAt:new Date().toISOString()};
  if(!prior)cat.cards.push(entry);write(CATALOGUE,cat);
  const result={...entry,gameUrl:'/jeu/#collection'};setStatus(id,'published',{message:'Carte ajoutee a la collection V4.',result});return result;
}
module.exports={HOME,CATALOGUE,UUID,FIELDS,options,defaults,validate,catalogue,initialize,folder,draftList,saveDraft,profileCard,status,setStatus,create,publish};
