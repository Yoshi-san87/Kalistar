'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {plan,ROOT,inside}=require('../deploy/build.cjs');
const {chromium}=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_map_browser.cjs'))('playwright');
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../map/layers-1.30/qa'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
async function main(){
  const dist=process.env.KALISTAR_DIST?path.resolve(process.env.KALISTAR_DIST):null;
  const publicBase=process.env.KALISTAR_MAP_URL||(process.env.KALISTAR_MAP_PUBLIC?process.env.KALISTAR_MAP_PUBLIC.replace(/\/$/,'')+'/jeu/':null);
  const published=dist||publicBase?null:await plan();
  const files=new Map((published?.files||[]).map(file=>[file.target,file]));
  const versions=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../map/versions.json'),'utf8'));
  const proof=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../map/layers-'+versions.latestVersion+'/published-media.json'),'utf8'));
  const server=http.createServer((req,res)=>{
    try{
      let rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');
      if(rel.startsWith('Kalistar/'))rel=rel.slice(9);
      if(!rel){res.writeHead(302,{Location:'jeu/'});res.end();return;}
      if(rel.endsWith('/'))rel+='index.html';
      if(dist){
        const file=inside(dist,rel);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
        res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));return;
      }
      if(rel==='jeu/catalogue.json'){res.setHeader('Content-Type',mime['.json']);res.end(JSON.stringify(published.catalogue));return;}
      const item=files.get(rel);if(!item)throw Error('Unpublished path');
      let bytes=fs.readFileSync(inside(ROOT,item.source));
      if(rel==='jeu/index.html')bytes=Buffer.from(bytes.toString('utf8').replace('data-hosting="local"','data-hosting="static"'));
      res.setHeader('Content-Type',mime[path.extname(rel)]||'application/octet-stream');
      res.setHeader('Cache-Control','no-store');res.end(bytes);
    }catch(error){res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const local='http://127.0.0.1:'+server.address().port;
  const base=publicBase||local+'/jeu/';
  const errors=[],failures=[],results=[];
  const formats=[
    ['desktop',1440,900,false],['wide',1920,1080,false],['razr',412,1007,true],
    ['phone',390,844,true],['small-phone',320,568,true],['landscape',844,390,true],['tablet',768,1024,true]
  ];
  let browser;
  try{
    fs.mkdirSync(output,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
    for(const [name,width,height,touch] of formats){
      const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
      await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){return open.call(this,name+'-map-qa-only',...args);};});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
      page.on('response',r=>{if(r.status()>=400)failures.push(name+': '+r.status()+' '+r.url());});
      await page.goto(new URL('#collection',base).href);await page.waitForFunction(()=>window.KALISTAR_READY);
      await page.locator('.nav-more').click();
      const menuIcon=page.locator('#mobile-dialog [data-view=map] .kalistar-nav-icon');
      await menuIcon.evaluate(img=>img.decode());assert.equal(await menuIcon.evaluate(img=>img.naturalWidth),128);
      await page.locator('#mobile-dialog [data-view=map]').click();
      await page.locator('.kalistar-map').waitFor();
      assert.equal(await page.locator('#mobile-dialog').evaluate(dialog=>dialog.open),false);
      await page.waitForFunction(()=>[...document.querySelectorAll('.kalistar-map img')].filter(img=>img.getClientRects().length).every(img=>img.complete&&img.naturalWidth>0));
      if(process.env.KALISTAR_EXPECTED_VERSION)assert((await page.title()).includes('V'+process.env.KALISTAR_EXPECTED_VERSION));
      assert.equal(await page.locator('[data-map-city]').count(),8);assert.equal(await page.locator('[data-map-landmark]').count(),8);
      const image=await page.locator('.map-atlas').evaluate(img=>({src:img.src,width:img.naturalWidth,height:img.naturalHeight}));
      assert(image.src.includes('kalistar-atlas-'+versions.latestVersion+'.webp'));assert.equal(image.width,1774);assert.equal(image.height,887);
      const geometry=await page.evaluate(()=>{
        const viewport=document.querySelector('.map-viewport').getBoundingClientRect(),image=document.querySelector('.map-atlas').getBoundingClientRect();
        return {viewport:viewport.toJSON(),image:image.toJSON()};
      });
      assert(geometry.viewport.height>(touch?60:height*.4));
      assert(geometry.image.width<=geometry.viewport.width+1&&geometry.image.height<=geometry.viewport.height+1);
      if(touch&&width<700)assert(Math.abs(geometry.viewport.bottom-(height-60))<=2,'Map clears phone bar');
      const overview=await page.locator('.map-landmark img').evaluateAll(images=>images.map(img=>({height:img.getBoundingClientRect().height,native:img.naturalHeight})));
      assert(overview.every(img=>img.height>=18&&img.native===192),'Independently sized sharp emblems');
      const body=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert(body.scroll<=body.width+1,name+' horizontal overflow');
      await page.screenshot({path:path.join(output,name+'-overview.png')});
      for(const id of ['kalistopolis','durane','arborium','velane','woodland','vulkar','cryptown','thalassea']){
        const button=page.locator('[data-map-city="'+id+'"]');
        if(touch)await button.tap();else await button.click();
        assert.equal(await button.getAttribute('aria-expanded'),'true');
        assert.equal(await page.locator('[data-map-city][aria-expanded=true]').count(),1);
        assert(await page.locator('#map-city-'+id).isVisible());
        const marker=page.locator('.map-city-marker');assert(await marker.isVisible());
        assert.equal(await marker.getAttribute('aria-label'),(await button.locator('b').innerText())+' sélectionné');
        const city=await page.locator('[data-map-landmark="'+id+'"]').boundingBox();
        const viewport=await page.locator('.map-viewport').boundingBox();
        assert(city&&viewport&&city.width>=10&&city.height>=18,id+' symbol dimensions');
        assert(city.x+city.width>viewport.x&&city.x<viewport.x+viewport.width&&city.y+city.height>viewport.y&&city.y<viewport.y+viewport.height,id+' landmark outside view');
        const label=page.locator('[data-map-landmark="'+id+'"]>span');assert(await label.isVisible());
        const labelBox=await label.boundingBox();assert(labelBox&&labelBox.x>=0&&labelBox.x+labelBox.width<=width+1,id+' label outside screen');
        const alignment=await page.locator('[data-map-landmark="'+id+'"]').evaluate((node,id)=>{
          const glyph=node.getBoundingClientRect(),image=node.querySelector('img').getBoundingClientRect(),label=node.querySelector('span').getBoundingClientRect();
          const marker=document.querySelector('.map-city-marker').getBoundingClientRect(),atlas=document.querySelector('.map-atlas').getBoundingClientRect();
          const city=KalistarMap.cities.find(city=>city.id===id);
          return {selected:node.classList.contains('is-selected'),gap:label.top-image.bottom,height:image.height,anchorDx:Math.abs(marker.x+marker.width/2-atlas.x-city.x/1774*atlas.width),anchorDy:Math.abs(marker.y+marker.height/2-atlas.y-city.y/887*atlas.height),glyphDx:Math.abs(glyph.x+glyph.width/2-marker.x-marker.width/2),glyphDy:Math.abs(glyph.y+glyph.height/2-marker.y-marker.height/2)};
        },id);
        assert(alignment.selected&&alignment.gap>=3);
        assert(alignment.anchorDx<2&&alignment.anchorDy<2&&alignment.glyphDx<2&&alignment.glyphDy<2,id+' geographic alignment');
        if(touch)assert(alignment.height>=44,id+' focused symbol readability');
        if(id==='woodland'){
          assert((await page.locator('#map-city-woodland').innerText()).includes('Cerelf'));
          await page.screenshot({path:path.join(output,name+'-woodland.png')});
        }
      }
      const selected=page.locator('[data-map-city="thalassea"]');if(touch)await selected.tap();else await selected.click();
      assert.equal(await selected.getAttribute('aria-expanded'),'false');assert(!(await page.locator('.map-city-marker').isVisible()));
      const fit=page.locator('[data-map-action=fit]');if(touch)await fit.tap();else await fit.click();
      assert.equal(await page.locator('[data-map-action=out]').isDisabled(),true);
      const zoomIn=page.locator('[data-map-action=in]');if(touch)await zoomIn.tap();else await zoomIn.click();
      assert.equal(await page.locator('.map-viewport').getAttribute('data-zoomed'),'true');
      await page.locator('.map-viewport').focus();await page.keyboard.press('0');
      assert.equal(await page.locator('[data-map-action=out]').isDisabled(),true);
      const layout=await page.locator('.kalistar-map').evaluate(el=>({display:getComputedStyle(el).display,canvas:el.querySelector('.map-canvas').getBoundingClientRect().toJSON(),cities:el.querySelector('.map-cities').getBoundingClientRect().toJSON()}));
      if(width<700)assert(layout.cities.bottom<=layout.canvas.top+1,name+' city list must stay above the map');
      if(touch&&width>=700&&height<500)assert.equal(layout.display,'grid');
      if(name==='desktop'){
        for(const asset of proof.assets){
          const actual=await page.evaluate(async file=>{
            const url=new URL(file.replace('V4/site/',''),location.href);
            const response=await fetch(url);if(!response.ok)throw Error('Asset HTTP '+response.status);
            const hash=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());
            return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
          },asset.file);
          assert.equal(actual,asset.sha256,asset.file);
        }
        await page.evaluate(()=>{location.hash='library';});await page.locator('.kalistar-map').waitFor({state:'detached'});
        await page.evaluate(()=>{location.hash='map';});await page.locator('.kalistar-map').waitFor();
        assert.equal(await page.locator('[data-map-city]').count(),8);
        assert.equal(await page.locator('[data-map-city][aria-expanded=true]').count(),0);
        await page.setViewportSize({width:390,height:844});
        await page.locator('[data-map-city=woodland]').click();
        assert.equal(await page.locator('.map-viewport').getAttribute('data-zoomed'),'true');
      }
      await page.locator('[data-map-city=durane]').click();
      assert.equal(await page.locator('.map-city-marker').evaluate(node=>getComputedStyle(node).animationName),'none','Reduced Motion');
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY&&document.querySelector('.map-atlas')?.naturalWidth===1774);
      assert.equal(await page.locator('[data-map-city][aria-expanded=true]').count(),0);
      await page.locator('.nav-more').click();await page.locator('#mobile-dialog [data-view=story]').click();
      await page.locator('#story-reader-root').waitFor();assert.equal(await page.locator('.map-viewport').count(),0);
      results.push({name,width,height,touch,cities:8,selection:true,zoom:true,labels:true});
      await context.close();
    }
    if(!publicBase){
      const context=await browser.newContext();const page=await context.newPage();
      await page.goto(local+'/Kalistar/jeu/#map');await page.waitForFunction(()=>window.KALISTAR_READY);
      await page.locator('.kalistar-map').waitFor();assert.equal(await page.locator('[data-map-city]').count(),8);
      await page.waitForFunction(()=>[...document.querySelectorAll('.kalistar-map img')].filter(img=>img.getClientRects().length).every(img=>img.complete&&img.naturalWidth>0));
      await context.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    const report={status:'passed',base,formats:results,assetHashes:proof.assets.length,errors,failures,personalBrowserStorageUsed:false};
    fs.writeFileSync(path.join(output,'map-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
