'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collaborations__.cjs'))('playwright');
const Binder=require('./collection-binder.js');
const output=path.join(os.tmpdir(),'kalistar-collection-filters-qa');

async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    // Mount the real controls with disposable data, without storage or publications.
    const cards=['FF7','FF8','NieR','Replicant','Chroma','MGS1','RE1','ONEPIECE','WITCHER',...Array(16).fill('FF7')].map((faction,index)=>({id:String(49998900+index),characterId:'fixture-'+index,name:'FIXTURE '+index,title:'Edition '+index,faction,race:'HUMAIN',element:'ELECTRO',weapon:'Lance',positions:[5]}));
    const ownedIds=cards.slice(0,5).map(card=>card.id);
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="collection-view"><main id="app"></main></body></html>');
    for(const file of ['style.css','collection-binder.css','mobile.css'])await page.addStyleTag({path:path.join(__dirname,file)});
    await page.addScriptTag({path:path.join(__dirname,'../../V3/site/assets/lucide.min.js')});
    for(const file of ['collaborations.js','collection-binder.js'])await page.addScriptTag({path:path.join(__dirname,file)});
    await page.evaluate(({cards,ownedIds})=>{
      const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=';
      const items=ownedIds.map(id=>({id:'copy-'+id,cardId:id}));
      globalThis.KalistarCardMedia={image:()=>pixel};
      globalThis.binder=KalistarCollection.create({data:{cards,elements:{ELECTRO:{id:'ELECTRO',label:'Electricite',color:'FFFF00'}}},getOwned:id=>items.filter(item=>!id||item.cardId===id)});
      binder.mount(document.querySelector('#app'));
    },{cards,ownedIds});
    const collection=page.locator('.cb-scopes [data-binder-filter=collection]');
    const state=()=>page.evaluate(()=>binder.inspect());
    const assertCount=async expected=>assert.match(await page.locator('.cb-count').textContent(),new RegExp(expected+' versions'));
    assert.equal(await page.locator('.cb-scopes [data-binder-action=scope]').count(),2);
    const entries=await collection.locator('option').evaluateAll(options=>Object.fromEntries(options.map(option=>[option.value,option.textContent])));
    assert.deepEqual(Object.keys(entries),['','kalistar','final-fantasy','nier','metal-gear','resident-evil','one-piece','witcher']);
    assert.equal(entries['final-fantasy'],'Final Fantasy · 2');
    await page.locator('[data-binder-action=scope][data-id=catalogue]').click();
    await collection.selectOption('final-fantasy');
    await assertCount(cards.filter(card=>Binder.matchesScope(card,'final-fantasy')).length);
    await page.locator('[data-binder-action=next-page]').last().click();
    assert.ok((await state()).page>0);
    await collection.selectOption('nier');
    assert.equal((await state()).page,0,'changing collection resets pagination');
    await assertCount(2);
    await page.locator('[data-binder-action=filters]').click();
    const dialog=page.locator('.cb-overlay[open]');
    assert.equal(await dialog.locator('[data-binder-filter=collection]').inputValue(),'nier');
    const factions=await dialog.locator('[data-binder-filter=faction] option').evaluateAll(options=>options.map(option=>option.value));
    for(const faction of ['FF7','FF8','NieR','Replicant','Chroma','MGS1','RE1','ONEPIECE','WITCHER'])assert(factions.includes(faction));
    await dialog.locator('[data-binder-filter=faction]').selectOption('Replicant');
    await assertCount(1);
    await dialog.locator('[data-binder-filter=collection]').selectOption('final-fantasy');
    assert.equal(await collection.inputValue(),'final-fantasy','both selectors stay synchronized');
    assert.equal((await state()).filters.faction,'Replicant','collection does not silently erase faction');
    assert.equal(await page.locator('.cb-empty').count(),1,'incompatible combined filters show the empty state');
    await dialog.locator('[data-binder-action=reset]').click();
    await assertCount(cards.length);
    assert.equal(await collection.inputValue(),'');
    await dialog.locator('.cb-filter-actions [data-binder-action=close-overlay]').click();
    await collection.selectOption('final-fantasy');
    await page.locator('[data-binder-action=scope][data-id=owned]').click();
    await assertCount(2);
    assert.equal((await state()).scope,'owned');
    assert.equal(await collection.inputValue(),'final-fantasy','collection remains selected when changing ownership scope');
    assert((await page.locator('.cb-pocket').evaluateAll(nodes=>nodes.map(node=>node.dataset.cardId))).every(id=>ownedIds.includes(id)));
    await page.locator('.cb-search input').fill('missing-card');
    assert.equal(await page.locator('.cb-empty').count(),1);
    await page.locator('.cb-toolbar [data-binder-action=reset]').click();
    await assertCount(ownedIds.length);
    assert.equal((await state()).filters.search,'');
    const reports=[];
    for(const [width,height]of [[320,568],[390,844],[412,1007],[700,900],[850,760],[1024,768],[1440,1000],[1600,1000],[844,390],[640,360]]){
      await page.setViewportSize({width,height});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const report=await page.locator('.cb-heading').evaluate(header=>{
        const bounds=header.getBoundingClientRect(),nodes=[...header.querySelectorAll('.cb-scopes button,.cb-collection-select select,:scope > .cb-icon')];
        const boxes=nodes.map(node=>{const r=node.getBoundingClientRect();return {id:node.dataset.id||node.dataset.binderFilter||'archives',left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,overflow:node.tagName!=='SELECT'&&node.scrollWidth>node.clientWidth+1};});
        return {width:innerWidth,height:innerHeight,headerHeight:bounds.height,boxes,inside:boxes.every(r=>r.left>=bounds.left&&r.right<=bounds.right&&r.top>=bounds.top&&r.bottom<=bounds.bottom),overlap:boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom)),documentWidth:document.documentElement.scrollWidth};
      });
      reports.push(report);
      assert(report.inside&&!report.overlap&&report.boxes.every(box=>!box.overflow),'Collection controls fit: '+JSON.stringify(report));
      assert(report.documentWidth<=width+1,'no horizontal overflow at '+width+'x'+height);
      if(width<700||height<500)assert(report.boxes.every(box=>box.height>=44),'phone targets remain 44px: '+JSON.stringify(report));
      await page.locator('.cb-heading').screenshot({path:path.join(output,'header-'+width+'x'+height+'.png')});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,isolated:true,reports},null,2)+'\n');
    console.log('PASS: collection dropdowns, ownership, faction combinations, reset, pagination and ten responsive sizes. Screenshots: '+output);
    await context.close();
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
