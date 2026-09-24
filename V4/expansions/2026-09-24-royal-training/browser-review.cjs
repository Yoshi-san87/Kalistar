'use strict';
const {createRequire}=require('node:module');
const L=require('../../atelier/lib.cjs');
const {fs,path,assert,sharp}=L;
const {pixelCheck}=require('../../collaborations/nier-arenas-01/browser-review.cjs');
const M=require('./model.cjs');
const home=__dirname;
async function ready(page){
  await page.waitForFunction(()=>window.KALISTAR_READY===true);
  await page.waitForFunction(()=>[...document.images].filter(i=>{
    const r=i.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight;
  }).every(i=>i.complete&&i.naturalWidth));
  assert.equal(await page.locator('[data-v4-media-error]').count(),0);
}
async function main(){
  const out=path.join(home,'browser-review');fs.mkdirSync(out,{recursive:true});
  const report={passed:false,checkedAt:new Date().toISOString(),views:[],errors:[],mode:'Isolated GET-only contexts; no real browser storage'};
  const origin=new URL(L.read(path.join(L.DATA,'runtime.json')).url).origin;
  const specs=Object.keys(M.INPUTS).flatMap(f=>L.read(path.join(home,f))).map(M.normalize);
  const revisions=L.read(path.join(home,'baseline/revisions.json'));
  const targets=[...specs.map(c=>({...c,file:'cards/'+c.key+'/card.png'})),...revisions.map(c=>({id:c.entry.id,key:c.key,name:c.entry.profile.name,file:'revisions/'+c.key+'/card.png'}))];
  const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const {chromium}=createRequire(path.join(runtime,'__royal_review__.cjs'))('playwright');
  const guarded=['V4/atelier/data/references.json','V4/donnees/catalogue.json','V4/atelier/designer-assets/manifest.json'];
  const before=new Map();for(const f of guarded)before.set(f,await L.hash(path.join(L.ROOT,f)));
  let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const viewport of [{width:1600,height:1000},{width:390,height:844}]){
      const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500,reducedMotion:'reduce',serviceWorkers:'block'});
      const view={...viewport,cards:[],screenshots:[]};report.views.push(view);
      const page=await context.newPage();page.setDefaultTimeout(25000);
      try{
        await context.route('**/*',route=>new URL(route.request().url()).origin===origin&&route.request().method()==='GET'?route.continue():route.abort());
        page.on('pageerror',e=>report.errors.push(e.message));
        page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
        await page.goto(origin+'/jeu/#collection');await ready(page);
        const data=await page.evaluate(()=>KALISTAR_DATA);
        assert.equal(data.cards.length,89);assert.equal(data.arenas.length,23);
        for(const c of targets){
          const card=data.cards.find(p=>p.id===c.id);assert(card,c.key);
          const response=await page.request.get(origin+card.pngUrl);assert.equal(response.status(),200);
          const bytes=await response.body(),hash=L.crypto.createHash('sha256').update(bytes).digest('hex');
          assert.equal(hash,await L.hash(path.join(home,c.file)),c.key+' served bytes');
          const meta=await sharp(bytes).metadata();assert.deepEqual([meta.width,meta.height],[897,1497]);
          await page.locator('[data-binder-field=search]').fill(c.id);
          await page.locator('.cb-card[data-id="'+c.id+'"]').click();await ready(page);
          assert.equal(await page.locator('.cb-card-heading h2').textContent(),c.name);
          const layout=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
          assert(layout.sw<=layout.w+1,c.key+' horizontal overflow');assert(layout.sh<=layout.h+1,c.key+' vertical overflow');
          view.cards.push({key:c.key,id:c.id,hash,layout});
          if(['ruby','kaylis-entrainement','sapphire','aelis-veille','xiaomi','asteran'].includes(c.key)){
            const file=c.key+'-'+viewport.width+'.png';
            const shot=await page.screenshot({path:path.join(out,file),animations:'disabled'});
            view.screenshots.push({file,...await pixelCheck(shot,file)});
          }
          await page.locator('[data-binder-action=back]').click();
        }
        const flag=await page.request.get(origin+'/jeu/assets/factions/Solaria.png');assert.equal(flag.status(),200);
        assert.equal(L.crypto.createHash('sha256').update(await flag.body()).digest('hex'),await L.hash(path.join(L.ROOT,'V4/site/assets/factions/Solaria.png')));
        view.solaria=true;
        assert.equal(await page.evaluate(()=>KALISTAR_DB.registry.owned('user-paris').length),89);
        await page.reload();await ready(page);
        assert.equal(await page.evaluate(()=>KALISTAR_DB.registry.owned('user-paris').length),89);
        view.seedIdempotent=true;
      }catch(error){await page.screenshot({path:path.join(out,'failure-'+viewport.width+'.png')}).catch(()=>{});throw error;}
      finally{await context.close();}
    }
    assert.deepEqual(report.errors,[]);report.passed=true;
  }catch(error){report.failure=error.stack;throw error;}
  finally{
    if(browser)await browser.close();
    for(const [f,h] of before)assert.equal(await L.hash(path.join(L.ROOT,f)),h);
    report.sourcesPreserved=true;L.write(path.join(out,'report.json'),report);
  }
  console.log(JSON.stringify({passed:true,views:report.views.map(v=>({width:v.width,cards:v.cards.length})),errors:report.errors}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
