'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__console_skin__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const base=process.env.KALISTAR_URL||(built?'https://console-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-09-arena-console/qa');
const checks=[],errors=[];
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    if(built)await context.route(base+'/**',route=>{
      let relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,'');
      if(relative.endsWith('/'))relative+='index.html';const file=path.resolve(dist,relative);
      assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing built resource '+relative);
      const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-console-skin-qa'):open.call(this,n+'-console-skin-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(base+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    const states=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(E).fromPreset({name:'Console QA',cards:KALISTAR_DATA.decks.player});
      const s=E.newGame(team,team,{seed:'CONSOLE-MATERIAL-QA',mode:'local',turnOrder:'ABBA'});E.rollInitiative(s,[6,1]);const states={};
      for(let i=0;i<4000;i++){
        E.assertState(s);states[s.phase+'-'+s.turn]??=E.clone(s);if(s.phase==='over')break;
        if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);
        else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);
        else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
        else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
      }return states;
    });
    const load=async state=>{
      await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},state);
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.locator('.console-inlay').waitFor({state:'attached'});
      if(await page.locator('#match-dialog[open]').count())await page.locator('#match-dialog [data-action=close]').first().click();
      await page.waitForFunction(()=>[...document.querySelectorAll('.slot-card img')].filter(i=>i.getBoundingClientRect().width).every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
    };
    for(const [name,width,height]of [['desktop',1440,1000],['wide',1920,1080],['razr',412,1007],['compact',320,568],['landscape',844,390]]){
      await page.setViewportSize({width,height});await load(states['attack-0']);
      const before=await page.evaluate(()=>{
        const sheet=[...document.styleSheets].find(s=>s.href?.includes('arena-console-skin.css'));sheet.disabled=true;
        const p=document.querySelector('.duel-console').getBoundingClientRect();return {x:p.x,y:p.y,w:p.width,h:p.height};
      });
      if(['desktop','razr'].includes(name))await page.screenshot({path:path.join(out,name+'-before.png')});
      await page.evaluate(()=>{[...document.styleSheets].find(s=>s.href?.includes('arena-console-skin.css')).disabled=false;});
      const result=await page.locator('.duel-console').evaluate(p=>{
        const r=p.getBoundingClientRect(),c=getComputedStyle(p),cue=p.querySelector('.console-turn-light');
        const action=p.querySelector('.ritual-action'),a=action.getBoundingClientRect();
        return {x:r.x,y:r.y,w:r.width,h:r.height,border:c.borderLeftWidth,radius:c.borderRadius,background:c.backgroundImage,font:getComputedStyle(p.querySelector('h2')).fontFamily,
          inlays:p.querySelectorAll('.console-inlay').length,hidden:p.querySelector('.console-inlay').getAttribute('aria-hidden'),pointer:getComputedStyle(p.querySelector('.console-inlay')).pointerEvents,
          animation:getComputedStyle(cue,'::before').animationName,action:{x:a.x,y:a.y,w:a.width,h:a.height},overflow:document.documentElement.scrollWidth>innerWidth};
      });
      for(const k of ['x','y','w'])assert(Math.abs(before[k]-result[k])<=1,name+' unchanged geometry '+k+' '+JSON.stringify({before,result}));
      assert(result.h<=before.h+1,name+' panel must not grow');
      assert.equal(result.inlays,1);assert.equal(result.hidden,'true');assert.equal(result.pointer,'none');assert(result.font.includes('Cinzel'));assert(result.background.includes('collection-reader-grimoire'));
      assert.equal(result.animation,'console-edge-travel');assert(!result.overflow);
      assert(result.action.w>=44&&result.action.h>=44);assert(result.action.x>=0&&result.action.x+result.action.w<=width+1);
      for(const material of ['ice','circuit','water','forge','stone','gates','leaves','prism','street']){
        const edge=await page.locator('.duel-console').evaluate((p,m)=>{p.dataset.material=m;return getComputedStyle(p).borderLeftWidth;},material);
        assert.equal(edge,result.border,'same frame for '+material);
      }
      checks.push({name,...result});await page.screenshot({path:path.join(out,name+'-attack.png')});
      await page.locator('[data-action=roll]').click();
      await page.waitForFunction(()=>document.querySelector('.duel-console')?.hasAttribute('data-casting'));
      assert.equal(await page.locator('.console-inlay').evaluate(n=>getComputedStyle(n,'::after').animationName),'console-metal-wake');
      await page.waitForFunction(()=>!document.querySelector('.duel-console')?.hasAttribute('data-casting'));
      const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));assert(stored.duel.attackRolls.length>0);
      await page.screenshot({path:path.join(out,name+'-rolled.png')});
      await load(states['defense-0']);
      assert.equal(await page.locator('.duel-console').getAttribute('data-acting-side'),'1');
      await page.screenshot({path:path.join(out,name+'-defense.png')});
      await load(states['result-0']);
      assert.equal(await page.locator('.console-turn-light').evaluate(n=>+getComputedStyle(n).opacity),0);
      await page.screenshot({path:path.join(out,name+'-result.png')});
    }
    await page.setViewportSize({width:1440,height:1000});await load(states['attack-0']);
    await page.locator('[data-action=journal]').click();
    assert.equal(await page.locator('.console-turn-light').evaluate(n=>getComputedStyle(n,'::before').animationPlayState),'paused');
    await page.locator('#journal-dialog [data-action=close]').click();
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.console-turn-light').evaluate(n=>getComputedStyle(n,'::before').animationName),'none');
    assert.equal(await page.locator('.console-inlay').evaluate(n=>getComputedStyle(n,'::after').animationName),'none');
    await page.locator('[data-action=roll]').click();await page.waitForFunction(()=>!document.querySelector('.duel-console')?.hasAttribute('data-casting')&&document.querySelector('.duel-console')?.dataset.phase!=='attack');
    await load(Object.values(states).find(s=>s.phase==='over'));
    assert.equal(await page.locator('.console-turn-light').evaluate(n=>getComputedStyle(n,'::before').animationName),'none');
    await page.locator('[data-view=collection]').first().click();assert.equal(await page.locator('.console-inlay').count(),0);
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');
    console.log(JSON.stringify({passed:true,viewports:checks.length,errors},null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
