const http=require('node:http');
const L=require('./lib.cjs');
const R=require('./runner.cjs');
const {fs,path,crypto,ROOT,DATA,read,write,baseline,jobDir,ID}=L;
const PUBLIC=path.join(__dirname,'public');
function makeServer(){
  const ref=baseline(),token=crypto.randomBytes(32).toString('hex');
  let origin,queue=[],running=false,integrity={state:'checking'},lastCheck=0;
  const entry=key=>{const c=ref.cards.find(c=>c.key===key);if(!c)throw Error('Modele introuvable.');return c;};
  async function check(){
    try{const count=await L.protectedCheck(ref);integrity={state:'intact',count,checkedAt:new Date().toISOString()};}
    catch(e){integrity={state:'changed',message:e.message};}
    lastCheck=Date.now();return integrity;
  }
  function jobs(){
    const dir=path.join(DATA,'jobs');if(!fs.existsSync(dir))return [];
    return fs.readdirSync(dir).filter(id=>ID.test(id)).map(id=>{
      try{const s=read(path.join(jobDir(id),'status.json'));const p=path.join(jobDir(id),'progress.json');if(fs.existsSync(p)&&!['verified','failed'].includes(s.state))try{s.progress=read(p);}catch{}return s;}catch{return null;}
    }).filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,30);
  }
  async function gate(){
    const p=path.join(DATA,'regression.json');if(!fs.existsSync(p))return {passed:false};
    const r=read(p);return {passed:r.passed&&r.referenceId===ref.id&&r.rendererHash===await L.rendererHash(),count:r.results.filter(v=>v.passed).length,total:r.results.length,checkedAt:r.checkedAt};
  }
  async function pump(){
    if(running||!queue.length||fs.existsSync(path.join(DATA,'render.lock')))return;
    running=true;try{await R.execute(queue.shift());}finally{running=false;}
  }
  const timer=setInterval(()=>{pump().catch(()=>{});if(Date.now()-lastCheck>60000&&!running)check();},2500);timer.unref();
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  async function body(req,max=12000000){
    if(!String(req.headers['content-type']).startsWith('application/json'))throw Error('JSON requis.');
    let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('Envoi trop volumineux.');chunks.push(chunk);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  function file(res,file,mime,download){
    if(!fs.existsSync(file)){json(res,404,{error:'Fichier absent.'});return;}
    const headers={'Content-Type':mime,'Content-Length':fs.statSync(file).size,'Cache-Control':'no-store'};
    if(download)headers['Content-Disposition']='attachment; filename="'+download+'"';
    res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
  }
  const designer=require('./designer-api.cjs').makeDesigner({token,json,file,body,getIntegrity:()=>integrity});
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    const stylePolicy=req.url.startsWith('/jeu/')?"'self' 'unsafe-inline'":"'self'";
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src "+stylePolicy+"; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
    if(req.headers.host!==new URL(origin).host||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'Acces local uniquement.'});
    if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Methode interdite.'});
    if(req.method==='POST'&&(req.headers.origin!==origin||req.headers['x-atelier-token']!==token))return json(res,403,{error:'Session non autorisee.'});
    try{
      const url=new URL(req.url,origin),p=url.pathname;
      if(await designer.handle(req,res,p))return;
      if(req.method==='GET'){
        if(p==='/api/bootstrap')return json(res,200,{token,referenceId:ref.id,integrity,gate:await gate(),cards:ref.cards.map(c=>({key:c.key,profile:L.editable(c.card),element:c.card.element,race:c.card.race,weapon:c.card.weapon,faction:c.card.faction,modelId:c.card.id,options:c.options,preview:'/media/reference/'+c.key+'.png'}))});
        if(p==='/api/status')return json(res,200,{integrity,gate:await gate(),jobs:jobs()});
        if(p==='/api/drafts'){
          const dir=path.join(DATA,'drafts');const drafts=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).map(f=>read(path.join(dir,f))):[];
          return json(res,200,drafts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
        }
        let m=p.match(/^\/media\/reference\/([a-z0-9-]+)\.png$/);
        if(m)return file(res,path.join(ROOT,entry(m[1]).png),'image/png');
        m=p.match(/^\/media\/upload\/([a-f0-9-]{36})\.png$/);
        if(m&&ID.test(m[1]))return file(res,path.join(DATA,'uploads',m[1]+'.png'),'image/png');
        m=p.match(/^\/api\/jobs\/([a-f0-9-]{36})$/);
        if(m){const dir=jobDir(m[1]);return json(res,200,{...read(path.join(dir,'status.json')),request:read(path.join(dir,'request.json')).items.map(i=>({key:i.key,profile:L.editable(i.card),upload:i.upload}))});}
        m=p.match(/^\/exports\/([a-f0-9-]{36})\/(card\.png|card\.psd|profile\.json|verification\.json)$/);
        if(m){const dir=jobDir(m[1]),s=read(path.join(dir,'status.json')),job=read(path.join(dir,'request.json'));if(s.state!=='verified'||job.kind!=='draft')return json(res,409,{error:'Export non valide.'});
          const folder=path.join(dir,job.items[0].key);
          if(m[2]==='profile.json')return json(res,200,job.items[0].card);
          const ext=path.extname(m[2]);return file(res,path.join(folder,m[2]),ext==='.png'?'image/png':ext==='.psd'?'image/vnd.adobe.photoshop':'application/json',ext==='.psd'?'KALISTAR_BROUILLON_'+m[1]+'.psd':null);
        }
        const publicFiles={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
        if(p==='/lucide.js')return file(res,path.join(ROOT,'V3/site/assets/lucide.min.js'),'text/javascript');
        if(publicFiles[p])return file(res,path.join(PUBLIC,publicFiles[p]),p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');
        return json(res,404,{error:'Route absente.'});
      }
      if(p==='/api/integrity')return json(res,200,await check());
      const input=await body(req);
      if(p==='/api/drafts'){
        const c=entry(input.key),card=L.validatePatch(c,input.profile);
        if(input.upload&&(!ID.test(input.upload)||!fs.existsSync(path.join(DATA,'uploads',input.upload+'.png'))))throw Error('Illustration absente.');
        const id=input.id||crypto.randomUUID();if(!ID.test(id))throw Error('Brouillon invalide.');
        const target=path.join(DATA,'drafts',id+'.json');let revision=0;
        if(fs.existsSync(target)){const prior=read(target);if(prior.revision!==input.revision)return json(res,409,{error:'Brouillon modifie dans une autre fenetre. Recharge-le avant de sauvegarder.'});revision=prior.revision;}
        const draft={id,key:c.key,profile:L.editable(card),upload:input.upload||null,revision:revision+1,updatedAt:new Date().toISOString()};write(target,draft);return json(res,200,draft);
      }
      if(p==='/api/uploads'){
        if(typeof input.base64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64))throw Error('Image invalide.');
        const buffer=Buffer.from(input.base64,'base64');if(buffer.length>8000000)throw Error('Image limitee a 8 Mo.');
        const pipeline=L.sharp(buffer,{limitInputPixels:24000000}),meta=await pipeline.metadata();
        if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)!==1||meta.width<128||meta.height<128)throw Error('PNG, JPEG ou WebP fixe, au moins 128 pixels.');
        const id=crypto.randomUUID(),target=path.join(DATA,'uploads',id+'.png');fs.mkdirSync(path.dirname(target),{recursive:true});
        await pipeline.rotate().toColourspace('srgb').png().toFile(target);return json(res,201,{id,url:'/media/upload/'+id+'.png'});
      }
      if(p==='/api/jobs'){
        if(queue.length>=5)return json(res,429,{error:'La file est pleine.'});
        if(integrity.state!=='intact')return json(res,409,{error:'Controle des references requis.'});
        if(!(await gate()).passed)return json(res,409,{error:'La reproduction des references du registre courant doit etre validee avant un brouillon.'});
        const c=entry(input.key);const id=await R.createJob('draft',c,input.profile,input.upload||null);queue.push(id);pump();return json(res,202,{id});
      }
      if(p==='/api/regression'){
        if(running||queue.length||fs.existsSync(path.join(DATA,'render.lock')))return json(res,409,{error:'Un rendu est deja en cours.'});
        const id=await R.createJob('regression');queue.push(id);pump();return json(res,202,{id});
      }
      return json(res,404,{error:'Route absente.'});
    }catch(e){json(res,e.statusCode||400,{error:e.message});}
  });
  server.setTimeout(30000);server.on('close',()=>{clearInterval(timer);designer.close();});
  return {server,setOrigin(value){origin=value;},check,recoverDesigner:()=>designer.recover()};
}
async function start(){
  fs.mkdirSync(DATA,{recursive:true});
  require('./designer-core.cjs').initialize();
  const lock=path.join(DATA,'server.lock');
  if(fs.existsSync(lock)){
    const old=read(lock);let alive=false;try{process.kill(old.pid,0);alive=true;}catch{}
    if(alive)throw Error('Un Atelier fonctionne deja.');fs.unlinkSync(lock);
  }
  const fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid}));fs.closeSync(fd);
  const app=makeServer();let port=Number(process.env.KALISTAR_PORT||4304);
  for(;;){
    app.setOrigin('http://127.0.0.1:'+port);
    try{await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(port,'127.0.0.1',()=>{app.server.removeListener('error',reject);resolve();});});break;}
    catch(e){if(e.code!=='EADDRINUSE'||port>=4324)throw e;port++;}
  }
  const url='http://127.0.0.1:'+port;write(path.join(DATA,'runtime.json'),{url,pid:process.pid,startedAt:new Date().toISOString()});console.log(url);
  process.on('exit',()=>{try{if(read(lock).pid===process.pid)fs.unlinkSync(lock);}catch{}});
  process.on('SIGINT',()=>app.server.close(()=>process.exit(0)));process.on('SIGTERM',()=>app.server.close(()=>process.exit(0)));
  await app.check();app.recoverDesigner();return app;
}
module.exports={makeServer,start};
if(require.main===module)start().catch(e=>{console.error(e);process.exitCode=1;});
