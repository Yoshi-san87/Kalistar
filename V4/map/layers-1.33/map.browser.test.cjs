'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=createRequire(path.join(modules,'_map_test.cjs'))('playwright');
const dir=__dirname,root=path.resolve(dir,'../../..');
const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(root,'work/qa/map-1.33');
const proof=JSON.parse(fs.readFileSync(path.join(dir,'published-media.json'),'utf8'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  fs.mkdirSync(output,{recursive:true});let server,browser;
  let base=process.env.KALISTAR_MAP_URL;
  const errors=[],failures=[],results=[];
  try{
    if(!base){
      assert(process.env.KALISTAR_DIST,'Set KALISTAR_DIST to the frozen validated release');
      const dist=path.resolve(process.env.KALISTAR_DIST);
      server=http.createServer((req,res)=>{
        try{
          const url=new URL(req.url,'http://localhost'),relative=decodeURIComponent(url.pathname).replace(/^\//,'');
          const file=path.resolve(dist,relative.endsWith('/')||!relative?relative+'index.html':relative);
          assert(file.startsWith(dist+path.sep));res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
          res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
        }catch{res.writeHead(404);res.end();}
      });
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/jeu/';
    }
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const viewport of [{width:1440,height:1000},{width:412,height:1007},{width:390,height:844}]){
      const context=await browser.newContext({viewport,reducedMotion:'reduce',isMobile:viewport.width<700,hasTouch:viewport.width<700});
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      page.on('response',response=>{if(response.status()>=400)failures.push(response.status()+' '+response.url());});
      await page.goto(base+'#map');await page.waitForFunction(()=>window.KALISTAR_READY&&document.body.classList.contains('map-view'));
      await page.waitForFunction(()=>[...document.querySelectorAll('.map-atlas,.map-landmark img,.map-cities img')].every(img=>img.complete&&img.naturalWidth>0));
      assert.equal(await page.locator('[data-map-city]').count(),8);assert.equal(await page.locator('.map-landmark').count(),8);
      assert((await page.locator('.map-atlas').getAttribute('src')).endsWith('kalistar-atlas-1.33.webp'));
      const assets=proof.assets.filter(asset=>asset.file.includes('thalassea-')||asset.file.includes('atlas-1.33'));
      for(const asset of assets){
        const response=await page.request.get(new URL(asset.file.replace(/^V4\/site\//,''),base).href);assert.equal(response.status(),200);
        assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'),asset.sha256,asset.file);
      }
      const size=viewport.width+'x'+viewport.height;
      await page.screenshot({path:path.join(output,'overview-'+size+'.png')});
      const button=page.locator('[data-map-city="thalassea"]');await button.scrollIntoViewIfNeeded();await button.click();
      await page.waitForFunction(()=>document.querySelector('[data-map-landmark="thalassea"]').classList.contains('is-selected'));
      assert.equal(await button.getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('#map-city-thalassea').isVisible(),true);
      assert((await page.locator('#map-city-thalassea').innerText()).includes('sous-marine'));
      const landmark=page.locator('[data-map-landmark="thalassea"]');
      const selected=await landmark.boundingBox(),view=await page.locator('.map-viewport').boundingBox();
      const center={x:selected.x+selected.width/2,y:selected.y+selected.height/2};
      assert(center.x>view.x&&center.x<view.x+view.width&&center.y>view.y&&center.y<view.y+view.height);
      assert(await landmark.locator('span').isVisible());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(viewport.width<700){
        const cities=await page.locator('.map-cities').boundingBox(),canvas=await page.locator('.map-canvas').boundingBox();
        assert(cities.y+cities.height<=canvas.y+1,'City list must remain above bottom map');
        assert(selected.height>=44,'Selected city remains readable on phone');
      }
      await page.screenshot({path:path.join(output,'thalassea-'+size+'.png')});
      await button.click();assert.equal(await button.getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('.map-city-marker').isVisible(),false);
      await page.locator('[data-map-action="fit"]').click();assert.equal(await page.locator('[data-map-action="out"]').isDisabled(),true);
      results.push({viewport,cities:8,assetsVerified:assets.length,selectedIconHeight:selected.height,accordionAndMarker:true,bottomMap:viewport.width<700});
      await context.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    const report={base,results,errors,failures};fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
