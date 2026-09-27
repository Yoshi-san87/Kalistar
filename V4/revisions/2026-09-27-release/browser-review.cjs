'use strict';
const {fs,path,assert,read,hash,sharp,ROOT,write}=require('../../atelier/lib.cjs');
const crypto=require('node:crypto');
const {createRequire}=require('node:module');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const batch=path.join(ROOT,'V4/expansions/2026-09-27-metal-gear-mines');
const artRevision=path.join(ROOT,'V4/revisions/2026-09-27-artwork-refresh');
const fields=['name','title','job','race','weapon','faction','element','positions','role','atk','defense','magic','barriers','characterId'];
async function inputs(){
  const references=read(path.join(ROOT,'V4/atelier/data/references.json'));
  const published=read(path.join(ROOT,'V4/donnees/catalogue.json')).cards.filter(c=>c.kind==='created');
  const expected=await require('../../atelier/game-catalog.cjs').buildCatalog({published});
  const set=read(path.join(batch,'set.json'));
  assert.equal(set.cards.length,13);
  const ids=new Set([...set.cards,...read(path.join(artRevision,'set.json')).cards].map(c=>c.id));
  for(const c of expected.cards)if(['Tome','Faucille'].includes(c.weapon))ids.add(c.id);
  const cards=[];
  for(const id of ids){
    const c=expected.cards.find(c=>c.id===id);assert(c,'Missing locally published card '+id);
    const row=references.cards.find(r=>r.card.id===id)||published.find(r=>r.id===id);assert(row);
    const file=path.join(ROOT,row.png);
    cards.push({id,file,sha256:await hash(file),profile:c});
  }
  const flags=[];
  for(const id of ['MGS1','MGS2','MGS4']){
    const file=path.join(ROOT,'V4/site/assets/factions/'+id+'.png');
    assert.equal(await hash(file),await hash(path.join(batch,'art-flags/flag-'+id+'.png')));
    flags.push({id,sha256:await hash(file)});
  }
  assert.equal(expected.cards.filter(c=>/^MGS[124]$/.test(c.faction)).length,10);
  const mixedKeys=['solid-snake-mgs1','revolver-ocelot','sniper-wolf','vulcan-raven','ninja','meryl','liquid-snake','psycho-mantis','voloden-mine','momo-silence'];
  const deck=mixedKeys.map(k=>set.cards.find(c=>c.key===k).id);
  const E=require('../../site/engine.js').createEngine(expected);
  assert.deepEqual(E.validatePlayableDeck(deck),[],'Thematic mixed deck is not playable');
  const before={};
  for(const f of ['V4/donnees/catalogue.json','V4/atelier/data/references.json',...cards.map(c=>path.relative(ROOT,c.file))])before[f]=await hash(path.join(ROOT,f));
  return {expected,cards,flags,deck,before};
}
async function ready(page){
  await page.waitForFunction(()=>window.KALISTAR_READY===true);
  await page.waitForFunction(()=>[...document.images].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}).every(n=>n.complete&&n.naturalWidth&&!n.src.includes('#v4-')));
  assert.equal(await page.locator('[data-v4-media-error]').count(),0);
}
async function fit(page,label){
  const r=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
  assert(r.sw<=r.w+1&&r.sh<=r.h+1,label+' viewport overflow '+JSON.stringify(r));return r;
}
async function native(page,card){
  const url=await page.evaluate(s=>new URL(KalistarSite.url(s),location.href).href,card.profile.pngUrl);
  assert.equal(new URL(url).origin,new URL(page.url()).origin);
  const response=await page.request.get(url,{maxRedirects:0});assert.equal(response.status(),200);
  const bytes=await response.body();assert.equal(digest(bytes),card.sha256,card.id+' native image mismatch');
  const m=await sharp(bytes).metadata();assert.deepEqual([m.width,m.height],[897,1497]);
  const pixels=await page.evaluate(async url=>{
    const img=new Image();img.src=url;await img.decode();
    const hero=document.querySelector('.cb-hero-image'),r=KalistarCardMedia.crop;
    if(hero.naturalWidth!==r.width||hero.naturalHeight!==r.height)throw Error('Wrong browser card crop');
    const canvas=document.createElement('canvas');canvas.width=r.width;canvas.height=r.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,r.left,r.top,r.width,r.height,0,0,r.width,r.height);
    const a=ctx.getImageData(0,0,r.width,r.height).data;ctx.clearRect(0,0,r.width,r.height);ctx.drawImage(hero,0,0);
    const b=ctx.getImageData(0,0,r.width,r.height).data;let delta=0;
    for(let i=0;i<a.length;i+=4)delta+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
    return delta/(r.width*r.height*3);
  },url);
  assert(pixels<6,card.id+' browser image differs from native card');return {url,sha256:card.sha256,meanAbsoluteRGBDelta:pixels};
}
async function inspectCard(page,c,out,width){
  await page.locator('[data-binder-field=search]').fill(c.id);
  await page.locator('.cb-card[data-id="'+c.id+'"]').click();await ready(page);
  assert.equal((await page.locator('.cb-card-heading h2').textContent()).trim(),c.profile.name);
  assert.equal((await page.locator('.cb-card-heading p').textContent()).trim(),c.profile.title);
  const image=await native(page,c),layout=await fit(page,c.id);
  await page.screenshot({path:path.join(out,c.id+'-'+width+'.png'),animations:'disabled'});
  const notes=page.locator('[data-binder-action=pane][data-id=notes]');if(await notes.isVisible())await notes.click();
  await page.locator('[data-binder-action=tab][data-id=profile]').click();await ready(page);
  assert.equal((await page.locator('.cb-identity b').first().textContent()).trim(),c.profile.faction);
  assert((await page.locator('.cb-weapon').innerText()).includes(c.profile.weapon));
  const faces=await page.locator('.cb-faces tbody tr').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('td')].map(n=>({value:n.querySelector('img')?.alt||n.textContent.trim(),magic:n.classList.contains('is-magic')}))));
  const effect={guard:'Garde',mana:'Potion',revive:'Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Puissance physique'};
  const expected=['atk','defense'].map((side,row)=>c.profile[side].map((v,i)=>({value:typeof v==='number'?v.toLocaleString('fr-FR'):v==='retry'?(row?'Relance':'Tr\u00e8fle'):effect[v],magic:c.profile[row?'barriers':'magic'].includes(6-i)})));
  assert.deepEqual(faces,expected,c.id+' displayed faces');await fit(page,c.id+' profile');
  await page.locator('[data-binder-action=back]').click();return {id:c.id,width,image,layout};
}
async function main(){
  const out=path.join(__dirname,'qa/browser',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(out,{recursive:true});
  const report={passed:false,views:[],errors:[],httpFailures:[],blockedRequests:[],mode:'Isolated nonpersistent contexts, same-origin GET only, no personal browser storage'};
  let browser,input;
  try{
    input=await inputs();
    const url=new URL(process.env.KALISTAR_REVIEW_URL||read(path.join(ROOT,'V4/atelier/data/runtime.json')).url);
    assert(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password);
    url.pathname=url.pathname.replace(/\/?$/,'/');if(!url.pathname.endsWith('/jeu/'))url.pathname+='jeu/';url.hash='collection';report.url=url.href;
    const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    const {chromium}=createRequire(path.join(runtime,'_mgs_review.cjs'))('playwright');
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const viewport of [{width:1600,height:1000},{width:390,height:844}]){
      const context=await browser.newContext({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500,reducedMotion:'reduce',serviceWorkers:'block'});
      try{
        await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(req.method()==='GET'&&(u.origin===url.origin||['data:','blob:'].includes(u.protocol)))return route.continue();report.blockedRequests.push(req.url());return route.abort();});
        const page=await context.newPage();page.setDefaultTimeout(30000);
        page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpFailures.push({url:r.url(),status:r.status()});});
        await page.goto(url.href);await ready(page);
        const actual=await page.evaluate(()=>structuredClone(KALISTAR_DATA));
        assert.equal(actual.cards.length,input.expected.cards.length);assert.equal(actual.arenas.length,input.expected.arenas.length);
        for(const c of input.cards){const a=actual.cards.find(x=>x.id===c.id);assert(a);for(const f of fields)assert.deepEqual(a[f],c.profile[f],c.id+' '+f);}
        const grouped=page.locator('[data-binder-action=scope][data-id=metal-gear]');
        if(await grouped.count()){
          await grouped.click();assert.match(await page.locator('.cb-count').innerText(),/8 personnages.*10 versions/);
        }
        for(const flag of input.flags){
          if(!await grouped.count())await page.locator('[data-binder-action=scope][data-id='+flag.id.toLowerCase()+']').click();
          else{await page.locator('[data-binder-action=filters]').click();await page.locator('[data-binder-filter=faction]').selectOption(flag.id);await page.locator('.cb-filter-actions [data-binder-action=close-overlay]').click();}
          await ready(page);const count=actual.cards.filter(c=>c.faction===flag.id).length;
          assert((await page.locator('.cb-count').innerText()).includes(count+' versions'));
          await page.screenshot({path:path.join(out,flag.id+'-'+viewport.width+'.png'),animations:'disabled'});
          const flagUrl=await page.evaluate(id=>new URL(KalistarCollaborations.asset('factions',id),location.href).href,flag.id);
          const r=await page.request.get(flagUrl);assert.equal(r.status(),200);assert.equal(digest(await r.body()),flag.sha256);
        }
        await page.locator('[data-binder-action=scope][data-id=catalogue]').click();
        const reset=page.locator('[data-binder-action=reset]:visible');if(await reset.count())await reset.first().click();
        for(const c of input.cards)report.views.push(await inspectCard(page,c,out,viewport.width));
      }finally{await context.close();}
    }
    assert.equal(report.views.length,input.cards.length*2);assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpFailures,[]);assert.deepEqual(report.blockedRequests,[]);report.passed=true;
  }catch(e){report.failure=e.stack;process.exitCode=1;}
  finally{
    await browser?.close();
    if(input){report.changed=[];for(const [f,h] of Object.entries(input.before))if(await hash(path.join(ROOT,f))!==h)report.changed.push(f);if(report.changed.length){report.passed=false;process.exitCode=1;}}
    write(path.join(out,'report.json'),report);console.log(JSON.stringify({passed:report.passed,views:report.views.length,report:path.join(out,'report.json'),failure:report.failure}));
  }
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={inputs};
