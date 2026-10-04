'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__base-weapons.cjs'))('playwright');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-04-white-weapons/qa');
let browser;
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[],results=[];
  for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,1007]]){
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
    await context.addInitScript(()=>{
      const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-white-glyph-isolated',version);};
      window.__qaBlobTypes=new Map();const create=URL.createObjectURL;
      URL.createObjectURL=function(blob){const url=create.call(this,blob);window.__qaBlobTypes.set(url,blob.type);return url;};
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/jeu/#collection');await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.waitForFunction(()=>[...document.querySelectorAll('.cb-card img')].some(i=>i.src.startsWith('blob:')&&i.complete&&i.naturalWidth===797));
    await page.screenshot({path:path.join(out,name+'-collection.png')});
    const sample=await page.evaluate(async()=>{
      const root=document.createElement('section');root.id='glyph-qa';root.style.cssText='position:relative;background:#10231f;display:grid;grid-template-columns:repeat(5,240px);gap:12px;padding:12px;width:1272px;box-sizing:border-box;z-index:999';
      const examples=KalistarBaseWeapons.families.map(family=>KALISTAR_DATA.cards.find(c=>c.weapon===family));
      for(const card of examples){
        if(!card)throw Error('Missing actual family');
        const item=document.createElement('div'),image=document.createElement('img');image.src=KalistarCardMedia.image(card);image.alt=card.weapon;image.style.cssText='width:210px;height:auto;display:block';
        const label=document.createElement('p');label.textContent=card.weapon+' / '+card.name;item.append(image,label);root.append(item);
      }
      document.body.append(root);return examples.map(c=>({id:c.id,family:c.weapon,name:c.name}));
    });
    await page.waitForFunction(()=>[...document.querySelectorAll('#glyph-qa img')].every(i=>i.src.startsWith('blob:')&&i.complete&&i.naturalWidth===797));
    const types=await page.locator('#glyph-qa img').evaluateAll(nodes=>nodes.map(n=>window.__qaBlobTypes.get(n.src)));
    assert(types.every(t=>t==='image/svg+xml'));assert.equal(types.length,20);
    if(name==='desktop'){
      await page.locator('#glyph-qa').screenshot({path:path.join(out,'all-families-cards.png')});
      await page.evaluate(()=>{
        for(const item of document.querySelector('#glyph-qa').children){
          const source=item.querySelector('img'),canvas=document.createElement('canvas');canvas.width=240;canvas.height=240;
          canvas.getContext('2d').drawImage(source,20,1041,134,134,0,0,240,240);
          source.replaceWith(canvas);
        }
      });
      await page.locator('#glyph-qa').screenshot({path:path.join(out,'all-families-medallions.png')});
    }
    await page.locator('#glyph-qa').evaluate(n=>n.remove());
    const selected=sample.find(c=>c.family==='Instrument');
    // Open the real catalogue popup, not a separate rendering implementation.
    await page.evaluate(id=>{
      const button=document.createElement('button');button.dataset.action='detail';button.dataset.id=id;document.querySelector('#app').append(button);button.click();button.remove();
    },selected.id);
    const detail=page.locator('#detail-dialog .detail-visual>img');
    await detail.waitFor();await detail.evaluate(img=>img.decode());
    assert.equal(await detail.evaluate(n=>n.naturalWidth),797);
    await page.screenshot({path:path.join(out,name+'-momo-detail.png')});
    const extent=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert(extent.scroll<=extent.width+1);
    results.push({name,examples:sample,types,extent});await context.close();
  }
  // Optional source failure must leave the original, usable card in place.
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
  await page.route('**/base-weapons/*.svg',route=>route.abort());
  await page.goto(base+'/jeu/#collection');await page.waitForFunction(()=>window.KALISTAR_READY);
  await page.waitForFunction(()=>[...document.querySelectorAll('.cb-card img')].some(i=>i.src.startsWith('blob:')&&i.complete));
  assert.equal(await page.locator('[data-v4-media-error]').count(),0);await context.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,errors,results},null,2));
  console.log({passed:true,viewports:results.length,families:20,out});
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
