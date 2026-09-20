const L=require('../../atelier/lib.cjs');
const {fs,path,ROOT,read,write,hash,assert}=L;
const work=__dirname;
(async()=>{
  const ref=L.baseline();await L.protectedCheck(ref);
  assert.ok(!fs.existsSync(path.join(L.DATA,'render.lock')),'Composition en cours');
  const catalog=read(path.join(ROOT,'V4/template-stable/current-elements.json'));
  const cards=catalog.cards.map(c=>({key:c.key,element:c.element,psd:c.psd,png:c.png,report:c.profile.replace('card.json','render.json')}));
  assert.equal(cards.length,21);assert.ok(cards.every(c=>c.element!=='ELECTRO'));
  const items=[...cards,{key:'master',element:'ELECTRO',psd:catalog.template}];
  const plan={revision:'branches-2026-09-18',referenceId:ref.id,createdAt:new Date().toISOString(),items,rectangles:[[180,1186,388,1230],[505,1186,706,1230]],componentHash:await hash(path.join(work,'branches-complete.png'))};
  for(const item of items){
    const dir=path.join(work,'staged',item.key);fs.mkdirSync(dir,{recursive:true});
    item.destination=path.relative(ROOT,dir).replaceAll('\\','/');
  }
  const before=path.join(work,'references-before.json');
  if(fs.existsSync(before))assert.deepEqual(read(before),ref);else write(before,ref);
  write(path.join(work,'plan.json'),plan);console.log({cards:cards.length,master:catalog.template,referenceId:ref.id});
})().catch(e=>{console.error(e);process.exitCode=1;});
