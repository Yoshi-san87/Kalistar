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
  let held=null,holdIssue=false,heldTransfer=null,holdTransfer='';
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
          if(name===holdTransfer)await new Promise(resolve=>{heldTransfer=resolve;});
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
          onChanged:()=>{QA.changed++;if(QA.failChange)throw Error('Actualisation indisponible.');},onLocal:()=>QA.archives++,onSync:()=>QA.sync++,
          sync:{snapshot:()=>({status:'synced',updatedAt:'2026-10-20T00:00:00Z'}),subscribe:fn=>{syncListener=fn;return()=>{syncListener=null;};}}});
        window.QA.switchUser=who=>{identity=who;ui.open();};
        window.QA.logout=()=>client.auth.signOut();
        window.QA.ui=ui;
        addEventListener('hashchange',()=>ui.route(location.hash.split('/')[1]));
        ui.mount(document.querySelector('#account-root'),'profile');
      },data);
      const idle=()=>page.locator('#account-root[aria-busy=false]').waitFor();
      const section=async name=>{await page.locator('.account-sidebar a[href="#account/'+name+'"]').click();await idle();};
      const shot=async name=>{
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForFunction(()=>[...document.querySelectorAll('.account-page img')].every(i=>i.complete&&i.naturalWidth));
        await page.evaluate(()=>Promise.all([...document.querySelectorAll('[data-transfer-stage],[data-activation-stage]')].flatMap(n=>n.getAnimations({subtree:true})).map(a=>a.finished.catch(()=>{}))));
        await page.screenshot({path:path.join(output,p.name+'-'+name+'.png'),fullPage:true});
      };
      const fit=async()=>assert.deepEqual(await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        outside:[...document.querySelectorAll('.account-page button,.account-page input:not([type=checkbox]),.account-page select,.account-page a')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>innerWidth+1||r.height<43);}).map(n=>n.outerHTML.slice(0,120))
      })),{overflow:false,outside:[]},p.name+' controls fit and remain touch sized');
      const fullPage=async()=>assert.deepEqual(await page.evaluate(()=>{
        const rect=selector=>document.querySelector(selector).getBoundingClientRect();
        const app=rect('#app'),page=rect('.account-page'),layout=rect('.account-layout'),content=rect('.account-content');
        const padding=parseFloat(getComputedStyle(document.querySelector('.account-page')).paddingBottom);
        return {
          fullWidth:Math.abs(page.left-app.left)<1&&Math.abs(page.width-app.width)<1,
          fullHeight:page.height>=app.height-1,
          contentToRight:Math.abs(content.right-layout.right)<1,
          layoutToBottom:Math.abs(layout.bottom-(page.bottom-padding))<1
        };
      }),{fullWidth:true,fullHeight:true,contentToRight:true,layoutToBottom:true},p.name+' account fills the available workspace');
      await idle();assert.equal(await page.locator('dialog,.cloud-card-list').count(),0);
      await shot('profile');await fit();await fullPage();
      await page.locator('[name=displayName]').fill('W'.repeat(40));
      await page.locator('[data-cloud-form=profile] [type=submit]').click();await idle();
      assert.equal((await database.call('kalistar_me')).profile.displayName,'W'.repeat(40));await fit();
      await section('settings');await shot('settings');await fit();await fullPage();
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
      await section('contact');await shot('contact');await fit();await fullPage();
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
      assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-phase'),'error','a refused transfer never plays a success scene');
      assert.equal(await page.locator('[name=handle]').inputValue(),'tokyo','a failed offer keeps the intended recipient');
      await page.locator('[name=card]').selectOption(available.id);await page.locator('[name=handle]').fill('tokyo');await page.locator('[name=confirm]').check();
      await page.locator('[name=handle]').fill('tokyo_');
      assert.equal(await page.locator('[name=confirm]').isChecked(),false,'typing resets confirmation before blur');
      assert.equal(await page.locator('[data-transfer-recipient]').innerText(),'@tokyo_');
      await page.locator('[name=handle]').fill('tokyo');await page.locator('[name=confirm]').check();
      const preview=await page.evaluate(()=>{
        const r=n=>n.getBoundingClientRect(),stage=r(document.querySelector('[data-transfer-stage]'));
        const select=r(document.querySelector('[name=card]')),recipient=r(document.querySelector('[name=handle]'));
        const image=r(document.querySelector('[data-account-selection] img'));
        return {right:stage.left>=select.right+20,aboveRecipient:stage.bottom<=recipient.top,height:image.height,width:image.width,scroll:document.documentElement.scrollWidth>innerWidth};
      });
      assert.equal(preview.scroll,false);
      if(p.width>1200){assert(preview.right,'desktop preview uses the right column');assert(preview.height>=400,'desktop card is genuinely large');}
      else assert(preview.aboveRecipient,'compact preview sits after selection and before recipient');
      await shot('transfer');await fit();
      holdTransfer='kalistar_offer';
      await page.locator('[data-cloud-form=offer] [type=submit]').click();
      await page.waitForFunction(()=>document.querySelector('[data-transfer-stage]')?.dataset.phase==='sending');
      assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-motion'),'','no sending celebration before the server confirms');
      assert.equal(await page.locator('[data-cloud-form=offer] [type=submit]').isDisabled(),true);
      for(let n=0;!heldTransfer&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,50));
      assert(heldTransfer,'offer response delayed by fixture');heldTransfer();heldTransfer=null;holdTransfer='';
      await idle();
      assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-phase'),'pending');
      assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-motion'),'dispatch');
      assert.match(await page.locator('.transfer-status').innerText(),/En attente/);
      assert.equal(await page.locator('[data-transfer-stage]').evaluate(n=>n.getAnimations({subtree:true}).every(a=>a.effect.getTiming().iterations===1)),true,'transfer effects are finite, never a permanent CPU loop');
      if(p.name!=='compact'){
        const motion=await page.locator('[data-account-selection] img').evaluate(n=>({name:getComputedStyle(n).animationName,duration:getComputedStyle(n).animationDuration}));
        assert.equal(motion.name,'transfer-card-dispatch');assert(parseFloat(motion.duration)<=1.2,'dispatch remains brief');
      }
      await shot('sent');
      if(p.name==='compact')assert.equal(await page.locator('[data-account-selection] img').evaluate(n=>getComputedStyle(n).animationName),'none','reduced motion disables the ceremony');
      const offer=(await database.call('kalistar_my_transfers')).find(t=>t.status==='pending');
      assert(offer,'server pending transfer created only after confirmation');
      await page.locator('[data-cloud-action=refresh]').click();await idle();
      assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-motion'),'','refresh does not replay a sent ceremony');
      if(p.name==='razr'){
        await database.call('kalistar_settle',{p_transfer:offer.id,p_action:'accepted'},'user-tokyo');
        await page.locator('[data-cloud-action=refresh]').click();await idle();
        assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-phase'),'accepted','sender sees actual acceptance after refreshing');
        await shot('delivered');
      }else{
        await page.locator('[data-cloud-action=settle][data-id="'+offer.id+'"]').click();await idle();
        assert.equal((await database.call('kalistar_my_transfers')).find(t=>t.id===offer.id).status,'cancelled');
        assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-phase'),'cancelled','cancellation is reflected in the preview');
      }
      if(p.name==='wide'){
        await page.locator('[name=card]').selectOption(available.id);await page.locator('[name=handle]').fill('tokyo');await page.locator('[name=confirm]').check();
        holdTransfer='kalistar_offer';await page.locator('[data-cloud-form=offer] [type=submit]').click();
        for(let n=0;!heldTransfer&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,50));
        assert(heldTransfer);await page.locator('.account-sidebar a[href="#account/contact"]').click();
        heldTransfer();heldTransfer=null;holdTransfer='';await idle();
        assert.equal(await page.locator('[data-transfer-stage]').count(),0,'a late response cannot reopen the transfer ceremony');
        await section('transfers');
        assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-phase'),'empty','returning to the page does not replay an old ceremony');
        const late=(await database.call('kalistar_my_transfers')).find(t=>t.status==='pending');
        await page.locator('[data-cloud-action=settle][data-id="'+late.id+'"]').click();await idle();
      }
      if(p.name==='desktop'){
        await page.locator('[name=card]').selectOption(available.id);await page.locator('[name=handle]').fill('tokyo');await page.locator('[name=confirm]').check();
        await page.locator('[data-cloud-form=offer] [type=submit]').click();await idle();
        const next=(await database.call('kalistar_my_transfers')).find(t=>t.status==='pending');
        await page.evaluate(()=>QA.switchUser('user-tokyo'));await idle();await section('transfers');
        assert.equal(await page.locator('a[href="#account/issue"]').count(),0,'Tokyo has no administration entry');
        await page.locator('[data-cloud-form=accept] input').check();
        await page.locator('[data-cloud-form=accept] [type=submit]').click();await idle();
        assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-phase'),'received');
        assert.equal(await page.locator('[data-transfer-stage]').getAttribute('data-motion'),'receive');
        await shot('received');
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
      const owned=await database.call('kalistar_my_cards',{},'user-tokyo');
      const activationModel=data.cards.find(c=>!owned.some(item=>item.modelId===c.id));
      const voucher=await database.call('kalistar_issue',{p_model_id:activationModel.id,p_pilot:true});
      await page.evaluate(()=>QA.switchUser('user-tokyo'));await idle();
      await page.evaluate(()=>QA.ui.open({section:'activate'}));await idle();
      const stage=page.locator('[data-activation-stage]');
      assert.equal(await stage.getAttribute('data-phase'),'sealed');
      const placement=await page.evaluate(()=>{
        const r=s=>document.querySelector(s).getBoundingClientRect(),stage=r('[data-activation-stage]'),form=r('[data-cloud-form=activate]');
        return {right:stage.left>=form.right+20,above:stage.bottom<=form.top,height:r('.activation-card').height};
      });
      if(p.width>1200){assert(placement.right);assert(placement.height>=400);}
      else assert(placement.above,'compact reveal sits above the activation controls');
      await shot('activation-sealed');await fit();
      const activate=async secret=>{
        await page.locator('[name=id]').fill(voucher.card.barcode);
        await page.locator('[name=secret]').fill(secret);
        await page.locator('[data-cloud-form=activate] [type=submit]').click();
      };
      await activate('0'.repeat(64));await idle();
      assert.equal(await stage.getAttribute('data-phase'),'error');
      assert.equal(await page.locator('.activation-front').count(),0,'a bad secret reveals no card');
      assert.equal(await page.locator('[name=id]').inputValue(),voucher.card.barcode,'public ID survives failure');
      assert.equal(await page.locator('[name=secret]').inputValue(),'');
      holdTransfer='kalistar_activate';await activate(voucher.secret);
      await page.waitForFunction(()=>document.querySelector('[data-activation-stage]')?.dataset.phase==='checking');
      assert.equal(await page.locator('.activation-front').count(),0,'no reveal before the server confirms');
      assert.equal(await page.locator('[name=secret]').inputValue(),'','submitted secret is immediately erased');
      assert.equal(await page.locator('[data-cloud-form=activate] [type=submit]').isDisabled(),true);
      for(let n=0;!heldTransfer&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,50));
      assert(heldTransfer);heldTransfer();heldTransfer=null;holdTransfer='';await idle();
      assert.equal(await stage.getAttribute('data-phase'),'registered');
      assert.equal(await stage.getAttribute('data-motion'),'unseal');
      assert.equal(await page.locator('[name=secret]').count(),0,'receipt has no secret field');
      assert.equal(await page.locator('.activation-caption code').innerText(),voucher.card.id);
      assert((await database.call('kalistar_my_cards',{},'user-tokyo')).some(c=>c.id===voucher.card.id));
      assert.equal(await page.evaluate(secret=>document.body.innerHTML.includes(secret)||JSON.stringify(localStorage).includes(secret)||JSON.stringify(sessionStorage).includes(secret),voucher.secret),false);
      assert.equal(await stage.evaluate(n=>n.getAnimations({subtree:true}).every(a=>a.effect.getTiming().iterations===1)),true);
      assert.equal(await page.locator('.activation-front').evaluate(n=>getComputedStyle(n).animationName),p.name==='compact'?'none':'activation-front-open');
      if(p.name==='desktop'){
        const frames=await stage.evaluate(n=>{
          const animation=n.querySelector('.activation-front').getAnimations()[0],img=n.querySelector('.activation-front');
          animation.pause();animation.currentTime=0;
          const start=getComputedStyle(img).opacity;
          animation.currentTime=800;
          const opened=getComputedStyle(img).opacity;
          animation.play();return {start,opened};
        });
        assert.deepEqual(frames,{start:'0',opened:'1'},'the card is actually revealed during the finite turn');
      }
      await shot('activation-revealed');await fit();
      await page.locator('[data-cloud-action=new-activation]').click();await idle();
      assert.equal(await stage.getAttribute('data-phase'),'sealed');
      assert.equal(await page.locator('[name=id]').inputValue(),'');
      const duplicateVoucher=await database.call('kalistar_issue',{p_model_id:activationModel.id,p_pilot:true});
      await page.locator('[name=id]').fill(duplicateVoucher.card.barcode);await page.locator('[name=secret]').fill(duplicateVoucher.secret);
      await page.locator('[data-cloud-form=activate] [type=submit]').click();await idle();
      assert.equal(await stage.getAttribute('data-phase'),'error','one version per player is still enforced');
      assert.match(await page.locator('[data-account-error]').innerText(),/deja cette version/);
      await section('contact');await page.goBack();await stage.waitFor();await idle();
      assert.equal(await stage.getAttribute('data-phase'),'sealed','history never replays a reveal');
      if(p.name==='desktop'){
        const nowOwned=await database.call('kalistar_my_cards',{},'user-tokyo');
        const nextModel=data.cards.find(c=>!nowOwned.some(item=>item.modelId===c.id));
        const nextVoucher=await database.call('kalistar_issue',{p_model_id:nextModel.id,p_pilot:true});
        await page.locator('[name=id]').fill(nextVoucher.card.barcode);await page.locator('[name=secret]').fill(nextVoucher.secret);
        await page.evaluate(()=>{QA.failChange=true;});
        await page.locator('[data-cloud-form=activate] [type=submit]').click();await idle();
        assert.equal(await stage.getAttribute('data-phase'),'error','an incomplete account refresh never celebrates a successful reveal');
        assert.equal(await page.locator('.activation-front').count(),0);
        assert((await database.call('kalistar_my_cards',{},'user-tokyo')).some(c=>c.id===nextVoucher.card.id),'server ownership remains valid even if UI refresh fails');
        await page.evaluate(()=>{QA.failChange=false;});
      }
      if(['wide','razr'].includes(p.name)){
        const nowOwned=await database.call('kalistar_my_cards',{},'user-tokyo');
        const lateModel=data.cards.find(c=>!nowOwned.some(item=>item.modelId===c.id));
        const lateVoucher=await database.call('kalistar_issue',{p_model_id:lateModel.id,p_pilot:true});
        await page.locator('[name=id]').fill(lateVoucher.card.barcode);await page.locator('[name=secret]').fill(lateVoucher.secret);
        holdTransfer='kalistar_activate';await page.locator('[data-cloud-form=activate] [type=submit]').click();
        for(let n=0;!heldTransfer&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,50));
        assert(heldTransfer);
        if(p.name==='wide')await page.locator('.account-sidebar a[href="#account/contact"]').click();
        else await page.evaluate(()=>QA.logout());
        heldTransfer();heldTransfer=null;holdTransfer='';await idle();
        assert.equal(await stage.count(),0,'late activation cannot reopen after navigation or logout');
      }
      await page.evaluate(()=>QA.switchUser('user-paris'));await idle();
      await section('profile');await page.locator('[data-cloud-action=logout]').click();await idle();
      assert.equal(await page.locator('[data-cloud-form=profile]').count(),0,'logout clears private form');
      assert(!(await page.locator('#account-root').innerText()).includes('paris@example.invalid'));
      assert.deepEqual(errors,[]);results.push({profile:p.name,passed:true});await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,profiles:results,rpcCalls:calls.length,mode:'isolated page + actual registry API + PostgreSQL migrations; fictional users only'},null,2));
    console.log('PASS account page: '+results.map(p=>p.profile).join(', ')+'; profile, privacy, password form, sync, transfer/duplicate/cancel/accept, activation/reveal/duplicate/late response, admin, certificates, secret lifecycle, history, logout.');
  }finally{held?.();heldTransfer?.();await browser.close();await database.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
