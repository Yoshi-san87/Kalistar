'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__arena_immersion__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304',output=path.join(__dirname,'verification/arena-immersion');
const elements=['ELECTRO','PYRO','HYDRO','AERO','CRYO','MINERO','GEO','HERBO','HEMATO','NECRO','LUXO','RAINBOW'];
(async()=>{
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],results=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.locator('[data-action=start]').click();
    const base=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kalistar.v4.game'));s.mode='local';return s;});
    async function stage(s=base){
      await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},s);
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.waitForTimeout(100);
    }
    const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
    async function choose(){
      await page.locator('.formation[data-player="0"] .slot-card').first().click();
      await page.locator('.formation[data-player="1"] .slot-card').first().click();await page.waitForTimeout(560);
    }
    async function pixels(selector){return page.locator(selector).first().evaluate(c=>{
      const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let alpha=0,hash=0;
      for(let i=3;i<data.length;i+=4){if(data[i])alpha++;hash=(Math.imul(hash,31)+data[i])>>>0;}
      return {alpha,hash,width:c.width,height:c.height};
    });}
    const profiles=await page.evaluate(()=>KALISTAR_DATA.arenas.map(a=>({id:a.id,...KalistarAmbience.profileFor(a)})));
    assert.ok(profiles.length>=28);for(const p of profiles)assert.ok(p.motions.length>=2&&p.motions.length<=3);
    assert.notDeepEqual(profiles.find(p=>p.id==='hydro').motions,profiles.find(p=>p.id==='minero').motions);
    const manifest=require('../atelier/designer-assets/manifest.json'),anchor=await page.evaluate(()=>KalistarFocus.crystalAnchor);
    for(const e of elements){const c=manifest.elements[e].crystal;assert.ok(Math.abs(anchor.x*797+50-(c.left+c.width/2))<=1);assert.ok(Math.abs(anchor.y*1388+50-(c.top+c.height/2))<=1);}
    for(const [width,height] of [[1440,1000],[2041,1383],[412,1007],[390,844],[320,568],[844,390]]){
      await page.setViewportSize({width,height});await stage();await choose();
      const before=await saved(),bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.challenger')].map(n=>getComputedStyle(n).transform)}));
      const resting=await pixels('.arena-ambience');await page.waitForTimeout(200);const living=await pixels('.arena-ambience');
      assert.ok(living.alpha>0);assert.notEqual(resting.hash,living.hash,'ambient pixels move');
      await page.locator('[data-action=lock]').click();await page.waitForTimeout(160);
      assert.equal(await page.locator('.battlefield[data-awakening=true]').count(),1);
      const peak=await pixels('.element-aura');await page.waitForTimeout(160);const moving=await pixels('.element-aura');
      assert.ok(peak.alpha>0);assert.notEqual(peak.hash,moving.hash,'activation changes in movement');
      const status=await page.evaluate(()=>({ambient:KalistarAmbience.inspect(),scroll:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.challenger')].map(n=>getComputedStyle(n).transform),layers:[...document.querySelectorAll('.arena-ambience,.arena-tension,.arena-arrival')].map(n=>({z:getComputedStyle(n).zIndex,pointer:getComputedStyle(n).pointerEvents}))}));
      assert.equal(status.scroll,bounds.scroll,'no added horizontal overflow');
      assert.equal(status.cards.length,bounds.cards.length);
      for(const [index,transform] of status.cards.entries()){
        const numeric=value=>value.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number)||[];
        const actual=numeric(transform),expected=numeric(bounds.cards[index]);assert.equal(actual.length,expected.length);
        // Browser interpolation can finish between samples; retain a subpixel geometry check.
        assert.ok(actual.every((value,i)=>Math.abs(value-expected[i])<=.001),'activation does not reposition the cards');
      }
      assert.ok(status.layers.every(n=>n.z==='-1'&&n.pointer==='none'));assert.ok(status.ambient.dpr<=1.5);assert.ok(status.ambient.particles<=(width<=699||height<=500?7:14));
      await page.screenshot({path:path.join(output,`after-${width}x${height}.png`),scale:'css'});
      await page.waitForTimeout(550);assert.equal(await page.locator('.battlefield[data-awakening]').count(),0);
      const expected=await page.evaluate(s=>{KalistarEngine.createEngine(KALISTAR_DATA).lock(s,0,0);return s;},before);assert.deepEqual(await saved(),expected,'activation only uses the existing lock');
      await page.locator('.challenger .inspect').first().dispatchEvent('click');await page.waitForSelector('#detail-dialog[open]');
      await page.screenshot({path:path.join(output,`modal-${width}.png`),scale:'css'});await page.locator('#detail-dialog [data-action=close]').click();
      results.push({viewport:[width,height],...status.ambient});
    }
    await page.setViewportSize({width:1440,height:1000});await stage();await choose();
    const fixture=await saved();
    // Element variants are renderer-only: source pixels are approved cards, no catalogue or game writes.
    for(const element of [...elements,'NONE']){
      await page.evaluate(element=>{
        const node=document.querySelector('.team-left .challenger'),card=KALISTAR_DATA.cards.find(c=>c.element===element);
        node.dataset.element=element;node.style.setProperty('--element-color','#'+KALISTAR_DATA.elements[element].color);
        node.querySelector('img').src=KalistarCardMedia.image(card);KalistarAmbience.engage();KalistarFocus.engage();
      },element);
      await page.waitForTimeout(240);
      const p=await pixels('.team-left .element-aura');assert.equal(p.alpha>0,element!=='NONE');
      const protectedStats=await page.locator('.team-left .element-aura').evaluate(c=>{
        const {width:w,height:h,ratio}=c._size,ctx=c.getContext('2d');
        return [[.08,.15],[.93,.15],[.08,.4],[.93,.4]].map(([x,y])=>ctx.getImageData(Math.round((24+(w-48)*x)*ratio),Math.round((24+(h-48)*y)*ratio),1,1).data[3]);
      });assert.ok(protectedStats.every(alpha=>alpha===0),'no activation over printed stats: '+element);
      await page.screenshot({path:path.join(output,`element-${element.toLowerCase()}.png`),scale:'css'});await page.waitForTimeout(600);
    }
    assert.deepEqual(await saved(),fixture,'element previews never change the match');
    for(const arenaId of ['minero','herbo','hydro','electro','cryo']){
      await stage({...base,arenaId});
      const a=await pixels('.arena-ambience');await page.waitForTimeout(180);const b=await pixels('.arena-ambience');assert.notEqual(a.hash,b.hash,arenaId+' moves');
      await page.screenshot({path:path.join(output,`ambience-${arenaId}.png`),scale:'css'});
    }
    await stage();await choose();
    await page.evaluate(()=>{
      const react=KalistarAmbience.react;
      KalistarAmbience.react=options=>{window.immersionReactions.push(options);react(options);};
      window.startImmersionFx=(kind,element='HYDRO')=>{
        window.immersionReactions=[];
        const e=KalistarEngine.createEngine(KALISTAR_DATA),before=JSON.parse(localStorage.getItem('kalistar.v4.game'));e.lock(before,0,0);before.phase='defense';
        const after=e.clone(before);after.phase='result';after.duel.magic=kind==='magic';after.duel.formula={attack:290,defense:180};
        if(kind==='defeat')after.players[1-before.turn].board[0]=null;
        window.immersionAbort=new AbortController();KalistarAmbience.action();
        window.immersionDone=KalistarCombat.play({before,after,element,color:'#'+KALISTAR_DATA.elements[element].color,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,signal:immersionAbort.signal});
      };
    });
    for(const [kind,element] of [['magic','HYDRO'],['magic','RAINBOW'],['physical','NONE'],['defeat','CRYO']]){
      await page.evaluate(([k,e])=>startImmersionFx(k,e),[kind,element]);
      if(kind==='magic'){
        await page.waitForSelector('.combat-magic');await page.waitForTimeout(50);const a=await pixels('.combat-magic');
        await page.waitForTimeout(100);const b=await pixels('.combat-magic');assert.notEqual(a.hash,b.hash);
        await page.screenshot({path:path.join(output,`${kind}-${element}-flight-1.png`),scale:'css'});
        await page.evaluate(async()=>{immersionAbort.abort();await immersionDone;});
        await page.evaluate(([k,e])=>startImmersionFx(k,e),[kind,element]);await page.waitForSelector('.combat-magic');await page.waitForTimeout(350);
        await page.screenshot({path:path.join(output,`${kind}-${element}-flight-2.png`),scale:'css'});
      }
      await page.waitForFunction(()=>window.immersionReactions.length>0);
      const reactions=await page.evaluate(()=>immersionReactions);assert.equal(reactions.length,1,'one terrain reaction per outcome');assert.equal(reactions[0].magic,kind==='magic');
      await page.screenshot({path:path.join(output,`${kind}-${element}-arrival.png`),scale:'css'});
      await page.evaluate(()=>immersionDone);assert.equal(await page.locator('.combat-magic,.combat-card-effect').count(),0);
      assert.equal(await page.evaluate(()=>KalistarAmbience.inspect().reaction),false);
    }
    const last=await page.evaluate(s=>{
      const p=s.players[0];p.dead.push(...p.board.slice(1).filter(Boolean));p.board=p.board.map((u,i)=>i?null:u);return s;
    },base);
    await stage(last);assert.equal(await page.locator('.last-combatant').count(),1);assert.equal(await page.locator('.battlefield[data-tension=true]').count(),0);
    await page.screenshot({path:path.join(output,'last-survivor.png'),scale:'css'});
    const imminent=await page.evaluate(s=>{s.players[0].dead.push(...s.players[0].reserve);s.players[0].reserve=[];return s;},last);
    await stage(imminent);assert.equal(await page.locator('.battlefield[data-tension=true]').count(),1);
    assert.deepEqual(await saved(),imminent,'engine end-condition preview does not mutate live state');
    await page.screenshot({path:path.join(output,'match-point.png'),scale:'css'});await stage();assert.equal(await page.locator('.battlefield[data-tension=true]').count(),0);
    const terminal=await page.evaluate(s=>{
      const p=s.players[0];p.dead.push(...p.board.filter(Boolean));p.board=p.board.map(()=>null);s.phase='result';KalistarEngine.createEngine(KALISTAR_DATA).next(s);return s;
    },imminent);
    await stage(terminal);assert.equal(await page.locator('.arena-ambience,.element-aura').count(),0);assert.equal(await page.evaluate(()=>KalistarAmbience.inspect().running),false);
    assert.equal(await page.locator('.arena-finale').count(),1);await stage();
    // An immediately clicked roll must await activation, then keep the exact engine result.
    await choose();await page.locator('[data-action=lock]').click();const locked=await saved();
    await page.locator('[data-action=roll]').click();await page.waitForTimeout(230);assert.equal(await page.locator('.ritual-flight').count(),0);
    await page.waitForFunction(()=>!document.querySelector('#app.rolling'),{},{timeout:15000});
    const rolled=await page.evaluate(s=>{KalistarEngine.createEngine(KALISTAR_DATA).rollAttack(s);return s;},locked);assert.deepEqual(await saved(),rolled);
    await stage();await choose();await page.locator('[data-action=lock]').click();
    const ready=await page.evaluate(()=>{window.hiddenForQa=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>hiddenForQa});document.dispatchEvent(new Event('visibilitychange'));return KalistarAmbience.inspect();});
    assert.equal(ready.running,false);assert.equal(ready.awakening,false);await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>KalistarAmbience.inspect().running),false);
    await page.evaluate(()=>{window.hiddenForQa=false;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>KalistarAmbience.inspect().running),true);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!KalistarAmbience.inspect().running);assert.equal(await page.evaluate(()=>KalistarAmbience.inspect().running),false);
    assert.equal(await page.evaluate(()=>KalistarAmbience.inspect().particles),0);
    await stage();await choose();await page.locator('[data-action=lock]').click();assert.equal(await page.locator('.battlefield[data-awakening]').count(),0);
    await page.screenshot({path:path.join(output,'reduced-motion.png'),scale:'css'});
    await page.locator('[data-view=collection]').click();assert.equal(await page.locator('.arena-ambience,.arena-arrival,.arena-tension').count(),0);
    assert.deepEqual(await page.evaluate(()=>({running:KalistarAmbience.inspect().running,subscribers:KalistarAmbience.inspect().subscribers})),{running:false,subscribers:0});
    await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-view=arena]').click();await stage();await choose();
    await page.locator('[data-action=lock]').click();await page.setViewportSize({width:412,height:1007});await page.waitForTimeout(100);
    assert.equal(await page.locator('.battlefield[data-awakening]').count(),0);assert.equal(await page.locator('.arena-ambience').count(),1);
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.locator('.arena-ambience').count(),0);assert.equal(await page.evaluate(()=>KalistarAmbience.inspect().running),false);
    await page.setViewportSize({width:1440,height:1000});await stage();await choose();
    await page.locator('[data-action=phone-preview]').click();await page.waitForSelector('#phone-preview-frame');
    const preview=page.locator('#phone-preview-frame').contentFrame();await preview.locator('.arena-ambience').waitFor();
    assert.deepEqual(await preview.locator('body').evaluate(()=>[innerWidth,innerHeight]),[412,1007]);
    await preview.locator('.team-left .slot-card').first().click();await preview.locator('.team-right .slot-card').first().click();
    await page.waitForTimeout(560);await preview.locator('[data-action=lock]').click();await page.waitForTimeout(180);
    assert.equal(await preview.locator('.challenger .element-aura').count(),2);
    await page.screenshot({path:path.join(output,'razr50-activation.png'),scale:'css'});
    assert.ok(await preview.locator('body').evaluate(()=>KalistarAmbience.inspect().particles<=7));
    await page.locator('#phone-preview-toggle').click();await page.waitForTimeout(100);
    assert.equal(await preview.locator('.arena-ambience').count(),1,'one layer across preview mode changes');
    const highDpr=await browser.newContext({viewport:{width:412,height:1007},deviceScaleFactor:3,isMobile:true,hasTouch:true}),hp=await highDpr.newPage();
    hp.on('pageerror',e=>errors.push(e.message));await hp.goto(url+'/jeu/#arena');await hp.waitForFunction(()=>window.KALISTAR_READY);
    await hp.locator('[data-action=start]').click();await hp.locator('.team-left .slot-card').first().click();await hp.locator('.team-right .slot-card').first().click();
    await hp.waitForTimeout(560);await hp.locator('[data-action=lock]').click();await hp.waitForTimeout(120);
    const highDprStatus=await hp.evaluate(()=>({ambient:KalistarAmbience.inspect(),auras:[...document.querySelectorAll('.element-aura')].map(c=>c._size.ratio)}));
    assert.equal(highDprStatus.ambient.dpr,1.25);assert.ok(highDprStatus.auras.every(dpr=>dpr<=2));
    await hp.screenshot({path:path.join(output,'high-dpr-phone.png'),scale:'css'});await highDpr.close();
    assert.deepEqual(errors,[]);
    const protectedBefore=JSON.parse(fs.readFileSync(path.join(output,'protected-before.json'),'utf8'));
    for(const [file,hash] of Object.entries(protectedBefore))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../..',file))).digest('hex'),hash,'protected bytes unchanged: '+file);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({viewports:results,highDpr:highDprStatus,arenas:profiles.length,elements:elements.length+1,errors,protectedHashes:protectedBefore},null,2));
    console.log('PASS arena immersion: six viewports, 28 arena profiles, all elements, moving pixels, engine parity, lifecycle, reduced motion.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
