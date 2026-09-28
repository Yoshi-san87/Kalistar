'use strict';
const L = require('../../atelier/lib.cjs'), {fs,path,assert,read,write,hash,ROOT,sharp} = L;
const {createRequire} = require('node:module'), crypto = require('node:crypto');
const spec = require('../../expansions/2026-09-28-raiden/set.json').cards[0];
async function main() {
  const url = new URL(process.env.KALISTAR_REVIEW_URL || 'http://127.0.0.1:4304/jeu/'); url.hash = 'collection';
  const out = path.join(__dirname, 'qa', process.env.KALISTAR_REVIEW_URL ? 'public' : 'local'); fs.mkdirSync(out, {recursive:true});
  const report = {passed:false,url:url.href,views:[],errors:[]}; let browser;
  try {
    const expected = read(path.join(__dirname, 'baseline-game.json'));
    const sha = await hash(path.join(ROOT,'V4/creations',spec.id,'card.png'));
    const runtime = path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    const {chromium} = createRequire(path.join(runtime,'_raiden.cjs'))('playwright');
    browser = await chromium.launch({channel:'chrome',headless:true});
    for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      const context = await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500,serviceWorkers:'block',reducedMotion:'reduce'});
      try {
        await context.route('**/*', route => { const r=route.request(),u=new URL(r.url()); return r.method()==='GET'&&(u.origin===url.origin||['blob:','data:'].includes(u.protocol)) ? route.continue() : route.abort(); });
        const page=await context.newPage(); page.on('pageerror',e=>report.errors.push(e.message));
        page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
        await page.goto(url.href); await page.waitForFunction(()=>window.KALISTAR_READY===true);
        const actual=await page.evaluate(()=>structuredClone(KALISTAR_DATA));
        assert.equal(actual.cards.length,expected.cards.length); assert.equal(actual.arenas.length,expected.arenas.length);
        const card=actual.cards.find(c=>c.id===spec.id); assert(card);
        for(const f of ['name','title','race','weapon','faction','element','role','positions','atk','defense','magic','barriers'])assert.deepEqual(card[f],spec[f]);
        assert(actual.arenas.find(a=>a.id==='mgs2-big-shell').homeCharacters.includes('raiden-mgs'));
        await page.locator('[data-binder-field=search]').fill(spec.id);
        await page.locator('.cb-card[data-id="'+spec.id+'"]').click();
        await page.waitForFunction(()=>{const i=document.querySelector('.cb-hero-image'),r=KalistarCardMedia.crop;return i?.complete&&i.naturalWidth===r.width&&i.naturalHeight===r.height&&!i.src.includes('#v4-');});
        assert.equal((await page.locator('.cb-card-heading h2').textContent()).trim(),spec.name);
        assert.equal((await page.locator('.cb-card-heading p').textContent()).trim(),spec.title);
        const nativeURL=await page.evaluate(s=>new URL(KalistarSite.url(s),location.href).href,card.pngUrl);
        const response=await page.request.get(nativeURL);assert.equal(response.status(),200);
        const bytes=await response.body();assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha);
        const meta=await sharp(bytes).metadata();assert.deepEqual([meta.width,meta.height],[897,1497]);
        const delta=await page.evaluate(async url=>{
          const img=new Image();img.src=url;await img.decode();const hero=document.querySelector('.cb-hero-image'),r=KalistarCardMedia.crop;
          const cv=document.createElement('canvas');cv.width=r.width;cv.height=r.height;const ctx=cv.getContext('2d',{willReadFrequently:true});
          ctx.drawImage(img,r.left,r.top,r.width,r.height,0,0,r.width,r.height);const a=ctx.getImageData(0,0,r.width,r.height).data;
          ctx.clearRect(0,0,r.width,r.height);ctx.drawImage(hero,0,0);const b=ctx.getImageData(0,0,r.width,r.height).data;let d=0;
          for(let i=0;i<a.length;i+=4)d+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);return d/(r.width*r.height*3);
        },nativeURL);assert(delta<6,'Native/browser pixel delta: '+delta);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        assert.equal(await page.locator('[data-v4-media-error]').count(),0);
        await page.screenshot({path:path.join(out,'raiden-'+viewport.width+'.png'),animations:'disabled'});
        report.views.push({width:viewport.width,id:spec.id,sha256:sha,meanAbsoluteRGBDelta:delta});
      } finally {await context.close();}
    }
    assert.deepEqual(report.errors,[]);report.passed=true;
  } catch(e) {report.failure=e.stack;process.exitCode=1;}
  finally {await browser?.close();write(path.join(out,'report.json'),report);console.log(JSON.stringify(report));}
}
main();

