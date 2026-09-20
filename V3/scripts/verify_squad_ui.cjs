'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification-squad');
const runtime=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/__squad__.cjs'));
const {chromium}=runtime('playwright');
const report={tests:[],errors:[],geometry:[],screenshots:[]};let browser,page;
const order=()=>page.locator('[data-deck-slot]').evaluateAll(ns=>ns.map(n=>n.dataset.deckPreview||null));
async function test(name,fn){await fn();report.tests.push(name);console.log('PASS '+name);}
async function shot(name){const file=path.join(out,name+'.png');await page.screenshot({path:file});report.screenshots.push(file);}
async function geometry(){return page.evaluate(()=>{
  const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
  const boxes=[...document.querySelectorAll('.kdb-heading,.kdb-workbench,.kdb-composition,.kdb-affinities,.kdb-preview,.kdb-browser,.kdb-coverage,.kdb-slots,.kdb-library-bar,.kdb-filters')].filter(visible).map(n=>{
    const r=n.getBoundingClientRect();return {name:n.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom,clientH:n.clientHeight,scrollH:n.scrollHeight};
  });
  return {width:innerWidth,height:innerHeight,scrollX:scrollX,scrollY:scrollY,bodyH:document.documentElement.scrollHeight,bodyW:document.documentElement.scrollWidth,boxes,
    outside:[...document.querySelectorAll('.kdb-page button,.kdb-page input,.kdb-page select')].filter(visible).flatMap(n=>{const r=n.getBoundingClientRect();return r.left < -1||r.right>innerWidth+1||r.top<0||r.bottom>innerHeight+1?[{action:n.dataset.deckAction||n.dataset.deckFilter,rect:{x:r.x,y:r.y,bottom:r.bottom,right:r.right}}]:[];})};
});}
async function fit(label){const g=await geometry();report.geometry.push({label,...g});assert.ok(g.bodyH<=g.height+1&&g.bodyW<=g.width+1,JSON.stringify(g));assert.deepEqual(g.outside,[],JSON.stringify(g));assert.ok(g.boxes.every(b=>b.scrollH<=b.clientH+3),JSON.stringify(g));}
async function move(from,to){const a=await from.boundingBox(),b=await to.boundingBox();assert.ok(a&&b);await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});}
async function run(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1600,height:1080},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.stack));
  await page.goto(pathToFileURL(path.join(root,'site/index.html')).href+'#decks');await page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_DB);await page.waitForFunction(()=>[...document.querySelectorAll('.kdb-slot-image img')].every(n=>n.complete&&n.naturalWidth));
  await test('Single screen contains ten slots, synergies, recruits and inspector at desktop sizes',async()=>{
    for(const [width,height]of [[1600,1080],[1440,900],[1280,720],[2560,1440]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(150);await fit(width+'x'+height);
      assert.equal(await page.locator('[data-deck-slot]:visible').count(),10);assert.ok(await page.locator('.kdb-affinities').isVisible());assert.ok(await page.locator('.kdb-preview').isVisible());assert.ok(await page.locator('.kdb-browser').isVisible());await shot('squad-'+width);
    }
  });
  await page.setViewportSize({width:1600,height:1080});
  await test('Hover links correspond to selected faction or race and candidate potential comes from model',async()=>{
    const c=page.locator('[data-deck-slot="0"]'),id=await c.getAttribute('data-deck-preview');await c.hover();
    const expected=await page.evaluate(id=>{const card=KALISTAR_DATA.cards.find(c=>c.id===id);return [...document.querySelectorAll('[data-deck-slot]')].filter(n=>KALISTAR_DATA.cards.find(c=>c.id===n.dataset.deckPreview)?.faction===card.faction).length;},id);
    assert.equal(await page.locator('.kdb-slot.is-affinity').count(),expected);await page.locator('[data-deck-action=affinity-type][data-id=race]').click();
    const candidate=page.locator('.kdb-candidate').first();await candidate.hover();const candidateId=await candidate.getAttribute('data-deck-preview');assert.equal(await page.locator('.kdb-preview-image').getAttribute('src'),await candidate.locator('img').getAttribute('src'));
    const deltas=await page.evaluate(id=>{const model=KalistarDeckBuilder.createModel({data:KALISTAR_DATA,engine:KalistarEngine.createEngine(KALISTAR_DATA),registry:KALISTAR_DB.registry,userId:KALISTAR_ACTIVE_USER});const slots=[...document.querySelectorAll('[data-deck-slot]')].map(n=>n.dataset.deckPreview||null);return model.candidate(slots,0,id).affinities;},candidateId);
    const values=await page.locator('.kdb-preview-affinities em').allTextContents();assert.deepEqual(values,[deltas.faction.delta,deltas.race.delta].map((n,i)=>(n>=0?'+':'')+n+(i?' DEF':' ATK')));
  });
  await test('Deck slots swap without changing the owned set and recruit drag targets validate independently',async()=>{
    const before=await order(),owners=await page.evaluate(()=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).map(c=>c.id));await move(page.locator('.kdb-slot-image[data-slot="0"]'),page.locator('.kdb-slot-image[data-slot="7"]'));await page.mouse.up();const expected=before.slice();[expected[0],expected[7]]=[expected[7],expected[0]];assert.deepEqual(await order(),expected);
    const add=page.locator('.kdb-candidate [data-deck-action=add]:enabled').first(),id=await add.getAttribute('data-id');await move(page.locator(`[data-deck-recruit="${id}"]`),page.locator('.kdb-slot-image[data-slot="7"]'));assert.ok(await page.locator('.is-drop-eligible').count());await page.mouse.up();assert.equal((await order())[7],id);
    assert.deepEqual(await page.evaluate(()=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).map(c=>c.id)),owners);
  });
  await test('Cancelled recruit drag never commits and click replacement updates coverage',async()=>{
    const before=await order(),recruit=page.locator('[data-deck-recruit]').first();await move(recruit,page.locator('.kdb-slot-image[data-slot="1"]'));await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await order(),before);assert.equal(await page.locator('.kdb-drag-ghost').count(),0);
    await page.locator('.kdb-slot-image[data-slot="1"]').click();const add=page.locator('.kdb-candidate [data-deck-action=add]:enabled').first(),id=await add.getAttribute('data-id');await add.click();assert.equal((await order())[1],id);
    const expected=await page.evaluate(()=>KalistarEngine.createEngine(KALISTAR_DATA).deckCoverage(JSON.parse(localStorage.getItem('kalistar.v3.deck'))));const counts=await page.locator('.kdb-coverage b span').allTextContents();assert.deepEqual(counts,[1,2,3,4,5].map(p=>expected[p]+'/2'));
  });
  await test('Paged recruitment and quick filters remain in place without scrolling',async()=>{
    await page.locator('.kdb-recruit-tools [data-deck-action=filters]').click();await fit('filters');await page.locator('[data-deck-filter=position]').selectOption('1');await page.locator('.kdb-filters [data-deck-action=filters]').click();
    assert.ok(await page.locator('.kdb-candidate').count());await page.locator('[data-deck-action=reset-filters]').first().click();
    await page.locator('[data-deck-filter=search]').fill('MOMO');assert.equal(await page.locator('.kdb-candidate').count(),2);await page.locator('[data-deck-filter=search]').fill('');
    const first=await page.locator('.kdb-candidate').first().getAttribute('data-deck-preview');await page.locator('[data-deck-action=next]').click();assert.notEqual(await page.locator('.kdb-candidate').first().getAttribute('data-deck-preview'),first);await fit('recruits');
  });
  await test('Saved named decks switch instantly and preserve independent compositions',async()=>{
    await page.locator('[data-deck-action=name]').fill('Escouade A');await page.locator('[data-deck-action=save]').click();const a=await page.locator('[data-deck-action=select]').inputValue(),cardsA=await order();
    await page.locator('.kdb-heading [data-deck-action=manage]').click();await fit('manage');await page.locator('[data-deck-action=duplicate]').click();await page.locator('[data-deck-action=name]').fill('Escouade B');
    if(await page.locator('.kdb-library-bar').isVisible())await page.locator('.kdb-heading [data-deck-action=manage]').click();
    await move(page.locator('.kdb-slot-image[data-slot="0"]'),page.locator('.kdb-slot-image[data-slot="9"]'));await page.mouse.up();const cardsB=await order();assert.notDeepEqual(cardsA,cardsB);
    await page.locator('[data-deck-action=save]').click();const b=await page.locator('[data-deck-action=select]').inputValue();assert.notEqual(a,b);
    await page.locator('[data-deck-action=deck-previous]').click();assert.equal(await page.locator('[data-deck-action=select]').inputValue(),a);assert.deepEqual(await order(),cardsA);
    await page.locator('[data-deck-action=deck-next]').click();assert.equal(await page.locator('[data-deck-action=select]').inputValue(),b);assert.deepEqual(await order(),cardsB);
    await page.locator('[data-deck-action=select]').selectOption(a);assert.deepEqual(await order(),cardsA);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.deepEqual(await order(),cardsA);
  });
  await test('Mobile panels and short landscape screens have no scrolling or clipped actions',async()=>{
    for(const [width,height]of [[390,844],[360,740],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(150);
      for(const id of ['board','synergy','inspect']){await page.locator(`[data-deck-action=panel][data-id=${id}]`).click();await fit(width+'-'+id);await shot('squad-'+width+'-'+id);}
      await page.locator('.kdb-recruit-tools [data-deck-action=filters]').click();await fit(width+'-filters');await page.locator('.kdb-filters [data-deck-action=filters]').click();await page.locator('[data-deck-action=panel][data-id=board]').click();
    }
  });
  await test('No browser exceptions or unrendered glyphs',async()=>{assert.deepEqual(report.errors,[]);assert.equal(await page.locator('.kdb-page i[data-lucide]').count(),0);});
}
run().catch(async e=>{report.failure=e.stack;process.exitCode=1;console.error(e);try{await shot('failure');}catch{}}).finally(async()=>{await browser?.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));});
