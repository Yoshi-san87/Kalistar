'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__ui_qa__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const base=built?'https://kalistar-ui-qa.invalid/Kalistar/jeu/':'http://127.0.0.1:4304/jeu/';
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-03-ui-system/qa');
const results=[],errors=[];
async function settle(page){await page.waitForTimeout(260);}
async function shot(page,name){
  await settle(page);
  await page.screenshot({path:path.join(out,name+'.png')});
}
async function bounds(page,label){
  const sample=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('[data-kui=field],button[data-kui],dialog[open]')].filter(n=>n.getClientRects().length&&!n.closest('[inert]'));
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,
      fields:nodes.filter(n=>n.dataset.kui==='field').map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),
      bad:nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<1||r.right>innerWidth+2||r.x<-2;}).map(n=>n.outerHTML.slice(0,180))};
  });
  assert(!sample.overflow,label+' viewport overflow');
  assert.deepEqual(sample.bad,[],label+' controls outside viewport');
  results.push({label,...sample});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    for(const [name,width,height,motion] of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,568,'no-preference'],['reduced',390,844,'reduce'],['landscape',844,390,'no-preference']]){
      const phone=width<700||height<501;
      const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,hasTouch:phone,serviceWorkers:'block'});
      if(built)await context.route('https://kalistar-ui-qa.invalid/**',route=>{
        const relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
        assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'published asset '+relative);
        return route.fulfill({path:file,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream'});
      });
      await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-ui-qa-only',version);};});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
      await page.goto(base+'#decks');await page.waitForFunction(()=>window.KALISTAR_READY&&window.KalistarUI);await settle(page);
      assert.equal(await page.locator('.kdb-slot-image[data-kui],.kdb-candidate-image[data-kui],.main-nav [data-kui]').count(),0,'card art and navigation are not re-skinned');
      await bounds(page,name+' composition');await shot(page,name+'-composition');
      if(!phone&&width>900){
        await page.locator('[data-deck-action=save]').hover();await page.locator('#kalistar-ui-hint:popover-open').waitFor();
        await shot(page,name+'-tooltip');
        await page.keyboard.press('Escape');assert.equal(await page.locator('#kalistar-ui-hint:popover-open').count(),0);
      }
      if(width<=900)await page.locator('.team-heading-summary').click();
      const field=page.locator('[data-deck-action=name]');await field.fill('Les eclats QA');
      if(await page.locator('.team-management[open]').count())await page.locator('.team-management [data-deck-action=manage]').click();
      await page.locator('[data-deck-action=save]').click();await settle(page);
      if(await page.locator('.team-management[open]').count()===0&&width<=900)await page.locator('.team-heading-summary').click();
      const picker=page.locator('[data-deck-action=select]');assert.equal(await picker.locator('option').count(),2,'real deck persisted');
      await picker.selectOption('');await settle(page);
      if(width<=900&&!await page.locator('.team-management[open]').count())await page.locator('.team-heading-summary').click();
      await bounds(page,name+' management');
      if(!phone){await page.locator('[data-deck-action=select]').click();await shot(page,name+'-picker');await page.keyboard.press('Escape');}
      else await shot(page,name+'-management');
      if(await page.locator('.team-management[open]').count())await page.locator('.team-management [data-deck-action=manage]').click();
      await page.goto(base+'#collection');await page.waitForSelector('.cb-page');
      await page.locator('[data-binder-action=filters]').click();await page.locator('.cb-overlay[open]').waitFor();await settle(page);
      const filter=page.locator('.cb-overlay select').first();await filter.selectOption({index:1});await settle(page);
      await bounds(page,name+' collection filters');await shot(page,name+'-filters');
      await page.keyboard.press('Escape');await page.locator('.cb-overlay[open]').waitFor({state:'detached'});
      await page.locator('.cb-card').first().click();await page.waitForSelector('.cb-reader');
      if(await page.locator('.cb-mobile-panes').isVisible())await page.locator('[data-binder-action=pane][data-id=notes]').click();
      await page.locator('[data-binder-action=tab][data-id=career]').click();await settle(page);
      assert.equal(await page.locator('.cb-reading [data-kui=field]').evaluate(n=>getComputedStyle(n).color),'rgb(36, 22, 15)');
      await bounds(page,name+' manuscript');await shot(page,name+'-career');
      await page.goto(base+'#statistics');await page.waitForSelector('.statistics-sheet');
      await page.locator('[data-sheet-action=group][data-id=trophies]').click();await settle(page);
      assert.equal(await page.locator('.sheet-tabs [data-kui=tab][aria-pressed=true]').count(),1);
      await page.locator('[data-sheet-field=query]').fill('Momo');
      await bounds(page,name+' statistics');await shot(page,name+'-statistics');
      await page.goto(base+'#decks');await page.waitForSelector('.team-page');
      if(!await page.locator('[data-deck-action=captain][aria-pressed=true]').count())await page.locator('[data-deck-action=captain]').first().click();
      await page.locator('[data-deck-action=play]').click();await page.locator('#new-game-dialog[open]').waitFor();await settle(page);
      assert.equal(await page.locator('#new-game-dialog .kui-emblem').count(),1);
      await bounds(page,name+' prematch');await shot(page,name+'-prematch');
      await page.keyboard.press('Escape');
      await page.evaluate(()=>{
        const e=KalistarEngine.createEngine(KALISTAR_DATA),s=e.newGame(KALISTAR_DATA.decks.player,KALISTAR_DATA.decks.enemy,{seed:'UI-PALMARES',mode:'local'});
        e.autoDeploy(s,0);e.autoDeploy(s,1);e.start(s);
        for(let n=0;n<3000&&s.phase!=='over';n++){
          if(s.phase==='choose')e.lock(s,...e.aiChoice(s));
          else if(s.phase==='attack')e.rollAttack(s);
          else if(s.phase==='kalistel')e.acceptAttack(s);
          else if(s.phase==='defense')e.rollDefense(s);
          else if(s.phase==='result')e.next(s);
          else if(s.phase==='replace')e.autoDeploy(s,s.replacing);
          else{const suffix={guard:'Guard',heart:'Reraise',potion:'Potion',physical:'Physical',clover:'Clover'}[s.phase];e['grant'+suffix](s,e['ai'+suffix+'Choice'](s));}
        }
        if(s.phase!=='over')throw Error('QA match did not finish');
        const dialog=document.querySelector('#match-dialog');
        dialog.innerHTML='<div class="dialog-head"><h2>Palmar\u00e8s de la rencontre</h2></div>'+KalistarMatchReport.render(s,{tab:'awards'});
        dialog.showModal();lucide.createIcons();
      });
      await settle(page);assert.equal(await page.locator('#match-dialog .golden-award').count(),5);
      assert.equal(await page.locator('#match-dialog .kui-emblem').count(),1);
      assert.equal(await page.locator('.golden-portrait[data-kui]').count(),0);
      await bounds(page,name+' palmares');await shot(page,name+'-palmares');
      await page.keyboard.press('Escape');
      const lifecycle=await page.evaluate(()=>{
        KalistarUI.init();KalistarUI.init();const count=document.querySelectorAll('#kalistar-ui-hint').length;
        KalistarUI.destroy();const destroyed=document.querySelectorAll('#kalistar-ui-hint').length;
        KalistarUI.init();return {count,destroyed,restarted:document.querySelectorAll('#kalistar-ui-hint').length};
      });
      assert.deepEqual(lifecycle,{count:1,destroyed:0,restarted:1});
      if(motion==='reduce')assert.equal(await page.locator('[data-deck-action=save]').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
      await context.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,built,results,errors},null,2));
    console.log(JSON.stringify({passed:true,built,checks:results.length,out}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
