'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_deck_ux__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304',output=path.join(__dirname,'verification/collection-deck-ux');
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/jeu/');await page.waitForFunction(()=>window.KALISTAR_READY);
  const action=(type,id)=>page.locator(`[data-binder-action="${type}"]${id!==undefined?`[data-id="${id}"]`:''}:visible`);
  const deck=(type,id)=>page.locator(`[data-deck-action="${type}"]${id!==undefined?`[data-id="${id}"]`:''}`);
  const cards=()=>page.locator('.kdb-slot-image img').evaluateAll(ns=>ns.map(n=>n.alt));
  const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length&&i.loading!=='lazy').every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
  const screen=async name=>{await images();await page.screenshot({path:path.join(output,name+'.png'),scale:'css'});};
  await page.locator('[data-view=decks]').click();await page.setViewportSize({width:412,height:1007});await screen('full-deck-razr');
  await page.setViewportSize({width:1440,height:1000});await page.locator('[data-view=collection]').click();
  await action('filters').click();
  assert.equal(await page.locator('.cb-overlay:modal').count(),1);
  await action('filter-choice','ELECTRO').click();await action('filter-choice','3').click();
  assert.ok((await page.locator('[data-binder-filter=faction] option').allTextContents()).includes('Replicant'));
  assert.equal(await action('filter-choice','3').getAttribute('aria-pressed'),'true');
  await action('close-overlay').last().click();
  const ids=await page.locator('.cb-pocket').evaluateAll(ns=>ns.map(n=>n.dataset.cardId));
  assert.ok(ids.length>0);assert.ok(await page.evaluate(ids=>ids.every(id=>{const c=KALISTAR_DATA.cards.find(c=>c.id===id);return c.element==='ELECTRO'&&c.positions.includes(3);}),ids));
  await action('reset').click();await action('pages').click();
  const pages=await action('jump-page').count();assert.ok(pages>1);
  assert.equal(await page.locator('.cb-index [autofocus]').evaluate(n=>n===document.activeElement),true);
  await action('jump-page','1').click();assert.match(await page.locator('.cb-page-label').textContent(),/2 \/ /);
  await action('pages').click();await page.keyboard.press('Escape');
  assert.equal(await action('pages').evaluate(n=>n===document.activeElement),true);
  const fixture=await page.evaluate(()=>{
    const versions=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO').sort((a,b)=>a.id.localeCompare(b.id));
    const options={storage:localStorage,userId:KALISTAR_ACTIVE_USER,knownIds:KALISTAR_DATA.cards.map(c=>c.id)};
    const library=KalistarDeckLibrary.create(options);
    const first=library.save({name:'Les musiciens',cards:[versions[0].id,...Array(9).fill(null)]});
    const second=library.save({name:'Le bal',cards:[versions[1].id,...Array(9).fill(null)]});
    KalistarDeckLibrary.create({...options,userId:'user-tokyo'}).save({name:'Deck prive Tokyo',cards:[versions[0].id,...Array(9).fill(null)]});
    return {first,second,versions:versions.map(c=>({id:c.id,name:c.name,title:c.title,atk:c.atk,defense:c.defense}))};
  });
  await page.locator('[data-binder-field=search]').fill('MOMO');await action('open',fixture.versions[0].id).click();await action('tab','profile').click();
  assert.equal(await action('open-deck').count(),2);assert.doesNotMatch(await page.locator('.cb-deck-usage').textContent(),/Tokyo/);
  assert.match(await action('open-deck',fixture.second.id).textContent(),new RegExp(fixture.versions[1].title));
  await action('open-deck',fixture.first.id).click();await page.waitForSelector('.kdb-page');
  assert.equal(await deck('select').inputValue(),fixture.first.id);
  assert.equal(await page.locator('.kdb-slot.is-selected').getAttribute('data-deck-slot'),'0');
  await page.locator('[data-deck-filter=search]').fill('MOMO');
  await deck('add',fixture.versions[1].id).click();
  assert.equal(await page.locator('.kdb-compare:modal').count(),1);
  assert.equal(await page.locator('.kdb-slot-image img').first().getAttribute('alt'),'MOMO');
  const unchanged=await page.evaluate(id=>JSON.parse(localStorage.getItem('kalistar.v4.deckLibrary.user-paris')).decks.find(d=>d.id===id).cards[0],fixture.first.id);
  assert.equal(unchanged,fixture.versions[0].id);
  const faces=await page.locator('.kdb-compare-faces tbody tr').evaluateAll(ns=>ns.map(n=>[...n.querySelectorAll('td')].map(td=>td.querySelector('img')?.alt||td.textContent)));
  assert.equal(faces.length,6);assert.equal(faces[0][0],String(fixture.versions[0].atk[0]));
  await screen('comparison-desktop');await deck('cancel-replace').first().click();
  assert.equal(await page.locator('.kdb-compare').count(),0);assert.equal(await deck('undo').isDisabled(),true);
  await deck('add',fixture.versions[1].id).click();await deck('confirm-replace').click();
  assert.equal(await deck('undo').isEnabled(),true);
  await deck('undo').click();assert.equal(await deck('add',fixture.versions[0].id).isDisabled(),true);
  await deck('redo').click();assert.equal(await deck('add',fixture.versions[1].id).isDisabled(),true);
  // Empty slots recruit directly and form a new branch of history.
  await deck('undo').click();await page.locator('[data-deck-action=remove][data-slot="0"]').click();
  assert.deepEqual(await cards(),[]);assert.equal(await deck('redo').isDisabled(),true);
  await deck('undo').focus();await page.keyboard.press('Control+z');assert.deepEqual(await cards(),['MOMO']);
  await page.keyboard.press('Control+Shift+z');assert.deepEqual(await cards(),[]);
  await deck('add',fixture.versions[0].id).click();assert.equal(await page.locator('.kdb-compare').count(),0);
  await page.locator('[data-deck-action=reorder][data-slot="0"]').click();await page.locator('[data-deck-action=slot][data-slot="2"]').click();
  assert.equal(await page.locator('[data-deck-slot="2"] img').count(),1);await deck('undo').click();assert.equal(await page.locator('[data-deck-slot="0"] img').count(),1);
  await deck('select').selectOption(fixture.second.id);assert.equal(await deck('undo').isDisabled(),true);
  await deck('select').selectOption(fixture.first.id);assert.equal(await deck('undo').isEnabled(),true);
  await page.locator('[data-deck-action=remove][data-slot="0"]').click();
  await page.locator('[data-view=collection]').click();await action('open-deck',fixture.second.id).click();
  await deck('select').selectOption(fixture.first.id);assert.deepEqual(await cards(),[],'opening another deck preserves unsaved work');
  await deck('undo').click();await page.locator('[data-deck-action=slot][data-slot="0"]').click();
  for(const [width,height] of [[1440,1000],[2041,1383],[412,1007],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});await screen(`deck-${width}x${height}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);
    const board=page.locator('.kdb-composition');
    if(await board.isVisible())assert.ok(await page.locator('.kdb-slots').evaluate(n=>{const r=n.getBoundingClientRect();return [...n.querySelectorAll('.kdb-slot-image,.kdb-slot-top')].every(c=>{const s=c.getBoundingClientRect();return s.top>=r.top-1&&s.bottom<=r.bottom+1;});}),'slot controls stay inside composition '+width);
    if(width<=900&&height<=700){await deck('panel','recruit').click();await screen(`recruitment-${width}x${height}`);}
    if(width<600){
      assert.equal(await page.locator('.kdb-candidate').count(),2);
      assert.equal(await page.locator('.kdb-target').isVisible(),true);
      const r=await page.locator('.kdb-candidate-image').first().boundingBox();assert.ok(r.height>=95,'readable recruitment '+width+': '+JSON.stringify(r));
    }
    await deck('add',fixture.versions[1].id).click();await screen(`comparison-${width}x${height}`);
    assert.ok(await deck('confirm-replace').evaluate(n=>{const r=n.getBoundingClientRect();return r.right<=innerWidth&&r.bottom<=innerHeight&&r.top>=0;}),'confirmation stays on screen');
    await page.keyboard.press('Escape');assert.equal(await page.locator('.kdb-compare').count(),0);
    await page.locator('[data-view=collection]').click();await action('back').click();await page.locator('[data-binder-field=search]').fill('');
    await action('filters').click();await screen(`filters-${width}x${height}`);
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog')),true);
    await action('close-overlay').last().click();await action('pages').click();await screen(`index-${width}x${height}`);
    const last=String(await action('jump-page').count()-1);await action('jump-page',last).click();assert.ok(await page.locator('.cb-pocket').count()>0);
    await page.locator('[data-binder-field=search]').fill('MOMO');await action('open',fixture.versions[0].id).click();
    const notes=action('pane','notes');if(await notes.isVisible())await notes.click();await action('tab','profile').click();
    await screen(`deck-links-${width}x${height}`);await action('open-deck',fixture.first.id).click();
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:412,height:1007});
  await deck('add',fixture.versions[1].id).click();await page.waitForTimeout(300);await deck('cancel-replace').first().click();
  // Pointer recruitment follows the same confirmation path as the replace button.
  await page.setViewportSize({width:1440,height:1000});
  const source=await page.locator(`[data-deck-recruit="${fixture.versions[1].id}"]`).boundingBox(),destination=await page.locator('[data-deck-slot="0"]').boundingBox();
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();
  await page.mouse.move(destination.x+destination.width/2,destination.y+destination.height/2,{steps:12});await page.mouse.up();
  assert.equal(await page.locator('.kdb-compare:modal').count(),1);await deck('cancel-replace').first().click();
  // Touch runs in a separate phone context, not the user's browser or collection.
  const phone=await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),touch=await phone.newPage();
  touch.on('pageerror',e=>errors.push(e.message));await touch.goto(url+'/jeu/');await touch.waitForFunction(()=>window.KALISTAR_READY);
  await touch.locator('[data-binder-action=filters]').tap();await touch.locator('[data-binder-action=filter-choice][data-id=ELECTRO]').tap();
  await touch.locator('dialog[open] [data-binder-action=close-overlay]').last().tap();
  await touch.locator('.cb-card').first().tap();assert.equal(await touch.locator('.cb-reader').count(),1);
  await touch.locator('[data-view=decks]').tap();await touch.locator('[data-deck-action=panel][data-id=recruit]').tap();
  await touch.locator('[data-deck-action=add]:enabled').first().tap();assert.equal(await touch.locator('.kdb-compare:modal').count(),1);
  await touch.locator('[data-deck-action=confirm-replace]').tap();assert.equal(await touch.locator('.kdb-compare').count(),0);
  await phone.close();
  const safety=await page.evaluate(({versions})=>{
    const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;z-index:9999';document.body.append(host);
    const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
    let blocked=null,fail=false,current={name:'Isolated safety',cards:[versions[0].id,...Array(9).fill(null)]};
    const registry={owned:(_u,id)=>id===blocked?[]:[{id:'test',cardId:id}],deckErrors:(_u,ids)=>ids.includes(blocked)?['Exemplaire indisponible']:[]};
    const builder=KalistarDeckBuilder.create({data:KALISTAR_DATA,engine:KalistarEngine.createEngine(KALISTAR_DATA),registry,userId:'test-ux',storage,
      getDraft:()=>current,onDraft:d=>{if(fail)throw new Error('Test write failure');current=d;}});
    builder.mount(host);const click=(type,id)=>{const node=host.querySelector(`[data-deck-action="${type}"]${id?`[data-id="${id}"]`:''}`);if(!node)throw new Error('Missing '+type+' '+JSON.stringify(builder.inspect()));node.click();};
    fail=true;click('remove');const rollback=builder.inspect().draft.cards[0]===versions[0].id&&host.querySelector('[data-deck-action=undo]').disabled;
    fail=false;click('remove');blocked=versions[0].id;click('undo');const protectedUndo=builder.inspect().draft.cards[0]===null;
    blocked=null;click('undo');const restored=builder.inspect().draft.cards[0]===versions[0].id;
    const search=host.querySelector('[data-deck-filter=search]');search.value='MOMO';search.dispatchEvent(new Event('input',{bubbles:true}));
    click('slot');click('add',versions[1].id);blocked=versions[1].id;click('confirm-replace');const revalidated=builder.inspect().draft.cards[0]===versions[0].id;
    builder.destroy();host.remove();return {rollback,protectedUndo,restored,revalidated};
  },fixture);
  assert.deepEqual(safety,{rollback:true,protectedUndo:true,restored:true,revalidated:true});
  assert.deepEqual(errors,[]);console.log('PASS: filters, page index, profile-scoped deck links, comparison, undo/redo, drafts, responsive screenshots.');
  await context.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
