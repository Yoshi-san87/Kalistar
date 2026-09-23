'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_versions__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304',output=path.join(__dirname,'verification/collection-versions');
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/jeu/');await page.waitForFunction(()=>window.KALISTAR_READY);
  const fixture=await page.evaluate(()=>{
    const versions=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO').sort((a,b)=>a.id.localeCompare(b.id));
    const original=KALISTAR_DB.registry,user=KALISTAR_ACTIVE_USER,copy=original.owned(user,versions[0].id)[0];
    // A read-only count adapter: the first version owns two copies, the second one.
    KALISTAR_DB.registry={...original,owned:(u,id)=>{const items=original.owned(u,id);return u===user&&(!id||id===copy.cardId)?[...items,{...copy,id:'version-test-copy'}]:items;}};
    return {versions:versions.map(c=>({id:c.id,title:c.title})),character:versions[0].characterId||versions[0].id};
  });
  const [first,second]=fixture.versions;
  assert.equal(fixture.versions.length,2);
  const pocket=page.locator('.cb-pocket[data-character="'+fixture.character+'"]');
  const waitCard=id=>page.waitForFunction(({character,id})=>[...document.querySelectorAll('.cb-pocket')].some(n=>n.dataset.character===character&&n.dataset.cardId===id),{character:fixture.character,id});
  const readyImages=()=>page.waitForFunction(()=>[...document.querySelectorAll('.cb-stack img,.cb-hero-image')].every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
  await page.locator('[data-binder-action=scope][data-id=catalogue]').click();
  await readyImages();
  assert.equal(await pocket.locator('.cb-copy-count b').textContent(),'2');
  assert.equal(await pocket.locator('.cb-version-count b').textContent(),'2');
  const folio=await page.locator('.cb-page-label').textContent(),before=await pocket.boundingBox();
  await pocket.locator('[data-binder-action=cycle-version]').click();await waitCard(second.id);
  assert.equal(await page.locator('.cb-page').getAttribute('data-mode'),'book');
  assert.equal(await page.locator('.cb-page-label').textContent(),folio);
  assert.deepEqual(await pocket.boundingBox(),before,'cycling preserves the book geometry');
  assert.equal(await pocket.locator('.cb-copy-count b').textContent(),'1');
  assert.match(await pocket.locator('.cb-card').getAttribute('aria-label'),new RegExp(second.title));
  assert.equal(await pocket.locator('[data-binder-action=favorite]').getAttribute('data-id'),second.id);
  assert.equal(await pocket.locator('[data-binder-action=cycle-version]').evaluate(n=>n===document.activeElement),true,'keyboard focus follows the new version');
  await pocket.locator('[data-binder-action=cycle-version]').press('Enter');await waitCard(first.id);
  for(const [width,height] of [[2041,1383],[1440,1000],[1024,768],[412,1007],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});await readyImages();
    await page.screenshot({path:path.join(output,`book-${width}x${height}.png`),scale:'css'});
    const fits=await pocket.locator('.cb-caption').evaluate(n=>{
      const box=n.getBoundingClientRect();return [...n.querySelectorAll('.cb-copy-count,h2,.cb-version-count,.cb-icon')].every(c=>{const r=c.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1;});
    });
    assert.ok(fits,'caption counters fit at '+width+'x'+height);
    const inline=await pocket.locator('.cb-caption').evaluate(n=>{
      const [copies,versions,name]=['.cb-copy-count','.cb-version-count','h2'].map(s=>n.querySelector(s).getBoundingClientRect());
      const center=r=>r.top+r.height/2;
      return copies.right<=versions.left&&versions.right<=name.left&&Math.abs(center(copies)-center(versions))<1&&Math.abs(center(versions)-center(name))<1;
    });
    assert.ok(inline,'copies, versions and character name share one line in that order at '+width+'x'+height);
    assert.ok((await pocket.locator('.cb-card').boundingBox()).height>=120,'cards retain a readable height at '+width+'x'+height);
    await pocket.locator('.cb-card').click();
    const notes=page.locator('[data-binder-action=pane][data-id=notes]');if(await notes.isVisible())await notes.click();
    assert.deepEqual(await page.locator('.cb-versions button span').allTextContents(),fixture.versions.map(v=>v.title));
    assert.equal(await page.locator('.cb-versions button[aria-pressed=true]').count(),1);
    const geometry=await page.locator('.cb-reading').evaluate(n=>{
      const paragraph=n.querySelector('.cb-story p'),story=n.querySelector('.cb-story'),content=n.querySelector('.cb-read-content'),style=getComputedStyle(paragraph),active=n.querySelector('.cb-versions [aria-pressed=true]'),inactive=n.querySelector('.cb-versions [aria-pressed=false]'),rect=n.getBoundingClientRect();
      return {font:parseFloat(style.fontSize),weight:Number(style.fontWeight),shadow:style.textShadow,inset:story.getBoundingClientRect().left-content.getBoundingClientRect().left,contrast:getComputedStyle(active).backgroundColor!==getComputedStyle(inactive).backgroundColor,labels:[...n.querySelectorAll('.cb-versions button span')].every(s=>getComputedStyle(s).display!=='none'&&s.getBoundingClientRect().right<=rect.right),overlap:n.querySelector('.cb-versions').getBoundingClientRect().bottom>n.querySelector('.cb-reading-tabs').getBoundingClientRect().top+1};
    });
    assert.ok(geometry.weight>=600&&geometry.inset>=7&&geometry.shadow==='none','stronger ink without a shadow: '+JSON.stringify(geometry));
    assert.equal(geometry.font,width<=699||width<=950&&height<=500?17:height<=850?15:19,'story font size unchanged');
    assert.ok(geometry.contrast&&geometry.labels&&!geometry.overlap,'readable named versions: '+JSON.stringify(geometry));
    await page.locator('.cb-story p').scrollIntoViewIfNeeded();
    const storyReachable=await page.locator('.cb-story p').evaluate(n=>{
      const r=n.getBoundingClientRect(),leaf=n.closest('.cb-workbench').getBoundingClientRect(),y=Math.max(r.top,leaf.top)+Math.min(r.height,leaf.height)/2;
      return n.closest('.cb-read-content').clientHeight>0&&document.elementsFromPoint(r.left+r.width/2,y).includes(n);
    });
    assert.ok(storyReachable,'the story remains reachable on a short leaf at '+width+'x'+height);
    await readyImages();await page.screenshot({path:path.join(output,`reader-${width}x${height}.png`),scale:'css'});
    await page.locator('.cb-versions [data-id="'+second.id+'"]').click();
    assert.equal(await page.locator('.cb-versions [aria-pressed=true]').getAttribute('data-id'),second.id);
    assert.equal(await page.locator('.cb-card-heading p').textContent(),second.title);
    await page.locator('[data-binder-action=back]').click();await waitCard(second.id);
    await pocket.locator('[data-binder-action=cycle-version]').click();await waitCard(first.id);
  }
  await page.setViewportSize({width:1440,height:1000});await readyImages();await page.emulateMedia({reducedMotion:'no-preference'});
  await pocket.locator('[data-binder-action=cycle-version]').click();
  await page.waitForSelector('.cb-stack[data-cycling=true]');
  const frame=await pocket.locator('.cb-stack').evaluate(n=>{
    const animations=n.getAnimations({subtree:true});animations.forEach(a=>{a.pause();a.currentTime=320;});
    return {count:animations.length,front:getComputedStyle(n.querySelector('.cb-card')).transform,back:getComputedStyle(n.querySelector('.cb-layer-0')).transform};
  });
  assert.equal(frame.count,2);assert.notEqual(frame.front,'none');assert.notEqual(frame.front,frame.back);
  await page.screenshot({path:path.join(output,'version-swap-midpoint.png'),scale:'css'});
  await pocket.locator('[data-binder-action=cycle-version]').evaluate(n=>{n.click();n.click();});
  await pocket.locator('.cb-stack').evaluate(n=>n.getAnimations({subtree:true}).forEach(a=>a.finish()));await waitCard(second.id);
  assert.equal(await pocket.locator('[aria-busy=true]').count(),0,'rapid clicks do not leave the stack busy');
  await pocket.locator('[data-binder-action=cycle-version]').click();await page.waitForSelector('.cb-stack[data-cycling=true]');
  await page.locator('[data-binder-field=search]').fill('AELIS');
  await page.waitForTimeout(700);assert.equal(await pocket.count(),0,'filter change cancels the previous animation');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-binder-field=search]').fill(first.title);
  assert.equal(await pocket.locator('.cb-version-count b').textContent(),'1');
  assert.equal(await pocket.locator('[data-binder-action=cycle-version]').count(),0,'cycling never bypasses a filter');
  await page.locator('[data-binder-field=search]').fill('');
  await page.evaluate(id=>{const registry=KALISTAR_DB.registry;KALISTAR_DB.registry={...registry,owned:(u,c)=>registry.owned(u,c).filter(i=>i.cardId!==id)};},second.id);
  await page.locator('[data-binder-action=scope][data-id=owned]').click();
  assert.equal(await pocket.locator('.cb-version-count b').textContent(),'1');
  assert.equal(await pocket.locator('[data-binder-action=cycle-version]').count(),0,'owned scope does not reveal an unowned version');
  assert.deepEqual(errors,[]);
  console.log('PASS: named/selected versions, unchanged type sizes, stronger manuscript ink, copy/version counts, filtered/owned cycling, keyboard focus, animated swap, rapid clicks, cancellation and seven responsive sizes.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
