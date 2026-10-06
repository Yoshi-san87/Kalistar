'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__metro_qa__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',origin=built?'https://kalistar-metro.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304',url=origin+'/jeu/';
const dist=path.resolve(__dirname,'../deploy/dist'),output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/combat-timeline/local'));
async function restore(page,s){
  await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},s);
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.waitForSelector('.turn-timeline li[aria-current=step]');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
}
async function inspect(page){
  return page.evaluate(()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const rail=document.querySelector('.turn-timeline'),list=rail.querySelector('ol'),box=rect(rail),track=rect(list);
    const steps=[...list.children].filter(n=>n.getClientRects().length),active=rail.querySelector('[aria-current=step]');
    const fits=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
    const group=[...rail.querySelectorAll('.tt-round')].filter(n=>n.getClientRects().length);
    const now=rail.querySelector('.tt-now'),dot=active.querySelector('.tt-dot'),gem=getComputedStyle(dot,'::after');
    return {box,track,steps:steps.map(n=>({turn:Number(n.dataset.turnRound),round:Number(n.dataset.combatRound),side:Number(n.dataset.turnSide),past:n.classList.contains('is-past'),box:rect(n)})),
      current:{turn:Number(active.dataset.turnRound),round:Number(active.dataset.combatRound),side:Number(active.dataset.turnSide),resolved:active.classList.contains('is-resolved')},
      stationFits:steps.every(n=>fits(rect(n.querySelector('.tt-stop')),rect(n))),groupsFit:group.every(n=>fits(rect(n),track)&&[...n.children].every(c=>fits(rect(c),rect(n)))),
      text:rail.innerText,status:now.getAttribute('aria-label'),hiddenStatus:getComputedStyle(now).clipPath==='inset(50%)',overflow:document.documentElement.scrollWidth>innerWidth+1,
      score:rect(document.querySelector('.match-scoreboard')),motion:gem.animationName,gem:gem.backgroundImage,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches};
  });
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  const errors=[],checks=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    if(built)await context.route(origin+'/**',route=>{
      const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
      if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-metro-qa-only',version);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(url+'#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    const fixtures=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.fromPreset({name:'Metro QA',cards:KALISTAR_DATA.decks.player}),fixtures=[];
      for(const first of [0,1]){
        const s=E.newGame(team,team,{seed:'METRO-'+first,mode:'local',turnOrder:'ABBA'});E.rollInitiative(s,first?[1,6]:[6,1]);
        const cases={},copy=()=>JSON.parse(JSON.stringify(s));
        for(let turn=1;turn<=200;turn++){
          if([1,2,3,4,5,17,99,195,200].includes(turn))cases['choose-'+turn]=copy();
          E.lock(s,0,0);const a=E.card(s.players[s.turn].board[0]),b=E.card(s.players[1-s.turn].board[0]);
          const attack=Math.min(...a.atk.filter(v=>typeof v==='number')),defense=Math.max(...b.defense.filter(v=>typeof v==='number'));
          if(turn===17)cases['attack-17']=copy();
          E.rollAttack(s,6-a.atk.indexOf(attack));if(s.phase==='kalistel')E.acceptAttack(s);
          if(s.phase==='defense')E.rollDefense(s,6-b.defense.indexOf(defense));
          if(s.phase!=='result'||s.players.some(p=>p.dead.length))throw Error('Nonlethal fixture must resolve through the real engine');
          E.assertState(s);if(turn<=3||turn===200)cases['result-'+turn]=copy();E.next(s);
        }
        E.assertState(s);if(s.phase!=='over')throw Error('200-turn fixture not finished');fixtures.push(cases);
      }
      return fixtures;
    });
    for(const [first,cases]of fixtures.entries()){
      for(const turn of [1,2,3,4,5,17,99,195,200]){
        await restore(page,cases['choose-'+turn]);const result=await inspect(page);
        assert.deepEqual(result.current,{turn,round:Math.floor(turn/2)+1,side:cases['choose-'+turn].turn,resolved:false});
        assert(!result.text.includes('ABBA')&&!result.text.includes('Maintenant'));assert(result.hiddenStatus);assert(result.stationFits&&result.groupsFit);
        assert(result.steps.some(x=>x.turn===turn));if(turn>1)assert(result.steps.some(x=>x.past));checks.push({first,turn,...result});
      }
      for(const turn of [1,2,3]){
        await restore(page,cases['result-'+turn]);assert((await inspect(page)).current.resolved);
        await page.locator('[data-action=next]').click();await page.waitForFunction(turn=>JSON.parse(localStorage.getItem('kalistar.v4.game')).round===turn+1,turn);
        const result=await inspect(page);assert.equal(result.current.turn,turn+1);assert.equal(result.current.round,Math.floor((turn+1)/2)+1);
        checks.push({name:'real-next',first,turn,...result});
      }
    }
    for(const turn of [17,200]){
      await restore(page,fixtures[0][turn===17?'attack-17':'choose-200']);
      for(const [width,height]of [[1920,1080],[1440,1000],[1024,768],[820,1180],[412,1007],[390,844],[320,568],[699,900],[844,390]]){
        await page.setViewportSize({width,height});await page.waitForTimeout(120);const result=await inspect(page),phone=width<700||width<=950&&height<=500;
        assert.equal(result.box.height,phone?34:36);assert.equal(result.steps.length,phone?5:11);assert(!result.overflow);
        assert(result.stationFits&&result.groupsFit,'station and round labels fit at '+width+' / '+turn);
        assert.equal(result.current.turn,turn);assert(result.box.left>=0&&result.box.right<=width+1);
        if(phone){assert(result.score.top>=result.box.bottom);assert(result.track.width>=result.box.width-20);}
        checks.push({width,height,turn,...result});
        if([1440,412,320].includes(width)){
          await page.screenshot({path:path.join(output,'arena-'+turn+'-'+width+'.png')});
          await page.locator('.turn-timeline').screenshot({path:path.join(output,'track-'+turn+'-'+width+'.png')});
        }
      }
    }
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal((await inspect(page)).motion,'none');
    await page.setViewportSize({width:1440,height:1000});await page.goto(url+'?phone=razr50#arena');
    const frame=page.frameLocator('#phone-preview-frame');await frame.locator('.turn-timeline li[aria-current=step]').waitFor();
    assert.equal(await frame.locator('.turn-timeline').evaluate(n=>n.getBoundingClientRect().height),34);
    assert.equal(await frame.locator('.turn-timeline li:visible').count(),5);await page.screenshot({path:path.join(output,'razr50.png')});
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');
    console.log(JSON.stringify({passed:true,built,checks:checks.length,errors},null,2));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
