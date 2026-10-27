const path=require('node:path'),{createRequire}=require('node:module');
const modules=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/_narration_qa.cjs'));
const {chromium}=modules('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/gaming-book-narration');
const origin='https://momo-narration.invalid',url=origin+'/jeu/gaming-book/momo/';
const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
async function routeBuild(context){
  await context.route('**/*',route=>{
    const request=new URL(route.request().url());assert.equal(request.origin,origin);
    const file=path.resolve(dist,decodeURIComponent(request.pathname.slice(1))+(request.pathname.endsWith('/')?'index.html':''));
    assert(file.startsWith(dist+path.sep));assert(fs.existsSync(file),'Missing '+file);
    return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
}
const result={passed:false,checks:[],errors:[]};
const check=(v,label)=>{assert.ok(v,label);result.checks.push(label);};
const snap=p=>p.evaluate(()=>KalistarMomoScene.snapshot());
async function next(p,touch=false){
  if((await snap(p)).narration.typing){await p.locator('#continue')[touch?'tap':'click']();await p.waitForTimeout(240);}
  await p.waitForFunction(()=>KalistarMomoScene.snapshot().canContinue);await p.locator('#continue')[touch?'tap':'click']();
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const b=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
  try{
    for(const mobile of [false,true]){
      const context=await b.newContext({viewport:mobile?{width:412,height:915}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
      await routeBuild(context);
      const p=await context.newPage(),name=mobile?'razr':'pc';p.on('pageerror',e=>result.errors.push(e.message));
      await p.goto(url);await p.waitForFunction(()=>window.KalistarMomoScene?.snapshot().ready);
      const initial=await p.evaluate(()=>({loading:!document.getElementById('loading').hidden,n:KalistarMomoScene.snapshot().narration}));
      check(!initial.loading||(initial.n.visible===0&&initial.n.suspended),name+': typing waits for the loading screen to leave');
      await p.evaluate(()=>document.fonts.ready);
      await p.waitForFunction(()=>KalistarMomoScene.snapshot().canContinue&&!KalistarMomoScene.snapshot().narration.typing);
      check(!(await snap(p)).narration.scheduled,name+': completed text has no timer');
      await next(p,mobile);await p.waitForTimeout(400);let s=await snap(p);
      check(s.narration.typing&&s.narration.visible>0&&s.narration.visible<s.narration.total,name+': visible letters build gradually');
      await p.screenshot({path:path.join(output,`typewriter-${name}.png`)});
      const positions=()=>p.locator('.narration-layer').evaluateAll(layers=>{
        const layer=layers.find(e=>e.style.opacity==='1');
        return [...layer.children].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
      });
      const before=await positions(),beat=s.story.beat;
      if(mobile)await p.locator('#continue').tap();else await p.locator('#continue').dblclick();
      s=await snap(p);check(!s.narration.typing&&s.narration.visible===s.narration.total&&s.story.beat===beat,name+': first input reveals text, never skips its page');
      assert.deepEqual(await positions(),before);result.checks.push(name+': no letter or line moves while text is revealed');
      check(await p.locator('#narration .sr-only').textContent()===s.narration.text,name+': accessible text is announced as a whole phrase');
      await p.waitForTimeout(240);await next(p,mobile);await p.waitForTimeout(250);
      await p.locator('#pause').click();const held=(await snap(p)).narration;await p.waitForTimeout(450);s=await snap(p);
      check(s.narration.visible===held.visible&&!s.narration.scheduled,name+': pause freezes letters and clears their timer');
      await p.locator('#resume').click();await p.waitForFunction(n=>KalistarMomoScene.snapshot().narration.visible>n,held.visible);
      check(true,name+': letters resume after pause');
      await next(p,mobile);await p.waitForTimeout(250);
      await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      const hidden=(await snap(p)).narration;await p.waitForTimeout(500);
      check((await snap(p)).narration.visible===hidden.visible&&!(await snap(p)).narration.scheduled,name+': hidden page stops typing');
      await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>KalistarMomoScene.snapshot().reduced);
      s=await snap(p);check(!s.narration.typing&&s.narration.visible===s.narration.total&&!s.narration.scheduled,name+': reduced motion shows the full phrase immediately');
      await next(p,mobile);s=await snap(p);check(!s.narration.typing&&!s.cinema.captionCentered,name+': next phrase respects reduced motion and bottom placement');
      check(await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth&&document.documentElement.scrollHeight===innerHeight),name+': no viewport overflow');
      await context.close();
    }
    const p=await b.newPage();await routeBuild(p.context());await p.goto(url);await p.waitForFunction(()=>window.KalistarMomoScene?.snapshot().ready);
    const component=await p.evaluate(async()=>{
      const {createNarrator,narrationGlyphs,glyphDelay,typingDefaults}=await import('./narration.mjs');
      const host=document.createElement('div');document.body.append(host);
      const n=createNarrator(host,{settings:{leadMs:1,letterMs:2,pauseMs:5,commaMs:3,lineMs:3}});
      const special='e\u0301 👩🏽‍🚀 <script>.';const units=narrationGlyphs(special);n.show(special);n.complete();
      const safe=!host.querySelector('script'),complete=n.snapshot();
      n.show('Ancien texte long.');n.show('Nouveau.');n.dispose();const stopped=n.snapshot();
      await new Promise(r=>setTimeout(r,80));const after=n.snapshot();host.remove();
      return {safe,units,complete,stopped,after,pause:glyphDelay('.',typingDefaults)>glyphDelay('a',typingDefaults)};
    });
    check(component.safe,'Narration is text, never parsed HTML');
    check(component.units.includes('e\u0301')&&component.units.includes('👩🏽‍🚀'),'Accented letters and joined characters remain whole');
    check(component.complete.visible===component.complete.total,'Manual completion reveals all glyphs');
    check(!component.after.scheduled&&component.after.visible===component.stopped.visible,'Replacement and disposal cancel obsolete timers');
    check(component.pause,'Punctuation provides a short breathing pause');
    check(result.errors.length===0,'No browser errors');result.passed=true;
  }finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));await b.close();console.log(JSON.stringify(result));}
})().catch(e=>{console.error(e);process.exitCode=1;});
