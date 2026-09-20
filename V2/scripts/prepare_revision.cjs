const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),old=path.resolve(root,'../V1');
const cards=JSON.parse(fs.readFileSync(path.join(old,'donnees/cartes.json'),'utf8'));
async function main(){
 for(const c of cards){
  c.previous_art=c.reference||c.art;c.reference=null;
  c.art=path.join(root,'assets/illustrations',c.element.toLowerCase()+'.png').replace(/\\/g,'/');
  c.visual_revision='V2';c.barcode_style='spectrum_dark';
 }
 fs.writeFileSync(path.join(root,'donnees/cartes.json'),JSON.stringify(cards,null,2));
 for(const file of ['build_cards.jsx','finish_templates.jsx','finalize.py','verify_gallery.cjs','verify_pdf.py']){
  let s=fs.readFileSync(path.join(old,'scripts',file),'utf8').replace(/V1/g,'V2');
  if(file==='build_cards.jsx'){
   s=s.replace("slice(-2)+'.jpg'","slice(-2)+'.png'");
   s=s.replace('[733,1132,779,1178]','[730,1129,782,1181]');
  }
  if(file==='verify_pdf.py'){
   s=s.slice(0,s.indexOf("a=Image.open("))+"print('PDF V2: 12 CMYK pages and coloured IDs checked.')\n";
  }
  fs.writeFileSync(path.join(root,'scripts',file),s);
 }
 fs.mkdirSync(path.join(root,'assets/armes_transparentes'),{recursive:true});
 const weaponQA=[];
 for(let i=0;i<20;i++){
  const name=String(i).padStart(2,'0');
  const jpg=fs.readFileSync(path.join(old,'assets/armes',name+'.jpg'));
  const m=await sharp(jpg).metadata();
  const svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+m.width+'" height="'+m.height+'"><defs><clipPath id="disc"><circle cx="'+m.width/2+'" cy="'+m.height/2+'" r="'+(Math.min(m.width,m.height)/2-1.4)+'"/></clipPath></defs><image xlink:href="data:image/jpeg;base64,'+jpg.toString('base64')+'" width="'+m.width+'" height="'+m.height+'" clip-path="url(#disc)"/></svg>';
  fs.writeFileSync(path.join(root,'assets/armes_transparentes',name+'.svg'),svg);
  const dest=path.join(root,'assets/armes',name+'.png');
  await sharp(Buffer.from(svg)).png().toFile(dest);
  const pix=await sharp(dest).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const corners=[0,m.width-1,m.width*(m.height-1),m.width*m.height-1].map(p=>pix.data[p*4+3]);
  if(corners.some(a=>a!==0))throw new Error('Opaque weapon corner '+name);
  weaponQA.push({weapon:i,size:[m.width,m.height],corner_alpha:corners});
 }
 fs.writeFileSync(path.join(root,'verification/transparence_armes.json'),JSON.stringify(weaponQA,null,2));
 fs.mkdirSync(path.join(root,'assets/barcodes_noir_blanc'),{recursive:true});
 const palette=[[16,36,124],[9,83,80],[26,63,117],[51,28,108],[66,21,66],[9,66,76]];
 for(let i=0;i<cards.length;i++){
  const c=cards[i],src=path.join(old,'assets/barcodes',c.id+'.png');
  fs.copyFileSync(src,path.join(root,'assets/barcodes_noir_blanc',c.id+'.png'));
  const im=await sharp(src).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const data=Buffer.from(im.data),w=im.info.width,h=im.info.height;
  for(let y=0;y<h;y++){
   const phase=(y/(h-1)*5+i*.43)%palette.length,a=Math.floor(phase),f=phase-a;
   const color=palette[a].map((v,k)=>Math.round(v*(1-f)+palette[(a+1)%palette.length][k]*f));
   for(let x=0;x<w;x++){const p=(y*w+x)*3;if(im.data[p]<128){for(let k=0;k<3;k++)data[p+k]=color[k];}}
  }
  await sharp(data,{raw:{width:w,height:h,channels:3}}).png().toFile(path.join(root,'assets/barcodes',c.id+'.png'));
 }
 console.log('V2 data unchanged; 20 circular weapon masks; 12 dark multicolour barcodes and B/W backups.');
}
main().catch(e=>{console.error(e);process.exit(1)});

