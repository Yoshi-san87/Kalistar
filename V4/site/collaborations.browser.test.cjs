'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collaborations__.cjs'))('playwright');
const Binder=require('./collection-binder.js');
const output=path.join(__dirname,'verification/replicant-ui');

async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
    // Isolated static fixture: no application server, storage, publication or personal browser.
    const cards=['FF7','FF8','NieR','Replicant'].map((faction,index)=>({id:String(49998990+index),characterId:'fixture-'+index,name:'FIXTURE',title:'Fixture',faction,race:'ANDROID',element:'ELECTRO',weapon:'Lance',positions:[5]}));
    const html=Binder.create({data:{cards,elements:{ELECTRO:{id:'ELECTRO',label:'Electricite',color:'FFFF00'}}}}).render();
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="app">'+html+'</main></body></html>');
    await page.addStyleTag({path:path.join(__dirname,'collection-binder.css')});
    await page.addStyleTag({content:'html,body{margin:0;width:100%;height:100%;}*{box-sizing:border-box}#app{width:100%;height:100vh}.cb-scopes button{display:flex;justify-content:center;align-items:center}'});
    const reports=[];
    for(const [width,height]of [[320,568],[390,844],[700,900],[1024,768],[1600,1000]]){
      await page.setViewportSize({width,height});
      const report=await page.locator('.cb-heading').evaluate(header=>{
        const bounds=header.getBoundingClientRect(),nodes=[...header.querySelectorAll('.cb-scopes button')];
        const boxes=nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:n.scrollWidth>n.clientWidth+1};});
        return {width:innerWidth,height:innerHeight,headerHeight:bounds.height,boxes,inside:boxes.every(r=>r.left>=bounds.left&&r.right<=bounds.right&&r.top>=bounds.top&&r.bottom<=bounds.bottom),overlap:boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom))};
      });
      reports.push(report);
      await page.locator('.cb-heading').screenshot({path:path.join(output,'header-'+width+'x'+height+'.png')});
      assert(report.inside&&!report.overlap&&report.boxes.every(b=>!b.overflow),'All six scopes fit: '+JSON.stringify(report));
    }
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,isolated:true,reports},null,2)+'\n');
    console.log('PASS: six collaboration scopes fit without overlap or scrolling on 320, 390, 700, 1024 and 1600px isolated fixtures.');
    await context.close();
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
