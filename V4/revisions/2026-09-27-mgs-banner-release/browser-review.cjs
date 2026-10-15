'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,assert,read,write,hash,ROOT,sharp}=L;
const {createRequire}=require('node:module'),crypto=require('node:crypto');
const specs=require('../2026-09-27-mgs-banner-refinement/model.cjs').specs();
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
async function ready(page){
  await page.waitForFunction(()=>window.KALISTAR_READY===true);
  await page.waitForFunction(()=>[...document.images].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}).every(n=>n.complete&&n.naturalWidth&&!n.src.includes('#v4-')));
  assert.equal(await page.locator('[data-v4-media-error]').count(),0);
}
async function main(){
  const mode=process.env.KALISTAR_REVIEW_URL?'public':'local',out=path.join(__dirname,'qa',mode);
  fs.mkdirSync(out,{recursive:true});
  const report={passed:false,views:[],errors:[],failedRequests:[],flags:[]};let browser;
  try{
    const published=read(path.join(ROOT,'V4/donnees/catalogue.json')).cards.filter(c=>c.kind==='created');
    const expected=await require('../../atelier/game-catalog.cjs').buildCatalog({published});
    const cards=[];
    for(const s of specs){const c=expected.cards.find(c=>c.id===s.id);assert(c);cards.push({...s,profile:c,sha256:await hash(path.join(ROOT,'V4/creations',s.id,'card.png'))});}
    const url=new URL(process.env.KALISTAR_REVIEW_URL||'http://127.0.0.1:4304/jeu/');url.hash='collection';report.url=url.href;
    const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    const {chromium}=createRequire(path.join(runtime,'_banner_review.cjs'))('playwright');
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const viewport of [{width:1600,height:1000},{width:390,height:844}]){
      const context=await browser.newContext({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500,reducedMotion:'reduce',serviceWorkers:'block'});
      try{
        await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());return r.method()==='GET'&&(u.origin===url.origin||['blob:','data:'].includes(u.protocol))?route.continue():route.abort();});
        const page=await context.newPage();page.setDefaultTimeout(30000);
        page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedRequests.push(r.url());});
        await page.goto(url.href);await ready(page);
        const actual=await page.evaluate(()=>structuredClone(KALISTAR_DATA));
        assert.equal(actual.cards.length,expected.cards.length);assert.equal(actual.arenas.length,expected.arenas.length);
        for(const id of ['MGS1','MGS2','MGS4']){
          const file=path.join(ROOT,'V4/site/assets/factions',id+'.png'),sha256=await hash(file);
          assert.equal(sha256,await hash(path.join(ROOT,'V4/revisions/2026-09-27-mgs-banner-refinement/art-flags','flag-'+id+'.png')));
          const flagUrl=await page.evaluate(id=>new URL(KalistarCollaborations.asset('factions',id),location.href).href,id);
          const r=await page.request.get(flagUrl);assert.equal(r.status(),200);assert.equal(digest(await r.body()),sha256);report.flags.push({id,width:viewport.width,sha256});
        }
        for(const c of cards){
          const a=actual.cards.find(x=>x.id===c.id);assert(a);
          for(const f of ['name','title','race','weapon','faction','element','positions','role','atk','defense','magic','barriers','characterId'])assert.deepEqual(a[f],c.profile[f],c.id+' '+f);
          await page.locator('[data-binder-field=search]').fill(c.id);await page.locator('.cb-card[data-id="'+c.id+'"]').click();await ready(page);
          assert.equal((await page.locator('.cb-card-heading h2').textContent()).trim(),c.profile.name);
          assert.equal((await page.locator('.cb-card-heading p').textContent()).trim(),c.profile.title);
          const nativeUrl=await page.evaluate(s=>new URL(KalistarSite.url(s),location.href).href,c.profile.pngUrl);
          const r=await page.request.get(nativeUrl);assert.equal(r.status(),200);const bytes=await r.body();assert.equal(digest(bytes),c.sha256);
          const m=await sharp(bytes).metadata();assert.deepEqual([m.width,m.height],[897,1497]);
          const delta=await page.evaluate(async url=>{
            const img=new Image();img.src=url;await img.decode();const h=document.querySelector('.cb-hero-image'),r=KalistarCardMedia.crop;
            if(h.naturalWidth!==r.width||h.naturalHeight!==r.height)throw Error('Invalid crop');
            const cv=document.createElement('canvas');cv.width=r.width;cv.height=r.height;const ctx=cv.getContext('2d',{willReadFrequently:true});
            ctx.drawImage(img,r.left,r.top,r.width,r.height,0,0,r.width,r.height);const a=ctx.getImageData(0,0,r.width,r.height).data;
            ctx.clearRect(0,0,r.width,r.height);ctx.drawImage(h,0,0);const b=ctx.getImageData(0,0,r.width,r.height).data;let d=0;
            for(let i=0;i<a.length;i+=4)d+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);return d/(r.width*r.height*3);
          },nativeUrl);assert(delta<6,c.id+' browser/native mismatch');
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1),'Viewport overflow');
          if(c.crop||c.key.startsWith('solid-snake'))await page.screenshot({path:path.join(out,c.key+'-'+viewport.width+'.png'),animations:'disabled'});
          report.views.push({id:c.id,width:viewport.width,sha256:c.sha256,meanAbsoluteRGBDelta:delta});await page.locator('[data-binder-action=back]').click();
        }
      }finally{await context.close();}
    }
    assert.equal(report.views.length,22);assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.passed=true;
  }catch(e){report.failure=e.stack;process.exitCode=1;}
  finally{await browser?.close();write(path.join(out,'report.json'),report);console.log(JSON.stringify({passed:report.passed,views:report.views.length,flags:report.flags.length,failure:report.failure,report:path.join(out,'report.json')}));}
}
main();
