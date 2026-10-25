'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(modules,'playwright')),sharp=require(path.join(modules,'sharp'));
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(ROOT,'../../work/astraball-sizing'));
const MEDIA=process.env.KALISTAR_DIST?path.join(process.env.KALISTAR_DIST,'jeu/astraball'):ROOT;
const fixture=`
import {CourtRenderer} from '/src/renderer.mjs';
import {createRoster} from '/src/roster.mjs';
import {createMatch} from '/src/core/game.mjs';
const roster=createRoster(await(await fetch('/data/sprite-library.json')).json());
const byCharacter=id=>roster.entries.find(c=>c.characterId===id).id;
let selection=roster.defaults();
for(const [role,id] of [['meneur','tony-tony-chopper-op'],['scoreur','monkey-d-luffy-op'],['middle','barret-ff7'],['pilier','simone-nier']])selection=roster.select(selection,0,role,byCharacter(id));
const state=createMatch({mode:'hotseat',teams:roster.teams(selection)});
for(const [role,x] of [['pilier',1],['middle',3],['meneur',4],['scoreur',5]]){
  Object.assign(state.units.find(u=>u.team===0&&u.role===role),{x,y:3});
}
const holder=state.units.find(u=>u.team===0&&u.role==='meneur');
state.ball={holderId:holder.id,x:holder.x,y:holder.y};
const court=new CourtRenderer(document.querySelector('#court'),{roster,appearance:{view:'horizontal',height:60,arena:'rhinoz'},onCell:()=>{},onUnit:()=>{},onHover:()=>{}});
await court.init(state.units);court.reduced=true;court.sync(state);court.resetView();
window.proof={court,state,roster};window.ready=true;
`;
async function main(){
  fs.mkdirSync(OUT,{recursive:true});
  const server=http.createServer((req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}
      res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; object-src 'none'");
      if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#152626}#court{width:100vw;height:100vh;overflow:hidden}canvas{display:block}</style><div id="court"></div><script type="module" src="/fixture.mjs"></script>');}
      if(url.pathname==='/fixture.mjs'){res.setHeader('Content-Type','text/javascript');return res.end(fixture);}
      const file=path.resolve(MEDIA,'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(MEDIA+path.sep))throw Error('Outside fixture');
      res.setHeader('Content-Type',({'.mjs':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');
      res.end(fs.readFileSync(file));
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const reports=[];
  try{
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
    for(const [name,width,height] of [['desktop',1440,900],['razr',412,915],['compact',360,800]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      await page.goto('http://127.0.0.1:'+server.address().port);
      try{await page.waitForFunction(()=>window.ready,null,{timeout:15000});}
      catch(error){throw Error('Sizing fixture failed: '+errors.join('\n'),{cause:error});}
      const proof=await page.evaluate(async()=>{
        const {court,state,roster}=window.proof;
        const {CLIPS}=await import('/src/sprites.mjs');
        const initial=JSON.stringify(state),checks=[];
        for(const view of ['horizontal','isometric'])for(const height of [0,60,100]){
          court.setAppearance({view,height});
          for(const token of court.tokens.values()){
            const scale=token.scale,anchor=token.image.anchor.y;
            for(const [pose,clip] of Object.entries(CLIPS))for(let frame=0;frame<clip.frames.length;frame++){
              court.pose(token,pose,1000*frame/clip.fps+.01);
              court.face(token,{x:1,y:0},{x:0,y:0});
              if(token.image.scale.x!==-scale||token.image.scale.y!==scale||token.image.anchor.y!==anchor)throw Error('Pose resized or moved feet');
            }
            court.pose(token,'idle');court.face(token,{x:0,y:0},{x:1,y:0});
          }
          const h=court.tokens.get(state.ball.holderId);court.placeBall(state);
          if(Math.abs(court.ball.y-(h.root.y+h.sizing.ballY))>.001)throw Error('Ball height');
          checks.push({view,height,sizes:court.spriteMetrics().units.map(u=>[u.id,u.scale])});
        }
        court.setAppearance({view:'horizontal',height:60});court.resetView();court.sync(state);
        const units=court.spriteMetrics().units.map(u=>({...u,characterId:roster.forUnit(state.units.find(s=>s.id===u.id)).characterId}));
        for(const u of units){
          const target=court.unitAtPoint({x:u.x,y:u.y-u.sizing.standingHeight*.8});
          if(target!==u.id)throw Error('Cannot select head '+u.id);
          if(u.foot!==90)throw Error('Foot anchor');
        }
        if(JSON.stringify(state)!==initial)throw Error('Presentation changed game');
        return {units,checks};
      });
      const barret=proof.units.find(u=>u.characterId==='barret-ff7'),luffy=proof.units.find(u=>u.characterId==='monkey-d-luffy-op');
      assert.ok(barret.sizing.standingHeight>luffy.sizing.standingHeight*1.08);
      assert.equal(proof.units.find(u=>u.characterId==='simone-nier').sizing.height.cm,300);
      for(const check of proof.checks)assert.deepEqual(check.sizes,proof.checks[0].sizes,'projection must not change relative size');
      await page.screenshot({path:path.join(OUT,name+'-court.png')});
      // Close view uses the real common camera, not individual sprite magnification.
      await page.evaluate(()=>{const c=window.proof.court;c.zoom=1.75;c.layout();const p=c.camera.center(3.5,3);c.pan={x:(c.viewCenter.x-p.x)*c.scale,y:(c.viewCenter.y-p.y+50)*c.scale};c.layout();c.render();});
      await page.screenshot({path:path.join(OUT,name+'-comparison.png')});
      assert.ok((await sharp(await page.locator('canvas').screenshot()).stats()).channels[0].stdev>18);
      await page.evaluate(async()=>{
        const {court,state}=window.proof,unit=state.units.find(u=>u.id===state.ball.holderId),after=structuredClone(state),to=after.units.find(u=>u.id===unit.id);
        to.x++;after.ball.x++;court.reduced=false;
        const scale=court.tokens.get(unit.id).scale;
        await court.animate([{type:'move',unitId:unit.id,from:{x:unit.x,y:unit.y},path:[{x:to.x,y:to.y}]}],state,after);
        if(court.tokens.get(unit.id).scale!==scale)throw Error('Movement scale changed');
        const holder=court.tokens.get(unit.id);
        if(Math.abs(court.ball.y-holder.root.y-holder.sizing.ballY)>.001)throw Error('Carried ball drift');
      });
      assert.deepEqual(errors,[]);reports.push({name,...proof,errors});await context.close();
    }
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(reports,null,2)+'\n');console.log('Sprite sizing desktop, Razr, compact, six projections, clips, movement, picking: passed');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
