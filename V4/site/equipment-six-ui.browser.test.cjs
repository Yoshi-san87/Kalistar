'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const runtime=createRequire(path.join(modules,'__six_ui_qa__.cjs')),origin='https://equipment-six-ui.invalid';
const ROOT=path.resolve(__dirname,'../..'),output=process.env.KALISTAR_VERIFICATION_DIR||path.join(ROOT,'V4/revisions/2026-10-09-equipment-slots/qa/team/six-face-warning');
const scripts=['assets/lucide.min.js','ui-system.js','factions.js','weapons.js','weapon-art.js','defensive-equipment.js','equipment.js','turn-order.js','engine.js','base-weapons.js','collaborations.js','card-media.js','equipment-presentation.js','weapon-cards.js','weapons-ui.js','deck-library.js','team-composition.js','deck-builder.js'];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  const data=await buildCatalog(),references=require('../atelier/data/references.json'),errors=[],checks=[];
  const browser=await runtime('playwright').chromium.launch({channel:process.env.KALISTAR_BROWSER||'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
    await context.route(origin+'/**',async route=>{
      const name=decodeURIComponent(new URL(route.request().url()).pathname);
      if(name==='/qa')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('href="manifest.webmanifest"','href="data:application/manifest+json,{}"')});
      let file;
      if(name.startsWith('/media/reference/')){
        const ref=references.cards.find(r=>name==='/media/reference/'+r.key+'.png');if(ref)file=path.join(ROOT,ref.png);
      }else if(name.startsWith('/shared/'))file=path.join(ROOT,'V3/assets',name.slice(8));
      else{
        file=path.resolve(__dirname,'.'+name);assert(file.startsWith(__dirname+path.sep));
        if(!fs.existsSync(file)&&name.startsWith('/assets/'))file=path.join(ROOT,'V3/site',name);
      }
      if(!file||!fs.existsSync(file))return route.fulfill({status:404,body:name});
      return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/qa');for(const file of scripts)await page.addScriptTag({url:origin+'/'+file});
    await page.evaluate(data=>{
      const Q=KalistarEquipment,c=data.cards.find(c=>c.characterId==='rikka'),w=Q.catalogue.weapons.find(w=>w.id==='ninth-life-boots');
      if(!Q.compatible(w,c)||typeof c.defense[0]==='number')throw Error('Native Rikka prerequisite changed.');
      const row=Q.equipProfile(Q.profile('qa-six'),'rikka',w.id,data.cards);
      const snapshot=Q.snapshot([row.slots,Q.emptyLoadout()],data.cards),u={uid:'0-rikka',cardId:c.id};
      const state={equipment:snapshot,duel:{attacker:'1-enemy',target:u.uid,defenseDie:6,defenseValue:c.defense[0],attackValue:100},phase:'defense'};
      if(row.slots.shield.rikka!==w.id||Q.retained(state,u,c,'DEF')!==null)throw Error('Pure compatibility or special-face no-bonus regression.');
      window.QA={data,notices:[],row:Q.profile('qa-six'),writes:0,native:JSON.stringify(c)};
      QA.cleanup=()=>{QA.builder?.destroy();QA.arsenal?.destroy();QA.builder=QA.arsenal=null;};
      QA.mountArsenal=cards=>{
        QA.cleanup();document.body.className='weapons-view';QA.cards=cards;QA.row=Q.profile('qa-six');
        let refresh=()=>{};
        QA.db={equipment:{profile:()=>structuredClone(QA.row),subscribe:fn=>{refresh=fn;return()=>{};},
          equip:async(user,cid,id,options)=>{QA.row=Q.equipProfile(QA.row,cid,id,cards,options);QA.writes++;refresh();},
          unequip:async(user,cid,id)=>{const item=Q.catalogue.weapons.find(w=>w.id===id);delete QA.row.slots[item.slot][cid];QA.writes++;refresh();}}};
        QA.arsenal=KalistarWeaponsUI.create({data:{...data,cards},db:QA.db,userId:'qa-six',toast:text=>QA.notices.push(text)});
        QA.arsenal.mount(document.getElementById('app'));
      };
      QA.mountDeck=(cardId,cards=data.cards,seeded=null)=>{
        QA.cleanup();document.body.className='decks-view';const engine=KalistarEngine.createEngine({...data,cards}),T=KalistarTeamComposition.create(engine);
        QA.draft=T.normalize({name:'Six QA',cards:[cardId]});if(seeded)QA.draft=T.equip(QA.draft,cardId,seeded);
        QA.slot=T.slots(QA.draft).indexOf(cardId);
        QA.builder=KalistarDeckBuilder.create({data:{...data,cards},engine,userId:'qa-deck-'+crypto.randomUUID(),storage:localStorage,
          registry:{deckErrors:()=>[],owned:()=>[{}]},getDraft:()=>QA.draft,onDraft:value=>{QA.draft=structuredClone(value);},toast:text=>QA.notices.push(text)});
        QA.builder.mount(document.getElementById('app'));return QA.slot;
      };
      QA.mountArsenal(data.cards);QA.arsenal.open(w.id);
    },data);
    checks.push('Native Rikka remains compatible and equippable in memory; DEF6 dodge grants no numeric equipment bonus');
    const arsenalButton=page.locator('#weapons-dialog [data-weapon-action=equip][data-character=rikka]');
    assert.equal(await arsenalButton.isDisabled(),true);
    await warning(page,'#weapons-dialog','ninth-life-boots','DEF');
    assert.match(await arsenalButton.getAttribute('aria-describedby'),/weapon-edition-warning/);
    await arsenalButton.dispatchEvent('click');assert.equal(await page.evaluate(()=>QA.writes),0);
    fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'arsenal-desktop.png')});
    await page.setViewportSize({width:412,height:1007});
    await warning(page,'#weapons-dialog','ninth-life-boots','DEF');await page.screenshot({path:path.join(output,'arsenal-phone.png')});
    await page.evaluate(()=>{QA.row=KalistarEquipment.equipProfile(QA.row,'rikka','ninth-life-boots',QA.cards);QA.arsenal.refresh();});
    assert.equal(await page.locator('#weapons-dialog [data-weapon-action=unequip][data-character=rikka]').isEnabled(),true);
    await page.locator('#weapons-dialog [data-weapon-action=unequip][data-character=rikka]').click();
    assert.equal(await arsenalButton.isDisabled(),true);assert.equal(await page.evaluate(()=>QA.row.slots.shield.rikka),undefined);
    checks.push('Arsenal: visible accessible warning on PC/phone, disabled equip without persistence writes, existing item still removable');
    await page.evaluate(()=>{
      const original=QA.data.cards.find(c=>c.characterId==='rikka'),numeric=structuredClone(original);numeric.id='qa-rikka-numeric';numeric.defense[0]=200;
      QA.mountArsenal([numeric,...QA.data.cards]);QA.arsenal.open('ninth-life-boots');
    });
    assert.equal(await arsenalButton.isEnabled(),true);
    assert.equal(await page.locator('#weapons-dialog [data-equipment-unavailable]').count(),0);
    assert.equal(await page.locator('#weapons-dialog [data-weapon-action=card]').getAttribute('data-id'),'qa-rikka-numeric');
    await arsenalButton.click();assert.equal(await page.evaluate(()=>QA.row.slots.shield.rikka),'ninth-life-boots');
    checks.push('Arsenal: numeric compatible edition preferred regardless of catalogue ordering');
    await deckPicker(page,'rikka');
    const deckButton=page.locator('[data-deck-action=equip][data-id=ninth-life-boots]');
    assert.equal(await deckButton.isDisabled(),true);await warning(page,'.team-weapon-list','ninth-life-boots','DEF');
    assert.equal(await page.locator('[data-deck-action=equip][data-id=leopard-lightning]').isEnabled(),true,'Rikka ATK6 still enables her weapon');
    assert.match(await deckButton.getAttribute('aria-describedby'),/team-equipment-warning/);
    await deckButton.dispatchEvent('click');assert.deepEqual(await page.evaluate(()=>QA.draft.equipment.shield),{});
    await page.screenshot({path:path.join(output,'deck-phone.png')});
    await deckPicker(page,'rikka','ninth-life-boots');
    assert.equal(await page.locator('[data-deck-action=unequip][data-id=ninth-life-boots]').isEnabled(),true);
    await page.locator('[data-deck-action=unequip][data-id=ninth-life-boots]').click();assert.equal(await deckButton.isDisabled(),true);
    await page.setViewportSize({width:1440,height:900});await deckPicker(page,'balmhyr');
    for(const id of ['fallen-king-axe','durane-rampart','exiled-king-seal'])assert.equal(await page.locator(`[data-deck-action=equip][data-id="${id}"]`).isEnabled(),true);
    await page.evaluate(()=>{
      const cards=structuredClone(QA.data.cards),balm=cards.find(c=>c.characterId==='balmhyr');balm.atk[0]='death';
      QA.mountDeck(balm.id,cards);
    });
    await openDeckPicker(page);assert.equal(await page.locator('[data-deck-action=equip][data-id=fallen-king-axe]').isDisabled(),true);
    await warning(page,'.team-weapon-list','fallen-king-axe','ATK');
    assert.equal(await page.locator('[data-deck-action=equip][data-id=durane-rampart]').isEnabled(),true);
    await page.screenshot({path:path.join(output,'deck-desktop.png')});
    await page.evaluate(()=>{
      const cards=structuredClone(QA.data.cards),momo=cards.find(c=>c.characterId==='momo');momo.defense[0]='dodge';momo.atk[0]='retry';
      QA.mountDeck(momo.id,cards);
    });
    await openDeckPicker(page);assert.equal(await page.locator('[data-deck-action=equip][data-id=little-joys-flute]').isEnabled(),true);
    checks.push('Deck: per-edition ATK/DEF6 checks, disabled equip and removable existing item; numeric items and conditional relics remain enabled');
    assert.equal(await page.evaluate(()=>JSON.stringify(QA.data.cards.find(c=>c.characterId==='rikka'))===QA.native),true);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,isolated:true,checks,errors},null,2));
    for(const check of checks)console.log('PASS '+check);
    await context.close();
  }finally{await browser.close();}
}
async function warning(page,root,id,stat){
  const notice=page.locator(`${root} [data-equipment-unavailable="${id}"]`);
  assert.equal(await notice.isVisible(),true);assert.match(await notice.innerText(),new RegExp('6 '+stat+'.*bonus indisponible'));
}
async function deckPicker(page,character,seeded=null){
  await page.evaluate(({character,seeded})=>QA.mountDeck(QA.data.cards.find(c=>c.characterId===character).id,QA.data.cards,seeded),{character,seeded});
  await openDeckPicker(page);
}
async function openDeckPicker(page){
  const index=await page.evaluate(()=>QA.slot);await page.locator(`[data-deck-action=slot][data-slot="${index}"]`).click();
  await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
