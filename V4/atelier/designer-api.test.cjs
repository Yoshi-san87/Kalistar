const test=require('node:test');
const L=require('./lib.cjs');
const D=require('./designer-core.cjs');
const {assert,fs,path}=L;
test('V4 Atelier API uses the same local security boundary as the legacy editor',async()=>{
  const app=require('./server.cjs').makeServer();app.setOrigin('http://127.0.0.1:0');await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.server.address().port;app.setOrigin(base);let draft;
  try{
    const referenceIds=L.baseline().cards.map(c=>c.card.id).sort();
    const response=await fetch(base+'/api/designer/bootstrap'),boot=await response.json();assert.equal(response.status,200);assert.deepEqual(boot.catalogue.filter(c=>c.kind==='approved').map(c=>c.id).sort(),referenceIds);assert.equal(boot.defaults.upload,null);assert.equal(boot.options.elements.length,13);
    const headers={'Content-Type':'application/json',Origin:base,'X-Atelier-Token':boot.token};
    assert.equal((await fetch(base+'/api/designer/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/designer/drafts',{method:'POST',headers:{...headers,Origin:'https://malicious.example'},body:'{}'})).status,403);
    const saved=await fetch(base+'/api/designer/drafts',{method:'POST',headers,body:JSON.stringify({profile:D.defaults()})});assert.equal(saved.status,200);draft=await saved.json();
    const conflict=await fetch(base+'/api/designer/drafts',{method:'POST',headers,body:JSON.stringify({...draft,revision:0})});assert.equal(conflict.status,409);
    const create=await fetch(base+'/api/designer/create',{method:'POST',headers,body:JSON.stringify({requestId:L.crypto.randomUUID(),profile:{...D.defaults(),name:'Test'}})});assert.equal(create.status,409);
    assert.equal((await fetch(base+'/media/created/49999999.png')).status,400);
    assert.equal((await fetch(base+'/jeu/engine.js')).status,200);
    const manifestResponse=await fetch(base+'/jeu/manifest.webmanifest');assert.equal(manifestResponse.status,200);assert.match(manifestResponse.headers.get('content-type'),/^application\/manifest\+json/);assert.equal((await manifestResponse.json()).display,'standalone');
    assert.equal((await fetch(base+'/jeu/assets/pwa-192.png')).status,200);
    assert.equal((await fetch(base+'/jeu/package.json')).status,404);
    const game=await (await fetch(base+'/api/game/catalogue')).json();assert.equal(game.version,4);assert.deepEqual(game.cards.filter(c=>c.origin!=='published').map(c=>c.id).sort(),referenceIds);
    assert.equal((await fetch(base+'/legacy')).status,200);
  }finally{
    if(draft)fs.unlinkSync(path.join(D.HOME,'drafts',draft.id+'.json'));await new Promise(r=>app.server.close(r));
  }
});
test('Artwork crop and zoom stay within the uploaded source',async()=>{
  const R=require('./designer-render.cjs'),id=L.crypto.randomUUID(),file=path.join(L.DATA,'uploads',id+'.png');
  const buffer=Buffer.alloc(512*256*3);for(let y=0;y<256;y++)for(let x=0;x<512;x++){const i=(y*512+x)*3;buffer[i]=x<256?240:10;buffer[i+2]=x<256?10:240;}
  fs.mkdirSync(path.dirname(file),{recursive:true});await L.sharp(buffer,{raw:{width:512,height:256,channels:3}}).png().toFile(file);
  try{
    for(const x of [-1,1]){const output=await R.art({...D.defaults(),upload:id,crop:{zoom:3,x,y:1}}),{data,info}=await L.sharp(output).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,737);assert.equal(info.height,921);const i=(400*737+300)*info.channels;assert.equal(data[i]>data[i+2],x===1);}
  }finally{fs.unlinkSync(file);}
});
