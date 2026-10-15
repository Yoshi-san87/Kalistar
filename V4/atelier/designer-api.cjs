const L=require('./lib.cjs');
const D=require('./designer-core.cjs');
const {fs,path,ROOT,DATA,read}=L;
const MIME={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
function makeDesigner({token,json,file,body,getIntegrity}){
  let queue=[],running=false,previewRunning=0,recoveryEnabled=false;
  const ready=()=>{const p=path.join(__dirname,'designer-assets/manifest.json');try{return ['ready','complete'].includes(read(p).status);}catch{return false;}};
  function alive(pid){if(!Number.isInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}}
  function recover(){
    recoveryEnabled=true;const lock=path.join(DATA,'render.lock');
    if(fs.existsSync(lock)){
      let owner;try{owner=read(lock);}catch{return;}
      if(owner.kind==='designer'&&!alive(owner.pid)&&!alive(owner.workerPid))fs.unlinkSync(lock);
      else return;
    }
    const jobs=path.join(D.HOME,'jobs');if(!fs.existsSync(jobs))return;
    for(const id of fs.readdirSync(jobs).filter(id=>D.UUID.test(id))){
      try{
        const request=read(path.join(D.folder(id),'request.json'));if(request.testOnly)continue;
        if(!D.UUID.test(request.requestId))throw Error('Reservation invalide.');
        const reservation=read(path.join(D.HOME,'requests',request.requestId+'.json'));
        if(reservation.id!==id||reservation.modelId!==request.card.id)throw Error('Reservation absente ou incoherente.');
        if(!fs.existsSync(path.join(D.folder(id),'status.json')))D.setStatus(id,'queued',{message:'Creation reservee, reprise apres interruption.'});
        const s=D.status(id);if(['queued','rendering','verified'].includes(s.state)&&!queue.includes(id)){
          if(s.state==='rendering')D.setStatus(id,'queued',{message:'Reprise apres redemarrage du service.'});queue.push(id);
        }
      }catch(e){
        L.write(path.join(D.folder(id),'status.json'),{id,state:'failed',message:'Travail incomplet apres interruption.',error:e.message,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      }
    }
  }
  async function pump(){
    if(recoveryEnabled&&!running&&!queue.length)recover();
    if(running||!queue.length||fs.existsSync(path.join(DATA,'render.lock')))return;
    running=true;const id=queue.shift();
    try{const state=D.status(id).state;if(state==='verified')await D.publish(id);else if(state!=='published')await require('./designer-render.cjs').execute(id);}
    catch(e){D.setStatus(id,'failed',{error:e.message,message:'Creation interrompue. Le catalogue est inchange.'});}
    finally{running=false;}
  }
  const timer=setInterval(()=>pump().catch(()=>{}),1000);timer.unref();
  async function handle(req,res,p){
    if(req.method==='GET'){
      if(p==='/api/designer/bootstrap'){
        json(res,200,{token,options:D.options(),defaults:D.defaults(),catalogue:D.catalogue().cards.map(({id,name,title,element,pngUrl,psdUrl,kind})=>({id,name,title,element,pngUrl,psdUrl,kind})),ready:ready(),error:ready()?null:'Preparation des composants du template en cours.'});return true;
      }
      if(p==='/api/designer/drafts'){json(res,200,D.draftList());return true;}
      if(p==='/api/game/catalogue'){
        const catalogue=D.catalogue();
        const result=await require('./game-catalog.cjs').buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
        json(res,200,result);return true;
      }
      let m=p.match(/^\/api\/designer\/jobs\/([a-f0-9-]{36})$/);
      if(m){json(res,200,D.status(m[1]));return true;}
      m=p.match(/^\/media\/created\/(4\d{7})\.(png|psd)$/);
      if(m){const c=D.catalogue().cards.find(c=>c.id===m[1]&&c.kind==='created');if(!c)throw Error('Carte introuvable.');file(res,path.join(ROOT,m[2]==='png'?c.png:c.psd),m[2]==='png'?'image/png':'image/vnd.adobe.photoshop',m[2]==='psd'?'KALISTAR_V4_'+c.id+'.psd':null);return true;}
      const publicFiles={'/':'designer.html','/designer.js':'designer.js','/designer.css':'designer.css','/legacy':'index.html'};
      if(publicFiles[p]){file(res,path.join(__dirname,'public',publicFiles[p]),MIME[path.extname(publicFiles[p])]);return true;}
      if(p==='/jeu'){res.writeHead(302,{Location:'/jeu/'});res.end();return true;}
      if(p.startsWith('/jeu/')){
        const relative=decodeURIComponent(p.slice('/jeu/'.length))||'index.html';
        if(!/^[a-zA-Z0-9_./-]+$/.test(relative)||relative.includes('..'))throw Error('Chemin de jeu invalide.');
        let target=L.inside(path.join(ROOT,'V4/site'),relative);
        if(relative.startsWith('assets/')&&!fs.existsSync(target))target=L.inside(path.join(ROOT,'V3/site'),relative);
        if(relative.startsWith('shared/'))target=L.inside(path.join(ROOT,'V3/assets'),relative.slice('shared/'.length));
        const ext=path.extname(target).toLowerCase();
        if(!MIME[ext]||relative.endsWith('.test.cjs'))throw Error('Ressource non publique.');
        file(res,target,MIME[ext]);return true;
      }
      return false;
    }
    if(!p.startsWith('/api/designer/'))return false;
    const input=await body(req);
    if(p==='/api/designer/drafts'){json(res,200,D.saveDraft(input));return true;}
    if(p==='/api/designer/preview'){
      if(!ready()){json(res,503,{error:'Composants en cours de preparation.'});return true;}
      if(previewRunning>=2){json(res,429,{error:'Un apercu est deja en cours.'});return true;}
      const profile=D.validate(input);previewRunning++;
      try{const buffer=await require('./designer-render.cjs').preview(profile);res.writeHead(200,{'Content-Type':'image/png','Content-Length':buffer.length,'Cache-Control':'no-store'});res.end(buffer);}finally{previewRunning--;}
      return true;
    }
    if(p==='/api/designer/create'){
      if(!ready()||getIntegrity().state!=='intact'){json(res,409,{error:'Le controle du template doit etre termine avant la creation.'});return true;}
      if(queue.length>=3){json(res,429,{error:'Trois cartes attendent deja leur composition.'});return true;}
      const job=D.create(input);if(job.state==='queued'&&!queue.includes(job.id))queue.push(job.id);
      json(res,202,job);pump().catch(()=>{});return true;
    }
    json(res,404,{error:'Commande Atelier absente.'});return true;
  }
  return {handle,recover,close(){clearInterval(timer);},busy(){return running||queue.length>0;}};
}
module.exports={makeDesigner};
