'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),M=require('./model.cjs'),B=require('./build.cjs'),guard=require('./guard.cjs');
async function main(args=process.argv.slice(2)) {
  L.assert(args.length===0||(args.length===1&&args[0]==='--publish'));
  const publish=args[0]==='--publish';
  if(publish){
    L.assert.equal(process.env.KALISTAR_RIKKA_PARENT_NATIVE_REVIEW,'2026-10-01','Parent final card preview is required');
    const review=L.read(L.path.join(__dirname,'native-review.json'));
    L.assert.equal(review.parentReview,'passed');L.assert.equal(review.userApprovalClaimed,false);
    L.assert.equal(review.cardSha256,await L.hash(L.path.join(__dirname,'cards',M.KEY,'card.png')));
  }
  await B.stable();await guard.preparation(true);
  const guardedL={...L,write(file,value){
    if(L.path.resolve(file)===L.path.resolve(D.CATALOGUE)){
      L.assert.deepEqual(value.cards.filter(c=>c.id!==M.ID),D.catalogue().cards.filter(c=>c.id!==M.ID),'Publication must preserve every concurrent entry');
      L.assert.equal(value.cards.filter(c=>c.id===M.ID).length,1);
    }
    return L.write(file,value);
  }};
  const publisher=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L:guardedL,D,home:__dirname,model:M});
  const result=await(publish?publisher.publish():publisher.preflight());await B.stable();await guard.preparation(true);
  if(publish)L.write(L.path.join(__dirname,'published.json'),{...result,ownEntryOnly:true,protectedOriginal:'40000042',publishedAt:new Date().toISOString()});
  return result;
}
module.exports={main};if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
