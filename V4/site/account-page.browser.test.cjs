'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_account_browser.cjs'));
const {chromium}=runtime('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/account-page'));
const profiles=[{name:'desktop',width:1440,height:1000},{name:'wide',width:2532,height:1412},{name:'razr',width:412,height:1007,mobile:true},{name:'compact',width:320,height:740,mobile:true},{name:'landscape',width:1007,height:412,mobile:true}];
const origin='https://account.invalid',mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
  const database=await require('../deploy/supabase/browser-fixture.cjs').create(data,{journeyKey:'account-fixture-only-'.repeat(4)});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[],calls=[];
  let held=null,holdIssue=false;
  try{
    for(const p of profiles){
      await database.call('kalistar_set_profile',{p_handle:'paris',p_display_name:'Paris',p_publish_owner:false});
      await database.call('kalistar_set_profile',{p_handle:'tokyo',p_display_name:'Tokyo',p_publish_owner:false},'user-tokyo');
      const context=await browser.newContext({viewport:{width:p.width,height:p.height},isMobile:!!p.mobile,hasTouch:!!p.mobile,reducedMotion:p.name==='compact'?'reduce':'no-preference',serviceWorkers:'block'});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.exposeFunction('accountRPC',async(name,args,who)=>{
        calls.push({name,who});
        try{
          const value=name==='models'?await database.models():await database.call(name,args,who);
          if(name==='kalistar_issue'&&holdIssue)await new Promise(resolve=>{held=resolve;});
          return {data:value,error:null};
        }catch(e){return {data:null,error:{message:e.message,code:e.code}};}
      });
      await context.route('**/*',async route=>{
        const url=new URL(route.request().url());assert.equal(url.origin,origin,'no real network in account tests');
        if(url.pathname==='/jeu/'){
          const links=fs.readFileSync(path.join(dist,'jeu/index.html'),'utf8').match(/<link[^>]+rel="stylesheet"[^>]*>/g).join('\n');
          return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1">${links}</head><body class="account-view"><main id="app"><div id="account-root"></div></main></body></html>`});
        }
        const file=path.resolve(dist,'.'+url.pathname);assert(file.startsWith(dist+path.sep));
        return route.fulfill(fs.existsSync(file)?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:{status:404,body:'No fixture asset'});
      });
      await page.goto(origin+'/jeu/#account/profile');
      await page.addScriptTag({path:path.join(dist,'jeu/cloud-registry.js')});
      await page.addScriptTag({path:path.join(dist,'jeu/cloud-registry-ui.js')});
      await page.addScriptTag({path:path.join(dist,'jeu/assets/lucide.min.js')});
      await page.evaluate(data=>{
        let identity='user-paris',authListener;
        window.KalistarCloudConfig={enabled:true,redirectTo:location.origin+'/jeu/?registry=1'};
        window.KalistarUI={icons:root=>lucide.createIcons({root})};
        window.KalistarCardMedia={image:c=>c.pngUrl};
        window.QA={changed:0,sync:0,archives:0,passwords:0};
        const session=()=>({user:{id:identity==='user-paris'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222',email:identity==='user-paris'?'paris@example.invalid':'tokyo@example.invalid'}});
        const client={
          auth:{getSession:async()=>({data:{session:identity?session():null}}),onAuthStateChange:fn=>{authListener=fn;return {data:{subscription:{unsubscribe(){}}}};},signOut:async()=>{identity=null;authListener('SIGNED_OUT',null);return {};}},
          rpc:(name,args)=>accountRPC(name,args,identity),from:()=>({select:()=>({order:()=>accountRPC('models',{},identity)})})
        };
        window.KalistarCloudSession={getClient:async()=>client,required:()=>false,get:async()=>({password:async(a,b)=>{if(a!==b)throw Error('Confirmation différente.');QA.passwords++;}})};
        let syncListener;window.QA.emitSync=()=>syncListener?.();
        const ui=KalistarCloudRegistryUI.create({data,onNavigate:section=>{history.replaceState(null,'','#account/'+section);ui.mount(document.querySelector('#account-root'),section);},
          onChanged:()=>{QA.changed++;},onLocal:()=>QA.archives++,onSync:()=>QA.sync++,
          sync:{snapshot:()=>({status:'synced',updatedAt:'2026-10-20T00:00:00Z'}),subscribe:fn=>{syncListener=fn;return()=>{syncListener=null;};}}});
        window.QA.switchUser=who=>{identity=who;ui.open();};
        window.QA.ui=ui;
        addEventListener('hashchange',()=>ui.route(location.hash.split('/')[1]));
        ui.mount(document.querySelector('#account-root'),'profile');
      },data);
      const idle=()=>page.locator('#account-root[aria-busy=false]').waitFor();
      const section=async name=>{await page.locator('.account-sidebar a[href="#account/'+name+'"]').click();await idle();};
      const shot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,p.name+'-'+name+'.png'),fullPage:true});};
      const fit=async()=>assert.deepEqual(await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        outside:[...document.querySelectorAll('.account-page button,.account-page input:not([type=checkbox]),.account-page select,.account-page a')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>innerWidth+1||r.height<43);}).map(n=>n.outerHTML.slice(0,120))
      })),{overflow:false,outside:[]},p.name+' controls fit and remain touch sized');
      await idle();assert.equal(await page.locator('dialog,.cloud-card-list').count(),0);
      await shot('profile');await fit();
      await page.locator('[name=displayName]').fill('W'.repeat(40));
      await page.locator('[data-cloud-form=profile] [type=submit]').click();await idle();
      assert.equal((await database.call('kalistar_me')).profile.displayName,'W'.repeat(40));await fit();
      await section('settings');await shot('settings');await fit();
      await page.locator('[name=publish]').check();await page.locator('[data-cloud-form=privacy] [type=submit]').click();await idle();
      assert.equal((await database.call('kalistar_me')).profile.publishOwner,true);
      await page.locator('[name=password]').fill('fixture-only-new-password');await page.locator('[name=confirmation]').fill('fixture-only-new-password');
      await page.evaluate(()=>QA.emitSync());
      assert.equal(await page.locator('[name=password]').inputValue(),'fixture-only-new-password','sync updates do not erase an edited form');
      await page.locator('[data-cloud-form=password] [type=submit]').click();await idle();
      assert.equal(await page.evaluate(()=>QA.passwords),1);
      assert.equal(await page.locator('[name=password]').inputValue(),'','password is not retained after submitting');
      await page.locator('[data-cloud-action=sync]').click();await page.locator('[data-cloud-action=local]').click();
      assert.deepEqual(await page.evaluate(()=>[QA.sync,QA.archives]),[1,1]);
      await section('contact');await shot('contact');await fit();
      assert.equal(await page.locator('a[href^="mailto:"]').count(),0,'uncreated support address must not solicit mail');
      assert((await page.locator('.account-content').innerText()).includes('contact@Kalistar.com'));
      await section('billing');await fit();assert.equal(await page.locator('.account-content input').count(),0,'no fake payment collection');
      await page.goBack();await page.getByRole('heading',{name:'Contact',exact:true}).waitFor();
      await section('transfers');await idle();assert.equal(await page.locator('.cloud-specimen').count(),0,'no duplicate collection gallery');
      const paris=await database.call('kalistar_my_cards'),tokyo=await database.call('kalistar_my_cards',{},'user-tokyo');
      const duplicate=paris.find(c=>tokyo.some(t=>t.modelId===c.modelId)),available=paris.find(c=>!tokyo.some(t=>t.modelId===c.modelId));
      await page.locator('[name=card]').selectOption(available.id);
      await page.locator('[name=confirm]').check();await page.locator('[name=card]').selectOption(duplicate.id);
      assert.equal(await page.locator('[name=confirm]').isChecked(),false,'changing a card invalidates its prior confirmation');
      await page.locator('[name=handle]').fill('tokyo');await page.locator('[name=confirm]').check();
      await page.locator('[data-cloud-form=offer] [type=submit]').click();await idle();
      assert.match(await page.locator('[data-account-error]').innerText(),/deja cette version/);
      await page.locator('[name=card]').selectOption(available.id);await page.locator('[name=handle]').fill('tokyo');await page.locator('[name=confirm]').check();
      await shot('transfer');await fit();
      await page.locator('[data-cloud-form=offer] [type=submit]').click();await idle();
      const offer=(await database.call('kalistar_my_transfers')).find(t=>t.status==='pending');
      assert(offer,'server pending transfer created only after confirmation');
      await page.locator('[data-cloud-action=settle][data-id="'+offer.id+'"]').click();await idle();
      assert.equal((await database.call('kalistar_my_transfers')).find(t=>t.id===offer.id).status,'cancelled');
      if(p.name==='desktop'){
        await page.locator('[name=card]').selectOption(available.id);await page.locator('[name=handle]').fill('tokyo');await page.locator('[name=confirm]').check();
        await page.locator('[data-cloud-form=offer] [type=submit]').click();await idle();
        const next=(await database.call('kalistar_my_transfers')).find(t=>t.status==='pending');
        await page.evaluate(()=>QA.switchUser('user-tokyo'));await idle();await section('transfers');
        assert.equal(await page.locator('a[href="#account/issue"]').count(),0,'Tokyo has no administration entry');
        await page.locator('[data-cloud-form=accept] input').check();
        await page.locator('[data-cloud-form=accept] [type=submit]').click();await idle();
        assert.equal((await database.call('kalistar_my_transfers',{},'user-tokyo')).find(t=>t.id===next.id).status,'accepted');
        assert((await database.call('kalistar_my_cards',{},'user-tokyo')).some(c=>c.id===available.id));
        await page.evaluate(()=>QA.ui.open({section:'issue'}));await idle();
        await page.getByRole('heading',{name:'Accès réservé'}).waitFor();
        await page.evaluate(()=>QA.switchUser('user-paris'));await idle();
        await page.evaluate(()=>QA.ui.open({section:'lookup',id:'INVALID'}));await idle();
        assert.match(await page.locator('[data-account-error]').innerText(),/invalide/);
        await page.evaluate(id=>QA.ui.open({id}),available.id);await idle();
        assert.equal(await page.locator('.cloud-specimen').count(),1,'public certificate deep link still resolves');
        await page.evaluate(()=>QA.ui.open({section:'issue'}));await idle();
        await page.locator('[data-cloud-form=issue] input').check();await page.locator('[data-cloud-form=issue] [type=submit]').click();await idle();
        const secret=await page.locator('.cloud-issued-secret').innerText();assert.equal(secret.length,64);
        await section('contact');await page.goBack();await page.locator('[data-cloud-form=issue]').waitFor();
        assert.equal(await page.locator('.cloud-issued-secret').count(),0,'history never restores a one-time secret');
        assert.equal(await page.evaluate(s=>JSON.stringify(localStorage).includes(s),secret),false);
        holdIssue=true;await page.locator('[data-cloud-form=issue] input').check();await page.locator('[data-cloud-form=issue] [type=submit]').click();
        await page.locator('.account-sidebar a[href="#account/contact"]').click();
        for(let n=0;!held&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,50));
        assert(held,'delayed issuance reached the fixture');
      }
      // Release a delayed mutation only after leaving its section.
      if(p.name==='desktop'){
        held?.();holdIssue=false;await idle();
        assert.equal(await page.locator('.cloud-issued-secret').count(),0);
        assert.equal(await page.locator('#account-section-title').innerText(),'Contact');
      }
      await section('profile');await page.locator('[data-cloud-action=logout]').click();await idle();
      assert.equal(await page.locator('[data-cloud-form=profile]').count(),0,'logout clears private form');
      assert(!(await page.locator('#account-root').innerText()).includes('paris@example.invalid'));
      assert.deepEqual(errors,[]);results.push({profile:p.name,passed:true});await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,profiles:results,rpcCalls:calls.length,mode:'isolated page + actual registry API + PostgreSQL migrations; fictional users only'},null,2));
    console.log('PASS account page: '+results.map(p=>p.profile).join(', ')+'; profile, privacy, password form, sync, transfer/duplicate/cancel/accept, admin, certificates, secret lifecycle, history, logout.');
  }finally{held?.();await browser.close();await database.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
