'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__console_turn__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',origin=built?'https://kalistar-turn.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const base=origin+'/jeu/',dist=path.resolve(__dirname,'../deploy/dist'),out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/console-turn-20261006');
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),errors=[],checks=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage();
    if(built)await context.route(origin+'/**',route=>{
      const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,'');
      const file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
      if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
      const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
      return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-console-turn-qa-only',version);};});
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(base+'#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    const states=await page.evaluate(()=>{
      const e=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(e).fromPreset({name:'Turn Cue QA',cards:KALISTAR_DATA.decks.player});
      const s=e.newGame(team,team,{seed:'TURN-LIGHT-QA',mode:'local',turnOrder:'ABBA'});e.rollInitiative(s,[6,1]);
      const states={};
      for(let i=0;i<4000;i++){
        e.assertState(s);const key=s.phase+'-'+s.turn+(s.phase==='replace'?'-'+s.replacing:'');
        states[key]??=e.clone(s);if(s.phase==='over')break;
        if(s.phase==='choose')e.lock(s,...e.aiChoice(s));
        else if(s.phase==='attack')e.rollAttack(s);
        else if(s.phase==='kalistel')e.acceptAttack(s);
        else if(s.phase==='defense')e.rollDefense(s);
        else if(s.phase==='result')e.next(s);
        else if(s.phase==='replace')e.autoDeploy(s,s.replacing);
        else{const kind={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];e['grant'+kind](s,e['ai'+kind+'Choice'](s));}
      }
      return states;
    });
    for(const key of ['choose-0','choose-1','defense-0','defense-1'])assert(states[key],key+' real fixture');
    assert(Object.keys(states).some(key=>key.startsWith('over-')));
    for(const [width,height]of [[1440,1000],[412,1007]]){
      await page.setViewportSize({width,height});
      for(const [key,s]of Object.entries(states)){
        await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},s);
        await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.locator('.console-turn-light').waitFor({state:'attached'});
        if(await page.locator('#match-dialog[open]').count())await page.locator('#match-dialog [data-action=close]').first().click();
        const result=await page.locator('.duel-console').evaluate(panel=>{
          const cue=panel.querySelector('.console-turn-light'),p=panel.getBoundingClientRect(),r=cue.getBoundingClientRect(),c=getComputedStyle(cue);
          return {side:panel.dataset.actingSide,count:panel.querySelectorAll('.console-turn-light').length,opacity:+c.opacity,pointer:c.pointerEvents,hidden:cue.getAttribute('aria-hidden'),left:r.left-p.left,right:p.right-r.right,border:parseFloat(getComputedStyle(panel).borderLeftWidth),animations:cue.getAnimations().length,color:c.borderLeftColor,transition:c.transitionDuration};
        });
        const expected=s.phase==='defense'?1-s.turn:s.phase==='replace'?s.replacing:['result','over'].includes(s.phase)?null:s.turn;
        assert.equal(result.side,expected===null?'':String(expected));assert.equal(result.count,1);assert.equal(result.pointer,'none');assert.equal(result.hidden,'true');assert.equal(result.animations,0);
        if(expected===null)assert.equal(result.opacity,0);else{assert(result.opacity>0);assert(Math.abs((expected===0?result.left:result.right)-(result.border-1))<.6,key+' / '+width+' / '+JSON.stringify(result));}
        checks.push({width,key,...result});
        if(['choose-0','choose-1','defense-0'].includes(key)){
          await page.waitForFunction(()=>[...document.querySelectorAll('.slot-card img')].filter(i=>i.getBoundingClientRect().width).every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
          await page.screenshot({path:path.join(out,width+'-'+key+'.png')});
        }
      }
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.console-turn-light').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');
    console.log(JSON.stringify({passed:true,realStates:Object.keys(states).length,checks:checks.length,errors},null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
