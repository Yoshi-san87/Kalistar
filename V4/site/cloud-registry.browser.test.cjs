'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_cloud_browser.cjs'));
const {chromium}=runtime('playwright');
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/cloud-registry');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base='https://kalistar-cloud-qa.invalid/jeu/?registry=1#home';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const specimen='KC-'+'a'.repeat(32),secret='b'.repeat(64),userId='11111111-1111-4111-8111-111111111111';
const item={id:specimen,serial:'000001',barcode:'00000001',modelId:'30000001',name:'MOMO',title:'L\u2019ARTISTE MAGIQUE',status:'owned',pilot:true,owner:{handle:'fixture',displayName:'Voyageur'}};
const profiles=[{name:'desktop',width:1440,height:1000},{name:'razr',width:412,height:1007,mobile:true},{name:'compact',width:320,height:740,mobile:true},{name:'landscape',width:1007,height:412,mobile:true},{name:'reduced',width:412,height:1007,mobile:true,reduced:true}];
function session(){
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})).toString('base64url')+'.fixture-signature';
  return {access_token:token,refresh_token:'disposable-fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:userId,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',email_confirmed_at:'2026-10-16T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}}};
}
async function prepare(context){
  const fixture={profile:{handle:'fixture',displayName:'Voyageur',publishOwner:false},cards:[],transfers:[],isAdmin:false,calls:[],failActivation:false};
  await context.route(/^https:\/\/(kalistar\.pages\.dev|kalistar-cloud-qa\.invalid)\//,route=>{
    const relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\//,''),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
    assert(file.startsWith(dist+path.sep));
    return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}):route.fulfill({status:404,body:'Missing QA asset'});
  });
  await context.route('https://fkskjhlaaagqlfcsojjp.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url()),args=request.postDataJSON()||{};
    fixture.calls.push({path:url.pathname,args});let body=null,status=200;
    if(url.pathname==='/auth/v1/otp'){
      assert.equal(args.email,'fixture@example.invalid');assert.equal(url.searchParams.get('redirect_to'),'https://kalistar.pages.dev/jeu/?registry=1');body={};
    }else if(url.pathname==='/auth/v1/logout')body={};
    else if(url.pathname==='/rest/v1/kalistar_models')body=[{id:'30000001',name:'MOMO',title:item.title}];
    else{
      const name=url.pathname.split('/').pop();
      if(name==='kalistar_me')body={profile:fixture.profile,isAdmin:fixture.isAdmin};
      else if(name==='kalistar_my_cards')body=fixture.cards;
      else if(name==='kalistar_my_transfers')body=fixture.transfers;
      else if(name==='kalistar_certificate')body=args.p_id==='00000000'?null:item;
      else if(name==='kalistar_set_profile'){fixture.profile={handle:args.p_handle,displayName:args.p_display_name,publishOwner:args.p_publish_owner};body={profile:fixture.profile,isAdmin:fixture.isAdmin};}
      else if(name==='kalistar_activate'){body=fixture.failActivation?{ok:false,code:'activation_refused'}:{ok:true,card:item};if(body.ok)fixture.cards=[item];}
      else if(name==='kalistar_offer'){fixture.transfers=[{id:'22222222-2222-4222-8222-222222222222',card:item,sender:'fixture',recipient:args.p_recipient,incoming:false,status:'pending'}];body=fixture.transfers[0].id;}
      else if(name==='kalistar_settle'){fixture.transfers.find(t=>t.id===args.p_transfer).status=args.p_action;body=item;}
      else if(name==='kalistar_issue'){assert.equal(args.p_pilot,true);body={card:{...item,status:'unclaimed',owner:null},secret};}
      else {status=500;body={message:'Unexpected fixture request '+url.pathname};}
    }
    await route.fulfill({status,json:body??null,headers:{'access-control-allow-origin':'*'}});
  });
  return fixture;
}
const action=(page,name)=>page.locator('#account-root [data-cloud-action="'+name+'"]');
async function tab(page,name){
  const link=page.locator('.account-page a[href="#account/'+name+'"]').first();
  if(!await link.count())await page.locator('.account-sidebar a[href="#account/transfers"]').click();
  await link.click();
}
async function idle(page){await page.locator('#account-root[aria-busy=false]').waitFor();}
async function geometry(page,name){
  const actual=await page.locator('#account-root').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth,viewport:innerWidth,right:n.getBoundingClientRect().right,x:n.getBoundingClientRect().x,
    controls:[...n.querySelectorAll('button,input:not([type=checkbox]),select')].filter(b=>b.getClientRects().length).map(b=>({height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width})),
    images:[...n.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)}));
  assert(actual.scroll<=actual.width+1,name+' page has no horizontal overflow');assert(actual.x>=0&&actual.right<=actual.viewport+1,name+' page fits viewport');
  assert(actual.controls.every(c=>c.height>=44&&c.width>=44),name+' controls have 44px targets');assert(actual.images,name+' card images loaded');return actual;
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
  try{
    if(process.env.KALISTAR_CLOUD_LIVE_URL)throw Error('Use login.browser.test.cjs with KALISTAR_LOGIN_LIVE_URL for the now-private site.');
    for(const profile of profiles){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile,reducedMotion:profile.reduced?'reduce':'no-preference',serviceWorkers:'block'});
      await context.addInitScript(s=>{localStorage.setItem('kalistar.cloud.auth.v1',JSON.stringify(s));},session());
      const fixture=await prepare(context),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base);await idle(page);assert.equal(await page.locator('[data-cloud-form=profile] [name=handle]').inputValue(),'fixture');
      const localOwned=await page.evaluate(()=>KALISTAR_DB.registry.owned('user-paris').length);
      assert.equal(new URL(page.url()).search,'','registry entry parameters are consumed');
      await tab(page,'lookup');await page.locator('#account-root input[name=id]').fill('00000001');await page.locator('[data-cloud-form=lookup] button').click();await idle(page);
      await page.waitForFunction(()=>{const i=document.querySelector('.cloud-specimen img');return i?.complete&&i.naturalWidth>0&&i.dataset.v4Cropped;});await geometry(page,profile.name);
      await page.screenshot({path:path.join(output,profile.name+'-public.png')});
      await page.goBack();await page.getByRole('heading',{name:'Transférer une carte',exact:true}).waitFor();
      await page.locator('.account-home').click();await page.locator('#home-root').waitFor();
      if(profile.name==='desktop'||profile.name==='razr'){
        await page.locator('[data-action=account]').click();await page.locator('#account-dialog[open]').waitFor();
        await page.locator('[data-registry-action=cloud]').click();await idle(page);
        assert.equal(await page.locator('dialog[open]').count(),0,'entering the account page closes the legacy local tools');
        assert.equal(await page.evaluate(()=>KALISTAR_DB.registry.owned('user-paris').length),localOwned,'opening the online register preserves local possessions');
      }
      await page.evaluate(s=>{localStorage.setItem('kalistar.cloud.auth.v1',JSON.stringify(s));},session());
      await page.goto(base);await idle(page);
      await tab(page,'transfers');assert.equal(await page.locator('a[href="#account/issue"]').count(),0,'ordinary user has no emission control');
      await tab(page,'profile');await page.locator('#account-root input[name=displayName]').fill('Voyageur du ciel');await page.locator('[data-cloud-form=profile] button').click();await idle(page);
      await tab(page,'settings');await page.locator('#account-root input[name=publish]').check();await page.locator('[data-cloud-form=privacy] button').click();await idle(page);assert(fixture.profile.publishOwner);
      await tab(page,'activate');await page.locator('#account-root input[name=id]').fill('30000001');await page.locator('#account-root input[name=secret]').fill(secret);await page.locator('[data-cloud-form=activate] button').click();await idle(page);
      assert.equal(fixture.calls.filter(c=>c.path.includes('kalistar_activate')).length,0,'model barcode is rejected before a request');
      await page.locator('#account-root input[name=id]').fill('00000001');await page.locator('#account-root input[name=secret]').fill(secret);fixture.failActivation=true;await page.locator('[data-cloud-form=activate] button').click();await idle(page);
      assert.match(await page.locator('#account-root [role=alert]').innerText(),/refusee/);assert.equal(fixture.cards.length,0);
      fixture.failActivation=false;await page.locator('#account-root input[name=id]').fill('00000001');await page.locator('#account-root input[name=secret]').fill(secret);await page.locator('[data-cloud-form=activate] button').click();await idle(page);
      assert.equal(await page.locator('#account-root input[name=secret]').count(),0);
      assert.equal(await page.locator('[data-activation-stage]').getAttribute('data-phase'),'registered');
      await page.waitForFunction(()=>{const i=document.querySelector('.activation-front');return i?.complete&&i.naturalWidth>0&&i.dataset.v4Cropped;});
      await page.locator('[data-activation-stage]').evaluate(n=>Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
      await geometry(page,profile.name);await page.screenshot({path:path.join(output,profile.name+'-registered.png')});
      await tab(page,'transfers');await page.locator('[name=card]').selectOption(specimen);
      await page.waitForFunction(()=>{const i=document.querySelector('.cloud-specimen img');return i?.complete&&i.naturalWidth>0&&i.dataset.v4Cropped;});await geometry(page,profile.name);await page.screenshot({path:path.join(output,profile.name+'-owned.png')});
      assert(!(await page.locator('#account-root').innerText()).includes(secret));
      await page.locator('#account-root input[name=handle]').fill('recipient');await page.locator('[data-cloud-form=offer] button').click();assert.equal(fixture.transfers.length,0,'unchecked confirmation blocks transfer');
      await page.locator('[data-cloud-form=offer] input[type=checkbox]').check();await page.locator('[data-cloud-form=offer] button').click();await idle(page);assert.equal(fixture.transfers.length,1);
      await action(page,'settle').click();await idle(page);assert.equal(fixture.transfers[0].status,'cancelled');
      fixture.transfers[0]={...fixture.transfers[0],incoming:true,status:'pending',sender:'sender',recipient:'fixture'};
      await page.reload();await idle(page);
      await page.locator('[data-cloud-form=accept] input').check();await page.locator('[data-cloud-form=accept] [type=submit]').click();await idle(page);assert.equal(fixture.transfers[0].status,'accepted');
      fixture.isAdmin=true;await page.reload();await idle(page);await tab(page,'issue');
      await page.locator('[data-cloud-form=issue] input').check();await page.locator('[data-cloud-form=issue] button').click();await idle(page);
      assert.equal(await page.locator('.cloud-issued-secret').innerText(),secret);
      const downloadEvent=page.waitForEvent('download');await action(page,'voucher').click();const download=await downloadEvent;
      assert.equal(await download.failure(),null,profile.name+' activation voucher download');
      const voucher=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(voucher.secret,secret);assert.equal(voucher.barcode,'00000001');
      await tab(page,'profile');assert.equal(await page.locator('.cloud-issued-secret').count(),0);await page.reload();await idle(page);await tab(page,'issue');assert.equal(await page.locator('.cloud-issued-secret').count(),0,'secret never survives reload');
      // A second isolated page shares only this disposable browser context's SDK session.
      const other=await context.newPage();await other.goto(base);await idle(other);await action(other,'logout').click();await idle(other);
      await page.locator('.account-content a[href$="login.html"]').waitFor();assert.equal(await page.locator('.cloud-specimen').count(),0,'cross-tab signout clears private DOM');
      assert.deepEqual(errors,[],profile.name+' no JavaScript errors');
      results.push({profile:profile.name,passed:true,requests:fixture.calls.length});await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,mode:'isolated mocked Auth and RPC through official Supabase SDK; no remote mutations',profiles:results},null,2));
    console.log('PASS online registry: '+results.map(r=>r.profile).join(', ')+'; authenticated profile, consent, activation, transfers, pilot voucher, reload, cross-tab signout, Back.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
