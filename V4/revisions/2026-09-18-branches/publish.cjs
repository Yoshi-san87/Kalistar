const L=require('../../atelier/lib.cjs');
const {fs,path,ROOT,DATA,read,write,hash,assert}=L;
const work=__dirname,relative=p=>path.relative(ROOT,p).replaceAll('\\','/');
(async()=>{
  const plan=read(path.join(work,'plan.json')),audit=read(path.join(work,'verification.json'));
  const old=read(path.join(work,'references-before.json'));
  assert.equal(audit.passed,true);assert.equal(audit.results.length,22);
  assert.equal(read(path.join(work,'master-proof.json')).passed,true,'Preuve du maitre requise');
  assert.equal(audit.componentHash,await hash(path.join(work,'branches-complete.png')));
  assert.equal(L.baseline().id,old.id,'Migration deja appliquee ou references changees');
  assert.ok(!fs.existsSync(path.join(work,'published.json')),'Publication deja effectuee');
  const lock=path.join(DATA,'render.lock');let fd;
  const changed=new Set(),backups=new Map();
  function backup(file){
    const p=L.inside(ROOT,file),dest=L.inside(path.join(work,'originals'),file);
    assert.ok(!fs.existsSync(dest),'Sauvegarde existante : '+file);
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(p,dest);
    backups.set(file,dest);return p;
  }
  function install(from,file){
    const p=backup(file),tmp=p+'.branches-revision.tmp';
    assert.ok(!fs.existsSync(tmp));fs.copyFileSync(from,tmp);fs.renameSync(tmp,p);changed.add(file);
  }
  function json(file,value){const p=backup(file);write(p,value);changed.add(file);}
  try{
    fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,revision:plan.revision,phase:'publishing'}));
    await L.protectedCheck(old);
    for(const item of plan.items){
      const verified=audit.results.find(r=>r.key===item.key),dir=path.join(ROOT,item.destination);
      assert.equal(await hash(path.join(dir,'card.psd')),verified.psdHash);
      assert.equal(await hash(path.join(dir,'card.png')),verified.pngHash);
      assert.equal(await hash(path.join(dir,'native.json')),verified.nativeHash);
    }
    for(const item of plan.items){
      const dir=path.join(ROOT,item.destination),verified=audit.results.find(r=>r.key===item.key);
      install(path.join(dir,'card.psd'),item.psd);
      if(item.png){
        install(path.join(dir,'card.png'),item.png);
        const report=read(path.join(ROOT,item.report));
        report.reopened=read(path.join(dir,'native.json')).reopened;
        report.branchRevision={id:plan.revision,componentHash:plan.componentHash,comparison:verified.comparison,psdHash:verified.psdHash,pngHash:verified.pngHash};
        json(item.report,report);
      }
    }
    const manifestFile='V4/template-stable/elements-02/manifest.json',manifest=read(path.join(ROOT,manifestFile));
    for(const file of Object.keys(manifest.protectedFiles))if(changed.has(file))manifest.protectedFiles[file]=await hash(path.join(ROOT,file));
    manifest.branchRevision={id:plan.revision,audit:relative(path.join(work,'verification.json'))};json(manifestFile,manifest);
    const catalogFile='V4/template-stable/current-elements.json',catalog=read(path.join(ROOT,catalogFile));
    catalog.frameRevision={id:plan.revision,component:relative(path.join(work,'branches-complete.png')),audit:relative(path.join(work,'verification.json'))};json(catalogFile,catalog);
    const next=structuredClone(old);
    for(const file of changed){assert.ok(file in old.protectedFiles,file+' absent du verrou precedent');next.protectedFiles[file]=await hash(path.join(ROOT,file));}
    for(const name of ['branches-complete.png','plan.json','verification.json','master-proof.json']){const file=relative(path.join(work,name));next.protectedFiles[file]=await hash(path.join(ROOT,file));}
    next.id=L.crypto.createHash('sha256').update(JSON.stringify(next.protectedFiles)).digest('hex');
    next.parentReferenceId=old.id;next.createdAt=new Date().toISOString();next.revision={id:plan.revision,reason:'Contour integral des branches non Electro',audit:relative(path.join(work,'verification.json'))};
    for(const card of next.cards.filter(c=>c.card.element==='ELECTRO')){
      assert.equal(await hash(path.join(ROOT,card.psd)),old.protectedFiles[card.psd]);
      assert.equal(await hash(path.join(ROOT,card.png)),old.protectedFiles[card.png]);
    }
    backup('V4/atelier/data/regression.json');
    json('V4/atelier/data/references.json',next);
    await L.protectedCheck(next);
    write(path.join(work,'published.json'),{revision:plan.revision,previousReferenceId:old.id,referenceId:next.id,changedFiles:[...changed],backups:Object.fromEntries([...backups].map(([k,v])=>[k,relative(v)])),publishedAt:new Date().toISOString(),regressionRequired:true});
    console.log({publishedCards:21,electroUnchanged:5,referenceId:next.id,regressionRequired:true});
  }catch(e){
    for(const [file,saved] of [...backups].reverse())fs.copyFileSync(saved,L.inside(ROOT,file));
    throw e;
  }finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
})().catch(e=>{console.error(e);process.exitCode=1;});
