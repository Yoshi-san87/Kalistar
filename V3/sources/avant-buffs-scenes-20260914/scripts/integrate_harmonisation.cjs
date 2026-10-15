const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'assets/revisions-20260914');
const recordFile=path.join(root,'donnees/harmonisation_integration_20260914.json');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const protectedSlugs=['01_ELECTRO_MOMO','02_AERO_CANA','06_LUXO_AELIS','10_NECRO_ZVIRI','13_ELECTRO_TAULIO','14_ELECTRO_MOMO_CARILLON','28_NECRO_VOLODEN'];
async function main(){
 const files=process.argv.slice(2);
 const record=fs.existsSync(recordFile)?JSON.parse(fs.readFileSync(recordFile,'utf8')):{revision:'20260914',assets:{},contracts:{},protected:{}};
 const auditFile=path.join(root,'verification/harmonisation-static-audit.json');
 const audited=fs.existsSync(auditFile)?JSON.parse(fs.readFileSync(auditFile,'utf8')).snapshot.file_sha256:{};
 for(const file of ['donnees/cartes.json','donnees/armes.json','donnees/elements.json','donnees/regles.json','donnees/regles_demo.json','donnees/decks_demo.json','donnees/arenes.json',
  'site/data.js','site/engine.js','site/local-db.js','site/app.js','site/catalogue.js','site/match-report.js','site/combat-effects.js','site/duel-focus.js','site/dice-view.js']){
  if(!record.contracts[file])record.contracts[file]=audited[file]||hash(path.join(root,file));
  if(hash(path.join(root,file))!==record.contracts[file])throw new Error('Gameplay/data contract changed before integration: '+file);
 }
 if(!Object.keys(record.protected).length){
  for(const slug of protectedSlugs)record.protected[slug]=hash(path.join(root,'assets/illustrations',slug+'.png'));
 }
 for(const rel of files){
  if(!/^(illustrations|races|armes|cristaux|effets)\/[A-Za-z0-9_]+\.png$/.test(rel))throw new Error('Invalid asset path: '+rel);
  if(protectedSlugs.some(slug=>rel==='illustrations/'+slug+'.png'))throw new Error('Protected illustration: '+rel);
  const src=path.join(stage,rel),dest=path.join(root,'assets',rel),m=await sharp(src).metadata();
  if(!rel.startsWith('illustrations/')){
   if(!m.hasAlpha)throw new Error('Missing alpha: '+rel);
   const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   for(const p of [0,info.width-1,info.width*(info.height-1),info.width*info.height-1])
    if(data[p*4+3]>1)throw new Error('Opaque corner: '+rel);
  }
  fs.copyFileSync(src,dest);
  record.assets[rel]={sha256:hash(dest),width:m.width,height:m.height,integratedAt:new Date().toISOString()};
 }
 for(const [file,expected] of Object.entries(record.contracts))if(hash(path.join(root,file))!==expected)throw new Error('Gameplay/data contract changed: '+file);
 for(const [slug,expected] of Object.entries(record.protected))if(hash(path.join(root,'assets/illustrations',slug+'.png'))!==expected)throw new Error('Protected art changed: '+slug);
 fs.writeFileSync(recordFile,JSON.stringify(record,null,2));
 console.log('Integrated '+files.length+' assets; total '+Object.keys(record.assets).length+'. Gameplay/data and 7 illustrations unchanged.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
