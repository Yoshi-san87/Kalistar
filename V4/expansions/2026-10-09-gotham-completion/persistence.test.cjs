'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http');
const {createRequire}=require('node:module'),{buildCatalog}=require('../../atelier/game-catalog.cjs');
const {runDatabaseScenarios}=require('../../site/catalogue-evolution.test.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_gotham_completion_db.cjs'))('playwright');
const set=require('./set.json'),oldRegistry=require('./before.json').catalogue.cards.filter(c=>c.kind==='created');
const modules=['weapons.js','defensive-equipment.js','equipment.js','turn-order.js','engine.js','ownership.js','local-db.js'];
async function main(){
  const server=http.createServer((req,res)=>{
    if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Batman and Joker isolated persistence QA</title>');}
    const name=req.url.slice(1);if(!modules.includes(name)){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'../../site',name)));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext(),page=await context.newPage(),errors=[],checks=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    for(const file of modules)await page.addScriptTag({url:'/'+file});
    const old=await buildCatalog({published:oldRegistry});
    for(const spec of set.cards){
      const profile=require('./cards/'+spec.key+'/profile.json');
      const next=await buildCatalog({published:[...oldRegistry,{id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'}]});
      const result=await page.evaluate(runDatabaseScenarios,{old,next,addedId:spec.id});
      checks.push({id:spec.id,checks:result});console.log('PASS: '+spec.name+' ('+result.length+' registry scenarios)');
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(__dirname,'persistence-results.json'),JSON.stringify({passed:true,isolated:true,oldCards:old.cards.length,checks,errors},null,2));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
