'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_discovery.cjs'));
const {chromium}=runtime('playwright'),Cloud=require('./cloud-registry.js');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist')),built=process.env.KALISTAR_BUILT_SITE==='1';
const site=built?path.join(dist,'jeu'):__dirname,origin='https://discovery.invalid';
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/catalogue-discovery'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const profiles=[['desktop',1440,900],['wide',2532,1412],['razr',412,1007],['compact',320,740],['landscape',1007,412]];
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
  const database=await require('../deploy/supabase/browser-fixture.cjs').create(data,{journeyKey:'catalogue-fixture-'.repeat(4)});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const access=async who=>Cloud.catalogueAccess({owned:await database.call('kalistar_my_cards',{},who),transfers:await database.call('kalistar_my_transfers',{},who),isAdmin:(await database.call('kalistar_me',{},who)).isAdmin});
    const initial=await access('user-tokyo'),paris=await database.call('kalistar_my_cards');
    const known=data.cards.find(c=>c.characterId==='momo'&&initial.ids.includes(c.id));
    const hidden=data.cards.find(c=>c.characterId==='momo'&&!initial.ids.includes(c.id));
    const unknown=data.cards.find(c=>!initial.ids.includes(c.id)&&c.characterId!=='momo');
    assert(known&&hidden&&unknown);
    const specimen=paris.find(c=>c.modelId===hidden.id);
    const offered=await database.call('kalistar_offer',{p_id:specimen.id,p_recipient:'kalistar_tokyo'});
    assert.equal(typeof offered,'string');assert(!(await access('user-tokyo')).ids.includes(hidden.id),'pending incoming offers do not discover');
    const pending=(await database.call('kalistar_my_transfers',{},'user-tokyo')).find(t=>t.card.id===specimen.id);
    assert.equal((await database.call('kalistar_settle',{p_transfer:pending.id,p_action:'accepted'},'user-tokyo')).id,specimen.id);
    assert((await access('user-tokyo')).ids.includes(hidden.id),'accepted receipt discovers this version');
    assert.equal(typeof await database.call('kalistar_offer',{p_id:specimen.id,p_recipient:'kalistar_paris'},'user-tokyo'),'string');
    const outbound=(await database.call('kalistar_my_transfers')).find(t=>t.card.id===specimen.id&&t.status==='pending');
    assert.equal((await database.call('kalistar_settle',{p_transfer:outbound.id,p_action:'accepted'})).id,specimen.id);
    const reloaded=await access('user-tokyo');
    assert(reloaded.ids.includes(hidden.id),'fresh read on another device remembers an outbound transfer');
    assert(!(await database.call('kalistar_my_cards',{},'user-tokyo')).some(c=>c.modelId===hidden.id));
    assert(!reloaded.all);assert(!reloaded.ids.includes(unknown.id),'another unknown version stays hidden');
    const cards=[hidden,known,unknown];
    for(const [name,width,height] of profiles){
      const context=await browser.newContext({viewport:{width,height},isMobile:width<700||height<500,hasTouch:width<700||height<500,reducedMotion:name==='compact'?'reduce':'no-preference',serviceWorkers:'block'});
      const page=await context.newPage(),errors=[],requested=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requested.push(r.url()));
      await context.route('**/*',async route=>{
        const url=new URL(route.request().url());assert.equal(url.origin,origin,'no production requests');
        if(url.pathname==='/jeu/'){
          const links=fs.readFileSync(path.join(dist,'jeu/index.html'),'utf8').match(/<link[^>]+rel="stylesheet"[^>]*>/g).join('\n');
          return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+links+'</head><body class="collection-view"><main id="app"><div id="collection-binder-root"></div></main></body></html>'});
        }
        let file=path.resolve(dist,'.'+url.pathname);assert(file.startsWith(dist+path.sep));
        if(!built&&url.pathname==='/jeu/collection-binder.css')file=path.join(site,'collection-binder.css');
        return route.fulfill(fs.existsSync(file)?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:{status:404,body:'No fixture asset'});
      });
      let mounts=0;
      async function mount(info,owned){
        await page.goto(origin+'/jeu/?fixture='+mounts+++'#collection');
        for(const file of ['assets/lucide.min.js','base-weapons.js','factions.js','collaborations.js','positions.js','collection-binder.js'])await page.addScriptTag({path:fs.existsSync(path.join(site,file))?path.join(site,file):path.join(dist,'jeu',file)});
        await page.evaluate(({data,cards,info,owned})=>{
          window.KalistarCardMedia={image:c=>c.pngUrl};
          window.DISCOVERY={info,owned,favorites:0};
          window.KalistarUI={icons:root=>lucide.createIcons({root})};
          const view=KalistarCollection.create({data:{...data,cards},getOwned:id=>DISCOVERY.owned.filter(c=>!id||c.cardId===id),canView:id=>DISCOVERY.info.all||DISCOVERY.info.ids.includes(id),onFavorite:()=>DISCOVERY.favorites++});
          window.DISCOVERY.view=view;view.mount(document.querySelector('#collection-binder-root'));
        },{data,cards,info,owned});
        await page.locator('.cb-scopes [data-binder-action=scope][data-id=catalogue]').click();
      }
      const owned=(await database.call('kalistar_my_cards',{},'user-tokyo')).map(c=>({...c,cardId:c.modelId}));
      await mount(initial,owned);
      const momo=page.locator('.cb-pocket[data-character="momo"]');
      assert.equal(await momo.getAttribute('data-card-id'),known.id,'discovered version is the initial cover');
      const locked=page.locator('.cb-pocket.is-undiscovered');
      assert.equal(await locked.count(),1);assert.equal(await locked.locator('[data-binder-action=open]').count(),0);
      for(const c of [hidden,unknown])assert(!(await page.locator('#app').innerHTML()).includes(c.title),'unknown title is absent');
      await momo.locator('[data-binder-action=cycle-version]').click();
      assert.equal(await momo.getAttribute('data-card-id'),hidden.id);assert(await momo.locator('.cb-locked-face').isVisible());
      assert.equal(await page.locator('[data-binder-action=discover]').isDisabled(),false);
      const random=page.locator('[data-binder-action=discover]');
      if(await random.isVisible())await random.click();else{
        // The compact toolbar omits shuffle; still exercise its shared selection guard.
        await random.evaluate(n=>n.click());
      }
      assert.equal(await page.locator('.cb-card-heading p').textContent(),known.title);
      assert.equal(await page.locator('.cb-versions button:disabled').count(),1);
      assert.equal(await page.locator('.cb-versions button:disabled img').getAttribute('src'),'assets/back-obsidian-v1.webp');
      assert(await page.locator('[data-binder-action=next-card]').isDisabled());
      assert(await page.locator('[data-binder-action=previous-card]').isDisabled());
      await page.locator('[data-binder-action=back]').click();
      await page.locator('[data-binder-action=pages]').click();
      for(const c of [hidden,unknown])assert(!(await page.locator('.cb-index').innerHTML()).includes(c.pngUrl));
      await page.locator('.cb-index [data-binder-action=close-overlay]').click();
      await page.locator('[data-binder-field=search]').fill(hidden.title);
      assert.equal(await page.locator('.cb-pocket').count(),0,'undiscovered lore is not searchable');
      await page.locator('[data-binder-field=search]').fill('');
      assert.deepEqual(await page.evaluate(()=>({x:document.documentElement.scrollWidth>innerWidth+1,y:document.documentElement.scrollHeight>innerHeight+1})),{x:false,y:false},name+' stays in viewport');
      await page.screenshot({path:path.join(output,name+'-catalogue.png')});
      for(const c of [hidden,unknown])assert(!requested.some(url=>url===new URL(c.pngUrl,origin+'/jeu/').href),'undiscovered artwork is never loaded');
      await page.evaluate(()=>{DISCOVERY.info={all:false,ids:[]};DISCOVERY.owned=[];DISCOVERY.view.refresh();});
      assert(await page.locator('[data-binder-action=discover]').isDisabled(),'no discovery can be opened by chance');
      const admin=await access('user-paris');assert(admin.all);
      await mount(admin,[]);
      assert.equal(await page.locator('.is-undiscovered').count(),0,'trusted admin sees all, even without ownership');
      assert.equal(await momo.getAttribute('data-card-id'),hidden.id);
      await momo.locator('[data-binder-action=open]').click();
      assert.equal(await page.locator('.cb-versions button:disabled').count(),0);
      assert.equal(await page.locator('.cb-card-heading p').textContent(),hidden.title);
      await mount(reloaded,owned);
      assert.equal(await momo.getAttribute('data-card-id'),hidden.id,'previously owned version is readable on a fresh page');
      assert.equal(await momo.locator('.cb-card-copies b').textContent(),'0','discovery does not mint another copy');
      await momo.locator('[data-binder-action=open]').click();
      assert.equal(await page.locator('.cb-card-heading p').textContent(),hidden.title);
      await page.locator('[data-binder-action=back]').click();
      await page.evaluate(id=>{DISCOVERY.info.ids.push(id);DISCOVERY.view.refresh();},unknown.id);
      assert.equal(await page.locator('.is-undiscovered').count(),0,'an acquisition refresh reveals the newly discovered version');
      assert.deepEqual(errors,[]);await context.close();
    }
    assert.equal((await database.call('kalistar_my_cards')).length,paris.length,'round trip preserves the original distribution');
    console.log('PASS: PostgreSQL ownership/history/admin, pending vs accepted transfers, per-version masks, thumbnails, cycling, search, reader, random, five viewports and Reduced Motion.');
  }finally{await browser.close();await database.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
