const test=require('node:test');
const vm=require('node:vm');
const L=require('./lib.cjs');
const D=require('./designer-core.cjs');
const {assert,fs,path}=L;
test('Designer starts blank and every choice is a calibrated V4 component',()=>{
  const p=D.defaults(),o=D.options();assert.equal(p.name,'');assert.equal(p.upload,null);assert.equal(o.elements.length,13);
  assert.equal(new Set(o.weapons.map(o=>o.value)).size,o.weapons.length);
  for(const element of o.elements)assert.equal(D.validate({...p,element:element.value}).element,element.value);
  assert.throws(()=>D.validate({...p,element:'invented'}));
  assert.throws(()=>D.validate({...p,id:'40001234'}));
  assert.throws(()=>D.validate(JSON.parse('{"__proto__":{}}')));
});
test('Six independent faces: numbers, magic, barriers and supported effects',()=>{
  const p=D.defaults();
  for(const o of D.options().effects.atk)for(let i=0;i<6;i++){
    const atk=p.atk.slice();atk[i]=o.value;assert.equal(D.validate({...p,atk}).atk[i],o.value);
  }
  for(const o of D.options().effects.defense)for(let i=0;i<6;i++){
    const defense=p.defense.slice();defense[i]=o.value;assert.equal(D.validate({...p,defense}).defense[i],o.value);
  }
  assert.deepEqual(D.validate({...p,positions:[5,3,1,4,2]}).positions,[1,2,3,4,5]);
  assert.throws(()=>D.validate({...p,positions:[]}));assert.throws(()=>D.validate({...p,positions:[2,2]}));
  assert.throws(()=>D.validate({...p,atk:['revive',1,2,3,4,5],magic:[6]}));
  assert.throws(()=>D.validate({...p,element:'NONE',barriers:[1]}));
  assert.throws(()=>D.validate({...p,defense:['revive',1,2,3,4,5]}));
  assert.throws(()=>D.validate({...p,atk:[Infinity,1,2,3,4,5]}));
});
test('Strict image and crop fields; names required only at creation',()=>{
  assert.doesNotThrow(()=>D.validate(D.defaults()));assert.throws(()=>D.validate(D.defaults(),{final:true}));
  assert.throws(()=>D.validate({...D.defaults(),upload:'../../other'}));
  assert.throws(()=>D.validate({...D.defaults(),crop:{zoom:0,x:0,y:0}}));
  assert.throws(()=>D.validate({...D.defaults(),crop:{zoom:1,x:NaN,y:0}}));
  assert.throws(()=>D.validate({...D.defaults(),crop:{zoom:1,x:0,y:2}}));
  assert.throws(()=>D.validate({...D.defaults(),crop:{zoom:1,x:0,y:0,path:'x'}}));
  assert.equal(D.validate({...D.defaults(),name:'  Nouvelle   carte ',title:'Premiere histoire',job:'Artiste'},{final:true}).name,'Nouvelle carte');
});
test('Nonbreaking spaces normalize identically for preview and native creation',()=>{
  const input={...D.defaults(),name:'\u00a0Nouvelle\u00a0\u202fcarte\u00a0',title:'Premiere\u202fhistoire',job:'Grand\u00a0artiste',description:'\u00a0Bonjour\u00a0:\u202fbienvenue\u2009ici.\u00a0'};
  const original=JSON.stringify(input);
  for(const final of [false,true]){
    const p=D.validate(input,{final});
    assert.equal(p.name,'Nouvelle carte');assert.equal(p.title,'Premiere histoire');assert.equal(p.job,'Grand artiste');
    assert.equal(p.description,'Bonjour : bienvenue ici.');
    // E.setDescription joins whitespace-separated words with spaces or line breaks.
    assert.equal(p.description.split(/\s+/).join('\r').replace(/\r/g,' '),p.description);
    assert.deepEqual(D.validate(p,{final}),p);
  }
  assert.equal(JSON.stringify(input),original);
});
test('Native worker retains an opaque black bottom layer through every save',()=>{
  const code=fs.readFileSync(path.join(__dirname,'designer-worker.jsx'),'utf8').replace(/^#(?:target|include)\b[^\r\n]*/gm,'');
  function render(source){
    const saves=[],card={...D.defaults(),name:'Test',title:'Version',job:'Artiste',id:'40001234',color:'38CBED'};
    const plan={textSource:'donor.psd',layers:[{file:'art.png',name:'ILLUSTRATION',left:80,top:156,width:737,height:921},{file:'frame.png',name:'CADRE',left:0,top:0,width:897,height:1497}]};
    const doc={layers:[],info:{},width:{as:()=>897},height:{as:()=>1497},resolution:300};
    function layer(name){return {name,visible:true,opacity:100,textItem:{},resize(){},translate(){},remove(){doc.layers.splice(doc.layers.indexOf(this),1);}};}
    const blank=layer('Initial');doc.layers.push(blank);doc.activeLayer=blank;
    function insert(name,before){const l=layer(name);doc.layers.splice(doc.layers.indexOf(before),0,l);doc.activeLayer=l;return l;}
    function save(file){saves.push({file,layers:doc.layers.map(l=>({initial:l===blank,name:l.name,visible:l.visible,opacity:l.opacity,fill:l.fill,fullCanvas:l.fullCanvas}))});}
    let selected=false;
    doc.selection={selectAll(){selected=true;},fill(color){doc.activeLayer.fill=color.rgb.hexValue;doc.activeLayer.fullCanvas=selected;},deselect(){selected=false;}};
    doc.saveAs=file=>save(file.fsName);
    function File(file){return {fsName:String(file),parent:{parent:{parent:{fsName:'/isolated'}}}};}
    function SolidColor(){this.rgb={};}
    const life={open:file=>file.endsWith('/card.psd')?doc:{saved:true},track:value=>value};
    // Only the worker executes: all Photoshop APIs and writes are in-memory fakes.
    vm.runInNewContext(source,{
      File,SolidColor,PNGSaveOptions:function(){},$:{fileName:'/isolated/V4/atelier/designer-worker.jsx'},
      app:{version:'test',documents:{add:()=>doc}},NewDocumentMode:{RGB:'RGB'},DocumentFill:{TRANSPARENT:'TRANSPARENT'},BitsPerChannelType:{EIGHT:8},AnchorPosition:{TOPLEFT:'TOPLEFT',MIDDLECENTER:'MIDDLECENTER'},
      K:{read:file=>{
        if(file.endsWith('/active.json'))return {id:'00000000-0000-4000-8000-000000000001'};
        if(file.endsWith('/composition.json'))return plan;
        if(file.endsWith('/request.json'))return {card};
        throw Error('Unexpected read: '+file);
      },lifecycle:fn=>fn(life),bounds:()=>[0,0,10,10],ink:()=>[0,0,10,10],need:(_doc,name)=>({name}),transplant:(_source,_layer,_doc,before,name)=>insert(name,before),text(){},save:(_doc,psd,png)=>{save(psd);save(png);},state:()=>[],write(){}},
      E:{place:(_doc,_file,before,name)=>insert(name,before)}
    },{timeout:1000});
    return saves;
  }
  function check(saves){
    assert.deepEqual(saves.map(s=>path.basename(s.file)),['without-text.png','card.psd','card.png','reopened.png']);
    for(const saved of saves){
      const bottom=saved.layers.at(-1);
      assert.ok(bottom.initial,'Initial background must remain at the bottom: '+saved.file);
      assert.equal(bottom.visible,true);assert.equal(bottom.opacity,100);assert.equal(bottom.fill,'000000');assert.equal(bottom.fullCanvas,true);
      assert.ok(saved.layers.some(l=>l.name==='ILLUSTRATION'));assert.ok(saved.layers.some(l=>l.name==='CADRE'));
    }
  }
  check(render(code));
  assert.throws(()=>check(render(code.replace('doc.selection.fill(black);',''))),{code:'ERR_ASSERTION'});
  assert.throws(()=>check(render(code.replace("doc.saveAs(new File(folder + 'without-text.png')","blank.remove(); doc.saveAs(new File(folder + 'without-text.png')"))),{code:'ERR_ASSERTION'});
});
test('Draft optimistic revisions prevent stale writes',()=>{
  let d;
  try{d=D.saveDraft({profile:D.defaults()});assert.equal(d.revision,1);assert.equal(D.saveDraft(d).revision,2);assert.throws(()=>D.saveDraft(d),/autre fenetre/);}
  finally{if(d)fs.unlinkSync(path.join(D.HOME,'drafts',d.id+'.json'));}
});
test('Catalogue starts with exactly the approved V4 cards',()=>{
  const approved=D.catalogue().cards.filter(c=>c.kind==='approved'),references=L.baseline().cards;
  assert.equal(approved.length,references.length);assert.equal(new Set(approved.map(c=>c.id)).size,references.length);
  assert.deepEqual(approved.map(c=>c.id).sort(),references.map(c=>c.card.id).sort());
  assert.ok(approved.every(c=>c.png.startsWith('V4/cartes/')));
  const p={...D.defaults(),name:'Nouvelle carte',atk:[200,165,130,'guard','revive','buff_atk']};
  const card=D.profileCard(D.validate(p),'40001234');assert.equal(card.canGuard,true);assert.equal(card.canHeal,true);assert.equal(card.text,p.description);assert.equal(card.id,'40001234');
});
test('Repeated create is idempotent; publication rejects an unverified job',async()=>{
  const requestId=L.crypto.randomUUID(),profile={...D.defaults(),name:'Test de creation',title:'Premiere histoire',job:'Artiste'};let s;
  try{
    s=D.create({requestId,profile});assert.equal(D.create({requestId,profile}).id,s.id);
    assert.throws(()=>D.create({requestId,profile:{...profile,name:'Autre carte'}}));
    await assert.rejects(()=>D.publish(s.id),/verifiee/);
    assert.equal(D.catalogue().cards.some(c=>c.creationJob===s.id),false);
  }finally{
    if(s){for(const f of ['request.json','status.json'])fs.unlinkSync(path.join(D.folder(s.id),f));fs.rmdirSync(D.folder(s.id));}
    const r=path.join(D.HOME,'requests',requestId+'.json');if(fs.existsSync(r))fs.unlinkSync(r);
  }
});
