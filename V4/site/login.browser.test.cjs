'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_login_browser.cjs'));
const {chromium}=runtime('playwright'),dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/login');
const origin='https://kalistar.pages.dev',mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
const profiles=[{name:'desktop',width:1440,height:1000},{name:'wide',width:2532,height:1412},{name:'razr',width:412,height:1007,mobile:true},{name:'compact',width:320,height:740,mobile:true},{name:'landscape',width:1007,height:412,mobile:true},{name:'reduced',width:412,height:1007,mobile:true,reduced:true}];
function token(profile){const sub=profile==='user-paris'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222',email=profile==='user-paris'?'paris@example.invalid':'tokyo@example.invalid';
  const access_token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})).toString('base64url')+'.fixture-signature';
  return {access_token,refresh_token:'fixture-refresh-'+profile,expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:sub,email,email_confirmed_at:'2026-10-16T00:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}};}
async function main(){
  const worker=await import('../deploy/access-worker.mjs');fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];let database;
  try{
    if(process.env.KALISTAR_LOGIN_LIVE_URL){
      for(const p of profiles.filter(p=>['desktop','razr'].includes(p.name))){
        const context=await browser.newContext({viewport:{width:p.width,height:p.height},isMobile:!!p.mobile,hasTouch:!!p.mobile,serviceWorkers:'block'}),page=await context.newPage();
        await page.goto(process.env.KALISTAR_LOGIN_LIVE_URL);await page.waitForURL('**/jeu/login*');await page.locator('#login-form button[type=submit]:enabled').waitFor();
        assert.equal(await page.locator('.main-nav').count(),0);assert.equal(await page.locator('[data-action=account]').count(),0);
        for(const route of ['/jeu/catalogue.json','/media/reference/momo.png','/jeu/boot.js','/release.json'])assert.equal((await page.request.get(origin+route)).status(),401,route);
        await page.screenshot({path:path.join(output,p.name+'-live.png')});await context.close();
      }
      console.log('PASS live closed access: anonymous visitors get login, game catalogue, scripts and raw cards refuse access; no credentials sent.');return;
    }
    database=await require('../deploy/supabase/browser-fixture.cjs').create(JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8')));
    for(const p of profiles.filter(p=>!process.env.KALISTAR_LOGIN_PROFILES||process.env.KALISTAR_LOGIN_PROFILES.split(',').includes(p.name))){
      await database.resetProgress();
      const context=await browser.newContext({viewport:{width:p.width,height:p.height},isMobile:!!p.mobile,hasTouch:!!p.mobile,reducedMotion:p.reduced?'reduce':'no-preference',serviceWorkers:'block'}),page=await context.newPage(),errors=[],calls=[];
      let denied=false;const leaseDevices=[];const paris=token('user-paris'),tokyo=token('user-tokyo');
      const identify=authorization=>authorization==='Bearer '+paris.access_token?paris:authorization==='Bearer '+tokyo.access_token?tokyo:null;
      const permission=session=>session===paris?{localProfile:'user-paris',label:'Paris'}:{localProfile:'user-tokyo',label:'Tokyo'};
      const api=async(url,options={})=>{
        const pathname=new URL(url).pathname,session=identify(options.headers?.Authorization||options.headers?.authorization);
        if(pathname==='/auth/v1/user')return new Response(JSON.stringify(session?.user||{}),{status:session?200:401});
        if(pathname==='/rest/v1/rpc/kalistar_access')return new Response(JSON.stringify(session&&!denied?permission(session):{message:'Denied',code:'42501'}),{status:session&&!denied?200:403});
        if(pathname==='/rest/v1/rpc/kalistar_journey_library'){
          if(!session||denied)return Response.json({message:'Denied'},{status:403});
          return Response.json(await database.call('kalistar_journey_library',{},session===paris?'user-paris':'user-tokyo'));
        }
        throw Error('Unexpected edge request '+pathname);
      };
      const env={KALISTAR_SESSION_KEY:'test-only-session-key-'.repeat(4),ASSETS:{fetch:async r=>{
        let relative=decodeURIComponent(new URL(r.url).pathname).replace(/^\//,'');if(!relative||relative.endsWith('/'))relative+='index.html';
        if(relative==='jeu/login')relative+='.html';
        const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep));
        return fs.existsSync(file)?new Response(fs.readFileSync(file),{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}}):new Response('Missing QA asset',{status:404});
      }}};
      await context.route(origin+'/**',async route=>{
        const r=route.request(),response=await worker.handle(new Request(r.url(),{method:r.method(),headers:await r.allHeaders(),...(r.postData()?{body:r.postData()}:{}),...(r.method()==='GET'?{}:{duplex:'half'})}),env,api);
        // Playwright does not re-route redirects; navigate explicitly inside this isolated fixture.
        if(response.status===302)return route.fulfill({contentType:'text/html',body:'<!doctype html><script>location.replace('+JSON.stringify(response.headers.get('Location'))+')</script>'});
        await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
      });
      await context.route('https://fkskjhlaaagqlfcsojjp.supabase.co/**',async route=>{
        const r=route.request(),u=new URL(r.url()),args=r.postDataJSON()||{};calls.push(u.pathname);
        if(u.pathname==='/auth/v1/token'){
          if(args.password!=='only-a-fixture-password')return route.fulfill({status:400,json:{code:'invalid_credentials',msg:'Invalid login credentials'}});
          return route.fulfill({json:args.email==='paris@example.invalid'?paris:tokyo});
        }
        if(u.pathname==='/auth/v1/logout')return route.fulfill({json:{}});
        if(u.pathname==='/auth/v1/recover')return route.fulfill({json:{}});
        if(u.pathname.endsWith('/kalistar_access')){const response=await api(r.url(),{headers:await r.allHeaders()});return route.fulfill({status:response.status,json:await response.json()});}
        const name=u.pathname.split('/').pop(),who=identify((await r.allHeaders()).authorization)===tokyo?'user-tokyo':'user-paris';
        if(['kalistar_sync_claim','kalistar_sync_v2_claim'].includes(name))leaseDevices.push(args.p_device_id);
        try{return route.fulfill({json:name==='kalistar_models'?await database.models():await database.call(name,args,who)});}catch(error){return route.fulfill({status:403,json:{code:error.code,message:error.message}});}
      });
      page.on('pageerror',e=>errors.push(e.message));
      let filmCompleted=false;
      const ready=async(expectIntro=false)=>{try{
        await page.waitForFunction(()=>window.KALISTAR_READY||document.querySelector('.login-intro[open]'),{},{timeout:30000});
        assert.equal(await page.locator('.login-intro[open]').count(),expectIntro&&!p.reduced?1:0,'intro only follows an explicit successful password login');
        if(await page.locator('.login-intro[open]').count()){
          assert((await context.cookies()).some(c=>c.name==='__Host-kalistar'),'intro follows server authentication');
          assert.equal(await page.locator('input[name=password]').count(),0,'no password form survives in the game document');
          assert.equal(new URL(page.url()).pathname,'/jeu/','film runs on the destination, without a hidden second game');
          assert.equal(await page.locator('iframe').count(),0);
          if(!filmCompleted&&['desktop','razr'].includes(p.name)){
            await page.waitForFunction(()=>document.querySelector('.login-intro video')?.currentTime>.3);
            assert(Math.abs(await page.locator('.login-intro video').evaluate(v=>v.duration)-30)<.1);
            await page.waitForFunction(()=>window.KALISTAR_PREPARED&&document.querySelector('.login-intro[open]'),{},{timeout:20000});
            assert.equal(await page.evaluate(()=>KALISTAR_INTRO_PENDING),true,'data prepared before film completion');
            assert.equal(await page.evaluate(()=>!!window.KALISTAR_READY),false,'game not activated during film');
            assert.equal(await page.locator('#home-root,.game-shell,.cloud-sync-dialog').count(),0,'views and sync notifications wait at the activation boundary');
            assert.equal(new Set(leaseDevices).size,1,'lease acquisition and renewal use the same game device');
            assert.equal(await page.locator('script[src*="/app.js"],script[src^="app.js"]').count(),1,'the application starts only once');
            const bounds=await page.locator('.login-intro').boundingBox();assert(bounds.width>=p.width&&bounds.height>=p.height,'film fills the actual game shell');
            await page.screenshot({path:path.join(output,p.name+'-game-loading-under-film.png')});
            await page.locator('.login-intro').waitFor({state:'detached',timeout:35000});filmCompleted=true;
          }else await page.locator('.login-intro__skip').click();
        }
        await page.waitForFunction(()=>window.KALISTAR_READY,{},{timeout:30000});
      }catch(e){console.error({errors,calls,leaseDevices,boot:await page.locator('#app').innerText().catch(()=>''),sync:await page.evaluate(()=>window.KALISTAR_SYNC?.snapshot())});throw e;}};
      await page.goto(origin+'/jeu/login.html?next='+encodeURIComponent('/jeu/#home'));await page.waitForURL('**/jeu/login*');await page.locator('#login-form button[type=submit]:enabled').waitFor();
      assert.equal(await page.locator('.main-nav').count(),0);assert(!calls.some(c=>c.includes('kalistar_me')),'game does not initialize before authentication');
      assert.equal(await page.locator('.login-intro').count(),0,'no intro before authentication');
      for(const version of [1,2,3])assert.equal(await page.evaluate(v=>fetch('assets/cinematics/kalistar-anime-v'+v+'.mp4').then(r=>r.status),version),401,'film remains private');
      await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,p.name+'.png')});
      const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('button,input')].map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))}));
      assert.equal(layout.width,layout.scroll,p.name+' no horizontal overflow');assert(layout.controls.every(c=>c.w>=44&&c.h>=44),p.name+' touch targets');
      if(p.reduced)assert.equal(await page.locator('.login-seal img').evaluate(n=>getComputedStyle(n).animationName),'none');
      await page.locator('input[name=email]').fill('paris@example.invalid');await page.locator('input[name=password]').fill('incorrect-fixture');await page.locator('#login-form [type=submit]').click();await page.locator('#login-error:not(:empty)').waitFor();
      assert.equal(await page.locator('input[name=password]').inputValue(),'');assert.equal(await page.evaluate(url=>fetch(url).then(r=>r.status),origin+'/jeu/catalogue.json'),401);
      denied=true;await page.locator('input[name=password]').fill('only-a-fixture-password');await page.locator('#login-form [type=submit]').click();await page.getByText('Ce compte ne peut pas acceder a Kalistar.').waitFor();assert.equal(await page.evaluate(url=>fetch(url).then(r=>r.status),origin+'/jeu/catalogue.json'),401);
      denied=false;await page.locator('input[name=password]').fill('only-a-fixture-password');await page.locator('#login-form [type=submit]').click();await ready(true);
      assert.equal(new URL(page.url()).hash,'#home','explicit login and intro preserve the requested destination');
      assert.equal(await page.evaluate(()=>KALISTAR_ACTIVE_USER),'user-paris');assert.equal(await page.locator('[data-registry-action=cloud]').count(),0);
      const cookies=await context.cookies();assert(cookies.some(c=>c.name==='__Host-kalistar'&&c.httpOnly&&c.secure));
      await page.evaluate(()=>localStorage.setItem('kalistar-auth-qa-marker','preserve'));await page.reload();await ready();assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar-auth-qa-marker')),'preserve');
      if(['desktop','razr'].includes(p.name)){
        await page.goto(origin+'/jeu/login.html?next='+encodeURIComponent('/jeu/#home'));await ready();
        assert.equal(new URL(page.url()).hash,'#home','resumed login keeps the destination without replaying the film');
      }
      await page.locator('[data-action=account]').click();await page.locator('#account-root[aria-busy=false]').waitFor();
      assert.equal(new URL(page.url()).hash,'#account/profile');
      assert.equal(await page.locator('#cloud-dialog').count(),0,'account is a page, not a dialog');
      await page.locator('#app:not(.page-arriving)').waitFor();
      assert.deepEqual(await page.evaluate(()=>{
        const app=document.querySelector('#app'),rect=app.getBoundingClientRect();
        const account=document.querySelector('.account-page').getBoundingClientRect();
        const header=document.querySelector('.masthead').getBoundingClientRect();
        const bottom=parseFloat(getComputedStyle(document.body).paddingBottom);
        return {
          width:Math.abs(account.width-app.clientWidth)<1&&Math.abs(account.left)<1,
          height:account.height>=app.clientHeight-1,
          belowHeader:Math.abs(rect.top-header.bottom)<1,
          aboveFooter:Math.abs(rect.bottom-(innerHeight-bottom))<1,
          noBodyScroll:document.documentElement.scrollHeight<=innerHeight+1
        };
      }),{width:true,height:true,belowHeader:true,aboveFooter:true,noBodyScroll:true},p.name+' account fills the shell without covering navigation');
      await page.locator('[data-cloud-form=profile] [name=displayName]').fill('Paris QA');
      await page.locator('[data-cloud-form=profile] [type=submit]').click();
      await page.getByText('Profil enregistré.',{exact:true}).waitFor();
      assert.equal(await page.locator('[data-cloud-form=profile] [name=displayName]').inputValue(),'Paris QA','cloud ownership refresh does not destroy the page');
      await page.locator('.account-sidebar a[href="#account/settings"]').click();
      await page.locator('[data-cloud-form=privacy]').waitFor();
      assert.equal(new URL(page.url()).hash,'#account/settings');
      await page.locator('[data-cloud-form=password] [type=submit]').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('[data-cloud-form=password] [type=submit]').evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'account controls stay above phone navigation');
      await page.goBack();await page.locator('[data-cloud-form=profile]').waitFor();
      await page.screenshot({path:path.join(output,p.name+'-account.png')});
      await page.locator('.account-sidebar a[href="#account/contact"]').click();
      await page.reload();await ready();await page.locator('#account-root[aria-busy=false]').waitFor();
      assert.equal(await page.locator('#account-section-title').innerText(),'Contact','a deep account route survives reload');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.locator('.account-sidebar a[href="#account/profile"]').click();
      try{await page.locator('[data-cloud-action=logout]').click({timeout:10000});}catch(e){console.error(await page.evaluate(()=>({sync:window.KALISTAR_SYNC?.snapshot(),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>({id:d.id,text:d.textContent.slice(0,700)}))})));throw e;}
      await page.waitForURL('**/jeu/login*');await page.locator('#login-form [type=submit]:enabled').waitFor();
      assert.equal(await page.evaluate(url=>fetch(url).then(r=>r.status),origin+'/jeu/catalogue.json'),401);assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar-auth-qa-marker')),'preserve');
      await page.locator('input[name=email]').fill('tokyo@example.invalid');await page.locator('input[name=password]').fill('only-a-fixture-password');await page.locator('#login-form [type=submit]').click();await ready(true);
      assert.equal(await page.evaluate(()=>KALISTAR_ACTIVE_USER),'user-tokyo','server profile wins over former local Paris selection');
      await page.locator('.nav-more').click();
      await page.locator('[data-view=journeys]').click();
      await page.getByRole('heading',{name:'Story',exact:true}).waitFor();
      assert.equal(await page.locator('.jv-cover').count(),3);
      await page.screenshot({path:path.join(output,p.name+'-fragment.png')});
      await page.locator('[data-jv-action=open]').first().click();
      await page.locator('.jv-panorama img').evaluate(img=>img.decode());
      await page.locator('[data-jv-action=start]').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('[data-jv-action=start]').evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'Fragment combat button is reachable in the real mobile shell');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Fragment has no horizontal page overflow');
      await page.screenshot({path:path.join(output,p.name+'-fragment-reader.png')});
      assert(!calls.some(c=>c.includes('/signup')||c.includes('/otp')),'no optional signup or email-code login');assert.deepEqual(errors,[],p.name+' no JavaScript errors');
      results.push({profile:p.name,passed:true,layout});await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,mode:'real edge module and official Auth SDK with isolated Supabase fixtures',profiles:results},null,2));
    console.log('PASS mandatory password access: '+results.map(r=>r.profile).join(', ')+'; denied login, allowlist, cookies, raw files, reload, logout, Paris/Tokyo mapping, saved data.');
  }finally{await browser.close();await database?.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
