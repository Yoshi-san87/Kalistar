'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__weapon_cards_browser__.cjs'))('playwright');
const {weapons}=require('./weapons.js');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-03-collectible-weapons/qa-refinement');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',results=[],errors=[];let browser;
async function loaded(page){
  await page.waitForFunction(()=>[...document.querySelectorAll('.weapon-card img')].every(i=>i.complete&&i.naturalWidth>0));
  await page.evaluate(()=>document.fonts.ready);
}
async function layout(page,label){
  const samples=await page.locator('.weapon-card:visible .wc-surface').evaluateAll(cards=>cards.map(c=>{
    const box=c.getBoundingClientRect(),med=c.querySelector('.wc-medallion').getBoundingClientRect();
    return {id:c.dataset.weaponCard,ratio:box.width/box.height,medallionRatio:med.width/med.height,
      background:(()=>{const bg=c.querySelector('.wc-art-background'),main=c.querySelector('.wc-art-main');if(!bg)return null;
        const b=bg.getBoundingClientRect(),m=main.getBoundingClientRect();return {loaded:bg.complete&&bg.naturalWidth>0,hidden:bg.getAttribute('aria-hidden'),alt:bg.alt,
          fit:getComputedStyle(main).objectFit,filter:getComputedStyle(main).filter,above:Number(getComputedStyle(main).zIndex)>Number(getComputedStyle(bg).zIndex||0),
          boundsMatch:Math.abs(b.x-m.x)<1&&Math.abs(b.y-m.y)<1&&Math.abs(b.width-m.width)<1&&Math.abs(b.height-m.height)<1};})(),
      rules:[...c.querySelectorAll('.wc-rule')].map(n=>({label:n.getAttribute('aria-label'),align:getComputedStyle(n).textAlign,color:getComputedStyle(n).color,icon:!!n.querySelector('svg.lucide')})),
      medallionOffset:[(med.left-box.left)/box.width,(med.top-box.top)/box.height],
      fields:[...c.querySelectorAll('.wc-title,.wc-flavour,.wc-activation-title,.wc-activation,.wc-power,.wc-bearers')].map(n=>{
        const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const text=range.getBoundingClientRect();
        return {field:n.className,width:r.width,height:r.height,overflow:n.scrollHeight-n.clientHeight,textInset:[text.left-r.left,text.top-r.top,r.right-text.right,r.bottom-text.bottom],
          insideCard:r.left>=box.left-.5&&r.right<=box.right+.5&&r.top>=box.top-.5&&r.bottom<=box.bottom+.5,
          textFits:text.left>=r.left-1&&text.right<=r.right+1&&text.top>=r.top-1&&text.bottom<=r.bottom+1};
      })};
  }));
  fs.writeFileSync(path.join(out,'latest-layout.json'),JSON.stringify({label,samples},null,2));
  for(const card of samples){
    assert(Math.abs(card.ratio-1.4)<.002,label+' poker ratio');
    assert(Math.abs(card.medallionRatio-1)<.005,label+' medallion stays circular');
    assert(Math.abs(card.medallionOffset[0]-.00315789)<.001&&Math.abs(card.medallionOffset[1]+.00117904)<.001,label+' medallion at requested top-left anchor');
    assert.equal(card.rules.length,2);assert.match(card.rules[0].label,/^Condition :/);
    const weapon=weapons.find(w=>w.id===card.id);assert(card.rules[1].label.startsWith('Effet : +'+weapon.effect.value+' '+weapon.effect.stat));
    assert.equal(card.background,null,label+' single painted scene, no separate backdrop');
    assert(card.rules.every(r=>r.align==='left'&&r.icon),label+' left-aligned condition and effect with loaded icons');
    assert.notEqual(card.rules[0].color,card.rules[1].color,label+' distinct condition and effect colors');
    for(const f of card.fields){assert(f.insideCard,label+' '+f.field+' in frame');assert(f.overflow<=1&&f.textFits,label+' '+card.id+' '+JSON.stringify(f));}
  }
  assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),label+' no horizontal overflow');
  results.push({label,samples});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion] of [['desktop',1440,1000,'no-preference'],['wide',1920,1080,'no-preference'],['laptop',1280,900,'no-preference'],['tablet',1024,900,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,650,'reduce']]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,String(name)+'-weapon-card-qa-only',version);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/jeu/#weapons');await page.waitForFunction(()=>window.KALISTAR_READY);await loaded(page);
    await page.screenshot({path:path.join(out,name+'-arsenal.png'),fullPage:true});await layout(page,name+' arsenal');
    assert.equal(await page.locator('.weapon-entry').count(),weapons.length);
    if(width>=1200){
      const geometry=await page.evaluate(()=>{
        const list=document.querySelector('.weapons-list');
        return {columns:getComputedStyle(list).gridTemplateColumns.split(' ').length,width:document.querySelector('.weapons-page').getBoundingClientRect().width,
          rects:[...list.children].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y};})};
      });
      assert.equal(geometry.columns,6);assert(geometry.width>=width-2,'full-width arsenal');
      assert.equal(geometry.rects[5].y,geometry.rects[0].y);assert(geometry.rects[6].y>geometry.rects[0].y,'seventh wraps');
      await loaded(page);await page.screenshot({path:path.join(out,name+'-six-columns-qa.png'),fullPage:true});
    }
    await page.locator('.weapon-filter').selectOption('equipped');assert.equal(await page.locator('.weapon-entry').count(),0);
    await page.locator('[data-weapon-action=reset-filter]').click();assert.equal(await page.locator('.weapon-entry').count(),weapons.length);
    await page.locator('.weapon-filter').selectOption('family:Hache');assert.equal(await page.locator('.weapon-entry').count(),1);
    await page.locator('.weapon-filter').selectOption('stat:DEF');assert.equal(await page.locator('.weapon-entry').count(),weapons.filter(w=>w.effect.stat==='DEF').length);
    await page.locator('.weapon-filter').selectOption('all');
    await page.locator('.weapons-page [data-weapon-holder=little-joys-flute]').click();await loaded(page);
    assert(await page.locator('[data-weapon-action=equip][data-character=momo]').evaluate(n=>document.activeElement===n),'plus goes directly to compatible equipment action');
    await page.screenshot({path:path.join(out,name+'-flute-detail.png'),fullPage:true});await layout(page,name+' detail');
    const full=await page.evaluate(()=>KalistarWeapons.weapons[1].lore);
    assert.equal(await page.locator('.weapon-lore').textContent(),full,'complete narrative remains readable in detail');
    assert(await page.locator('[data-weapon-action=equip][data-character=momo]').isVisible());
    await page.locator('[data-weapon-action=equip][data-character=momo]').click();
    await page.waitForFunction(()=>document.querySelector('.weapons-page [data-weapon="little-joys-flute"] .wc-holder.is-filled img'));
    await loaded(page);assert.equal(await page.locator('#weapons-dialog .wc-holder img').getAttribute('alt'),'MOMO');
    await page.screenshot({path:path.join(out,name+'-equipped-detail.png'),fullPage:true});
    await page.locator('[data-weapon-action=close]').click();
    await page.locator('.weapon-filter').selectOption('equipped');assert.equal(await page.locator('.weapon-entry').count(),1);
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await loaded(page);
    assert(await page.locator('.weapons-page [data-weapon="little-joys-flute"] .wc-holder.is-filled img').isVisible(),'equipped portrait survives reload');
    await page.locator('.weapons-page [data-weapon-holder=little-joys-flute]').click();
    await page.locator('[data-weapon-action=unequip][data-character=momo]').click();
    await page.waitForFunction(()=>document.querySelector('#weapons-dialog .wc-holder.is-empty .lucide-plus'));
    await page.locator('[data-weapon-action=close]').click();
    if(name==='desktop'){
      const orbit=page.locator('[data-weapon=fallen-king-axe] .eq-orbit');await page.locator('[data-weapon=fallen-king-axe]').hover();
      assert.equal(await orbit.evaluate(n=>getComputedStyle(n).animationIterationCount),'infinite');
      await page.waitForFunction(()=>!document.querySelector('#toast')?.classList.contains('visible'));
      for(const {id} of weapons){
        await page.evaluate(id=>{
          document.querySelector('#app').innerHTML=`<section class="weapons-page" style="padding:0;max-width:none"><div class="weapon-card" style="width:1400px;margin:20px">${KalistarWeaponCards.markup(KalistarWeapons.weapons.find(w=>w.id===id),{cards:KALISTAR_DATA.cards,medallion:KalistarEquipmentFX.markup})}</div></section>`;
          document.querySelectorAll('.eq-orbit,.eq-radar').forEach(n=>n.style.animation='none');
          lucide.createIcons();
        },id);
        await page.setViewportSize({width:1440,height:1080});await loaded(page);
        assert.equal(await page.locator('#app .wc-surface').evaluate(n=>n.clientWidth),1400,'native collectible export width');
        await layout(page,'export '+id);
        await page.locator('#app .wc-surface').screenshot({path:path.join(out,id+'-card.png')});
      }
    }
    if(motion==='reduce')assert.equal(await page.locator('.weapon-card .eq-orbit').first().evaluate(n=>getComputedStyle(n).animationName),'none');
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,errors,results},null,2));
  console.log(JSON.stringify({passed:true,checks:results.length,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
