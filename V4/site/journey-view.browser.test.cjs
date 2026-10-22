'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = createRequire(path.join(runtime, '__journey_view_qa__.cjs'))('playwright');
const root = path.resolve(__dirname, '../..');
const dist = path.resolve(process.env.KALISTAR_DIST || path.join(__dirname, '../deploy/dist'));
const frozen = process.env.KALISTAR_BUILT_SITE === '1' || process.env.KALISTAR_DIST !== undefined;
const output = process.env.KALISTAR_VERIFICATION_DIR || path.join(root, 'work/qa/journeys-view');
const origin = 'https://kalistar-journey-view.invalid';
const sequelDiagnostics = [];
const currentModules = new Set(['journey-view.js', 'journey-view.css', 'journey-definitions.js']);
const shell = fs.readFileSync(path.join(frozen ? path.join(dist,'jeu') : __dirname,'index.html'),'utf8');
const shellStyles = shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g).join('\n');
const masthead = shell.match(/<header class="masthead">[\s\S]*?<\/header>/)[0];
const types = {'.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2'};
// The harness has no application boot, server commands, account or browser storage.
const fixture = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/jeu/"><title>Kalistar Journey View QA</title>
${shellStyles}
<script defer src="assets/lucide.min.js"></script><script defer src="ui-system.js"></script><script defer src="dialog-history.js"></script><script defer src="card-media.js"></script><script defer src="journey-definitions.js"></script><script defer src="journey-view.js"></script>
<script defer src="ultimate-definitions.js"></script><script defer src="weapons.js"></script><script defer src="weapon-art.js"></script><script defer src="base-weapons.js"></script><script defer src="ultimate-ui.js"></script><script defer src="weapon-cards.js"></script>
</head><body class="journeys-view">${masthead}<main id="app"><div id="journey-root"></div></main><script>
window.addEventListener('DOMContentLoaded',async()=>{
  const data=await fetch('catalogue.json').then(response=>response.json());
  const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};
  const state={status:'ready',isAdmin:false,books:KalistarJourneyDefinitions.catalogue(data).map(book=>({...book,bonusStages:[]})),progress:{}};
  window.harness={data,state,calls:[],behavior:{},notices:[],release:null};
  async function action(name,...args){
    harness.calls.push({name,args});
    const behavior=harness.behavior[name];
    if(behavior==='defer')await new Promise(resolve=>{harness.release=resolve;});
    if(behavior==='reject')throw Error('Erreur QA '+name);
    if(name==='acknowledge')harness.state.progress[args[0]].acknowledged=true;
    if(name==='claim'&&behavior==='reveal'){
      harness.state.progress[args[0]].claimed=true;harness.view.refresh();
      const book=harness.state.books.find(item=>item.id===args[0]);
      if(await harness.view.revealReward(data.cards.find(card=>card.id===book.rewardModelId)))await action('acknowledge',book.id);
    }
    if(name==='acknowledgeEquipment')harness.state.progress[args[0]].equipmentClaims.find(claim=>claim.stage===args[1]).acknowledged=true;
    if(name==='claimEquipment'&&behavior==='reveal'){
      const book=harness.state.books.find(item=>item.id===args[0]),stage=book.bonusStages[args[1]-4],p=harness.state.progress[book.id];
      const item=KalistarWeapons.weapons.find(item=>item.id===stage.rewardEquipmentId);
      p.equipmentClaims.push({stage:args[1],equipmentId:item.id,kind:stage.rewardKind,alreadyOwned:!!harness.alreadyOwned,acknowledged:false});
      p.finished=p.equipmentClaims.length===3;harness.view.refresh();
      harness.confirmed=await harness.view.revealEquipment(item,{alreadyOwned:!!harness.alreadyOwned});
      if(harness.confirmed){await action('acknowledgeEquipment',book.id,args[1]);harness.view.refresh();await harness.view.revealSequel(book,args[1]+1);}
    }
  }
  harness.view=KalistarJourneyView.create({data,
    image:async card=>KalistarCardMedia.image(card),art:async card=>KalistarCardMedia.image(card,'art'),
    getState:()=>freeze(structuredClone(harness.state)),
    onStart:id=>action('start',id),onResume:id=>action('resume',id),onClaim:id=>action('claim',id),
    onAcknowledge:id=>action('acknowledge',id),onPreview:(id,index)=>action('preview',id,index),
    onClaimEquipment:(id,stage)=>action('claimEquipment',id,stage),onAcknowledgeEquipment:(id,stage)=>action('acknowledgeEquipment',id,stage),
    onDetail:id=>action('detail',id),onRefresh:()=>action('refresh'),toast:message=>harness.notices.push(message)});
  harness.mount=()=>harness.view.mount(document.querySelector('#journey-root'));
  harness.progress=(index,value)=>{harness.state.progress[harness.state.books[index].id]={cleared:0,completed:false,claimed:false,acknowledged:false,finished:false,equipmentClaims:[],activeAttempt:null,...value};harness.view.refresh();};
  harness.mount();window.fixtureReady=true;
  lucide.createIcons();
});
</script></body></html>`;

async function routeFixture(context) {
  await context.route('**/*', async route => {
    if(new URL(route.request().url()).origin!==origin)return route.abort('blockedbyclient');
    const name = decodeURIComponent(new URL(route.request().url()).pathname);
    if (name === '/') return route.fulfill({contentType:'text/html', body:fixture});
    const relative = name.replace(/^\//, '');
    // Default: current UI over the existing build's real catalogue and assets.
    // Either explicit build selector checks frozen modules without source overrides.
    const current = !frozen && name.startsWith('/jeu/') && (currentModules.has(name.slice(5)) || name.startsWith('/jeu/assets/journeys/'));
    const directory = current ? __dirname : dist;
    const file = path.resolve(directory, current ? name.slice(5) : relative);
    if (!file.startsWith(directory+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({status:404, body:name});
    return route.fulfill({body:await fs.promises.readFile(file), contentType:types[path.extname(file)] || 'application/octet-stream'});
  });
}
const action = name => `[data-jv-action="${name}"]`;
async function imagesReady(page) {
  const selector = '.jv-cover-art img,.jv-cover-skin,.jv-panorama img,.jv-scene img,.jv-reward-prize img,.jv-sequel-leaf img';
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(image => image.complete && image.naturalWidth > 0 && (!image.hasAttribute('data-jv-media') || image.dataset.v4Cropped || image.src.startsWith('blob:'))), selector);
  await page.evaluate(async selector => {
    await Promise.all([...document.querySelectorAll(selector)].map(image => image.decode()));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, selector);
}
async function assertLayout(page, label) {
  const geometry = await page.evaluate(() => {
    const rect = node => node.getBoundingClientRect();
    const within = (a,b) => a.left >= b.left-1 && a.right <= b.right+1 && a.top >= b.top-1 && a.bottom <= b.bottom+1;
    const textFits = node => {
      const range = document.createRange(); range.selectNodeContents(node);
      return node.scrollWidth <= node.clientWidth+1 && within(range.getBoundingClientRect(),rect(node));
    };
    return {overflow:document.documentElement.scrollWidth-innerWidth,
      appBottom:rect(document.querySelector('#app')).bottom,
      navTop:rect(document.querySelector('.main-nav')).top,
      mobileNav:getComputedStyle(document.querySelector('.main-nav')).position==='fixed',
      regions:[...document.querySelectorAll('.jv-filters,.jv-route,.jv-stage-actions,.jv-stage-heading,.jv-library-heading,.jv-reward-ceremony,.jv-story-page,.jv-illustrated-page')].map(node => ({name:node.className,fits:node.scrollWidth <= node.clientWidth+1})),
      covers:[...document.querySelectorAll('.jv-cover-object')].map(node => {
        const inscription = rect(node.querySelector('.jv-cover-inscription')), art = rect(node.querySelector('.jv-cover-art')), title = rect(node.querySelector('.jv-cover-title'));
        return {inside:within(inscription,rect(node)) && within(title,inscription),separate:art.bottom+1 <= inscription.top,text:[...node.querySelectorAll('.jv-cover-title,.jv-cover-character')].every(textFits)};
      }),
      headings:[...document.querySelectorAll('.jv-stage-heading h3,.jv-illustrated-page h2,.jv-reward h2')].every(textFits),
      prizes:[...document.querySelectorAll('.jv-reward-display')].every(node=>{
        const display=rect(node),name=rect(node.parentElement.querySelector('.jv-reward-name'));
        const separate=name.top>=display.bottom-1 || name.left>=display.right-1;
        return separate && [...node.querySelectorAll('.jv-reward-prize img')].every(image=>within(rect(image),display));
      }),
      reader:[...document.querySelectorAll('.jv-spread')].every(node=>within(rect(node.querySelector('.jv-stage-footer')),rect(node))),
      panoramas:[...document.querySelectorAll('.jv-panorama')].map(node=>({inside:within(rect(node),rect(node.closest('.jv-spread,.jv-sequel-leaf'))),width:rect(node).width,height:rect(node).height})),
      stations:[...document.querySelectorAll('.jv-route button')].every(node => rect(node).width >= 44 && rect(node).height >= 44)};
  });
  assert.ok(geometry.overflow <= 1, label+': no document overflow '+JSON.stringify(geometry));
  assert.ok(!geometry.mobileNav || geometry.appBottom <= geometry.navTop+1,label+': content stays above bottom navigation '+JSON.stringify(geometry));
  assert.ok(geometry.regions.every(region => region.fits), label+': regions fit '+JSON.stringify(geometry));
  assert.ok(geometry.covers.every(cover => cover.inside && cover.separate && cover.text), label+': cover titles fit the leather plaque below the illustration '+JSON.stringify(geometry));
  assert.ok(geometry.headings && geometry.stations, label+': readable headings and touch-sized stations '+JSON.stringify(geometry));
  assert.ok(geometry.prizes,label+': reward art stays separate from its real name '+JSON.stringify(geometry));
  assert.ok(geometry.reader,label+': book never clips its combat commands '+JSON.stringify(geometry));
  assert.ok(geometry.panoramas.every(p=>p.inside&&p.width>200&&p.height>=200),label+': scene has a useful unclipped display area '+JSON.stringify(geometry));
}
async function cleanupProbe(page) {
  const result = await page.evaluate(async () => {
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;height:600px'; document.body.append(host);
    const Original = globalThis.ResizeObserver;
    let observers = 0;
    globalThis.ResizeObserver = class {
      constructor(callback) { this.inner = new Original(callback); observers++; this.active = true; }
      observe(node) { this.inner.observe(node); }
      disconnect() { this.inner.disconnect(); if (this.active) observers--; this.active = false; }
    };
    const state = {status:'ready',books:harness.state.books,progress:{},isAdmin:false}, delayed = [];
    let starts = 0, acknowledgements = 0;
    const probe = KalistarJourneyView.create({data:harness.data,getState:()=>state,
      image:() => new Promise(resolve=>delayed.push(resolve)),art:() => new Promise(resolve=>delayed.push(resolve)),
      onStart:async()=>{starts++;},onAcknowledge:async()=>{acknowledgements++;}});
    try {
      probe.mount(host); await Promise.resolve();
      const previous = [...host.querySelectorAll('img[data-jv-media]')];
      probe.destroy();
      delayed.splice(0).forEach(resolve=>resolve('/late-media-must-not-load.png'));
      await Promise.resolve(); await Promise.resolve();
      const lateMediaIgnored = previous.every(image=>!image.hasAttribute('src'));
      for (let count=0;count<4;count++) { probe.mount(host); probe.refresh(); probe.destroy(); }
      probe.mount(host); host.querySelector('[data-jv-action="open"]').click(); host.querySelector('[data-jv-action="start"]').click();
      await Promise.resolve(); await Promise.resolve();
      const book = state.books[0]; state.progress[book.id] = {cleared:4,completed:true,claimed:true,acknowledged:false};
      probe.refresh(); const rewardPromise = probe.revealReward(harness.data.cards.find(card=>card.id===book.rewardModelId));
      probe.destroy();
      const rewardCancelled = await rewardPromise === false;
      delayed.splice(0).forEach(resolve=>resolve('/late-media-must-not-load.png'));
      host.innerHTML = '<button data-jv-action="start">Detached command</button>'; host.firstChild.click();
      return {lateMediaIgnored,rewardCancelled,starts,acknowledgements,observers,dialogs:document.querySelectorAll('dialog[open]').length,views:host.querySelectorAll('.jv-view').length};
    } finally { probe.destroy(); host.remove(); globalThis.ResizeObserver = Original; }
  });
  assert.deepEqual(result,{lateMediaIgnored:true,rewardCancelled:true,starts:1,acknowledgements:0,observers:0,dialogs:0,views:0});
}
async function assertSequelScene(page,index) {
  await imagesReady(page);
  const expected=await page.evaluate(index=>{
    const book=harness.state.books[0],stage=book.bonusStages[index-4];
    return {key:book.id+':'+stage.id,scene:stage.id};
  },index);
  const scene=page.locator('.jv-sequel-leaf .jv-panorama');
  assert.equal(await scene.count(),1,'the sequel ceremony has its own chapter illustration');
  assert.equal(await scene.getAttribute('data-jv-scene'),expected.key);
  assert.match(new URL(await scene.locator('img').evaluate(img=>img.currentSrc)).pathname,new RegExp('/momo-'+expected.scene+'-v'+(expected.scene==='boite'?2:1)+'(?:-small)?\\.webp$'));
  const backgrounds=await page.locator('.jv-sequel-reveal,.jv-sequel-leaf').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundImage));
  sequelDiagnostics.push({stage:index,key:expected.key,backgrounds,noBookBackground:backgrounds.every(background=>!background.includes('collection-reader-grimoire'))});
  fs.writeFileSync(path.join(output,'sequel-scenes.json'),JSON.stringify(sequelDiagnostics,null,2));
}
async function bonusProbe(page,capture) {
  await page.evaluate(()=>{
    document.querySelector('[data-jv-action="library"]')?.click();
    harness.state.books=KalistarJourneyDefinitions.catalogue(harness.data);
    harness.state.isAdmin=false;harness.behavior={};harness.calls=[];harness.progress(0,{cleared:4,completed:true});
  });
  await page.locator(action('open')).first().click();
  for (const claimed of [false,true]) {
    await page.evaluate(claimed=>harness.progress(0,{cleared:4,completed:true,claimed}),claimed);
    assert.equal(await page.locator('.jv-bonus-route').count(),0,'no bonus locks or total before card ACK');
    const readerText=await page.locator('.jv-reader').textContent();
    assert.doesNotMatch(readerText,/\/ 7|\/7/);
    for(const title of await page.evaluate(()=>harness.state.books[0].bonusStages.map(stage=>stage.title)))assert(!readerText.includes(title),'hidden bonus title: '+title);
    assert.equal(await page.evaluate(()=>harness.view.revealSequel(harness.state.books[0],4)),false);
  }
  await page.evaluate(()=>{harness.state.isAdmin=true;harness.view.refresh();});
  assert.equal(await page.locator(action('stage')).count(),7);
  for (let index=0;index<7;index++) {
    await page.locator(action('stage')+'[data-jv-stage="'+index+'"]').click();
    assert.match(await page.locator(action('preview')).getAttribute('aria-label') || await page.locator(action('preview')).textContent(),/Aperçu sans récompense/);
    await page.locator(action('outro')).click();
    assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(index=>[...harness.state.books[0].stages,...harness.state.books[0].bonusStages][index].outro[0],index));
    await page.locator(action('preview')).click();
    assert.deepEqual(await page.evaluate(()=>harness.calls.at(-1)),{name:'preview',args:['momo-petits-bonheurs',index]});
  }
  assert.equal(await page.evaluate(()=>harness.state.progress[harness.state.books[0].id].cleared),4,'admin previews never win rewards');
  await page.evaluate(()=>{harness.state.isAdmin=false;harness.view.refresh();});
  assert.equal(await page.locator(action('stage')).count(),4);
  await page.evaluate(()=>harness.progress(0,{cleared:4,claimed:true,acknowledged:true}));
  assert.equal(await page.locator(action('stage')).count(),5);
  await page.evaluate(()=>{
    harness.state.progress[harness.state.books[0].id].equipmentClaims=[{stage:4,equipmentId:'little-joys-flute',acknowledged:true}];harness.view.refresh();
  });
  assert.equal(await page.locator(action('stage')).count(),5,'unwon claim cannot expose another chapter');
  await page.evaluate(()=>{harness.state.progress[harness.state.books[0].id].equipmentClaims=[];harness.view.refresh();});
  assert.equal(await page.locator('dialog').count(),0,'refresh/reload never starts a ceremony');
  await page.evaluate(()=>{harness.sequelResult='pending';void harness.view.revealSequel(harness.state.books[0],4).then(result=>harness.sequelResult=result);});
  await assertSequelScene(page,4);
  for (const viewport of [{width:1440,height:1000},{width:412,height:1007},{width:320,height:568},{width:844,height:390}]) {
    await page.setViewportSize(viewport); await assertLayout(page,'sequel '+viewport.width); await capture('sequel-'+viewport.width);
  }
  assert.equal(await page.evaluate(()=>harness.sequelResult),'pending');
  assert.equal(await page.locator('.jv-sequel-leaf').evaluate(node=>getComputedStyle(node).animationName),'none');
  await page.locator(action('acknowledge')).click();
  assert.equal(await page.evaluate(()=>harness.sequelResult),true);
  assert.equal(await page.locator(action('stage')+'[data-jv-stage="4"]').getAttribute('aria-current'),'step');
  assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(()=>harness.state.books[0].bonusStages[0].intro[0]));
  for (let index=4;index<=6;index++) {
    await page.locator(action('start')).click();
    assert.deepEqual(await page.evaluate(()=>harness.calls.at(-1)),{name:'start',args:['momo-petits-bonheurs']});
    await page.evaluate(index=>{const p=harness.state.progress[harness.state.books[0].id];p.activeAttempt={id:'qa-bonus',stage:index};harness.view.refresh();},index);
    await page.locator(action('resume')).click();
    assert.equal(await page.evaluate(()=>harness.calls.at(-1).name),'resume');
    await page.evaluate(index=>{const p=harness.state.progress[harness.state.books[0].id];p.activeAttempt=null;p.cleared=index+1;harness.view.refresh();},index);
    assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(index=>harness.state.books[0].bonusStages[index-4].outro[0],index));
    for (const viewport of [{width:1440,height:1000},{width:1024,height:768},{width:800,height:600},{width:412,height:1007},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport);await assertLayout(page,'bonus reader '+index+' '+viewport.width);await capture('bonus-reader-'+index+'-'+viewport.width);
    }
    await page.locator(action('intro')).click();
    assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(index=>harness.state.books[0].bonusStages[index-4].intro[0],index));
    await page.locator(action('outro')).click();
    assert.equal(await page.locator('.jv-scene').getAttribute('data-jv-model'),await page.evaluate(index=>harness.state.books[0].bonusStages[index-4].imageModelId || harness.state.books[0].rewardModelId,index));
    if (index===4) {
      await page.evaluate(()=>{harness.behavior.claimEquipment='reject';});await page.locator(action('claim-equipment')).click();
      assert.match(await page.locator('.jv-error').textContent(),/Erreur QA claimEquipment/);
      await page.evaluate(()=>{harness.behavior.claimEquipment='defer';harness.calls=[];});
      await page.locator(action('claim-equipment')).evaluate(node=>{node.click();node.click();});
      assert.equal(await page.evaluate(()=>harness.calls.filter(call=>call.name==='claimEquipment').length),1);
      await page.evaluate(()=>harness.release());await page.locator(action('claim-equipment')+':enabled').waitFor();
    }
    await page.evaluate(index=>{harness.behavior.claimEquipment='reveal';harness.alreadyOwned=index===5;harness.confirmed='pending';harness.calls=[];},index);
    await page.locator(action('claim-equipment')).click();await page.locator('.jv-equipment-reveal[open]').waitFor();
    assert.equal(await page.evaluate(()=>harness.confirmed),'pending');
    assert.equal(await page.locator(action('stage')).count(),index+1,'next chapter absent until equipment ACK');
    assert.equal(await page.locator('.jv-reward-name strong').textContent(),await page.evaluate(index=>KalistarWeapons.weapons.find(item=>item.id===harness.state.books[0].bonusStages[index-4].rewardEquipmentId).name,index));
    assert.equal(await page.locator('.jv-equipment-art img').count(),1,'real catalogue illustration');
    if(index===5)assert.match(await page.locator('.jv-reward-note').textContent(),/Aucun deuxième exemplaire/);
    for (const viewport of [{width:1440,height:1000},{width:412,height:1007},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport);await assertLayout(page,'equipment '+index+' '+viewport.width);await capture('equipment-'+index+'-'+viewport.width);
      const bounds=await page.locator(action('acknowledge')).evaluate(node=>({button:node.getBoundingClientRect().toJSON(),dialog:node.closest('dialog').getBoundingClientRect().toJSON()}));
      assert.ok(bounds.button.bottom<=bounds.dialog.bottom+1,'equipment confirmation fully visible');
    }
    assert.equal(await page.evaluate(()=>harness.calls.filter(call=>call.name==='acknowledgeEquipment').length),0);
    await page.locator(action('acknowledge')).click();
    if(index<6){
      await page.locator('.jv-sequel-reveal[open]').waitFor();
      assert.equal(await page.locator(action('stage')).count(),index+2);
      assert.equal(await page.locator('.jv-reward h2').textContent(),await page.evaluate(index=>{const stage=harness.state.books[0].bonusStages[index-3];return stage.reveal?.title || stage.title;},index));
      await assertSequelScene(page,index+1);
      for(const viewport of [{width:1440,height:1000},{width:412,height:1007}]){
        await page.setViewportSize(viewport);await assertLayout(page,'sequel '+(index+1)+' '+viewport.width);await capture('sequel-'+(index+1)+'-'+viewport.width);
      }
      await page.locator(action('acknowledge')).click();
    }
    await page.waitForFunction(()=>document.querySelector('.jv-view').getAttribute('aria-busy')==='false');
    assert.equal(await page.evaluate(()=>harness.confirmed),true);
    assert.deepEqual(await page.evaluate(()=>harness.calls.filter(call=>call.name==='acknowledgeEquipment')),[{name:'acknowledgeEquipment',args:['momo-petits-bonheurs',index]}]);
    assert.equal(await page.locator(action('claim')).count(),0,'card claim never returns');
  }
  assert.equal(await page.locator(action('start')).count(),0);
  assert.match(await page.locator('.jv-earned').textContent(),/Récit achevé/);
  await page.locator(action('reward-page')).click();assert.equal(await page.locator('.jv-reward-page').count(),1,'card page distinct from stage 4');
  for(let index=0;index<7;index++){
    await page.locator(action('stage')+'[data-jv-stage="'+index+'"]').click();
    await page.locator(action('intro')).click();await page.locator(action('outro')).click();
  }
  await page.evaluate(()=>{harness.view.destroy();harness.mount();harness.view.refresh();});
  assert.equal(await page.locator('dialog').count(),0,'all chapters reread without replay after remount');

  // Fresh, fictitious progress exercises ACK retry, motion, native close and cancellation.
  await page.evaluate(()=>harness.progress(0,{cleared:5,claimed:true,acknowledged:true,equipmentClaims:[{stage:4,equipmentId:'little-joys-flute',kind:'weapon',alreadyOwned:true,acknowledged:false}]}));
  await page.setViewportSize({width:412,height:1007});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{harness.behavior.acknowledgeEquipment='reject';harness.calls=[];document.querySelector('[data-jv-action="reveal-equipment"]').click();});
  assert.equal(await page.locator(action('acknowledge')).isDisabled(),true,'animation cannot be acknowledged early');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.jv-equipment-reveal[open]').count(),1);
  await page.locator(action('acknowledge')+':enabled').waitFor();
  assert.equal(await page.evaluate(()=>harness.calls.length),0,'animation completion is not an ACK');
  await page.locator(action('acknowledge')).click();assert.match(await page.locator('.jv-error').textContent(),/Erreur QA acknowledgeEquipment/);
  assert.equal(await page.locator(action('stage')).count(),5);
  await page.evaluate(()=>{harness.behavior.acknowledgeEquipment='noop';});await page.locator(action('reveal-equipment')).click();
  await page.locator(action('acknowledge')+':enabled').waitFor();await page.keyboard.press('Escape');
  await page.locator('.jv-sequel-reveal[open]').waitFor();await page.locator(action('acknowledge')+':enabled').waitFor();
  await page.waitForFunction(()=>document.querySelector('dialog').getAnimations({subtree:true}).every(animation=>animation.playState==='finished'));
  assert.equal(await page.locator('dialog[open]').count(),1,'finite animation waits for explicit confirmation');
  await capture('sequel-motion-finished');await page.locator(action('acknowledge')).click();
  await page.waitForFunction(()=>document.querySelector('.jv-view').getAttribute('aria-busy')==='false');
  await page.emulateMedia({reducedMotion:'reduce'});
  const cancelled=await page.evaluate(async()=>{
    const book=harness.state.books[0],item=KalistarWeapons.weapons.find(item=>item.id==='little-joys-flute');
    harness.progress(0,{cleared:5,claimed:true,acknowledged:true,equipmentClaims:[{stage:4,equipmentId:item.id,kind:'weapon',acknowledged:false}]});
    harness.calls=[];
    const equipment=harness.view.revealEquipment(item);harness.view.destroy();const equipmentResult=await equipment;
    harness.mount();harness.progress(0,{cleared:4,claimed:true,acknowledged:true});
    const sequel=harness.view.revealSequel(book,4);harness.view.destroy();const sequelResult=await sequel;
    harness.mount();harness.progress(0,{cleared:5,claimed:true,acknowledged:true,equipmentClaims:[{stage:4,equipmentId:item.id,kind:'weapon',acknowledged:false}]});
    const duplicate=harness.view.revealEquipment(item),same=harness.view.revealEquipment(item);
    const samePromise=duplicate===same;harness.view.destroy();await duplicate;harness.mount();
    return {equipmentResult,sequelResult,samePromise,acknowledgements:harness.calls.filter(call=>call.name.includes('acknowledge')).length,dialogs:document.querySelectorAll('dialog').length};
  });
  assert.deepEqual(cancelled,{equipmentResult:false,sequelResult:false,samePromise:true,acknowledgements:0,dialogs:0});
  await page.evaluate(()=>{
    harness.closedResult='pending';harness.calls=[];
    void harness.view.revealEquipment(KalistarWeapons.weapons.find(item=>item.id==='little-joys-flute')).then(result=>harness.closedResult=result);
  });
  await page.locator(action('acknowledge')+':enabled').waitFor();
  await page.evaluate(()=>document.querySelector('.jv-reward').close());
  await page.waitForFunction(()=>harness.closedResult===true);
  assert.equal(await page.evaluate(()=>harness.calls.length),0,'public native close confirms but leaves server ACK to parent');
  assert.equal(await page.locator(action('stage')).count(),5,'no next chapter before parent ACK');
  await page.evaluate(()=>{
    harness.behavior.acknowledgeEquipment='defer';harness.calls=[];
    document.querySelector('[data-jv-action="reveal-equipment"]').click();
  });
  await page.locator(action('acknowledge')).click();
  await page.waitForFunction(()=>harness.calls.some(call=>call.name==='acknowledgeEquipment'));
  await page.evaluate(()=>{harness.view.destroy();harness.release();harness.mount();});
  await page.evaluate(()=>Promise.resolve());
  assert.equal(await page.locator('dialog').count(),0,'late ACK cannot open a sequel in a remounted view');
}
async function adventureProbe(browser) {
  const report={scenes:[],violations:[],requests:[],errors:[]};
  for(const viewport of [{width:1440,height:1000},{width:412,height:1007}]){
    const context=await browser.newContext({viewport,isMobile:viewport.width===412,hasTouch:viewport.width===412,reducedMotion:'reduce'});
    await routeFixture(context);
    await context.addInitScript(()=>{
      window.qaFrameCalls=0;window.qaIntervals=0;
      const raf=window.requestAnimationFrame.bind(window),interval=window.setInterval.bind(window);
      window.requestAnimationFrame=callback=>{window.qaFrameCalls++;return raf(callback);};
      window.setInterval=(...args)=>{window.qaIntervals++;return interval(...args);};
    });
    const page=await context.newPage(),requested=[];
    page.on('pageerror',error=>report.errors.push({viewport,message:error.message}));
    page.on('response',response=>{if(response.status()>=400)report.errors.push({viewport,url:response.url(),status:response.status()});});
    page.on('request',request=>{
      const match=new URL(request.url()).pathname.match(/\/momo-([a-z]+)-v[12](?:-small)?\.webp$/);
      if(match)requested.push(match[1]);
    });
    try{
      await page.goto(origin);await page.waitForFunction(()=>window.fixtureReady);await imagesReady(page);
      assert.deepEqual(requested,[],'the shelf does not download unseen narrative backgrounds');
      await page.evaluate(()=>{harness.state.books=KalistarJourneyDefinitions.catalogue(harness.data);harness.state.isAdmin=false;harness.progress(0,{});});
      const book=await page.evaluate(()=>harness.state.books[0]),stages=[...book.stages,...book.bonusStages];
      assert.equal(book.rewardModelId,'30000014');assert.equal(stages.length,7);assert.equal(new Set(stages.map(s=>s.id)).size,7);
      assert.equal(await page.locator('.jv-cover-art img').first().getAttribute('data-jv-cover-model'),'30000014');
      const noFuture=limit=>{
        for(const id of requested)assert(stages.slice(0,limit+1).some(s=>s.id===id),'hidden scene downloaded before unlock: '+id+' at '+limit);
      };
      await page.locator(action('open')).first().click();await imagesReady(page);noFuture(0);
      const urls=[];
      for(let index=0;index<7;index++){
        if(index>0&&index<4)await page.evaluate(index=>harness.progress(0,{cleared:index}),index);
        if(index>=4){
          // Simulate only authoritative progress/ACK state, never issue a real card.
          await page.evaluate(index=>{
            const book=harness.state.books[0];
            harness.progress(0,{cleared:index,completed:true,claimed:true,acknowledged:index>4,
              equipmentClaims:book.bonusStages.slice(0,index-4).map((s,i)=>({stage:4+i,equipmentId:s.rewardEquipmentId,kind:s.rewardKind,alreadyOwned:false,acknowledged:i<index-5}))});
          },index);
          await imagesReady(page);noFuture(index-1);
          assert.equal(await page.locator(action('stage')+'[data-jv-stage="'+index+'"]').count(),0,'next chapter absent before reward ACK');
          const nextTitles=stages.slice(index).map(s=>s.title),text=await page.locator('.jv-reader').textContent();
          for(const title of nextTitles)assert(!text.includes(title),'hidden chapter name leaked: '+title);
          await page.evaluate(index=>{
            const p=harness.state.progress[harness.state.books[0].id];p.acknowledged=true;
            for(const claim of p.equipmentClaims)claim.acknowledged=true;harness.view.refresh();
          },index);
          await imagesReady(page);noFuture(index);
          assert.equal(await page.locator(action('stage')).count(),index+1,'only the next earned chapter appears');
        }
        await page.locator(action('stage')+'[data-jv-stage="'+index+'"]').click();await imagesReady(page);noFuture(index);
        assert.equal(await page.locator('.jv-panorama').count(),1,'one narrative background, not a preloaded strip');
        assert.equal(await page.locator('.jv-panorama').getAttribute('data-jv-scene'),book.id+':'+stages[index].id);
        const url=await page.locator('.jv-panorama img').evaluate(img=>img.currentSrc);urls.push(url);
        assert.match(new URL(url).pathname,new RegExp('/momo-'+stages[index].id+'-v'+(stages[index].id==='boite'?2:1)+'(?:-small)?\\.webp$'));
        assert.equal(await page.locator('.jv-stage-heading h3').textContent(),stages[index].title);
        assert.deepEqual(await page.locator('.jv-reading>p').allTextContents(),stages[index].intro);
        assert.equal(await page.locator('.jv-panorama img').evaluate(img=>getComputedStyle(img).animationName),'none');
        const beforeScroll=await page.locator('.jv-reader').evaluate(node=>node.scrollTop);
        await page.locator('.jv-reader').evaluate(node=>{node.scrollTop=0;});
        const label='momo-'+stages[index].id+'-'+viewport.width;
        await page.screenshot({path:path.join(output,label+'.png')});
        await page.locator('.jv-panorama').screenshot({path:path.join(output,label+'-scene.png')});
        try{await assertLayout(page,label);}catch(error){report.violations.push({label,message:error.message});}
        const geometry=await page.evaluate(()=>{
          const r=selector=>document.querySelector(selector).getBoundingClientRect().toJSON(),img=document.querySelector('.jv-panorama img'),reading=document.querySelector('.jv-reading');
          return {panorama:r('.jv-panorama'),spread:r('.jv-spread'),reading:r('.jv-reading'),footer:r('.jv-stage-footer'),
            image:{width:img.naturalWidth,height:img.naturalHeight,fit:getComputedStyle(img).objectFit,position:getComputedStyle(img).objectPosition},
            fontSize:getComputedStyle(reading).fontSize,lineHeight:getComputedStyle(reading).lineHeight};
        });
        const start=page.locator(action('start'));await start.scrollIntoViewIfNeeded();
        const hittable=await start.evaluate(node=>{const r=node.getBoundingClientRect();return r.width>=44&&r.height>=44&&node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
        assert(hittable,label+': combat control stays reachable and touch-sized');
        if(viewport.width===412)await page.screenshot({path:path.join(output,label+'-commands.png')});
        await page.evaluate(()=>{
          for(const selector of ['.jv-reading','.jv-reader']){
            const node=document.querySelector(selector);node.scrollTo({top:node.scrollHeight,behavior:'instant'});
          }
        });
        const ending=await page.evaluate(()=>{
          const paragraphs=document.querySelectorAll('.jv-reading>p'),last=paragraphs[paragraphs.length-1];
          const range=document.createRange();range.selectNodeContents(last);
          const lines=[...range.getClientRects()],line=lines[lines.length-1],footer=document.querySelector('.jv-stage-footer').getBoundingClientRect();
          const x=line.x+Math.min(line.width/2,20),y=line.y+line.height/2;
          return {lastLine:line.toJSON(),footer:footer.toJSON(),visible:last.contains(document.elementFromPoint(x,y))&&line.bottom<=footer.top+1};
        });
        if(viewport.width===412)await page.screenshot({path:path.join(output,label+'-reading-end.png')});
        report.scenes.push({viewport,stage:index,id:stages[index].id,url,beforeScroll,hittable,ending,...geometry});
        if(!ending.visible)report.violations.push({label,message:'The final narrative line remains behind the combat commands at maximum scroll',ending});
      }
      assert.equal(new Set(urls).size,7,'seven actual definition scenes, no copied QA bonus');
      const raf=await page.evaluate(()=>window.qaFrameCalls);await page.waitForTimeout(250);
      assert.equal(await page.evaluate(()=>window.qaFrameCalls),raf,'idle reader must not schedule a rendering loop');
      assert.equal(await page.evaluate(()=>window.qaIntervals),0,'no repeating JavaScript timer in the Fragment view');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.locator(action('stage')+'[data-jv-stage="0"]').click();await imagesReady(page);
      const animations=await page.locator('.jv-view').evaluate(node=>node.getAnimations({subtree:true}).map(a=>({name:a.animationName,iterations:a.effect.getTiming().iterations,duration:a.effect.getTiming().duration})));
      assert(animations.some(a=>a.name==='jv-scene-arrive'),'scene change has a real entrance animation');
      assert(animations.every(a=>Number.isFinite(a.iterations)&&Number.isFinite(a.duration)),'all reader animations are finite');
      await page.locator('.jv-view').evaluate(async node=>{await Promise.all(node.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.jv-view').evaluate(node=>node.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,'reader becomes static after its entrance');
      await page.emulateMedia({reducedMotion:'reduce'});await page.locator(action('stage')+'[data-jv-stage="1"]').click();await imagesReady(page);
      assert.equal(await page.locator('.jv-view').evaluate(node=>node.getAnimations({subtree:true}).length),0,'reduced motion disables all Fragment transitions');
      report.requests.push({viewport,scenes:[...new Set(requested)],animations});
    }finally{await context.close();fs.writeFileSync(path.join(output,'adventure-scenes.json'),JSON.stringify(report,null,2));}
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.violations,[]);
  return report;
}
async function balmhyrProbe(browser) {
  for (const viewport of [{width:1440,height:1000},{width:412,height:1007}]) {
    const context=await browser.newContext({viewport,isMobile:viewport.width===412,hasTouch:viewport.width===412,reducedMotion:'reduce'});
    try {
      await routeFixture(context);
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('response',response=>{if(response.status()>=400)errors.push(response.url());});
      await page.goto(origin);await page.waitForFunction(()=>window.fixtureReady);await imagesReady(page);
      const cover=page.locator('.jv-cover-art img[data-jv-cover-model="30000007"]');
      assert.equal(await cover.count(),1);
      assert.match(await cover.getAttribute('src'),/30000007-art-v1\.webp/);
      await page.evaluate(()=>{harness.state.books=KalistarJourneyDefinitions.catalogue(harness.data);harness.state.isAdmin=true;harness.view.refresh();});
      await page.locator(action('open')).nth(1).click();await imagesReady(page);
      const book=await page.evaluate(()=>harness.state.books[1]),stages=[...book.stages,...book.bonusStages];
      assert.equal(book.rewardModelId,'30000007');
      assert.deepEqual(book.bonusStages.map(stage=>stage.rewardEquipmentId),['fallen-king-axe','durane-rampart','mythic-iron-gauntlet']);
      for (const [index,stage] of stages.entries()) {
        await page.locator(action('stage')+'[data-jv-stage="'+index+'"]').click();await imagesReady(page);
        for (const mode of ['intro','outro']) {
          await page.locator(action(mode)).click();
          assert.deepEqual(await page.locator('.jv-reading>p:not(.jv-admin-note)').allTextContents(),stage[mode]);
          await assertLayout(page,'balmhyr '+index+' '+mode+' '+viewport.width);
        }
        await page.locator(action('intro')).click();
        await page.screenshot({path:path.join(output,'balmhyr-'+stage.id+'-'+viewport.width+'.png')});
      }
      await page.evaluate(()=>{
        harness.state.isAdmin=false;
        harness.progress(1,{cleared:7,completed:true,claimed:true,acknowledged:true,
          equipmentClaims:harness.state.books[1].bonusStages.map((stage,index)=>({stage:4+index,equipmentId:stage.rewardEquipmentId,kind:stage.rewardKind,acknowledged:index<2}))});
        void harness.view.revealEquipment(KalistarWeapons.weapons.find(item=>item.id==='mythic-iron-gauntlet'));
      });
      await page.locator('.jv-equipment-reveal[open]').waitFor();await imagesReady(page);
      assert.equal(await page.locator('.jv-reward-name strong').textContent(),'Gant de Fer');
      await assertLayout(page,'balmhyr relic '+viewport.width);
      await page.screenshot({path:path.join(output,'balmhyr-gant-'+viewport.width+'.png')});
      await page.locator(action('acknowledge')+':enabled').click();
      assert.deepEqual(errors,[]);
    } finally {await context.close();}
  }
}

async function main() {
  assert.ok(fs.existsSync(path.join(dist,'jeu/catalogue.json')), 'An existing V4/deploy/dist build is required; this test never builds or changes it.');
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({channel:'chrome',headless:true});
  let adventure;
  try{adventure=await adventureProbe(browser);}catch(error){await browser.close();throw error;}
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await routeFixture(context);
  const page = await context.newPage(), errors = [], failures = [];
  page.setDefaultTimeout(30000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status() >= 400) failures.push(response.url()+':'+response.status());});
  const capture = async name => { await imagesReady(page); await page.screenshot({path:path.join(output,name+'.png')}); };
  const open = async (index=0) => page.locator(action('open')).nth(index).click();
  try {
    await page.goto(origin); await page.waitForFunction(()=>window.fixtureReady);
    assert.equal(await page.locator('.jv-cover').count(),3);
    assert.equal(await page.locator('.jv-library-heading h1').textContent(),'Fragment');
    assert.equal(await page.locator('.jv-cover-card').count(),0,'no miniature card pasted over a generic book');
    assert.equal(await page.locator('.jv-cover-art img').count(),3,'all three reward paintings are present');
    assert.deepEqual(await page.locator('.jv-cover-art img').evaluateAll(nodes=>nodes.map(img=>img.dataset.jvCoverModel)),await page.evaluate(()=>harness.state.books.map(book=>book.rewardModelId)),'cover art follows the exact rewarded version');
    await page.evaluate(()=>{harness.state.books[0].rewardModelId='40243854';harness.view.refresh();});
    assert.equal(await page.locator('.jv-cover-art img').first().getAttribute('data-jv-media'),'40243854','a future version uses its own card artwork, never the registered painting of another Momo');
    await imagesReady(page);
    await page.evaluate(()=>{harness.state.books[0].rewardModelId=KalistarJourneyDefinitions.catalogue(harness.data)[0].rewardModelId;harness.view.refresh();});
    assert.equal(await page.locator('.jv-cover-art img').first().getAttribute('data-jv-cover-model'),'30000014','standing flute Momo is the new reward cover');
    assert.deepEqual(await page.evaluate(()=>harness.state.books.map(book=>book.stages.length)),[4,4,4]);
    for (const viewport of [{width:1440,height:1000},{width:412,height:1007},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport);
      await page.locator('.jv-shelf').evaluate(node=>{node.scrollLeft=0;node.dispatchEvent(new Event('scroll'));});
      await capture('library-'+viewport.width); await assertLayout(page,'library '+viewport.width);
      if (viewport.width <= 760) {
        assert.equal(await page.locator('.jv-filters').isVisible(),false);
        await page.locator(action('toggle-filters')).click();
        assert.equal(await page.locator(action('toggle-filters')).getAttribute('aria-expanded'),'true');
        await assertLayout(page,'filters '+viewport.width); await capture('filters-'+viewport.width);
        await page.locator('[data-jv-filter="search"]').fill('momo');assert.equal(await page.locator('.jv-cover').count(),1);
        await page.locator(action('reset-filters')).first().click();
        await page.locator(action('toggle-filters')).click();
        await page.locator(action('shelf-right')).click(); await page.waitForFunction(()=>document.querySelector('.jv-shelf').scrollLeft>0);
        await page.locator(action('shelf-left')).click();
      }
      await page.locator('.jv-shelf').focus(); await page.keyboard.press('Home');
      assert.equal(await page.locator('.jv-cover').first().evaluate(node=>node===document.activeElement),true);
      await page.keyboard.press('End'); assert.equal(await page.locator('.jv-cover').last().evaluate(node=>node===document.activeElement),true);
      await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('.jv-cover').nth(1).evaluate(node=>node===document.activeElement),true);
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-jv-filter="search"]').fill('elan'); assert.equal(await page.locator('.jv-cover').count(),1,'accent-insensitive reward-title search');
    await page.locator('[data-jv-filter="search"]').fill('introuvable'); assert.equal(await page.locator('.jv-cover').count(),0);
    await page.locator(action('reset-filters')).last().click();
    await page.locator('[data-jv-filter="character"]').selectOption('balmhyr'); assert.equal(await page.locator('.jv-cover').count(),1);
    await page.locator('[data-jv-filter="element"]').selectOption('RAINBOW'); assert.equal(await page.locator('.jv-cover').count(),0);
    await page.locator(action('reset-filters')).first().click();
    await page.evaluate(()=>harness.progress(0,{cleared:1}));
    await page.locator('[data-jv-filter="status"]').selectOption('started'); assert.equal(await page.locator('.jv-cover').count(),1);
    await page.locator(action('reset-filters')).first().click(); await page.evaluate(()=>harness.progress(0,{}));
    for (const index of [1,2]) {
      await open(index); await assertLayout(page,'book '+index);
      assert.deepEqual(await page.locator('[data-jv-action="stage"] .jv-station-label').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent)),['1/4','2/4','3/4','4/4']);
      await capture('book-'+index); await page.locator(action('library')).click();
    }
    await page.locator('.jv-cover').first().focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.jv-book-opening').evaluate(node=>getComputedStyle(node).animationName),'none');
    assert.equal(await page.locator('[data-jv-action="stage"]:disabled').count(),3);
    assert.deepEqual(await page.locator('[data-jv-action="stage"] .jv-station-label').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent)),['1/4','2/4','3/4','4/4']);
    assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(()=>harness.state.books[0].stages[0].intro[0]));
    await assertLayout(page,'reader desktop'); await capture('reader-1440');
    await page.locator(action('start')).click(); assert.equal(await page.evaluate(()=>harness.state.progress[harness.state.books[0].id].cleared),0,'callback success alone never advances progress');
    await page.evaluate(()=>{harness.behavior.start='reject';}); await page.locator(action('start')).click(); assert.match(await page.locator('.jv-error').textContent(),/Erreur QA start/);
    await page.evaluate(()=>{harness.behavior.start='defer';harness.calls=[];});
    await page.locator(action('start')).evaluate(node=>{node.click();node.click();node.click();});
    assert.equal(await page.evaluate(()=>harness.calls.filter(call=>call.name==='start').length),1);
    assert.equal(await page.locator(action('start')).isDisabled(),true);
    await page.evaluate(()=>{harness.release();harness.behavior.start='noop';}); await page.locator(action('start')+':enabled').waitFor();
    await page.evaluate(()=>harness.progress(0,{cleared:1}));
    assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(()=>harness.state.books[0].stages[0].outro[0]),'victory reveals approved outro');
    await page.locator(action('intro')).click(); assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(()=>harness.state.books[0].stages[0].intro[0]));
    await page.locator(action('current')).click();
    await page.evaluate(()=>harness.progress(0,{cleared:1,activeAttempt:{id:'attempt-qa',stage:1,phase:'combat'}}));
    assert.equal(await page.locator(action('start')).count(),0); await page.locator(action('resume')).click(); assert.equal(await page.evaluate(()=>harness.calls.at(-1).name),'resume');
    for (const viewport of [{width:1024,height:768},{width:800,height:600},{width:412,height:1007},{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport); await assertLayout(page,'reader '+viewport.width); await capture('reader-'+viewport.width);
      await page.locator(action('resume')).scrollIntoViewIfNeeded(); assert.equal(await page.locator(action('resume')).isVisible(),true);
      assert.equal(await page.locator(action('resume')).evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'combat command is not covered by the bottom navigation');
    }
    await page.evaluate(()=>{harness.state.isAdmin=true;harness.view.refresh();});
    await page.locator('[data-jv-action="stage"][data-jv-stage="3"]').click(); await page.locator(action('preview')).click();
    assert.deepEqual(await page.evaluate(()=>harness.calls.at(-1)),{name:'preview',args:['momo-petits-bonheurs',3]});
    assert.equal(await page.evaluate(()=>harness.state.progress[harness.state.books[0].id].cleared),1);
    await page.evaluate(()=>{harness.state.isAdmin=false;harness.view.refresh();}); assert.equal(await page.locator(action('preview')).count(),0);
    await page.setViewportSize({width:1440,height:1000}); await page.evaluate(()=>harness.progress(0,{cleared:4,completed:true})); await capture('completed-unclaimed');
    await page.evaluate(()=>{harness.behavior.claim='reject';}); await page.locator(action('claim')).click(); assert.match(await page.locator('.jv-error').textContent(),/Erreur QA claim/);
    await page.evaluate(()=>{harness.behavior.claim='reveal';harness.behavior.acknowledge='reject';harness.calls=[];});
    await page.locator(action('claim')).click(); await page.locator('.jv-reward[open]').waitFor();
    await page.locator('.jv-reward-prize').click(); assert.equal(await page.evaluate(()=>harness.calls.at(-1).name),'detail','detail stays usable while parent awaits ceremony');
    for (const viewport of [{width:1440,height:1000},{width:412,height:1007},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport); await assertLayout(page,'reward '+viewport.width); await capture('reward-'+viewport.width);
      const bounds = await page.locator(action('acknowledge')).evaluate(node=>({button:node.getBoundingClientRect().toJSON(),dialog:node.closest('dialog').getBoundingClientRect().toJSON()}));
      assert.ok(bounds.button.bottom<=bounds.dialog.bottom+1,'ceremony command fully visible '+viewport.width);
    }
    await page.locator(action('acknowledge')).click(); assert.match(await page.locator('.jv-error').textContent(),/Erreur QA acknowledge/);
    await page.evaluate(()=>{harness.behavior.acknowledge='noop';}); await page.locator(action('reveal')).click();
    await page.locator(action('acknowledge')+':enabled').waitFor(); await page.keyboard.press('Escape'); await page.locator('.jv-reward').waitFor({state:'detached'});
    await page.waitForFunction(()=>document.querySelector('.jv-view').getAttribute('aria-busy')==='false');
    assert.equal(await page.evaluate(()=>harness.state.progress[harness.state.books[0].id].acknowledged),true);
    assert.equal(await page.evaluate(()=>harness.calls.filter(call=>call.name==='claim').length),1); assert.equal(await page.locator(action('claim')).count(),0);
    await page.locator(action('reward-page')).click(); await capture('completed-reward-page');
    await page.locator(action('library')).click(); await open(); assert.equal(await page.locator(action('claim')).count(),0,'finished books remain readable without another claim');
    await page.locator('[data-jv-action="stage"][data-jv-stage="0"]').click(); assert.equal(await page.locator(action('start')).count(),0);
    // A fresh document resumes the server receipt, without passing reveal options in the test.
    await page.reload();await page.waitForFunction(()=>window.fixtureReady);
    await page.evaluate(()=>harness.progress(0,{cleared:4,completed:true,claimed:true,acknowledged:false,alreadyOwned:true}));
    assert.equal(await page.locator('dialog').count(),0,'reloading an already-owned receipt never starts its ceremony automatically');
    await open();assert.equal(await page.locator(action('claim')).count(),0);
    await page.locator(action('reveal')).click();await page.locator('.jv-card-reveal[open]').waitFor();await imagesReady(page);
    assert.equal(await page.locator('.jv-card-reveal h2').textContent(),'Déjà dans votre collection','resumed card ceremony preserves the authoritative alreadyOwned flag');
    assert.equal(await page.locator('.jv-reward-note').textContent(),'Aucun deuxième exemplaire n’est ajouté.');
    assert.equal(await page.locator('.jv-reward-prize').getAttribute('data-jv-model'),'30000014','the reused reward is the standing-flute Momo version');
    assert.deepEqual(await page.evaluate(()=>harness.calls),[],'resuming the presentation neither claims nor acknowledges a card');
    for(const viewport of [{width:1440,height:1000},{width:412,height:1007}]){
      await page.setViewportSize(viewport);await assertLayout(page,'already-owned card resume '+viewport.width);await capture('already-owned-card-resume-'+viewport.width);
    }
    await page.locator(action('acknowledge')).click();await page.waitForFunction(()=>document.querySelector('.jv-view').getAttribute('aria-busy')==='false');
    assert.deepEqual(await page.evaluate(()=>harness.calls),[{name:'acknowledge',args:['momo-petits-bonheurs']}],'confirmation sends one ACK and never repeats the card grant');
    assert.equal(await page.evaluate(()=>harness.state.progress[harness.state.books[0].id].acknowledged),true);
    assert.equal(await page.locator(action('claim')).count(),0);
    await page.emulateMedia({reducedMotion:'no-preference'}); await page.locator(action('library')).click(); await open();
    assert.equal(await page.locator('.jv-book-opening').evaluate(node=>getComputedStyle(node).animationName),'jv-book-open');
    await page.evaluate(()=>{harness.progress(0,{cleared:4,completed:true,claimed:true});void harness.view.revealReward(harness.data.cards.find(card=>card.id===harness.state.books[0].rewardModelId));});
    assert.equal(await page.locator('.jv-reward-prize').evaluate(node=>getComputedStyle(node).animationName),'jv-card-arrive'); await page.locator(action('acknowledge')).click();
    await page.emulateMedia({reducedMotion:'reduce'}); await page.locator('[data-jv-action="stage"][data-jv-stage="2"]').click();
    const passageBefore = await page.locator('.jv-reading').textContent();
    await page.evaluate(()=>{harness.view.destroy();harness.mount();harness.view.refresh();harness.view.refresh();});
    assert.equal(await page.locator('[data-jv-action="stage"][data-jv-stage="2"]').getAttribute('aria-current'),'step');
    assert.equal(await page.locator('.jv-reading').textContent(),passageBefore,'book, station and passage survive destruction/remount');
    await page.locator(action('library')).click(); await open(1); await page.evaluate(()=>{harness.calls=[];}); await page.locator(action('start')).click();
    assert.equal(await page.evaluate(()=>harness.calls.filter(call=>call.name==='start').length),1,'remount has one handler');
    await page.evaluate(()=>{harness.behavior.start='defer';}); await page.locator(action('start')).click();
    await page.evaluate(()=>{harness.view.destroy();harness.release();}); await page.waitForTimeout(30);
    assert.equal(await page.locator('.jv-view,.jv-reward').count(),0,'late action cannot repaint destroyed view');
    await page.evaluate(()=>{harness.mount();harness.state.status='loading';harness.view.refresh();}); assert.match(await page.locator('.jv-message').textContent(),/Ouverture/);
    await page.evaluate(()=>{harness.state.status='error';harness.state.error='<script>no</script>';harness.view.refresh();});
    assert.equal(await page.locator('.jv-message script').count(),0); assert.match(await page.locator('.jv-message').textContent(),/<script>/);
    await page.locator(action('refresh')).click(); assert.equal(await page.evaluate(()=>harness.calls.at(-1).name),'refresh');
    await page.evaluate(()=>{harness.behavior.refresh='reject';}); await page.locator(action('refresh')).click(); assert.match(await page.locator('.jv-error').textContent(),/Erreur QA refresh/);
    await page.evaluate(()=>{harness.state.status='ready';harness.view.refresh();}); await cleanupProbe(page);
    await bonusProbe(page,capture);
    assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);

    const touch = await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    try {
      await routeFixture(touch); const phone = await touch.newPage(); await phone.goto(origin); await phone.waitForFunction(()=>window.fixtureReady);
      const shelf = await phone.locator('.jv-shelf').boundingBox(), cdp = await touch.newCDPSession(phone);
      const y = shelf.y+90, from = shelf.x+shelf.width*.85, to = shelf.x+shelf.width*.2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});
      for (let step=1;step<=10;step++) { await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*step/10,y}]}); await phone.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await phone.waitForFunction(()=>document.querySelector('.jv-shelf').scrollLeft>60);
      await phone.locator('.jv-shelf').focus(); await phone.keyboard.press('End');
      const before = await phone.locator('.jv-shelf').evaluate(node=>node.scrollLeft);
      await phone.locator('.jv-cover').last().tap(); await phone.locator(action('library')).tap();
      assert.ok(Math.abs(await phone.locator('.jv-shelf').evaluate(node=>node.scrollLeft)-before)<2,'closing the last book restores the shelf position');
      await imagesReady(phone); await phone.screenshot({path:path.join(output,'touch-412.png')}); await cdp.detach();
    } finally { await touch.close(); }
    await balmhyrProbe(browser);
    assert.deepEqual(sequelDiagnostics.filter(scene=>!scene.noBookBackground),[],'no old book background in the sequel ceremonies');
    console.log(JSON.stringify({ok:true,books:3,combatsPerBook:4,bonusCombats:3,viewports:7,adventureSceneCaptures:adventure.scenes.length,source:frozen?'frozen-build':'current-view-with-built-assets',dist,output,checks:['seven-real-scenes-desktop-razr','no-hidden-scene-request-before-ack','readable-narrative-ending','finite-scene-animation','idle-no-raf-loop','no-repeating-timers','cover-text-bounds','filters','keyboard','touch-swipe','four-stations','approved-narration','frozen-state','busy','async-errors','resume','seven-admin-previews','claim-once','ack-retry','already-owned','reduced-motion','remount-selection','late-action','late-media','observer-cleanup','modal-cleanup','onRefresh','no-bonus-before-card-ack','sequential-equipment-ack','reward-art-bounds','equipment-real-names','equipment-cancel','sequel-cancel','no-reload-ceremony','finite-animation-no-auto-ack','public-reveals-parent-ack','late-ack-remount']},null,2));
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
