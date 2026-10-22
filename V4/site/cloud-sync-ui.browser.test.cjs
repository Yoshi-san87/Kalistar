'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_sync_choices.cjs'));
const {chromium}=runtime('playwright');
const project=path.resolve(__dirname,'../..'),dist=process.env.KALISTAR_DIST&&path.resolve(process.env.KALISTAR_DIST);
const site=dist?path.join(dist,'jeu'):__dirname,output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(project,'work/qa/cloud-sync-choices'));
const origin='https://kalistar.invalid',shell=fs.readFileSync(path.join(site,'index.html'),'utf8');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const profiles=[{name:'desktop',width:1440,height:1000},{name:'razr',width:412,height:1007,mobile:true},
  {name:'phone',width:360,height:640,mobile:true},{name:'narrow',width:320,height:568,mobile:true,reduced:true},
  {name:'landscape',width:740,height:360,mobile:true}];

async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
  try{
    for(const profile of profiles){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,
        hasTouch:!!profile.mobile,timezoneId:'Europe/Paris',reducedMotion:profile.reduced?'reduce':'no-preference',serviceWorkers:'block'});
      const errors=[];
      // All requests stay local; no real account, browser profile or server save is accessed.
      await context.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin){errors.push('Unexpected network origin '+url.origin);return route.abort();}
        if(url.pathname==='/jeu/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="mount"></main></body></html>'});
        let root=url.pathname.startsWith('/jeu/')?site:(dist||project);
        const relative=decodeURIComponent(url.pathname.replace(root===site?/^\/jeu\//:/^\//,''));
        if(!dist&&relative.startsWith('assets/')&&!fs.existsSync(path.resolve(root,relative)))root=path.join(project,'V3/site');
        const file=path.resolve(root,relative);
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){errors.push('Missing asset '+url.pathname);return route.fulfill({status:404,body:'Missing QA asset'});}
        return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
      });
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/jeu/');
      await page.evaluate(async html=>{
        const parsed=new DOMParser().parseFromString(html,'text/html');
        await Promise.all([...parsed.querySelectorAll('link[rel=stylesheet]')].map(source=>new Promise((resolve,reject)=>{
          const link=document.createElement('link');link.rel='stylesheet';link.href=source.getAttribute('href');link.onload=resolve;link.onerror=reject;document.head.append(link);
        })));
      },shell);
      for(const name of ['assets/lucide.min.js','ui-system.js','cloud-sync-ui.js'])await page.addScriptTag({url:origin+'/jeu/'+name});
      await page.evaluate(()=>{
        const initial={status:'conflict',revision:2,localUpdatedAt:'2026-10-22T18:02:00Z',cloudUpdatedAt:'2026-10-22T04:22:00Z'};
        let state={...initial},subscriber,finish,fail;
        window.fixture={calls:[],toasts:[],unsubscribed:false,update:next=>{state={...state,...next};subscriber(state);},reset:()=>{state={...initial};subscriber(state);ui.open();},
          finish:()=>finish(),fail:()=>fail()};
        const sync={snapshot:()=>({...state}),subscribe:fn=>{subscriber=fn;return ()=>{fixture.unsubscribed=true;};},
          resolve:action=>{fixture.calls.push(action);return new Promise((resolve,reject)=>{
            finish=()=>{state={...state,status:'synced'};subscriber(state);resolve({...state});};fail=()=>reject(Error('Fixture failure'));
          });},retry:async()=>{fixture.calls.push('retry');return {...state};}};
        window.ui=KalistarCloudSyncUI.create({sync,mount:document.querySelector('#mount'),toast:message=>fixture.toasts.push(message)});
      });
      const dialog=page.locator('.cloud-sync-dialog'),choices=dialog.locator('.cloud-sync-save');
      await dialog.waitFor();await page.evaluate(()=>document.fonts.ready);
      assert.equal(await choices.count(),2);
      assert.deepEqual(await choices.evaluateAll(nodes=>nodes.map(n=>n.dataset.syncAction)),['local','cloud']);
      const local=dialog.getByRole('button',{name:'Conserver celle de cet appareil',exact:true}),cloud=dialog.getByRole('button',{name:'Utiliser celle du compte',exact:true});
      assert.match(await local.textContent(),/Cet appareil.*22\/10\/2026 20:02/s);
      assert.match(await cloud.textContent(),/Compte Kalistar.*22\/10\/2026 06:22/s);
      const geometry=await choices.evaluateAll(nodes=>nodes.map(node=>{
        const box=node.getBoundingClientRect();
        for(const child of node.querySelectorAll('span')){
          const r=child.getBoundingClientRect();
          if(r.left<box.left||r.right>box.right+.5||r.top<box.top||r.bottom>box.bottom+.5||child.scrollWidth>child.clientWidth+1)throw Error('Save choice content overflow');
        }
        return {x:box.x,y:box.y,width:box.width,height:box.height};
      }));
      assert(geometry.every(r=>r.width>=44&&r.height>=44));
      if(profile.width>480){
        assert.equal(geometry[0].y,geometry[1].y);assert(geometry[0].x+geometry[0].width<geometry[1].x);
        const actionTops=await dialog.locator('.cloud-sync-save-action').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));
        assert.equal(actionTops[0],actionTops[1],'Action separators stay aligned despite wrapped labels');
      }
      else {assert.equal(geometry[0].x,geometry[1].x);assert(geometry[0].y+geometry[0].height<geometry[1].y);}
      assert(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(output,profile.name+'.png')});

      // Native focus order follows the same source order. Closing never resolves a save.
      await dialog.getByRole('button',{name:'Fermer',exact:true}).focus();
      await page.keyboard.press('Tab');assert(await local.evaluate(n=>n===document.activeElement));
      await page.keyboard.press('Tab');assert(await cloud.evaluate(n=>n===document.activeElement));
      if(profile.name==='desktop'){
        await page.setViewportSize({width:360,height:640});
        assert(await cloud.evaluate(n=>n===document.activeElement),'Resize does not change the selected source');
        assert(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1));
        await page.setViewportSize({width:profile.width,height:profile.height});
      }
      await page.evaluate(()=>fixture.update({cloudUpdatedAt:'2026-10-22T04:23:00Z'}));
      assert(await cloud.evaluate(n=>n===document.activeElement),'Snapshot refresh preserves the focused choice');
      await page.keyboard.press('Escape');assert.equal(await dialog.evaluate(d=>d.open),false);
      assert.deepEqual(await page.evaluate(()=>fixture.calls),[]);
      await page.evaluate(()=>ui.open());await dialog.getByRole('button',{name:'Fermer',exact:true}).click();
      assert.deepEqual(await page.evaluate(()=>fixture.calls),[]);

      for(const action of ['local','cloud']){
        await page.evaluate(()=>fixture.reset());
        const choice=action==='local'?local:cloud;
        if(profile.mobile)await choice.tap();else {await choice.focus();await page.keyboard.press(action==='local'?'Enter':'Space');}
        assert.deepEqual(await choices.evaluateAll(nodes=>nodes.map(n=>n.disabled)),[true,true]);
        assert.equal(await dialog.locator('.cloud-sync-content').getAttribute('aria-busy'),'true');
        const count=await page.evaluate(()=>fixture.calls.length);
        await choice.dispatchEvent('click');assert.equal(await page.evaluate(()=>fixture.calls.length),count,'No duplicate resolution while pending');
        assert.equal(await page.evaluate(()=>fixture.calls.at(-1)),action);
        await page.evaluate(()=>fixture.finish());await dialog.waitFor({state:'hidden'});
      }
      await page.evaluate(()=>fixture.reset());await local.click();await page.evaluate(()=>fixture.fail());
      await page.waitForFunction(()=>!document.querySelector('[data-sync-action=local]').disabled);
      assert.equal(await dialog.evaluate(d=>d.open),true,'Failed resolution leaves choices available');
      await page.evaluate(()=>fixture.update({localUpdatedAt:null,cloudUpdatedAt:'invalid'}));
      assert.equal(await dialog.getByText('Pas encore enregistrée',{exact:true}).count(),2);
      await page.evaluate(()=>fixture.update({status:'busy',pending:true}));
      assert.equal(await choices.count(),0);await dialog.locator('[data-sync-action=takeover]').waitFor();
      await page.evaluate(()=>fixture.update({status:'offline'}));await dialog.locator('[data-sync-action=retry]').click();
      assert.equal(await page.evaluate(()=>fixture.calls.at(-1)),'retry');
      await page.evaluate(()=>ui.destroy());assert.equal(await dialog.count(),0);assert(await page.evaluate(()=>fixture.unsubscribed));
      assert.deepEqual(errors,[]);
      results.push({profile:profile.name,passed:true,geometry,checks:['source-action-association','responsive-order','keyboard-touch','explicit-local-cloud-resolution','pending-lock','cancel','error','cleanup']});
      console.log('PASS save choices '+profile.name);await context.close();
    }
  }finally{
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:results.length===profiles.length,profiles:results},null,2));
    await browser.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
