const L=require('./lib.cjs');
const D=require('./designer-core.cjs');
const R=require('./designer-render.cjs');
const {fs,path,write,read,assert}=L;
const output=path.join(D.HOME,'verification');
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const base={...D.defaults(),name:'ESSAI ATELIER',title:'LE TEMPLATE V4',job:'ARTISTE',description:'Une carte de controle du template Kalistar. Les valeurs, les effets et les positions restent independants de son illustration.',positions:[1,2,3,4,5]};
  if(process.argv.includes('--native')){
    const element=process.argv.find(a=>a.startsWith('--element='))?.slice(10)||'ELECTRO';
    const upload=L.crypto.randomUUID(),imagePath=path.join(L.DATA,'uploads',upload+'.png');
    fs.copyFileSync(path.join(L.ROOT,'V4/assets/illustrations/42_ELECTRO_RIKKA_V4_02_VITRINE_FRONTALE.png'),imagePath);
    if(element==='HYDRO'){
      const {data,info}=await L.sharp(imagePath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      for(let i=3;i<data.length;i+=4)data[i]=Math.round(data[i]*.7);
      const transparent=await L.sharp(data,{raw:info}).png().toBuffer();fs.writeFileSync(imagePath,transparent);
    }
    const profile={...base,element,upload,crop:{zoom:1.45,x:.25,y:-.15},atk:[element==='NONE'?'death':250,'revive','guard','retry','buff_atk','mana'],defense:['dodge',200,'retry',100,50,25],magic:element==='NONE'?[]:[6],barriers:element==='NONE'?[]:[5,3]};
    if(element==='HYDRO')Object.assign(profile,{name:'GARDIEN DES MAREES LOINTAINES',title:'LE SERMENT DES VAGUES ET DES COURANTS OUBLIES',job:'GARDIEN DES ABYSSES',description:'Sous les vagues\u00a0: le gardien retrouve les courants oublies. Sa carte verifie les longs libelles et une illustration transparente.'});
    const job=D.create({requestId:L.crypto.randomUUID(),profile},{testOnly:true});
    write(path.join(output,'native-job.json'),{id:job.id});
    const result=await R.execute(job.id,{publish:false});assert.equal(result.state,'verified');
    write(path.join(output,'native-verification-'+element+'.json'),read(path.join(D.folder(job.id),'verification.json')));
    console.log(JSON.stringify({id:job.id,state:result.state,published:false,path:D.folder(job.id)}));return;
  }
  const m=read(path.join(R.ASSETS,'manifest.json')),results=[];
  for(const element of Object.keys(m.elements)){
    if(!m.stats.atk[element])continue;
    const profile={...base,element,race:'SIRENA',weapon:'Gun',faction:'Thalassea',magic:element==='NONE'?[]:[6,3],barriers:element==='NONE'?[]:[5,2]};
    try{const buffer=await R.preview(profile);await L.sharp(buffer).png().toFile(path.join(output,element+'.png'));results.push({element,passed:true});}
    catch(e){results.push({element,passed:false,error:e.message});}
  }
  write(path.join(output,'preview-verification.json'),results);console.log(JSON.stringify(results));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
