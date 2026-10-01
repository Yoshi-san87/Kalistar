'use strict';
const L=require('../../atelier/lib.cjs');
const {fs,path,assert,ROOT,sharp}=L;
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__one_piece__.cjs'))('playwright');
const home=__dirname,site=path.join(ROOT,'V4/site'),output=path.join(home,'qa/browser');
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const image='data:image/png;base64,'+(await sharp(path.join(ROOT,'V4/Illustrations/OP_robin_01.png')).resize(320,400).png().toBuffer()).toString('base64');
  const base=L.read(path.join(ROOT,'V4/atelier/data/references.json')).cards[0].card;
  const names=['Luffy','Zoro','Sanji','Nami','Usopp','Chopper','Chopper','Robin','Franky','Brook','Jinbe'];
  const cards=names.map((name,i)=>({...base,id:String(49800101+i),characterId:'one-piece-'+name.toLowerCase(),name,title:i===6?'Heavy Point':'Fixture',faction:'ONEPIECE',collaboration:'ONEPIECE'}));
  cards.push({...base,id:'49999990',characterId:'fixture-other',name:'OTHER',faction:'RE1'});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const reports=[],errors=[];
  try{
    const context=await browser.newContext({reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="app"></main></body></html>');
    await page.addStyleTag({path:path.join(site,'collection-binder.css')});
    await page.addStyleTag({content:'html,body{margin:0;width:100%;height:100%;}*{box-sizing:border-box}#app{width:100%;height:100dvh}'});
    await page.addScriptTag({path:path.join(ROOT,'V3/site/assets/lucide.min.js')});
    await page.addScriptTag({path:path.join(site,'collaborations.js')});
    await page.addScriptTag({path:path.join(site,'collection-binder.js')});
    for(const [width,height]of [[320,568],[390,844],[700,900],[1024,768],[1200,900],[1600,1000]]){
      await page.setViewportSize({width,height});
      await page.evaluate(({cards,image})=>{
        globalThis.binder?.destroy();
        globalThis.KalistarCardMedia={image:()=>image};
        globalThis.binder=KalistarCollection.create({data:{cards,elements:{ELECTRO:{id:'ELECTRO',label:'Electricite',color:'FFDD00'}}}});
        binder.mount(document.querySelector('#app'));
      },{cards,image});
      const scope=page.locator('[data-binder-action="scope"][data-id="one-piece"]');
      assert.equal(await scope.count(),1);
      await scope.click();
      assert.equal(await page.evaluate(()=>binder.inspect().scope),'one-piece');
      assert.match(await page.locator('.cb-count').innerText(),/10 personnages.*11 versions/);
      assert.equal(await scope.getAttribute('aria-pressed'),'true');
      const report=await page.evaluate(()=>{
        const header=document.querySelector('.cb-heading').getBoundingClientRect(),toolbar=document.querySelector('.cb-toolbar').getBoundingClientRect();
        const nodes=[...document.querySelectorAll('.cb-scopes button')];
        const boxes=nodes.map(n=>{const r=n.getBoundingClientRect();return{id:n.dataset.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:n.scrollWidth>n.clientWidth+1};});
        return{width:innerWidth,height:innerHeight,boxes,inside:boxes.every(r=>r.left>=header.left-.5&&r.right<=header.right+.5&&r.top>=header.top-.5&&r.bottom<=header.bottom+.5),overlap:boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.left<b.right-.5&&b.left<a.right-.5&&a.top<b.bottom-.5&&b.top<a.bottom-.5)),clearOfToolbar:boxes.every(r=>r.bottom<=toolbar.top+.5),imagesLoaded:[...document.querySelectorAll('.cb-card img')].every(n=>n.complete&&n.naturalWidth>0)};
      });
      reports.push(report);
      await page.screenshot({path:path.join(output,'scope-'+width+'.png')});
      assert(report.inside&&!report.overlap&&report.clearOfToolbar&&report.boxes.every(box=>!box.overflow),'Scope layout: '+JSON.stringify(report));
      assert(report.imagesLoaded);
      await page.getByRole('searchbox',{name:'Rechercher une carte'}).fill('Chopper');
      assert.match(await page.locator('.cb-count').innerText(),/1 personnage.*2 versions/);
      assert.equal(await page.locator('.cb-pocket').count(),1);
      assert.equal(await page.locator('.cb-version-count').innerText(),'2');
      await page.getByRole('button',{name:'Effacer les filtres',exact:true}).click();
      await page.locator('[data-binder-action="scope"][data-id="kalistar"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>binder.inspect().scope),'kalistar');
      await scope.focus();await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>binder.inspect().scope),'one-piece');
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }finally{
    L.write(path.join(output,'report.json'),{passed:reports.length===6&&reports.every(r=>r.inside&&!r.overlap&&r.clearOfToolbar&&r.boxes.every(b=>!b.overflow))&&!errors.length,isolated:true,productionStorageTouched:false,reports,errors});
    await browser.close();
  }
  console.log('PASS: single One Piece scope, 10 characters / 11 versions, Chopper grouping, keyboard and six viewport layouts.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
