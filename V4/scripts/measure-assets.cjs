const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
async function metric(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let l=info.width,t=info.height,r=0,b=0,s=0,sx=0,sy=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3]/255;
  if(a>0){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1);}
  if(a>.25){s+=a;sx+=a*(x+.5);sy+=a*(y+.5);}
 }
 return {width:info.width,height:info.height,bounds:[l,t,r,b],centre:[(sx/s-l)/(r-l),(sy/s-t)/(b-t)]};
}
async function main(){
 const metrics={};
 for(const f of ['electricite.png','structure-basse.png'])metrics[f]=await metric(path.join(root,'assets',f));
 for(const f of ['retry','mana','revive','barrier'])metrics[f]=await metric(path.join(root,'../V3/assets/effets',f+'.png'));
 fs.writeFileSync(path.join(root,'donnees/metriques.json'),JSON.stringify(metrics,null,2));
 await sharp(path.join(root,'assets/structure-basse.png')).resize(765,370).png().toFile(path.join(root,'verification/structure-echelle-carte.png'));
 await sharp(path.join(root,'../V3/assets/factions/Chroma.png')).resize(492,990).png().toFile(path.join(root,'references/drapeau-detail.png'));
 console.log(JSON.stringify(metrics,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
