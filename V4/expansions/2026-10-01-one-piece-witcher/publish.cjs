'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),M=require('./model.cjs'),B=require('./build.cjs');
async function main(args=process.argv.slice(2)){
 L.assert(args.length===0||(args.length===1&&args[0]==='--publish'));const publish=args[0]==='--publish';
 if(publish)L.assert.equal(process.env.KALISTAR_OP_WITCHER_PUBLISH,'2026-10-01');
 B.guard.publication();
 const guarded={...L,write(f,v){if(L.path.resolve(f)===L.path.resolve(D.CATALOGUE))B.guard.assertExisting(undefined,v);return L.write(f,v);}};
 const P=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L:guarded,D,model:M,home:__dirname});
 return publish?P.publish():P.preflight();
}
module.exports={main};if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});

