const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const r=path.resolve(__dirname,'..');
const icons=['ROBOT','FALCO','SIRENA','DRAX','HUMAIN','AURELION','NAIN','CARNIVERT','VAMP','SKULLZ','RHINOZ','retry','mana','revive','death','dodge'];
const factions=['Chroma','Nestown','Thalassea','Vulkar','Niveria','Solaria','Durane','Arborium','Draevenheim','Cryptown','Zarok','Z13'];
async function split(file,names,rows,kind){
 const m=await sharp(file).metadata();if(!m.hasAlpha)throw new Error('No real alpha: '+file);
 const proof=[];
 for(let i=0;i<names.length;i++){
  const x=Math.round(i%4*m.width/4),y=Math.round(Math.floor(i/4)*m.height/rows),w=Math.round((i%4+1)*m.width/4)-x,h=Math.round((Math.floor(i/4)+1)*m.height/rows)-y;
  const buf=await sharp(file).extract({left:x,top:y,width:w,height:h}).png().toBuffer();
  const folder=kind==='flags'?'factions':i<11?'races':'effets';
  const dest=path.join(r,'assets',folder,names[i]+'.png');
  const trimmed=await sharp(buf).trim({threshold:15}).png().toBuffer();
  await sharp(trimmed).resize(kind==='flags'?164:200,kind==='flags'?330:200,{fit:'contain',background:'#00000000'}).png().toFile(dest);
  const stats=await sharp(dest).stats();if(stats.channels[3].min!==0||stats.channels[3].max!==255)throw new Error('Bad alpha '+names[i]);
  const thumb=await sharp(dest).resize(kind==='flags'?110:126,kind==='flags'?220:126,{fit:'contain',background:'#00000000'}).png().toBuffer();
  proof.push({input:thumb,left:15+(i%4)*(kind==='flags'?145:160),top:15+Math.floor(i/4)*(kind==='flags'?245:150)});
 }
 await sharp({create:{width:kind==='flags'?595:650,height:rows*(kind==='flags'?245:150)+15,channels:3,background:'#15232e'}}).composite(proof).jpeg({quality:94}).toFile(path.join(r,'verification',kind+'_detoures.jpg'));
}
(async()=>{
 await split(path.join(r,'assets/effets/icones_atlas_v2_subject.png'),icons,4,'icons');
 await split(path.join(r,'assets/factions/atlas_v2_subject.png'),factions,3,'flags');
 console.log('16 alpha icons and 12 alpha banners sliced and scaled without distortion.');
})().catch(e=>{console.error(e);process.exit(1)});

