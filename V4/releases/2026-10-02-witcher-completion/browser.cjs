'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,assert,read,write,hash,ROOT,sharp}=L;
const {createRequire}=require('node:module');
async function main(){
 const specs=require('../../expansions/2026-10-01-one-piece-witcher/set.json').cards,ready=require('../../expansions/2026-10-01-one-piece-witcher/publication-selection.json').ready;
 const plans=[{id:'49800301'},{id:'49900106'}];
 const ids=process.env.KALISTAR_REVIEW_IDS?.split(',')||plans.map(c=>c.id);
 const cards=ids.map(id=>read(path.join(ROOT,'V4/creations',id,'profile.json')));
 const url=new URL(process.env.KALISTAR_REVIEW_URL||'http://127.0.0.1:4304/jeu/');url.hash='collection';
 const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
 const {chromium}=createRequire(path.join(runtime,'_one_piece.cjs'))('playwright');
 const report={passed:false,url:url.href,views:[],errors:[]};
 const out=path.join(__dirname,'qa',process.env.KALISTAR_REVIEW_KIND||'local');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500,serviceWorkers:'block',reducedMotion:'reduce'});
   try{
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
    await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());return r.method()==='GET'&&(u.origin===url.origin||['blob:','data:'].includes(u.protocol))?route.continue():route.abort();});
    await page.goto(url.href);await page.waitForFunction(()=>window.KALISTAR_READY===true);
    const data=await page.evaluate(()=>structuredClone(KALISTAR_DATA));assert.equal(data.cards.length,190);assert.equal(data.arenas.length,28);
    if(viewport.width>500)assert.match(await page.locator('.edition').textContent(),/4\.3/);
    else assert.match(await page.evaluate(()=>getComputedStyle(document.querySelector('.brand'),'::after').content),/4\.3/);
    for(const plan of plans){
     const card=data.cards.find(c=>c.id===plan.id),profile=read(path.join(ROOT,'V4/creations',plan.id,'profile.json'));assert(card);
     for(const field of ['atk','defense','role','positions','magic','barriers','characterId'])assert.deepEqual(card[field],profile[field],plan.id+' '+field);
    }
    const scope=page.locator('[data-binder-action=scope][data-id=one-piece]');
    assert.equal(await scope.count(),1);await scope.click();
    assert.match(await page.locator('.cb-count').textContent(),/19 personnages.*21 versions/);
    await page.locator('[data-binder-action=scope][data-id=witcher]').click();
    assert.match(await page.locator('.cb-count').textContent(),/5 personnages.*5 versions/);
    await page.locator('[data-binder-action=scope][data-id=catalogue]').click();
    for(const card of cards){
     await page.locator('[data-binder-field=search]').fill(card.id);
     await page.locator('.cb-card[data-id="'+card.id+'"]').click();
     await page.waitForFunction(()=>{const i=document.querySelector('.cb-hero-image'),r=KalistarCardMedia.crop;return i?.complete&&i.naturalWidth===r.width&&i.naturalHeight===r.height;});
     const published=data.cards.find(c=>c.id===card.id);assert(published);
     for(const f of ['name','title','race','weapon','faction','element','role','positions','atk','defense','magic','barriers','characterId'])assert.deepEqual(published[f],card[f],card.id+' '+f);
     const nativeURL=await page.evaluate(s=>new URL(KalistarSite.url(s),location.href).href,published.pngUrl);
     const response=await page.request.get(nativeURL);assert.equal(response.status(),200);
     const bytes=await response.body(),sha=await hash(path.join(ROOT,'V4/creations',card.id,'card.png'));
     assert.equal(L.crypto.createHash('sha256').update(bytes).digest('hex'),sha);
     const meta=await sharp(bytes).metadata();assert.deepEqual([meta.width,meta.height],[897,1497]);
     const delta=await page.evaluate(async url=>{
      const img=new Image();img.src=url;await img.decode();
      const hero=document.querySelector('.cb-hero-image'),r=KalistarCardMedia.crop;
      const cv=document.createElement('canvas');cv.width=r.width;cv.height=r.height;
      const ctx=cv.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,r.left,r.top,r.width,r.height,0,0,r.width,r.height);
      const a=ctx.getImageData(0,0,r.width,r.height).data;
      ctx.clearRect(0,0,r.width,r.height);ctx.drawImage(hero,0,0);
      const b=ctx.getImageData(0,0,r.width,r.height).data;let difference=0;
      for(let i=0;i<a.length;i+=4)difference+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
      return difference/(r.width*r.height*3);
     },nativeURL);assert(delta<6,'Native/browser image mismatch '+card.id+': '+delta);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
     assert.equal(await page.locator('[data-v4-media-error]').count(),0);
     await page.screenshot({path:path.join(out,card.id+'-'+viewport.width+'.png'),animations:'disabled'});
     report.views.push({id:card.id,width:viewport.width,sha256:sha,meanAbsoluteRGBDelta:delta});
     await page.goto(url.href);await page.waitForFunction(()=>window.KALISTAR_READY===true);
     await page.locator('[data-binder-action=scope][data-id=catalogue]').click();
    }
   }finally{await context.close();}
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{await browser.close();write(path.join(out,'report.json'),report);}
 return {passed:report.passed,views:report.views.length,errors:report.errors};
}
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
