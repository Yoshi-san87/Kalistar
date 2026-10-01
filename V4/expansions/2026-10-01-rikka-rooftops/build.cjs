'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs'), R = require('../../atelier/designer-render.cjs');
const M = require('./model.cjs'), guard = require('./guard.cjs');
const T = require('../2026-10-01-one-piece/typography.cjs');
const G = require('../2026-09-24-royal-training/geometry.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT,DATA,crypto} = L;
const home = __dirname, file = n => path.join(home,n), out = file('cards/'+M.KEY);
const relative = f => path.relative(ROOT,f).replaceAll('\\','/');
const set = () => M.validateSet(read(file('set.json')));
async function hashes(files) {const result={};for(const f of files)result[relative(f)]=await hash(f);return result;}
const shared = [
  'V4/atelier/data/references.json','V4/atelier/data/regression.json','V4/atelier/designer-assets/manifest.json',
  'V4/atelier/lib.cjs','V4/atelier/designer-core.cjs','V4/atelier/designer-render.cjs','V4/atelier/game-catalog.cjs',
  'V4/atelier/barcode.py','V4/atelier/designer-barcode.py','V4/site/engine.js','V4/site/collaborations.js',
  'V4/template-stable/icon-layouts.json','V4/scripts/stable/elements-common.jsx',
  'V4/collaborations/nier-pilot-01/build.cjs','V4/collaborations/nier-pilot-01/typography.cjs',
  'V4/collaborations/nier-pilot-01/typography.jsx','V4/collaborations/ff8-set-01/build.cjs',
  'V4/expansions/2026-10-01-one-piece/compose-one.jsx','V4/expansions/2026-10-01-one-piece/typography.cjs',
  'V4/expansions/2026-09-24-royal-training/geometry.cjs','V4/expansions/2026-09-24-royal-training/model.cjs',
  'V4/expansions/2026-09-27-metal-gear-mines/model.cjs','V4/expansions/2026-09-27-metal-gear-mines/publication-core.cjs',
  'V3/donnees/regles_demo.json','V3/donnees/armes.json'
];
function sources() {
  const own = ['set.json','model.cjs','model.test.cjs','guard.cjs','guard.test.cjs','native.test.cjs',
    'build.cjs','compose.jsx','render.ps1','publish.cjs','allowed-changes.json','README.md','approved-art.json'];
  own.push(...fs.readdirSync(home).filter(n=>/^prompt.*\.json$/.test(n)));
  return own.map(file).concat(shared.map(f=>path.join(ROOT,f)),
    [guard.policy().baseline,guard.policy().statsPlan].map(f=>path.join(ROOT,f)),[path.join(ROOT,M.artPath(set().cards[0]))],
    read(file('approved-art.json')).references.map(r=>path.join(ROOT,r.path)));
}
async function stable() {await L.protectedCheck();await R.verifyAssets();return guard.preservation();}
async function locked(action,lock=path.join(DATA,'render.lock')) {
  const owner={id:crypto.randomUUID(),pid:process.pid,kind:M.SET};let fd;
  try {fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify(owner));return await action();}
  finally {if(fd!==undefined){fs.closeSync(fd);if(read(lock).id===owner.id)fs.unlinkSync(lock);}}
}
async function check() {set();return stable();}
async function game() {
  const spec = set().cards[0], p = M.profile(spec,D), cat = D.catalogue();
  const published = cat.cards.filter(c=>c.kind==='created'&&c.id!==M.ID).concat({id:M.ID,profile:p,pngUrl:'/media/created/'+M.ID+'.png'});
  const data = await require('../../atelier/game-catalog.cjs').buildCatalog({published});
  return {data,proof:M.validateGame(data,set(),require('../../site/engine.js').createEngine)};
}
async function freeze() {
  assert(!fs.existsSync(file('dependencies.json')),'Never replace an existing input freeze');
  const spec=set().cards[0], selected=read(file('approved-art.json'));
  assert.equal(selected.parentReview,'passed');assert.equal(selected.userApprovalClaimed,false);
  assert.equal(selected.revision,4,'Wait for final image 04');assert.equal(selected.path,M.artPath(spec));
  assert.equal(await hash(path.join(ROOT,selected.path)),selected.sha256);
  assert.equal(await hash(file(selected.promptFile)),selected.promptSha256);
  for(const r of selected.references)assert.equal(await hash(path.join(ROOT,r.path)),r.sha256);
  const meta=await sharp(path.join(ROOT,selected.path)).metadata();assert.deepEqual([meta.width,meta.height],[1122,1402]);
  await stable();await game();
  assert(!D.catalogue().cards.some(c=>c.id===M.ID));assert(!fs.existsSync(path.join(ROOT,'V4/creations',M.ID)));
  const requests=path.join(DATA,'designer/requests');
  if(fs.existsSync(requests))for(const n of fs.readdirSync(requests).filter(n=>n.endsWith('.json')))assert.notEqual(read(path.join(requests,n)).modelId,M.ID);
  write(file('dependencies.json'),await hashes(sources()));
  await guard.dependencies();return {frozen:M.ID,art:selected.path,preservation:await stable()};
}
async function prepare() {return locked(async()=>{
  await guard.dependencies();await stable();assert(!fs.existsSync(path.join(out,'preparation.json')),'Preserve previous attempts before reprepare');
  const spec=set().cards[0], p=M.profile(spec,D), donor=M.donor(spec,D), art=path.join(ROOT,M.artPath(spec));
  const render=path.join(out,'render');fs.mkdirSync(render,{recursive:true});
  const layers=await R.components(donor,{id:M.ID,positionsText:true});
  layers[0]={...layers[0],left:layers[0].left+spec.nativePlacement.x,
    top:layers[0].top+spec.nativePlacement.y,input:await G.cropArt(sharp,art,p.crop)};
  write(path.join(out,'profile.json'),p);fs.copyFileSync(art,path.join(out,'illustration.png'));
  await sharp(await R.composite(layers)).composite(await T.preview(donor,R)).png().toFile(path.join(out,'preview.png'));
  const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
  const native=layers.filter(l=>!l.name.startsWith('POSITION SLOT '));
  for(const [i,l]of native.entries()){
    const name='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(path.join(render,name));
    plan.layers.push({file:name,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
  }
  write(path.join(render,'composition.json'),plan);
  await sharp(await R.composite(native)).png().toFile(path.join(render,'expected-components.png'));
  const generated=['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>path.join(out,n))
    .concat(plan.layers.map(l=>path.join(render,l.file)),[file('dependencies.json')]);
  write(path.join(out,'preparation.json'),{referenceId:L.baseline().id,inputs:await hashes(generated)});
  await guard.preparation();return {prepared:M.ID,crop:p.crop,preview:relative(path.join(out,'preview.png'))};
},file('prepare.lock'));}
async function render() {
  assert.equal(process.env.KALISTAR_RIKKA_PHOTOSHOP_HANDSHAKE,'2026-10-01','Wait for parent Photoshop slot');
  return locked(async()=>{
    await stable();await guard.preparation();assert(!fs.existsSync(path.join(out,'card.psd')),'Do not overwrite a native attempt');
    write(file('render-request.json'),{keys:[M.KEY]});
    const output=await R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
      ['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
    await guard.preparation();await stable();return {rendered:M.ID,output};
  });
}
async function verify() {return locked(async()=>{
  await stable();await guard.preparation();const spec=set().cards[0], p=read(path.join(out,'profile.json'));M.validateProfile(p,spec);
  const proof=await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(out,p), n=read(path.join(out,'render/native.json'));
  assert.equal(n.photoshop,'26.11.7');T.verify(n);
  const desc=n.layers.find(l=>l.name==='DESCRIPTION');assert(desc.text.split('\r').length<=4,'Description must remain within four lines');
  const plan=read(path.join(out,'render/composition.json'));
  for(const component of plan.layers){
    const layer=n.layers.find(l=>l.name===component.name);
    assert.deepEqual(layer.bounds,[component.left,component.top,component.left+component.width,component.top+component.height]);
  }
  assert(!plan.layers.some(l=>/guard|revive|BARRIERE/.test(l.name)));
  assert(plan.layers.some(l=>l.name==='ATK D5 - HALO MAGIQUE'));
  assert(plan.layers.some(l=>l.name==='DEF D6 - effet dodge')&&plan.layers.some(l=>l.name==='DEF D1 - effet retry'));
  await guard.preparation();await stable();
  const result={...proof,preparationHash:await hash(path.join(out,'preparation.json')),typography:true,descriptionLines:desc.text.split('\r').length};
  write(path.join(out,'verification.json'),result);
  await sharp(path.join(out,'card.png')).resize({width:300}).png().toFile(path.join(out,'small.png'));
  await game();return result;
});}
async function delivery() {
  await stable();await guard.preparation(true);const {proof,data}=await game();
  const report={status:'native-verified-awaiting-parent-preview',id:M.ID,gameCards:data.cards.length,game:proof,
    preservation:await guard.preservation(),native:read(path.join(out,'verification.json')),art:read(file('approved-art.json'))};
  write(file('delivery.json'),report);return report;
}
module.exports={check,freeze,prepare,render,verify,delivery,game,stable,sources};
if(require.main===module){const action=process.argv[2];assert(['check','freeze','prepare','render','verify','delivery'].includes(action));
  module.exports[action]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});}
