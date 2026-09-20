const {createRequire}=require('node:module');
const L=require('./lib.cjs');
const D=require('./designer-core.cjs');
const {fs,path,assert}=L;
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__designer_qa__.cjs'))('playwright');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=path.join(D.HOME,'verification');
let browser,draft;
async function main(){
  fs.mkdirSync(out,{recursive:true});const boot=await(await fetch(base+'/api/designer/bootstrap')).json();assert.equal(boot.ready,true,'La banque doit etre terminee avant ce controle.');
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  const errors=[],checks=[],responses=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.status()!==429)responses.push(r.url()+':'+r.status());});
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-label').textContent==='Apercu a jour');
  await page.screenshot({path:path.join(out,'atelier-blank-desktop.png'),fullPage:true});checks.push('Blank template with live native components');
  await page.locator('#field-name').fill('TEST ATELIER');await page.locator('#field-title').fill('CONTROLE NON PUBLIE');await page.locator('#field-job').fill('ARTISTE');
  await page.locator('#field-description').fill('Une carte de controle pour verifier les composants du template et le recadrage de son illustration.');
  for(const n of [1,2,4,5])await page.locator('#positions').getByRole('button',{name:'Position '+n,exact:true}).click();
  await page.getByRole('button',{name:'Eau',exact:true}).click();await page.getByRole('tab',{name:'Combat',exact:true}).click();
  await page.getByLabel('ATK D6, valeur',{exact:true}).fill('275');await page.getByLabel('D6, Attaque magique',{exact:true}).check();
  for(const [die,effect]of [[5,'mana'],[4,'retry'],[3,'buff_atk'],[2,'guard'],[1,'revive']])await page.getByLabel('ATK D'+die+', type',{exact:true}).selectOption(effect);
  await page.locator('#side-defense').click();await page.getByLabel('DEF D6, type',{exact:true}).selectOption('dodge');await page.getByLabel('DEF D4, type',{exact:true}).selectOption('retry');await page.getByLabel('D5, Barriere',{exact:true}).check();
  await page.waitForFunction(()=>document.querySelector('#preview-label').textContent==='Apercu a jour');
  checks.push('Every stat face, support effects, magic, barrier and five positions');
  await page.getByRole('tab',{name:'Image',exact:true}).click();
  const image=await L.sharp(path.join(L.ROOT,'V4/assets/illustrations/42_ELECTRO_RIKKA_V4_02_VITRINE_FRONTALE.png')).resize(600,750,{fit:'cover'}).png().toBuffer();
  const uploadResponse=page.waitForResponse(r=>r.url().endsWith('/api/uploads')&&r.request().method()==='POST');
  await page.locator('#art-upload').setInputFiles({name:'illustration-controle.png',mimeType:'image/png',buffer:image});await uploadResponse;
  await page.waitForFunction(()=>!document.querySelector('#crop-controls').disabled);
  await page.locator('#crop-zoom').fill('1.8');await page.locator('#crop-x').fill('0.5');await page.locator('#crop-y').fill('-0.2');
  await page.waitForFunction(()=>document.querySelector('#preview-label').textContent==='Apercu a jour');
  await page.screenshot({path:path.join(out,'atelier-import-desktop.png'),fullPage:true});
  assert.equal(await page.locator('#create-card').isEnabled(),true);checks.push('Real local image import, zoom and crop; creation enabled');
  const saveResponse=page.waitForResponse(r=>r.url().endsWith('/api/designer/drafts')&&r.request().method()==='POST');await page.locator('#save-draft').click();draft=await(await saveResponse).json();assert.ok(draft.id);assert.equal(draft.profile.crop.zoom,1.8);assert.deepEqual(draft.profile.positions,[1,2,3,4,5]);assert.equal(draft.profile.atk[0],275);checks.push('Server draft matches the printed live choices');
  for(const viewport of [{width:1920,height:1080},{width:1024,height:768},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1),true);
    await page.screenshot({path:path.join(out,`atelier-${viewport.width}.png`),fullPage:true});
  }
  checks.push('Desktop, compact desktop and mobile without page scrolling');
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'Sans cristal',exact:true}).click();await page.getByRole('tab',{name:'Combat',exact:true}).click();
  assert.equal(await page.getByLabel('D5, Barriere',{exact:true}).isDisabled(),true);await page.waitForFunction(()=>document.querySelector('#preview-label').textContent==='Apercu a jour');checks.push('NONE automatically clears incompatible numeric modes');
  const embedded=await context.newPage();embedded.on('pageerror',e=>errors.push(e.message));await embedded.goto(base+'/jeu/#atelier');
  const inner=embedded.frameLocator('#atelier-frame');await inner.locator('#preview-label').filter({hasText:'Apercu a jour'}).waitFor();assert.equal(await inner.locator('.topbar').isVisible(),false);
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    await embedded.setViewportSize(viewport);await embedded.waitForTimeout(200);
    assert.equal(await embedded.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1),true);
    const frame=embedded.frames().find(f=>f.url().includes('embedded=1'));
    assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1),true);
    await embedded.screenshot({path:path.join(out,`atelier-integrated-${viewport.width}.png`),fullPage:true});
  }
  checks.push('Integrated game tab retains one header and fits desktop/mobile viewports');
  assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
  L.write(path.join(out,'browser.json'),{passed:true,checks,errors,responses,publishedTestCards:0,checkedAt:new Date().toISOString()});console.log(checks.join('\n'));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();
  if(draft){const file=path.join(D.HOME,'drafts',draft.id+'.json');if(fs.existsSync(file)&&L.read(file).profile.name==='TEST ATELIER'){fs.unlinkSync(file);const upload=path.join(L.DATA,'uploads',draft.profile.upload+'.png');if(D.UUID.test(draft.profile.upload)&&fs.existsSync(upload))fs.unlinkSync(upload);}}
});
