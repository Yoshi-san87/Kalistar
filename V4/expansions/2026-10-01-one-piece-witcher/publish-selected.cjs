'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),M=require('./model.cjs'),B=require('./build.cjs');
const selection=require('./publication-selection.json'),set=M.validateSet(require('./set.json'));
async function main(){
 const publish=process.argv[2]==='--publish';L.assert(process.argv.length===(publish?3:2));
 if(publish)L.assert.equal(process.env.KALISTAR_OP_WITCHER_PUBLISH,'2026-10-01');
 L.assert.equal(selection.ready.length,14);L.assert.equal(selection.pending.length,3);
 L.assert.deepEqual(new Set(selection.ready.concat(selection.pending)),new Set(M.keys));
 B.guard.assertExisting();for(const key of selection.ready)B.guard.preparation(key,true);
 const guarded={...L,write(f,v){if(L.path.resolve(f)===L.path.resolve(D.CATALOGUE))B.guard.assertExisting(undefined,v);return L.write(f,v);}};
 const model={...M,validateGame(data,full,createEngine){
  M.validateSet(full);const engine=createEngine(data);
  for(const c of full.cards.filter(c=>selection.ready.includes(c.key))){const p=data.cards.find(p=>p.id===c.id);L.assert(p);
   for(const f of M.PRINTED.concat(['characterId','role','collaboration']))L.assert.deepEqual(p[f],c[f],c.key+'.'+f);
   L.assert.equal(p.sentry,c.element!=='NONE');L.assert.equal(p.canGuard,c.atk.includes('guard'));L.assert.equal(p.canHeal,c.atk.includes('revive'));
  }
  for(const c of full.cards.filter(c=>selection.pending.includes(c.key)))L.assert(!data.cards.some(p=>p.id===c.id),'Pending card must not be public');
  L.assert(engine.validateDeck(['49800301','49800103']).some(e=>e.includes('personnage')));
  return {verified:14,pending:selection.pending,duplicateSanjiRejected:true,noPresetInstalled:true};
 }};
 const P=require('./selected-publication-core.cjs').createPublisher({L:guarded,D,model,home:__dirname,keys:selection.ready});
 const result=await(publish?P.publish():P.preflight());L.write(L.path.join(__dirname,publish?'published-selection.json':'preflight-selection.json'),result);return result;
}
main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
