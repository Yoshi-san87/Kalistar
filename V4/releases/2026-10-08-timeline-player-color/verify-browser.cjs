'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__timeline_color__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',origin=built?'https://kalistar-timeline.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const base=origin+'/jeu/',dist=path.join(root,'V4/deploy/dist'),out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification');
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),errors=[],checks=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',hasTouch:true});
    if(built)await context.route(origin+'/**',route=>{
      const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,'');
      const file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
      if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
      const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
      return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-timeline-color-qa-only',version);};});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(base+'#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    // Snapshots are reached through real engine actions, never forged UI states.
    const states=await page.evaluate(()=>{
      const e=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(e).fromPreset({name:'Timeline QA',cards:KALISTAR_DATA.decks.player});
      const s=e.newGame(team,team,{seed:'TIMELINE-PLAYER-COLOR',mode:'local',turnOrder:'ABBA'});e.rollInitiative(s,[6,1]);
      const states={};
      for(let i=0;i<4000&&s.phase!=='over';i++){
        e.assertState(s);
        if(['choose','result'].includes(s.phase))states[s.phase+'-'+s.turn]??=e.clone(s);
        if(Object.keys(states).length===4)break;
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
    for(const key of ['choose-0','choose-1','result-0','result-1'])assert(states[key],key+' real fixture');
    for(const motion of ['no-preference','reduce']){
      await page.emulateMedia({reducedMotion:motion});
      for(const [width,height]of [[1440,1000],[412,1007],[360,800]]){
        await page.setViewportSize({width,height});
        for(const [key,s]of Object.entries(states)){
          await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},s);
          await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
          await page.locator('.turn-timeline [aria-current=step]').waitFor();
          const result=await page.locator('.turn-timeline').evaluate(rail=>{
            const active=rail.querySelector('[aria-current=step]'),dot=active.querySelector('.tt-dot'),css=getComputedStyle(dot),gem=getComputedStyle(dot,'::after'),svg=dot.querySelector('svg');
            const player=getComputedStyle(active).color,r=rail.getBoundingClientRect(),probe=document.createElement('span');
            probe.style.boxShadow='0 0 0 2px #071211,0 0 5px color-mix(in srgb,'+player+' 27%,transparent)';
            rail.append(probe);const expectedGlow=getComputedStyle(probe).boxShadow;probe.remove();
            return {side:active.dataset.turnSide,player,border:css.borderColor,glow:css.boxShadow,expectedGlow,diameter:parseFloat(css.width),check:svg?getComputedStyle(svg).stroke:null,resolved:active.classList.contains('is-resolved'),gemDisplay:gem.display,motion:gem.animationName,
              steps:[...rail.querySelectorAll('li')].filter(n=>n.getClientRects().length).length,height:r.height,left:r.left,right:r.right,overflow:document.documentElement.scrollWidth>innerWidth+1};
          });
          assert.equal(result.side,String(s.turn));assert.equal(result.border,result.player);
          assert.notEqual(result.border,'rgb(237, 207, 143)','no gold current-player override');
          assert.equal(result.glow,result.expectedGlow,'player-tinted glow');
          assert.equal(result.diameter,14);assert.equal(result.resolved,s.phase==='result');
          assert.equal(result.check,s.phase==='result'?result.player:null);
          if(s.phase==='result')assert.equal(result.gemDisplay,'none');
          if(motion==='reduce')assert.equal(result.motion,'none');
          assert.equal(result.steps,width<700?5:11);assert.equal(result.height,width<700?34:36);
          assert(result.left>=0&&result.right<=width+1);assert(!result.overflow);
          checks.push({viewport:{width,height},reducedMotion:motion,key,...result});
          if(motion==='no-preference'&&width!==360){
            await page.waitForFunction(()=>[...document.querySelectorAll('.slot-card img')].filter(i=>i.getBoundingClientRect().width).every(i=>i.complete&&i.naturalWidth>0));
            const name=width+'-'+key;
            await page.screenshot({path:path.join(out,name+'.png')});
            await page.locator('.turn-timeline').screenshot({path:path.join(out,name+'-rail.png')});
          }
        }
      }
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,built,origin,checks,errors},null,2)+'\n');
    console.log(JSON.stringify({passed:true,built,checks:checks.length,errors}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
