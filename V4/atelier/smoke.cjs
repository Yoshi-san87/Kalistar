const L=require('./lib.cjs');
const {fs,path,DATA,read,write,assert}=L;
(async()=>{
  const {url}=read(path.join(DATA,'runtime.json'));
  const boot=await (await fetch(url+'/api/bootstrap')).json();
  assert.equal(boot.gate.passed,true,'Toutes les references du registre courant doivent etre conformes.');
  const headers={'Content-Type':'application/json',Origin:url,'X-Atelier-Token':boot.token};
  async function post(route,input){const response=await fetch(url+route,{method:'POST',headers,body:JSON.stringify(input)});const value=await response.json();assert.ok(response.ok,JSON.stringify(value));return value;}
  const entry=L.baseline().cards.find(c=>c.key==='momo');
  const upload=await post('/api/uploads',{base64:fs.readFileSync(L.inside(L.ROOT,entry.card.art)).toString('base64')});
  const profile={...L.editable(entry.card),name:'MOMO ATELIER',title:'ESSAI ATELIER',job:'ARTISTE',
    description:'Au milieu des rebuts de Chroma, Momo joue pour ceux que la ville a oublies. Sa flute eveille une lumiere dans la ferraille. La musique reprend.',
    positions:[1,2,3,4,5],atk:[210,'mana','retry','buff_atk','mana',42],magic:[6,1],
    defense:[200,167,130,100,59,11],barriers:[6,5,4,2]};
  const draft=await post('/api/drafts',{key:entry.key,profile,upload:upload.id});
  const job=await post('/api/jobs',{key:entry.key,profile,upload:upload.id});
  console.log('Brouillon de verification '+job.id);
  for(;;){
    const status=await (await fetch(url+'/api/jobs/'+job.id)).json();
    if(['failed','verified'].includes(status.state)){
      const report={passed:status.state==='verified',job:job.id,draft:draft.id,checkedAt:new Date().toISOString(),message:status.message,
        cases:['native text','description wrapping','numeric stats','calibrated effects','magic and barrier toggles','five positions','imported artwork','fixed-layer audit','fixed-frame pixels','outside-component pixels','PSD reopen','barcode','protected source hashes']};
      write(path.join(DATA,'smoke-latest.json'),report);console.log(JSON.stringify(report,null,2));
      assert.equal(report.passed,true,status.message);break;
    }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
