const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '_ff9-gallery.cjs'))('playwright');

async function main() {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const results=[];
  try {
    for (const [name,width,height] of [['desktop',1440,1100],['mobile',412,915],['narrow',320,740]]) {
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
      await page.locator('img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
      await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
      assert.equal(await page.locator('figure').count(),20);
      const geometry=await page.evaluate(()=>({
        client:document.documentElement.clientWidth,
        scroll:document.documentElement.scrollWidth,
        columns:getComputedStyle(document.querySelector('main')).gridTemplateColumns.split(' ').length,
        images:[...document.images].map(image=>({loaded:image.complete&&image.naturalWidth>0,fit:getComputedStyle(image).objectFit})),
        clipped:[...document.querySelectorAll('h1,h2,figcaption p,select')].filter(element=>element.scrollWidth>element.clientWidth+1).map(element=>element.textContent)
      }));
      assert.equal(geometry.scroll,geometry.client);
      assert.equal(geometry.images.length,20);
      assert(geometry.images.every(image=>image.loaded&&image.fit==='contain'));
      assert.deepEqual(geometry.clipped,[]);
      for(const [group,count] of [['Heritiers',9],['Cour',6],['Tantalas',5]]) {
        await page.locator('#group').selectOption(group);
        assert.equal(await page.locator('figure:visible').count(),count);
        assert.equal(await page.locator('#count').innerText(),count+' illustrations');
      }
      await page.locator('#group').selectOption('');
      assert.equal(await page.locator('figure:visible').count(),20);
      await page.screenshot({path:path.join(__dirname,'gallery-'+name+'.png')});
      assert.deepEqual(errors,[]);
      results.push({name,width,height,status:'passed',columns:geometry.columns,images:20,overflow:false,filters:true,errors});
      await page.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(__dirname,'gallery-verification.json'),JSON.stringify({date:'2026-10-08',status:'passed',results},null,2)+'\n');
  console.log(JSON.stringify({status:'passed',results}));
}
main().catch(error=>{console.error(error);process.exitCode=1});

