'use strict';
// Isolated, temporary browser origin. No files, profiles or databases are written.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { createRequire } = require('node:module');
const dependencies = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const runtime = createRequire(path.join(dependencies, '__deck_reorder__.cjs'));
const { chromium } = runtime('playwright');
const screenshotMode = process.argv.includes('--screenshot');
const failures = [], results = [], browserErrors = [], pictures = [];
const baseline = [7, 13, 2, 4, 1, 14, 5, 17, 3, 6].map(n => String(30000000 + n));
const harness = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deck reorder test</title>
<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="deck-builder.css">
<style>html,body,#root{height:100%;min-height:0;margin:0;padding:0;overflow:hidden}</style>
<button id="outside" style="position:fixed;top:0;right:0;z-index:10">Outside</button><main id="root"></main>
<script src="assets/lucide.min.js"></script><script src="data.js"></script><script src="engine.js"></script><script src="deck-library.js"></script><script src="deck-builder.js"></script>
<script>
window.calls=[];window.messages=[];window.plays=0;window.parentClicks=0;window.failDraft=false;window.remountOnDraft=false;
document.addEventListener('click',()=>parentClicks++);
window.setup=(settings={})=>{
  window.builder?.destroy();
  window.profile=settings.userId||'user-paris';
  window.parentDraft=structuredClone(settings.draft||{name:'Les sentinelles',cards:${JSON.stringify(baseline)}});
  window.calls=[];window.messages=[];window.failDraft=false;window.remountOnDraft=false;window.parentClicks=0;
  window.pending=new Set();
  window.registry={
    user:id=>({name:id==='user-paris'?'Paris':'Tokyo'}),
    owned:(user,id)=>Array.from({length:user==='user-paris'?2:0},(_,i)=>({id:id+'-'+i,cardId:id})),
    deckErrors:(user,ids)=>{const counts={};ids.forEach(id=>counts[id]=(counts[id]||0)+1);return Object.entries(counts).filter(([id,n])=>n>(user==='user-paris'&&!pending.has(id)?2:0)).map(([id])=>'Indisponible '+id);}
  };
  window.builder=KalistarDeckBuilder.create({data:KALISTAR_DATA,engine:KalistarEngine.createEngine(KALISTAR_DATA),registry,userId:profile,
    getDraft:()=>structuredClone(parentDraft),
    onDraft:next=>{
      if(failDraft)throw new Error('Parent refuses draft');
      calls.push(structuredClone(next)); parentDraft={name:next.name,cards:next.cards.filter(id=>id!==null)};
      localStorage.setItem('test-pref-'+profile,JSON.stringify(parentDraft));
      if(remountOnDraft){builder.destroy();builder.refresh();builder.mount(document.querySelector('#root'));}
    },onPlay:()=>{plays++},onDetail:()=>{},toast:message=>messages.push(message)});
  builder.mount(document.querySelector('#root'));
};setup();
</script></html>`;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/__deck-test.html') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(harness); }
  const file = path.resolve(__dirname, '.' + decodeURIComponent(pathname));
  if (!file.startsWith(__dirname + path.sep)) return res.writeHead(403).end();
  try {
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
let browser, context, page;
const slot = (i, action = 'slot') => page.locator(`[data-deck-action="${action}"][data-slot="${i}"]`);
const state = () => page.evaluate(() => builder.inspect());
async function fresh(draft) {
  await page.evaluate(draft => setup(draft ? { draft } : {}), draft);
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function point(i, action = 'slot') {
  const box = await slot(i, action).boundingBox(); assert.ok(box); return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function startMouse(from, to) {
  const a = await point(from), b = await point(to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 12, a.y + 4); await page.mouse.move(b.x, b.y, { steps: 8 });
}
async function mouseSwap(from, to) { await startMouse(from, to); await page.mouse.up(); }
async function expectSwap(before, from, to) {
  const wanted = before.slice(); [wanted[from], wanted[to]] = [wanted[to], wanted[from]];
  assert.deepEqual((await state()).draft.cards, wanted);
  assert.equal(await page.evaluate(() => calls.length), before[from] === before[to] ? 0 : 1);
  assert.equal(await page.locator('.kdb-drag-ghost').count(), 0);
  assert.equal(await page.locator('.is-reordering').count(), 0);
}
async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); if (!screenshotMode) console.log('PASS ' + name); }
  catch (error) { results.push({ name, ok: false, error: error.stack }); failures.push(name); if (!screenshotMode) console.error('FAIL ' + name + '\n' + error.stack); }
  await page.mouse.up().catch(() => {});
}
async function geometry(width, height) {
  await page.setViewportSize({ width, height }); await fresh();
  await page.waitForFunction(() => [...document.querySelectorAll('.kdb-slot-image img')].every(img => img.complete && img.naturalWidth > 0));
  return page.evaluate(() => {
    const slots = [...document.querySelectorAll('.kdb-slot')].map(n => n.getBoundingClientRect().toJSON());
    const grid = document.querySelector('.kdb-slots'), composition = document.querySelector('.kdb-composition');
    const preview = document.querySelector('.kdb-preview');
    return { width:innerWidth, height:innerHeight, bodyOverflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,
      gridWidth:grid.getBoundingClientRect().width, compositionWidth:composition.getBoundingClientRect().width,
      slots, previewWidth:preview.getBoundingClientRect().width,
      innerScrollers:[...document.querySelectorAll('.kdb-page *')].filter(n=>/^(auto|scroll)$/.test(getComputedStyle(n).overflowY)&&n.scrollHeight>n.clientHeight+1).length,
      horizontalClipped:[...document.querySelectorAll('.kdb-page button,.kdb-page input,.kdb-page select')].filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.left<0||r.right>innerWidth+1}).length };
  });
}
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
    page = await context.newPage(); page.on('pageerror', error => browserErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/__deck-test.html`);
    await test('mouse swaps across rows once, without changing ownership or play validity', async () => {
      await fresh(); const before = await state(); await mouseSwap(0, 8); await expectSwap(baseline, 0, 8);
      assert.deepEqual((await state()).coverage, before.coverage); assert.equal((await state()).playable, true);
      assert.equal(await page.evaluate(() => plays), 0); assert.equal(await page.evaluate(() => parentClicks), 0);
    });
    await test('mouse exchanges filled and empty slots, compact refresh preserves holes', async () => {
      const cards = baseline.slice(); cards[7] = null; await fresh({ name: 'Holes', cards });
      await mouseSwap(2, 7); await expectSwap(cards, 2, 7);
      const expected = (await state()).draft.cards; await page.evaluate(() => builder.refresh()); assert.deepEqual((await state()).draft.cards, expected);
    });
    await test('empty slot itself can be the drag source', async () => {
      const cards = baseline.slice(); cards[0] = null; await fresh({ name: 'Empty source', cards });
      await mouseSwap(0, 9); await expectSwap(cards, 0, 9);
    });
    await test('dragging identical copies or dropping on source emits nothing', async () => {
      const cards = baseline.slice(); cards[1] = cards[0]; await fresh({ name: 'Copies', cards });
      await mouseSwap(0, 1); await expectSwap(cards, 0, 1); await mouseSwap(0, 0); await expectSwap(cards, 0, 0);
    });
    await test('ordinary card click still selects and never rearranges', async () => {
      await fresh(); await slot(4).click(); assert.equal((await state()).targetSlot, 4);
      assert.deepEqual((await state()).draft.cards, baseline); assert.equal(await page.evaluate(() => calls.length), 0);
    });
    await test('Escape cancels staged mouse swap without emitting a draft', async () => {
      await fresh(); await startMouse(0, 8); await page.keyboard.press('Escape'); await page.mouse.up();
      assert.deepEqual((await state()).draft.cards, baseline); assert.equal(await page.evaluate(() => calls.length), 0);
      assert.equal(await page.locator('.kdb-drag-ghost').count(), 0);
    });
    await test('dropping outside this grid never commits', async () => {
      await fresh(); await startMouse(0, 8); await page.mouse.move(1435, 100); await page.mouse.up();
      assert.deepEqual((await state()).draft.cards, baseline); assert.equal(await page.evaluate(() => calls.length), 0);
    });
    await test('pointercancel, lost capture, blur and pagehide clean up staged drag', async () => {
      for (const type of ['pointercancel', 'lostpointercapture', 'blur', 'pagehide']) {
        await fresh(); await startMouse(0, 8);
        await page.evaluate(type => {
          if (type === 'blur' || type === 'pagehide') window.dispatchEvent(new Event(type));
          else document.querySelector('[data-deck-action=slot][data-slot="0"]').dispatchEvent(new PointerEvent(type, { bubbles:true, pointerId:1 }));
        }, type);
        await page.mouse.up(); assert.deepEqual((await state()).draft.cards, baseline); assert.equal(await page.evaluate(() => calls.length), 0);
        assert.equal(await page.locator('.kdb-drag-ghost').count(), 0);
      }
    });
    await test('refresh during a drag cancels against a changed external draft', async () => {
      await fresh(); await startMouse(0, 8);
      await page.evaluate(() => { parentDraft={name:'External',cards:parentDraft.cards.slice().reverse()}; builder.refresh(); }); await page.mouse.up();
      assert.deepEqual((await state()).draft.cards, baseline.slice().reverse()); assert.equal(await page.evaluate(() => calls.length), 0);
    });
    await test('destroy and repeated mount remove captures and do not duplicate listeners', async () => {
      await fresh(); await startMouse(0, 8); await page.evaluate(() => builder.destroy()); await page.mouse.up();
      assert.equal(await page.locator('.kdb-drag-ghost').count(), 0);
      assert.equal(await page.evaluate(() => calls.length), 0);
      await page.evaluate(() => { for(let i=0;i<5;i++){builder.mount(document.querySelector('#root'));builder.destroy();}builder.mount(document.querySelector('#root')); });
      await mouseSwap(1, 9); await expectSwap(baseline, 1, 9);
    });
    await test('parent remounting synchronously in onDraft commits only once', async () => {
      await fresh(); await page.evaluate(() => remountOnDraft=true); await mouseSwap(0, 8); await expectSwap(baseline, 0, 8);
    });
    await test('parent callback failure restores the previous composition', async () => {
      await fresh(); await page.evaluate(() => failDraft=true); await mouseSwap(0, 8);
      assert.deepEqual((await state()).draft.cards, baseline); assert.equal(await page.evaluate(() => messages.at(-1)), 'Parent refuses draft');
    });
    await test('keyboard handle, arrows and Enter swap with no native click double-commit', async () => {
      await fresh(); await slot(0, 'reorder').focus(); await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
      await expectSwap(baseline, 0, 6);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.slot), '6');
    });
    await test('keyboard Escape and Tab cancel, grid arrows never wrap past a row', async () => {
      await fresh(); await slot(0, 'reorder').focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.slot), '0');
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape');
      assert.equal(await page.locator('.is-reordering').count(), 0); assert.equal(await page.evaluate(() => calls.length), 0);
      await slot(0, 'reorder').click(); await page.keyboard.press('Tab'); assert.equal(await page.locator('.is-reordering').count(), 0);
    });
    await test('two clicks on handle then destination provide a non-drag alternative', async () => {
      await fresh(); await slot(0, 'reorder').click(); await slot(8).click(); await expectSwap(baseline, 0, 8);
    });
    await test('saved named deck preserves reordered nulls after a new instance', async () => {
      const cards = baseline.slice(); cards[7] = null; await fresh({ name:'Paris ordre', cards });
      await mouseSwap(0, 7); const expected = (await state()).draft.cards;
      await page.locator('[data-deck-action=save]').click(); const saved = (await state()).selectedId; assert.ok(saved);
      await fresh(); await page.locator('[data-deck-action=select]').selectOption(saved);
      assert.deepEqual((await state()).draft.cards, expected); assert.equal((await state()).draft.name, 'Paris ordre');
      await page.evaluate(() => setup({userId:'user-tokyo'}));
      assert.equal(await page.locator('[data-deck-action=select] option').count(), 1);
      assert.equal((await state()).playable, false);
    });
    await test('unavailable draft cards may be reordered but remain unavailable for play', async () => {
      await fresh(); await page.evaluate(() => {pending.add('30000007');builder.refresh();});
      await mouseSwap(0, 8); await expectSwap(baseline, 0, 8); assert.equal((await state()).playable, false);
    });
    await test('recruit drop rechecks ownership after a transfer starts during the drag', async () => {
      await fresh();
      const add=page.locator('.kdb-candidate [data-deck-action=add]:enabled').first(),id=await add.getAttribute('data-id');
      const source=await page.locator(`[data-deck-recruit="${id}"]`).boundingBox(),to=await point(0);
      await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});
      await page.evaluate(id=>pending.add(id),id);await page.mouse.up();
      assert.deepEqual((await state()).draft.cards,baseline);assert.equal(await page.evaluate(()=>calls.length),0);
      assert.equal(await page.locator('.kdb-drag-ghost').count(),0);assert.match(await page.evaluate(()=>messages.at(-1)),/disponible/);
    });
    await test('viewport composition has two rows of five with no hidden slots or scrollbars at four sizes', async () => {
      for (const [width,height] of [[2560,1440],[1440,900],[390,844],[320,700]]) {
        const g = await geometry(width,height);
        assert.equal(g.bodyOverflow,false,JSON.stringify(g)); assert.equal(g.horizontalClipped,0,JSON.stringify(g)); assert.equal(g.innerScrollers,0);
        assert.equal(g.slots.length,10); assert.ok(g.gridWidth<=g.compositionWidth);
        assert.ok(g.slots.every(s=>s.top>=0&&s.bottom<=height&&s.left>=0&&s.right<=width),JSON.stringify(g));
        assert.equal(new Set(g.slots.map(s=>Math.round(s.y))).size,2);
        assert.equal(new Set(g.slots.slice(0,5).map(s=>Math.round(s.y))).size,1);
        if(width>=1440)assert.ok(g.previewWidth>=240);
      }
    });
    await test('right preview and recruitment remain simultaneously visible without scrolling', async () => {
      await page.setViewportSize({width:1440,height:900}); await fresh();
      await page.locator('.kdb-browser').scrollIntoViewIfNeeded();
      const boxes=await page.locator('.kdb-preview,.kdb-browser').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));
      assert.ok(boxes.every(b=>b.top>=0&&b.bottom<=900));assert.equal(await page.evaluate(()=>scrollY),0);
    });
    await test('real touch pointer swaps via the grip with no page panning', async () => {
      await context.close(); context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
      page = await context.newPage(); page.on('pageerror',e=>browserErrors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/__deck-test.html`);
      const client = await context.newCDPSession(page), a = await point(0,'reorder'), b = await point(8);
      assert.equal(await slot(0).evaluate(n=>getComputedStyle(n).touchAction),'none');
      assert.equal(await slot(0,'reorder').evaluate(n=>getComputedStyle(n).touchAction),'none');
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+12,y:a.y+5,id:0}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expectSwap(baseline,0,8); await client.detach();
    });
    await test('touch cancellation and a second finger leave the draft untouched', async () => {
      const client = await context.newCDPSession(page);
      for(const multitouch of [false,true]){
        await fresh();const a=await point(0,'reorder'),b=await point(8);
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0}]});
        if(multitouch)await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...b,id:0},{x:b.x+30,y:b.y+30,id:1}]});
        await client.send('Input.dispatchTouchEvent',{type:multitouch?'touchEnd':'touchCancel',touchPoints:[]});
        assert.deepEqual((await state()).draft.cards,baseline);assert.equal(await page.evaluate(()=>calls.length),0);assert.equal(await page.locator('.kdb-drag-ghost').count(),0);
      }
      await client.detach();
    });
    await test('touch recruitment opens the composition and replaces only the dropped slot', async () => {
      await fresh();await page.locator('[data-deck-action=panel][data-id=inspect]').click();
      const add=page.locator('.kdb-candidate [data-deck-action=add]:enabled').first(),id=await add.getAttribute('data-id');
      const source=await page.locator(`[data-deck-recruit="${id}"]`).boundingBox(),a={x:source.x+source.width/2,y:source.y+source.height/2};
      const client=await context.newCDPSession(page);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x,y:a.y-16,id:0}]});
      assert.equal(await page.locator('.kdb-page').getAttribute('data-panel'),'board');const b=await point(0);
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const expected=baseline.slice();expected[0]=id;assert.deepEqual((await state()).draft.cards,expected);assert.equal(await page.evaluate(()=>calls.length),1);
      assert.equal(await page.locator('.kdb-drag-ghost').count(),0);await client.detach();
    });
    await test('Chromium reports no uncaught errors including repaint focus events', async()=>{assert.deepEqual(browserErrors,[]);});
    if(screenshotMode){
      for(const [width,height]of [[1440,1100],[390,844]]){
        await page.setViewportSize({width,height});await fresh();
        await page.waitForFunction(()=>[...document.querySelectorAll('.kdb-slot-image img,.kdb-preview-image')].every(n=>n.complete));
        const buffer=await runtime('sharp')(await page.screenshot()).resize({width:Math.min(1100,width)}).jpeg({quality:48}).toBuffer();
        pictures.push({width,height,base64:buffer.toString('base64')});
      }
    }
  } catch(error){failures.push(error.stack);if(!screenshotMode)console.error(error.stack);}
  finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
  if(screenshotMode)console.log(JSON.stringify({results,failures,pictures}));
  else console.log(`${results.filter(r=>r.ok).length}/${results.length} browser tests passed`);
  process.exitCode=failures.length?1:0;
})();
