'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),M=require('./model.cjs'),B=require('./build.cjs');
async function main(args=process.argv.slice(2)){
 L.assert(args.length===0||(args.length===1&&args[0]==='--publish'),'Usage: node publish.cjs [--publish]');
 const publish=args[0]==='--publish';
 if(publish)L.assert.equal(process.env.KALISTAR_OP_PARENT_COORDINATED,'2026-10-01','Publication requires explicit parent coordinated release.');
 B.guard.publication();
 const guardedL={...L,write(file,value){
  if(L.path.resolve(file)===L.path.resolve(D.CATALOGUE)){B.guard.publication();B.guard.assertExisting(undefined,value);}
  return L.write(file,value);
 }};
 const publisher=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L:guardedL,D,home:__dirname,model:M});
 const result=await (publish?publisher.publish():publisher.preflight());B.guard.publication();return result;
}
module.exports={main};
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
