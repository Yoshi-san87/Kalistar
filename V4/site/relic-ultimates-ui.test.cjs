'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const catalogue=require('./weapons.js'),cards=require('./weapon-cards.js'),art=require('./weapon-art.js');
const source=fs.readFileSync(path.join(__dirname,'equipment-presentation.js'),'utf8');
const effects={
  'little-joys-box':{trigger:'OUTNUMBERED_GIFT',trait:'luck',event:'TARGETED',recipient:'allies',duration:'ONCE_MATCH'},
  'white-materia':{trigger:'OUTNUMBERED_GIFT',trait:'reraise',event:'ELIMINATED',recipient:'choice',duration:'ONCE_MATCH'},
  'pod-042':{trigger:'TACTICAL_REPRISAL',stat:'ATK',value:60,duration:'NEXT_TARGET_ATTACK'}
};
const relics=Object.entries(effects).map(([id,effect])=>({...catalogue.weapons.find(w=>w.id===id),effect}));
function fixture(){
  const children=[],image={offsetLeft:0,offsetTop:0,naturalWidth:797,naturalHeight:1388,addEventListener(){}},container={querySelector:()=>image,append:n=>children.push(n),closest:()=>null};
  const window={KalistarWeapons:catalogue,KalistarWeaponArt:art,addEventListener(){}};
  vm.runInNewContext(source,{window,matchMedia:()=>({matches:false,addEventListener(){}}),performance:{now:()=>0},AbortController,
    KalistarCardMedia:{crop:require('./card-media.js').crop},getComputedStyle:()=>({width:'180',height:'313.47',objectFit:'contain'}),ResizeObserver:class{observe(){}disconnect(){}},
    document:{createElement:()=>({dataset:{},style:{setProperty(){}},setAttribute(k,v){this[k]=v;},remove(){this.removed=true;}})}});
  return {fx:window.KalistarEquipmentFX,children,container};
}
test('trait relic card and medallion labels never invent numeric bonuses',()=>{
  const {fx}=fixture();
  for(const w of relics){
    const html=cards.markup(w,{medallion:fx.markup});
    assert(!/undefined|\+0\b/.test(html),w.id);assert(!/undefined|\+0\b/.test(fx.markup(w)),w.id);
    if(w.effect.trait){assert(html.includes(cards.effectLabel(w)));assert(!/\+\d/.test(html));assert(html.includes('wc-power-trait'));}
    else assert.equal(cards.effectLabel(w),'+60 ATK');
  }
  assert.equal(cards.effectLabel(relics[0]),'Tr\u00e8fles alli\u00e9s');assert.equal(cards.effectLabel(relics[1]),'Reraise');
  for(const file of ['deck-builder.js','weapons-ui.js','app.js'])assert.match(fs.readFileSync(path.join(__dirname,file),'utf8'),/KalistarWeaponCards\.effectLabel/);
});
test('rule copy preserves accepted hostility, definitive death, uncharged active allies and kept exact-target riposte',()=>{
  const momo=cards.activation(relics[0]),aeris=cards.activation(relics[1]),pod=cards.activation(relics[2]);
  assert.match(momo.condition,/ennemie accept\u00e9e/);assert.match(momo.condition,/Mort/);assert.match(momo.effect,/autres alli\u00e9s actifs sans tr\u00e8fle, avant/);assert.match(momo.duration,/m\u00eame si Momo meurt/);
  assert.match(aeris.condition,/d\u00e9but du duel.*d\u00e9finitivement/);assert.match(aeris.effect,/autre alli\u00e9 actif sans Reraise, au choix/);
  assert.match(pod.condition,/Survit.*ATK num\u00e9rique avantag\u00e9e/);assert.match(pod.condition,/arme, cristal, faction, ar\u00e8ne/);
  assert.equal(pod.effect,'+60 ATK contre lui au prochain jet num\u00e9rique conserv\u00e9.');assert.equal(pod.duration,'1 fois. Annul\u00e9 si la cible meurt.');
});
test('only awakened ultimates overlay the printed medallion; inactive and spent leave it intact',()=>{
  const f=fixture();
  for(const [state,expected]of [[{ready:true},'ready'],[{active:true},'active'],[{ready:true,targetUid:'enemy-uid'},'mark']]){
    f.fx.mountDetail(f.container,{weapon:relics[0],slot:'relic',active:false,...state},{arena:true});
    const n=f.children.at(-1);assert.equal(n.dataset.relicState,expected);assert(n.className.includes('is-active'));assert(!n.innerHTML.includes('eq-tab'));assert(!n['aria-label'].includes('+'));
    assert.match(n['aria-label'],/Tr\u00e8fles alli\u00e9s/);
  }
  assert.match(f.children[2]['aria-label'],/enemy-uid/);
  for(const state of [{},{status:'spent'},{status:'spent',active:true},{status:'lost',targetUid:'dead-enemy'},{status:'choice'}]){
    f.fx.mountDetail(f.container,{weapon:relics[0],slot:'relic',active:false,...state},{arena:true});assert.equal(f.children.length,3,'no inactive or spent overlay is created');
  }
  f.fx.clearDetail();assert(f.children.every(n=>n.removed));
});
test('consumed Pod stays active for its riposte duel without advertising another target charge',()=>{
  const f=fixture(),state={weapon:relics[2],slot:'relic',status:'spent',active:true,ready:false,targetUid:'enemy-uid'};
  f.fx.mountDetail(f.container,state,{arena:true});
  const overlay=f.children[0];assert(overlay);assert.equal(overlay.dataset.relicState,'active');assert(overlay.className.includes('is-active'));
  assert.match(overlay['aria-label'],/Riposte active, \+60 ATK/);assert(!/enemy-uid|Cible|prochaine/.test(overlay['aria-label']));assert(!overlay.innerHTML.includes('eq-tab'));
  f.fx.mountDetail(f.container,{...state,active:false},{arena:true});
  assert(overlay.removed);assert.equal(f.children.length,1,'next duel restores the printed medallion');
  f.fx.mountDetail(f.container,{...state,status:'lost'},{arena:true});assert.equal(f.children.length,1,'a lost mark never becomes a riposte');
});
test('only new relic deltas play, including append-only grants and repeated signatures in another duel',()=>{
  const {fx}=fixture(),luck={kind:'luck',weaponId:relics[0].id,sourceUid:'momo',recipient:'ally'},mark={kind:'mark',weaponId:relics[2].id,sourceUid:'2b',targetUid:'enemy'};
  const before={matchId:'match',round:1,duel:{attacker:'a',target:'b',relicEvents:[luck]}},after=structuredClone(before);after.duel.relicEvents.push(mark);
  assert.equal(fx.newRelicEvents(before,after).length,1);assert.equal(fx.newRelicEvents(before,after)[0].targetUid,'enemy');
  assert.equal(fx.newRelicEvents(after,structuredClone(after)).length,0,'reload/repaint does not replay');
  assert.equal(fx.newRelicEvents(null,after).length,0);assert.equal(fx.newRelicEvents(before,{...after,matchId:'other'}).length,0);
  assert.equal(fx.newRelicEvents(after,{...after,round:2}).length,2,'new duel is a new visual delta');
  after.duel.relicEvents.reverse();assert.equal(fx.newRelicEvents({...after,duel:{...after.duel,relicEvents:[luck,mark]}},after).length,0);
  const choice=structuredClone(before);choice.duel.relicEvents.push({kind:'reraise',weaponId:relics[1].id,sourceUid:'dead-aeris',recipient:'ally'});
  assert.equal(fx.newRelicEvents(before,choice)[0].sourceUid,'dead-aeris');
});
test('acceptance paths and dead-source attribution keep the presentation contract',()=>{
  const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'weapons.css'),'utf8');
  assert.match(app,/if\(p==='kalistel'\).*animatedAcceptAttack\(\)/);assert.match(app,/action==='kalistel'\?animatedRoll\(true\):animatedAcceptAttack\(\)/);
  assert.match(app,/p=>\[\.\.\.p.board,\.\.\.p.reserve,\.\.\.p.dead\]/);assert.match(app,/gift.trait==='reraise'&&source/);
  assert.match(css,/prefers-reduced-motion:reduce.*eq-relic-emblem/);assert.match(source,/eventController\?\.abort\(\)/);
  assert(!/createElement\(['"]canvas|requestAnimationFrame|setInterval/.test(source),'no relic canvas or permanent JS effects loop');
});

test('browser: desktop/mobile relic states, dead donor, transient cleanup and reduced motion',{skip:process.env.KALISTAR_UI_BROWSER!=='1',timeout:120000},async()=>{
  const {createRequire}=require('node:module'),runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const {chromium}=createRequire(path.join(runtime,'__relic_ui__.cjs'))('playwright');
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],base='http://kalistar-relic.test',out=process.env.KALISTAR_VERIFICATION_DIR||path.join(require('node:os').tmpdir(),'kalistar-relic-ui');
  fs.mkdirSync(out,{recursive:true});
  try{
    for(const [name,width,height,motion]of [['desktop',1440,1000,'no-preference'],['mobile',412,1007,'no-preference'],['compact',320,740,'reduce']]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:motion});
      await context.route(base+'/**',async route=>{
        const request=new URL(route.request().url()),relative=decodeURIComponent(request.pathname).slice(1),file=path.resolve(__dirname,relative);
        if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
        const contentType={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'}[path.extname(file)]||'text/plain';
        await route.fulfill({path:file,contentType});
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      const reference=require('../atelier/data/references.json').cards[0];
      await page.route(base+'/native.png',route=>route.fulfill({path:path.resolve(__dirname,'../..',reference.png),contentType:'image/png'}));
      await page.route(base+'/fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/weapons.css"><link rel="stylesheet" href="/weapon-cards.css"><style>body{margin:0;background:#101b1b;color:white;--serif:Georgia;--sans:Arial;font-family:Arial}.formation{display:flex;gap:12px;padding:12px}.slot{position:relative;width:90px;flex:none}.slot-card{display:block;border:0;padding:0;width:100%;background:none}.slot-card>img{display:block;width:100%;height:auto}.slot-buffs{display:flex;gap:2px;flex-wrap:wrap}.duel-status{margin:12px}.cards{max-width:900px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:10px}@media(max-width:600px){.cards{grid-template-columns:1fr;max-width:400px}}button{color:inherit}</style></head><body><div class="duel-status">Dernier don</div><div class="formation"></div><div class="cards"></div><script src="/ultimate-definitions.js"></script><script src="/weapons.js"></script><script src="/weapon-art.js"></script><script src="/base-weapons.js"></script><script src="/card-media.js"></script><script src="/ultimate-ui.js"></script><script src="/equipment-presentation.js"></script><script src="/weapon-cards.js"></script></body></html>'}));
      await page.goto(base+'/fixture');
      // The site's own crop pipeline reads an approved card without changing it.
      await page.evaluate(({relics,weapon})=>{
        window.testRelics=relics;window.KalistarSite={url:p=>p.startsWith('/')?p:'/'+p};
        const image=KalistarCardMedia.image({pngUrl:'/native.png',weapon});
        document.querySelector('.formation').innerHTML=['momo','ally','enemy'].map(uid=>`<div class="slot" data-unit="${uid}"><button class="slot-card" aria-label="${uid}"><img src="${image}"></button><div class="slot-buffs"></div></div>`).join('');
        document.querySelector('.cards').innerHTML=relics.map(w=>KalistarWeaponCards.markup(w,{medallion:KalistarEquipmentFX.markup,url:p=>'/'+p})).join('');
        window.testState={matchId:'ui',round:1,phase:'defense',players:[{board:[{uid:'momo'},{uid:'ally'}],dead:[{uid:'dead-aeris'}]},{board:[{uid:'enemy'}],dead:[]}],equipment:{definitions:relics},duel:{attacker:'enemy',target:'momo',relicEvents:[]}};
        window.testEngine={card:u=>({name:u.uid}),equipmentViews:(s,u)=>u.uid==='momo'?[{weapon:relics[0],slot:'relic',active:false,ready:true}]:u.uid==='ally'?[{weapon:relics[2],slot:'relic',active:false,ready:true,targetUid:'enemy'}]:[]};
        KalistarEquipmentFX.mount(testState,testEngine);
      },{relics,weapon:reference.card.weapon});
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
      await page.waitForFunction(()=>[...document.querySelectorAll('.slot-card>img')].every(i=>i.naturalWidth===797));
      assert.equal(await page.locator('.eq-overlay[data-relic-state=ready]').count(),1);assert.equal(await page.locator('.eq-target-mark[data-target-uid=enemy]').count(),1);assert.equal(await page.locator('.eq-overlay .eq-tab').count(),0);
      assert(await page.locator('[data-unit=enemy] .slot-card').getAttribute('aria-describedby'));
      await page.evaluate(()=>{
        window.originalViews=testEngine.equipmentViews;window.podActive=true;
        testEngine.equipmentViews=(s,u)=>originalViews(s,u).map(r=>r.targetUid?{...r,status:'spent',ready:false,active:podActive}:r);
        KalistarEquipmentFX.mount(testState,testEngine);
      });
      const pod=page.locator('.eq-overlay[data-weapon-id=pod-042]');assert.equal(await pod.getAttribute('data-relic-state'),'active');assert.match(await pod.getAttribute('class'),/is-active/);
      assert.equal(await page.locator('.eq-target-mark').count(),0);assert.equal(await page.locator('[data-unit=enemy] .slot-card').getAttribute('aria-describedby'),null);
      assert.match(await page.locator('[data-unit=ally] .eq-relic-status').getAttribute('aria-label'),/Riposte active/);
      assert(!/prochaine|cible/.test(await page.locator('[data-unit=ally] .eq-relic-status').getAttribute('aria-label')));
      await page.evaluate(()=>{podActive=false;testState.round++;KalistarEquipmentFX.mount(testState,testEngine);});assert.equal(await pod.count(),0);
      await page.evaluate(()=>{testEngine.equipmentViews=originalViews;KalistarEquipmentFX.mount(testState,testEngine);});
      const overflows=await page.locator('.wc-activation,.wc-power').evaluateAll(ns=>ns.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>({cls:n.className,w:n.clientWidth,h:n.clientHeight,sh:n.scrollHeight,text:n.textContent})));
      assert.deepEqual(overflows,[],name+' card copy fits');
      await page.screenshot({path:path.join(out,name+'-states.png'),fullPage:true});
      await page.evaluate(()=>{
        const animate=Element.prototype.animate;window.samples=[];window.hold=false;
        Element.prototype.animate=function(frames,options){const a=animate.call(this,frames,options);samples.push({className:this.className,kind:this.dataset.kind,sourceUid:this.dataset.sourceUid,frames});if(hold&&this.classList.contains('eq-relic-emblem')){a.pause();a.currentTime=100;}else a.playbackRate=20;return a;};
        window.after=structuredClone(testState);after.duel.relicEvents=[{kind:'reraise',weaponId:'white-materia',sourceUid:'dead-aeris',recipient:'ally'}];
      });
      await page.evaluate(async()=>{await KalistarEquipmentFX.play({before:testState,after});});
      const samples=await page.evaluate(()=>samples);assert(samples.some(s=>s.className==='eq-relic-emblem'&&s.sourceUid==='dead-aeris'));assert(samples.some(s=>s.className.includes('eq-relic-gift')));
      assert.equal(await page.locator('.eq-relic-emblem,.eq-relic-transfer,.eq-relic-gift').count(),0);
      if(motion==='reduce')assert(samples.filter(s=>/relic-emblem|relic-gift/.test(s.className)).every(s=>s.frames.every(f=>!f.transform)));
      assert.equal(await page.evaluate(async()=>{samples=[];await KalistarEquipmentFX.play({before:after,after:structuredClone(after)});return samples.length;}),0,'no replay after restore');
      const events=await page.evaluate(async()=>{
        samples=[];
        for(const changes of [
          [{kind:'luck',weaponId:'little-joys-box',sourceUid:'momo',recipient:'ally'},{kind:'luck',weaponId:'little-joys-box',sourceUid:'momo',recipient:'enemy'}],
          [{kind:'mark',weaponId:'pod-042',sourceUid:'ally',targetUid:'enemy'}],
          [{kind:'riposte',weaponId:'pod-042',sourceUid:'ally',targetUid:'enemy'}],
          [{kind:'sacrifice',weaponId:'white-materia',sourceUid:'dead-aeris'}]
        ]){const next=structuredClone(testState);next.duel.relicEvents=changes;await KalistarEquipmentFX.play({before:testState,after:next});}
        return samples;
      });
      for(const kind of ['luck','mark','riposte','sacrifice'])assert.equal(events.filter(s=>s.className==='eq-relic-emblem'&&s.kind===kind&&s.frames[0].opacity===0).length,1,'one relic focus per event group');
      assert.equal(events.filter(s=>s.className.includes('eq-relic-gift')&&s.kind==='luck').length,2,'each reported recipient receives a visual gift');
      await page.evaluate(()=>{hold=true;window.pending=KalistarEquipmentFX.play({before:testState,after});});await page.locator('.eq-relic-emblem').waitFor();
      const box=await page.locator('.eq-relic-emblem').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height,'relic focus fits the viewport');
      await page.screenshot({path:path.join(out,name+'-dead-donor.png')});
      await page.evaluate(async()=>{KalistarEquipmentFX.capture({reset:true});await pending;});
      assert.equal(await page.locator('.eq-overlay,.eq-relic-emblem,.eq-relic-transfer,.eq-relic-gift,.eq-target-mark,.eq-relic-status').count(),0);assert.equal(await page.locator('[aria-describedby]').count(),0);
      await page.evaluate(()=>{
        const views=testEngine.equipmentViews;testEngine.equipmentViews=(s,u)=>views(s,u).map(r=>r.targetUid?{...r,active:false,ready:false,status:'lost'}:r);
        testState.players[1].dead.push(...testState.players[1].board);testState.players[1].board=[];KalistarEquipmentFX.mount(testState,testEngine);
      });
      assert.equal(await page.locator('.eq-target-mark').count(),0);assert.equal(await page.locator('.eq-overlay[data-weapon-id=pod-042]').count(),0);assert.match(await page.locator('[data-unit=ally] .eq-relic-status').getAttribute('aria-label'),/Cible perdue/);
      await page.evaluate(()=>KalistarEquipmentFX.capture({reset:true}));
      // Reproduce the narrow action panel with the real stylesheet order and font.
      await page.route(base+'/choice-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="arena-view kalistar-ui"><div class="duel-console" style="position:relative;display:block;width:calc(100% - 20px);max-width:392px;height:110px;min-height:110px;margin:30px auto"><div class="duel-centre"><div class="duel-actions"><div class="clover-choice-status eq-choice" role="status" data-trait="reraise"><img alt="Mat\u00e9ria blanche"><span><i data-lucide="heart" aria-hidden="true"></i>Reraise</span></div></div></div></div></body></html>'}));
      await page.goto(base+'/choice-fixture');
      await page.evaluate(async({image,panelWidth})=>{
        const html=await (await fetch('/index.html')).text(),doc=new DOMParser().parseFromString(html,'text/html');
        await Promise.all([...doc.querySelectorAll('link[rel=stylesheet]')].map(link=>new Promise((resolve,reject)=>{
          const node=document.createElement('link');node.rel='stylesheet';node.href=link.getAttribute('href');node.onload=resolve;node.onerror=reject;document.head.append(node);
        })));
        document.querySelector('.duel-actions').style.width=panelWidth+'px';document.querySelector('.eq-choice>img').src='/'+image;
        await document.fonts.ready;
      },{image:art.get(relics[1]).body.startsWith('assets/')?art.get(relics[1]).body:'assets/equipment/'+art.get(relics[1]).body,panelWidth:width===320?96:width===412?124:180});
      await page.addScriptTag({content:fs.readFileSync(path.resolve(__dirname,'../../V3/site/assets/lucide.min.js'),'utf8')});
      await page.evaluate(()=>lucide.createIcons());await page.waitForFunction(()=>document.querySelector('.eq-choice>img').naturalWidth>0);
      const choice=await page.locator('.eq-choice').evaluate(n=>{
        const span=n.querySelector('span'),icon=span.querySelector('svg'),img=n.querySelector('img'),text=[...span.childNodes].find(n=>n.nodeType===Node.TEXT_NODE),range=document.createRange();range.selectNodeContents(text);
        const b=n.getBoundingClientRect(),s=span.getBoundingClientRect(),i=img.getBoundingClientRect(),h=icon.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();
        return {lines:range.getClientRects().length,font:parseFloat(getComputedStyle(span).fontSize),fits:s.left>=b.left&&s.right<=b.right&&h.right<=s.right&&b.left>=p.left-1&&b.right<=p.right+1&&n.scrollWidth<=n.clientWidth,overlap:!(i.bottom<=s.top||i.right<=s.left),height:b.height,imageWidth:i.width};
      });
      assert.equal(choice.lines,1,name+' keeps Reraise on one line');assert(choice.fits,name+' prompt stays within the action panel');assert(!choice.overlap,name+' image and label do not overlap');
      if(width<700){assert.equal(choice.font,12);assert.equal(choice.imageWidth,26);assert(choice.height<=64,name+' fits the mobile action height');}else assert.equal(choice.imageWidth,42,'desktop artwork is unchanged');
      await page.screenshot({path:path.join(out,name+'-reraise-choice.png')});
      await context.close();
    }
    assert.deepEqual(errors,[]);console.log('Relic UI screenshots: '+out);
  }finally{await browser.close();}
});
