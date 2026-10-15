const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json'),'utf8'));
const palette=[[16,36,124],[9,83,80],[26,63,117],[51,28,108],[66,21,66],[9,66,76]];
async function main(){
 for(let i=12;i<cards.length;i++){
  const id=cards[i].id;
  const bw=path.join(root,'assets/barcodes_noir_blanc',id+'.png');
  await sharp(path.join(root,'assets/barcodes',id+'.svg')).png().toFile(bw);
  const {data,info}=await sharp(bw).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const out=Buffer.from(data),w=info.width,h=info.height;
  for(let y=0;y<h;y++){
   const phase=(y/(h-1)*5+i*.43)%6,a=Math.floor(phase),f=phase-a;
   const color=palette[a].map((v,k)=>Math.round(v*(1-f)+palette[(a+1)%6][k]*f));
   for(let x=0;x<w;x++){const p=(y*w+x)*3;if(data[p]<128)for(let k=0;k<3;k++)out[p+k]=color[k];}
  }
  await sharp(out,{raw:{width:w,height:h,channels:3}}).png().toFile(path.join(root,'assets/barcodes',id+'.png'));
 }
 for(const name of ['buff_atk','shield_physical']){
  const m=await sharp(path.join(root,'assets/effets',name+'.png')).metadata();
  console.log(name,m.width,m.height,'alpha',m.hasAlpha);
 }
 fs.writeFileSync(path.join(root,'donnees/build_config.json'),JSON.stringify({ids:cards.slice(12).map(c=>c.id)},null,2));
 console.log('8 coloured barcodes ready. Build selects IDs 13-20.');
}
main().catch(e=>{console.error(e);process.exit(1)});
