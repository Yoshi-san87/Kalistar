'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__performance_qa__.cjs'));
const origin=process.env.KALISTAR_URL||'http://127.0.0.1:4304',built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const base=built?'https://kalistar-perf.invalid/Kalistar/jeu/':origin+'/jeu/';
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/performance-audit/baseline'));
const sourceRef=process.env.KALISTAR_BASELINE_REF||'',isolated=!!sourceRef||process.env.KALISTAR_ISOLATED_PERF==='1',collectCoverage=process.env.KALISTAR_COVERAGE==='1';
async function main(){
  const sources=new Map();
  if(isolated)for(const name of fs.readdirSync(__dirname).filter(name=>/\.(js|css|html)$/.test(name))){
    try{sources.set(name,sourceRef?execFileSync('git',['show',sourceRef+':V4/site/'+name],{cwd:path.resolve(__dirname,'../..'),stdio:['ignore','pipe','ignore']}):fs.readFileSync(path.join(__dirname,name)));}catch{ /* New unreferenced files have no historical counterpart. */ }
  }
  fs.mkdirSync(output,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),report={built,sourceRef:sourceRef||'working-tree',collectCoverage,profiles:[]};
  try{
    for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,1007]]){
      const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
      if(isolated)await context.route('**/jeu/**',async route=>{
        const name=new URL(route.request().url()).pathname.split('/jeu/')[1]||'index.html',bytes=sources.get(name);
        if(!bytes)return route.continue();
        await new Promise(resolve=>setTimeout(resolve,80));return route.fulfill({body:bytes,contentType:name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'text/javascript'});
      });
      if(built)await context.route('https://kalistar-perf.invalid/**',route=>{
        const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
        if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
        return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      await context.addInitScript(()=>{
        const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-performance-qa-only',version);};
        window.__perfLongTasks=[];new PerformanceObserver(list=>{for(const e of list.getEntries())__perfLongTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
      });
      page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      if(!built)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:10*1024*1024,uploadThroughput:1024*1024});
      if(collectCoverage){await page.coverage.startJSCoverage({resetOnNavigation:false});await page.coverage.startCSSCoverage({resetOnNavigation:false});}
      await page.goto(base+'#collection');await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
      const start=await page.evaluate(()=>({ready:performance.now(),resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name,location.href).pathname,bytes:e.encodedBodySize,duration:e.duration})),tasks:__perfLongTasks.slice()}));
      await page.evaluate(async()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.fromPreset({name:'Performance QA',cards:KALISTAR_DATA.decks.player});
        const game=E.newGame(team,team,{mode:'local',seed:'PERFORMANCE-QA',turnOrder:'ABBA'});E.rollInitiative(game, [6,1]);
        await KALISTAR_DB.saveGame(game);localStorage.setItem('kalistar.v4.game',JSON.stringify(game));
      });await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
      const navigation=[];
      for(const view of ['decks','weapons','statistics','story','collection','arena','collection','decks','statistics','collection']){
        console.log(name+' / '+view);
        const begin=await page.evaluate(()=>performance.now());
        await page.evaluate(view=>document.querySelector('.main-nav [data-view="'+view+'"]').click(),view);
        try{await page.waitForFunction(view=>location.hash==='#'+view&&document.body.classList.contains(view==='arena'?'arena-view':view+'-view'),view);}
        catch(error){throw Error(view+' navigation: '+await page.evaluate(()=>location.hash+' / '+document.querySelector('#toast').textContent)+' / '+error.message);}
        if(view==='arena'){
          const skip=page.locator('.li-skip');if(await skip.count())await skip.click();
        }
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        navigation.push({view,ms:await page.evaluate(begin=>performance.now()-begin,begin)});
        if(['decks','weapons','statistics','story'].includes(view)&&navigation.filter(x=>x.view===view).length===1){
          if(view==='story')await page.locator('.story-reader-book').waitFor();
          await page.waitForFunction(()=>[...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.left<innerWidth&&r.right>0;}).every(img=>img.complete&&img.naturalWidth>0&&!img.src.includes('#v4-')));
          await page.screenshot({path:path.join(output,name+'-'+view+'.png')});
        }
      }
      const queries=[];
      for(const [view,selector]of [['collection','[data-binder-field=search]'],['decks','[data-deck-filter=search]'],['statistics','[data-sheet-field=query]']]){
        await page.evaluate(view=>document.querySelector('.main-nav [data-view="'+view+'"]').click(),view);
        if(view==='decks'&&width<700)await page.locator('[data-deck-action=panel][data-id=recruit]').click();
        await page.waitForSelector(selector);
        const ms=await page.evaluate(async({selector})=>{
          const start=performance.now();for(const query of ['m','mo','mom','momo','']){const input=document.querySelector(selector);input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}));}await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return performance.now()-start;
        },{selector});queries.push({view,fiveInputsMs:ms});
      }
      await page.evaluate(()=>document.querySelector('.main-nav [data-view=collection]').click());await page.waitForTimeout(400);
      const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
      const activity=await page.evaluate(()=>({ambience:KalistarAmbience.inspect(),canvases:document.querySelectorAll('canvas').length,animations:document.getAnimations().length,nodes:document.querySelectorAll('*').length,longTasks:__perfLongTasks.slice()}));
      assert.equal(activity.ambience.running,false,'no arena loop outside arena');assert.equal(activity.ambience.subscribers,0);assert.deepEqual(errors,[]);
      if(process.env.KALISTAR_EXPECT_OPTIMIZED==='1'){
        const unchanged=await page.evaluate(()=>{
          const svg=document.querySelector('svg[data-lucide]'),converted=KalistarUI.icons();
          const set=Storage.prototype.setItem,writes=[];Storage.prototype.setItem=function(key,value){writes.push(key);return set.call(this,key,value);};
          try{for(const view of ['statistics','collection','weapons','collection'])document.querySelector('.main-nav [data-view="'+view+'"]').click();}
          finally{Storage.prototype.setItem=set;}
          return {converted,stable:svg===document.querySelector('svg[data-lucide]'),writes:writes.filter(key=>key.startsWith('kalistar.v4.'))};
        });
        assert.equal(unchanged.converted,0);assert(unchanged.stable,'existing icons retain identity');assert.deepEqual(unchanged.writes,[],'unchanged navigation does not write saves');
      }
      const js=collectCoverage?await page.coverage.stopJSCoverage():[],css=collectCoverage?await page.coverage.stopCSSCoverage():[];
      const coverage=entries=>entries.map(e=>({file:new URL(e.url,base).pathname,bytes:Buffer.byteLength(e.text||e.source||''),used:e.ranges?.reduce((n,r)=>n+r.end-r.start,0)??null}));
      report.profiles.push({name,width,height,cpuSlowdown:4,latencyMs:built?null:80,start,navigation,queries,metrics,activity,coverage:{js:coverage(js),css:coverage(css)},errors});
      fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');await context.close();
    }
  }finally{await browser.close();}
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.profiles.map(p=>({name:p.name,readyMs:Math.round(p.start.ready),scriptRequests:p.start.resources.filter(r=>r.name.endsWith('.js')).length,loadedBytes:p.start.resources.reduce((n,r)=>n+r.bytes,0),longTasks:p.activity.longTasks.length,queries:p.queries,arenaLoopAfterExit:p.activity.ambience.running})),null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
