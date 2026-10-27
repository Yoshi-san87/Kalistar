'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_deck_ux__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304',output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/collection-gallery-deck-ux');
async function enter(page){
  await page.locator('[data-startup-enter]:enabled').click();
  await page.waitForFunction(()=>window.KALISTAR_READY);
}
async function collection(page){
  const direct=page.locator('.main-nav [data-view=collection]');
  if(await direct.isVisible())await direct.click();
  else{
    await page.locator('.main-nav [data-view=home]').click();
    await page.locator('[data-home-category=collection]').click();
  }
  await page.locator('.cb-page').waitFor();
}
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/jeu/');await enter(page);page.setDefaultTimeout(30000);
  const protectedState=async()=>{const state=await page.evaluate(()=>({
    catalogue:JSON.stringify(KALISTAR_DATA),
    owned:JSON.stringify(KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).slice().sort((a,b)=>a.id.localeCompare(b.id))),
    matches:JSON.stringify(KALISTAR_DB.registry.matches(KALISTAR_ACTIVE_USER)),
    games:Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:^|\.)game$/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]))
  }));return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex')]));};
  const before=await protectedState();
  const action=(type,id)=>page.locator(`[data-binder-action="${type}"]${id!==undefined?`[data-id="${id}"]`:''}:visible`);
  const deck=(type,id)=>page.locator(`${type==='add'?'.kdb-candidate-controls ':''}[data-deck-action="${type}"]${id!==undefined?`[data-id="${id}"]`:''}`);
  const cards=()=>page.locator('.kdb-slot-image img').evaluateAll(ns=>ns.map(n=>n.alt));
  const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length&&i.loading!=='lazy').every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
  const screen=async name=>{await images();await page.screenshot({path:path.join(output,name+'.png'),scale:'css'});};
  await page.locator('[data-view=decks]').click();await page.setViewportSize({width:412,height:1007});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.decks-preset-tools').count(),0);
  assert.equal(await page.locator('.kdb-demo-tools #deck-preset').count(),1);
  assert.equal(await page.locator('.kdb-demo-tools [data-action]').count(),3);
  const rail=page.locator('.kdb-candidates');
  await deck('panel','recruit').click();
  assert.ok(await rail.locator('.kdb-candidate').count()>8,'all candidates remain reachable in recruitment');
  assert.ok(await rail.evaluate(n=>n.scrollHeight>n.clientHeight&&n.scrollWidth<=n.clientWidth+1),'current recruitment grid scrolls vertically');
  const railBox=await rail.boundingBox();await page.mouse.move(railBox.x+railBox.width/2,railBox.y+railBox.height/2);await page.mouse.wheel(0,180);
  await page.waitForFunction(()=>document.querySelector('.kdb-candidates').scrollTop>0);
  await rail.locator('.kdb-candidate').last().scrollIntoViewIfNeeded();await rail.locator('.kdb-candidate').first().scrollIntoViewIfNeeded();
  await page.locator('.team-heading-summary').click();
  await page.locator('#deck-preset').selectOption('player');await page.locator('[data-action=load-preset]').click();
  const deckExport=page.waitForEvent('download');await page.locator('[data-action=export-deck]').click();assert.equal((await deckExport).suggestedFilename(),'Kalistar-V4-deck.json');
  const deckImport=page.waitForEvent('filechooser');await page.locator('[data-action=import-deck]').click();assert.ok(await deckImport);
  await page.locator('.team-management [data-deck-action=manage]').click();await deck('panel','board').click();await screen('full-deck-razr');
  await page.setViewportSize({width:1440,height:1000});await screen('deck-rail-desktop');
  await page.waitForFunction(()=>{const n=document.querySelector('.kdb-candidates'),v=n.getBoundingClientRect();return [...n.querySelectorAll('.kdb-candidate-image img')].filter(img=>{const r=img.getBoundingClientRect();return r.right>v.left&&r.left<v.right&&r.bottom>v.top&&r.top<v.bottom;}).every(img=>img.complete&&img.naturalWidth>0);});
  assert.ok(await rail.evaluate(n=>[...n.querySelectorAll('.kdb-candidate-image img')].filter(img=>{const r=img.getBoundingClientRect(),v=n.getBoundingClientRect();return r.right>v.left&&r.left<v.right&&r.bottom>v.top&&r.top<v.bottom;}).every(img=>img.complete&&img.naturalWidth>0)),'visible recruitment cards have loaded artwork');
  assert.ok(await rail.evaluate(n=>n.scrollHeight>n.clientHeight&&n.scrollWidth<=n.clientWidth+1),'desktop recruitment scrolls without horizontal overflow');
  await collection(page);
  await action('filters').click();
  assert.equal(await page.locator('.cb-overlay:modal').count(),1);
  await page.locator('.cb-overlay:modal [data-binder-action=filter-choice][data-id=ELECTRO]').click();await page.locator('[data-binder-filter=position][value="3"]').check();
  assert.ok((await page.locator('[data-binder-filter=faction] option').allTextContents()).includes('Replicant'));
  assert.equal(await page.locator('[data-binder-filter=position][value="3"]').isChecked(),true);
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
    const options={storage:localStorage,userId:KALISTAR_ACTIVE_USER,knownIds:KALISTAR_DATA.cards.map(c=>c.id),normalizeDeck:KalistarTeamComposition.create(KalistarEngine.createEngine(KALISTAR_DATA)).normalize};
    const library=KalistarDeckLibrary.create(options);
    // Editions have different formation eligibility; reserve swaps remain legal for both.
    const reserve=(name,id)=>library.save({name,cards:[...Array(5).fill(null),id,...Array(4).fill(null)],formation:Array(5).fill(null),captain:null,equipment:KalistarEquipment.emptyLoadout()});
    const first=reserve('Les musiciens',versions[0].id);
    const second=reserve('Le bal',versions[1].id);
    KalistarDeckLibrary.create({...options,userId:'user-tokyo'}).save({name:'Deck prive Tokyo',cards:[versions[0].id,...Array(9).fill(null)]});
    return {first,second,slot:5,targetSlot:6,versions:versions.map(c=>({id:c.id,name:c.name,title:c.title,atk:c.atk,defense:c.defense}))};
  });
  await page.locator('[data-binder-field=search]').fill('MOMO');await action('open',fixture.versions[0].id).click();await action('tab','profile').click();
  assert.equal(await action('open-deck').count(),2);assert.doesNotMatch(await page.locator('.cb-deck-usage').textContent(),/Tokyo/);
  assert.match(await action('open-deck',fixture.second.id).textContent(),new RegExp(fixture.versions[1].title));
  await action('open-deck',fixture.first.id).click();await page.waitForSelector('.kdb-page');
  assert.equal(await deck('select').inputValue(),fixture.first.id);
  assert.equal(await page.locator('.kdb-slot.is-selected').getAttribute('data-deck-slot'),String(fixture.slot),'Collection opens the exact saved card slot');
  await page.locator('[data-deck-filter=search]').fill('MOMO');
  await deck('add',fixture.versions[1].id).click();
  assert.equal(await page.locator('.kdb-compare:modal').count(),1);
  assert.equal(await page.locator('.kdb-slot-image img').first().getAttribute('alt'),'MOMO');
  const unchanged=await page.evaluate(id=>JSON.parse(localStorage.getItem('kalistar.v4.deckLibrary.user-paris')).decks.find(d=>d.id===id).cards.filter(Boolean),fixture.first.id);
  assert.deepEqual(unchanged,[fixture.versions[0].id]);
  const faces=await page.locator('.kdb-compare-faces tbody tr').evaluateAll(ns=>ns.map(n=>[...n.querySelectorAll('td')].map(td=>td.querySelector('img')?.alt||td.textContent)));
  assert.equal(faces.length,6);assert.equal(faces[0][0],String(fixture.versions[0].atk[0]));
  await screen('comparison-desktop');await deck('cancel-replace').first().click();
  assert.equal(await page.locator('.kdb-compare').count(),0);assert.equal(await deck('undo').isDisabled(),true);
  await deck('add',fixture.versions[1].id).click();await deck('confirm-replace').click();
  assert.equal(await deck('undo').isEnabled(),true);
  await deck('undo').click();assert.equal(await deck('add',fixture.versions[0].id).isDisabled(),true);
  await deck('redo').click();assert.equal(await deck('add',fixture.versions[1].id).isDisabled(),true);
  // Empty slots recruit directly and form a new branch of history.
  await deck('undo').click();await page.locator(`[data-deck-action=remove][data-slot="${fixture.slot}"]`).click();
  assert.deepEqual(await cards(),[]);assert.equal(await deck('redo').isDisabled(),true);
  await deck('undo').focus();await page.keyboard.press('Control+z');assert.deepEqual(await cards(),['MOMO']);
  await page.keyboard.press('Control+Shift+z');assert.deepEqual(await cards(),[]);
  await deck('add',fixture.versions[0].id).click();assert.equal(await page.locator('.kdb-compare').count(),0);
  assert(fixture.targetSlot>=0,'fixture has a second compatible position');
  await page.locator(`[data-deck-action=reorder][data-slot="${fixture.slot}"]`).click();await page.locator(`[data-deck-action=slot][data-slot="${fixture.targetSlot}"]`).click();
  assert.equal(await page.locator(`[data-deck-slot="${fixture.targetSlot}"] .kdb-slot-image img`).count(),1);await deck('undo').click();assert.equal(await page.locator(`[data-deck-slot="${fixture.slot}"] .kdb-slot-image img`).count(),1);
  await deck('select').selectOption(fixture.second.id);assert.equal(await deck('undo').isDisabled(),true);
  await deck('select').selectOption(fixture.first.id);assert.equal(await deck('undo').isEnabled(),true);
  await page.locator(`[data-deck-action=remove][data-slot="${fixture.slot}"]`).click();
  await collection(page);await action('open-deck',fixture.second.id).click();
  await deck('select').selectOption(fixture.first.id);assert.deepEqual(await cards(),[],'opening another deck preserves unsaved work');
  await deck('undo').click();await page.locator(`[data-deck-action=slot][data-slot="${fixture.slot}"]`).click();
  for(const [width,height] of [[1440,1000],[1920,1080],[2560,1440],[412,1007],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});if(width<=900)await deck('panel','board').click();await screen(`deck-${width}x${height}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);
    const board=page.locator('.kdb-composition');
    if(await board.isVisible()){
      // Landscape flattens the tool wrapper with display:contents; measure its controls.
      const outside=await page.locator('.kdb-slots').evaluateAll(nodes=>nodes.flatMap(n=>{const r=n.getBoundingClientRect();return [...n.querySelectorAll('.kdb-slot-image,.kdb-slot-top > *')].filter(c=>c.getClientRects().length).flatMap(c=>{const s=c.getBoundingClientRect();return s.top>=r.top-1&&s.bottom<=r.bottom+1?[]:[{control:c.outerHTML.slice(0,180),bounds:s.toJSON(),group:r.toJSON()}];});}));
      assert.deepEqual(outside,[],'slot controls stay inside composition '+width);
    }
    if(width<=900){await deck('panel','recruit').click();await screen(`recruitment-${width}x${height}`);}
    if(width<600){
      const expected=await page.evaluate(()=>KALISTAR_DATA.cards.filter(c=>[c.name,c.title,c.faction,c.race,c.id].join(' ').toLocaleLowerCase('fr').includes('momo')&&KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER,c.id).length).map(c=>c.id).sort());
      assert.deepEqual((await page.locator('.kdb-candidate [data-deck-recruit]').evaluateAll(nodes=>nodes.map(n=>n.dataset.deckRecruit))).sort(),expected,'recruitment search retains every owned matching model');
      assert.equal(await page.locator('.kdb-target').isVisible(),true);
      const r=await page.locator('.kdb-candidate-image').first().boundingBox();assert.ok(r.height>=95,'readable recruitment '+width+': '+JSON.stringify(r));
    }
    await deck('add',fixture.versions[1].id).click();await screen(`comparison-${width}x${height}`);
    assert.ok(await deck('confirm-replace').evaluate(n=>{const r=n.getBoundingClientRect();return r.right<=innerWidth&&r.bottom<=innerHeight&&r.top>=0;}),'confirmation stays on screen');
    await page.keyboard.press('Escape');assert.equal(await page.locator('.kdb-compare').count(),0);
    await collection(page);await action('back').click();await page.locator('[data-binder-field=search]').fill('');
    await action('filters').click();await screen(`filters-${width}x${height}`);
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog')),true);
    await action('close-overlay').last().click();await action('pages').click();await screen(`index-${width}x${height}`);
    const last=String(await action('jump-page').count()-1);await action('jump-page',last).click();assert.ok(await page.locator('.cb-pocket').count()>0);
    await page.locator('[data-binder-field=search]').fill('MOMO');await action('open',fixture.versions[0].id).click();
    const notes=action('pane','notes');if(await notes.isVisible())await notes.click();await action('tab','profile').click();
    await screen(`deck-links-${width}x${height}`);await action('open-deck',fixture.first.id).click();
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:412,height:1007});
  await deck('panel','recruit').click();
  await deck('add',fixture.versions[1].id).click();await page.waitForTimeout(300);await deck('cancel-replace').first().click();
  // Pointer recruitment follows the same confirmation path as the replace button.
  await page.setViewportSize({width:1440,height:1000});
  const source=await page.locator(`[data-deck-recruit="${fixture.versions[1].id}"]`).boundingBox(),destination=await page.locator(`[data-deck-slot="${fixture.slot}"]`).boundingBox();
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();
  await page.mouse.move(destination.x+destination.width/2,destination.y+destination.height/2,{steps:12});await page.mouse.up();
  assert.equal(await page.locator('.kdb-compare:modal').count(),1);await deck('cancel-replace').first().click();
  // Touch runs in a separate phone context, not the user's browser or collection.
  const phone=await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),touch=await phone.newPage();
  touch.setDefaultTimeout(90000);
  touch.on('pageerror',e=>errors.push(e.message));await touch.goto(url+'/jeu/#collection');await enter(touch);
  await touch.locator('[data-binder-action=filters]').tap();await touch.locator('.cb-overlay:modal [data-binder-action=filter-choice][data-id=ELECTRO]').tap();
  await touch.locator('dialog[open] [data-binder-action=close-overlay]').last().tap();
  await touch.locator('.cb-card').first().tap();assert.equal(await touch.locator('.cb-reader').count(),1);
  await touch.locator('[data-view=decks]').tap();await touch.locator('[data-deck-action=panel][data-id=recruit]').tap();
  await touch.locator('[data-deck-action=add]:enabled').first().tap();assert.equal(await touch.locator('.kdb-compare:modal').count(),1);
  await touch.locator('[data-deck-action=confirm-replace]').tap();assert.equal(await touch.locator('.kdb-compare').count(),0);
  await phone.close();
  const safety=await page.evaluate(({versions,slot})=>{
    const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;z-index:9999';document.body.append(host);
    const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
    let blocked=null,fail=false,current={name:'Isolated safety',cards:[...Array(slot).fill(null),versions[0].id,...Array(9-slot).fill(null)],formation:Array(5).fill(null),captain:null,equipment:KalistarEquipment.emptyLoadout()};
    const registry={owned:(_u,id)=>id===blocked?[]:[{id:'test',cardId:id}],deckErrors:(_u,ids)=>ids.includes(blocked)?['Exemplaire indisponible']:[]};
    const builder=KalistarDeckBuilder.create({data:KALISTAR_DATA,engine:KalistarEngine.createEngine(KALISTAR_DATA),registry,userId:'test-ux',storage,
      getDraft:()=>current,onDraft:d=>{if(fail)throw new Error('Test write failure');current=d;}});
    builder.mount(host);const click=(type,id)=>{const node=host.querySelector(`[data-deck-action="${type}"]${id?`[data-id="${id}"]`:['remove','slot'].includes(type)?`[data-slot="${slot}"]`:''}`);if(!node)throw new Error('Missing '+type+' '+JSON.stringify(builder.inspect()));node.click();};
    fail=true;click('remove');const rollback=builder.inspect().draft.cards[slot]===versions[0].id&&host.querySelector('[data-deck-action=undo]').disabled;
    fail=false;click('remove');blocked=versions[0].id;click('undo');const protectedUndo=builder.inspect().draft.cards[slot]===null;
    blocked=null;click('undo');const restored=builder.inspect().draft.cards[slot]===versions[0].id;
    const search=host.querySelector('[data-deck-filter=search]');search.value='MOMO';search.dispatchEvent(new Event('input',{bubbles:true}));
    click('slot');click('add',versions[1].id);blocked=versions[1].id;click('confirm-replace');const revalidated=builder.inspect().draft.cards[slot]===versions[0].id;
    builder.destroy();host.remove();return {rollback,protectedUndo,restored,revalidated};
  },fixture);
  assert.deepEqual(safety,{rollback:true,protectedUndo:true,restored:true,revalidated:true});
  assert.deepEqual(await protectedState(),before,'deck browsing and edits leave game, ownership and catalogue unchanged');
  assert.deepEqual(errors,[]);console.log('PASS: filters, recruitment grid, profile-scoped deck links, comparison, undo/redo, drafts, responsive screenshots.');
  await context.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
