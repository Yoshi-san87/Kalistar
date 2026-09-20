const {execFileSync}=require('node:child_process');
const L=require('../../atelier/lib.cjs');
const {fs,path,ROOT,read,write,assert,sharp,hash}=L;
const work=__dirname;
(async()=>{
  const partial=process.argv.includes('--partial');
  const plan=read(path.join(work,'plan.json')),before=read(path.join(work,'references-before.json'));
  assert.equal(await hash(path.join(work,'branches-complete.png')),plan.componentHash);
  await L.protectedCheck(before);
  const results=[];
  for(const item of plan.items){
    const dir=path.join(ROOT,item.destination);
    if(partial&&!fs.existsSync(path.join(dir,'native.json')))continue;
    const native=read(path.join(dir,'native.json'));
    assert.equal(native.width,897);assert.equal(native.height,1497);assert.equal(native.resolution,300);
    assert.equal(native.before.length,native.reopened.length);
    for(let i=0;i<native.before.length;i++){
      const a=structuredClone(native.before[i]),b=structuredClone(native.reopened[i]);
      if(a.name===`BRANCHES ${item.element} - couleur du cristal`){
        assert.deepEqual(a.bounds,[196,1190,702,1227]);
        assert.deepEqual(b.bounds,[182,1190,703,1227]);delete a.bounds;delete b.bounds;
      }
      assert.deepEqual(b,a,item.key+' : calque modifie hors contour '+a.name);
    }
    const roundtrip=await L.diff(path.join(dir,'card.png'),path.join(dir,'reopened.png'));
    assert.equal(roundtrip.changed,0,item.key+' : PSD non stable');
    let comparison=null,barcode=null;
    if(item.png){
      comparison=await L.diff(path.join(ROOT,item.png),path.join(dir,'card.png'),plan.rectangles);
      assert.equal(comparison.outside,0,item.key+' : pixels hors branches');
      assert.ok(comparison.changed>0&&comparison.changed<3500,item.key+' : etendue inattendue');
      const card=before.cards.find(c=>c.key===item.key);
      barcode=JSON.parse(execFileSync(L.PYTHON,[path.join(ROOT,'V4/atelier/barcode.py'),path.join(dir,'card.png'),card.card.id],{windowsHide:true,encoding:'utf8'}));
      assert.equal(barcode.passed,true);
    }
    results.push({key:item.key,passed:true,comparison,roundtrip,barcode,psdHash:await hash(path.join(dir,'card.psd')),pngHash:await hash(path.join(dir,'card.png')),nativeHash:await hash(path.join(dir,'native.json'))});
    console.log(item.key,comparison||'master', 'PSD stable');
  }
  const families=plan.items.filter((item,i,all)=>item.png&&results.some(r=>r.key===item.key)&&all.findIndex(c=>c.element===item.element)===i);
  const composite=[];let row=0;
  for(const item of families){
    const label=Buffer.from(`<svg width="1160" height="24"><text x="12" y="18" font-family="Arial" font-size="16" fill="white">${item.key.toUpperCase()} / ${item.element} - AVANT | APRES</text></svg>`);
    composite.push({input:label,left:0,top:row});row+=24;
    for(const [i,f] of [path.join(ROOT,item.png),path.join(ROOT,item.destination,'card.png')].entries()){
      composite.push({input:await sharp(f).extract({left:172,top:1182,width:550,height:58}).png().toBuffer(),left:10+i*580,top:row});
    }
    row+=70;
  }
  await sharp({create:{width:1160,height:row,channels:4,background:'#10171b'}}).composite(composite).png().toFile(path.join(work,'families-before-after.png'));
  await L.protectedCheck(before);
  write(path.join(work,partial?'verification.partial.json':'verification.json'),{revision:plan.revision,passed:true,checkedAt:new Date().toISOString(),originalReferenceId:before.id,componentHash:plan.componentHash,rectangles:plan.rectangles,results,sourcesUnchanged:true});
  console.log(partial?'Controle partiel reussi.':'Controle complet reussi. Sources originales intactes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
