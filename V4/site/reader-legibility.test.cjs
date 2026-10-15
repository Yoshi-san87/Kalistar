'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__reader_legibility__.cjs'))('playwright');
const output=path.join(__dirname,'verification/reader-legibility');
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const paper=luminance([170,160,144]);
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto((process.env.KALISTAR_URL||'http://127.0.0.1:4304')+'/jeu/');
  await page.waitForFunction(()=>window.KALISTAR_READY);
  await page.locator('[data-binder-field=search]').fill('AELIS');
  await page.locator('.cb-card').click();
  for(const [width,height] of [[2041,1383],[1440,1000],[1024,768],[412,1007],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    const phone=width<=699||width<=950&&height<=500;
    if(phone)await page.locator('[data-binder-action=pane][data-id=notes]').click();
    for(const tab of ['profile','career','copies']){
      await page.locator('[data-binder-action=tab][data-id='+tab+']').click();
      const common={'.cb-card-heading h2':phone?25:height<=800?27:36,'.cb-card-heading p':phone?13:height<=800?12:16,'.cb-card-heading .cb-eyebrow':11};
      const fields={
        profile:{'.cb-identity b':13,'.cb-faces caption':18,'.cb-faces td':width>=700&&height<=500?9:13},
        career:{'.career-statistics thead th':11,'.career-statistics th[scope=row]':13,'.career-average':20,'.career-total':15,'.trophy-keepsake > span':10},
        copies:{'.cb-copies h3':18,'.cb-copy b':phone?12:14,'.cb-copy small':width>=700&&height<=500?8:10}
      }[tab];
      for(const [selector,size] of Object.entries({...common,...fields})){
        const style=await page.locator(selector).first().evaluate(n=>{const s=getComputedStyle(n);return {size:parseFloat(s.fontSize),weight:Number(s.fontWeight),color:s.color,shadow:s.textShadow};});
        assert.equal(style.size,size,'unchanged type size: '+selector+' at '+width+'x'+height);
        assert.ok(style.weight>=600,'stronger ink weight: '+selector+' '+JSON.stringify(style));
        assert.equal(style.shadow,'none','no light shadow on the manuscript: '+selector);
        const ink=luminance(style.color.match(/[\d.]+/g).slice(0,3).map(Number));
        assert.ok((paper+.05)/(ink+.05)>=4.5,'ink contrast on representative parchment: '+selector+' '+style.color);
      }
      assert.equal(await page.locator('.cb-reading-tabs [aria-selected=true]').getAttribute('data-id'),tab);
      const overflow=await page.locator('.cb-reading').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth,children:[...n.querySelectorAll('*')].filter(c=>c.getBoundingClientRect().right>n.getBoundingClientRect().right+1).map(c=>c.className||c.tagName)}));
      assert.ok(overflow.scroll<=overflow.width+1,'no horizontal overflow: '+tab+' at '+width+'x'+height+' '+JSON.stringify(overflow));
      if(tab==='profile'){
        const colors=await page.locator('.cb-faces .is-magic').evaluateAll(nodes=>[...new Set(nodes.map(n=>getComputedStyle(n).color))]);
        assert.equal(colors.length,2,'attack magic and defense barriers keep distinct ink colors');
      }
      const content=page.locator('.cb-'+(tab==='profile'?'faces':tab==='career'?'career':'copy'));
      await content.scrollIntoViewIfNeeded();
      assert.ok(await content.evaluate(n=>{
        const r=n.getBoundingClientRect(),leaf=n.closest('.cb-workbench').getBoundingClientRect(),top=Math.max(r.top,leaf.top),bottom=Math.min(r.bottom,leaf.bottom);
        return bottom>top&&document.elementsFromPoint(r.left+r.width/2,(top+bottom)/2).some(hit=>hit===n||n.contains(hit));
      }),'content stays reachable: '+tab+' at '+width+'x'+height);
      await page.screenshot({path:path.join(output,`${tab}-${width}x${height}.png`),scale:'css'});
    }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: manuscript headers, profile, career and copies retain type sizes with stronger ink, no light shadows, distinct magic colors and accessible content across seven viewports.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
