'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('no publication action; freeze and Photoshop require separate coordination',async()=>{
 const B=require('./build.cjs');assert.equal(B.publish,undefined);
 for(const [name,action,pattern] of [['KALISTAR_OP_ASSETS_STABLE','freeze',/stable assets/],['KALISTAR_OP_PHOTOSHOP_HANDSHAKE','render',/parent handshake/]]){
  const old=process.env[name];delete process.env[name];try{await assert.rejects(B[action](),pattern);}finally{if(old!==undefined)process.env[name]=old;}
 }
});
test('flag transplant preserves native pixels; verification keeps strict text and bounds',()=>{
 const s=fs.readFileSync(path.join(__dirname,'compose-one.jsx'),'utf8'),b=fs.readFileSync(path.join(__dirname,'build.cjs'),'utf8');
 assert(s.includes("spec.name==='FACTION - ONEPIECE'"));assert(s.includes("throw Error('Flag pixel bounds changed.')"));
 assert(b.includes("text.split('\\r').length<=4"));assert(b.includes('T.verify(n)'));assert(b.includes('verifyNative(out,p)'));
 assert(b.includes('[672,829,770,1052]'));assert(b.includes("assert.equal(n.photoshop,'26.11.7')"));
 assert(b.includes('proof.none=await'));assert(b.includes('.noneProof('));
});
test('parent publication command refuses missing coordination',async()=>{
 const old=process.env.KALISTAR_OP_PARENT_COORDINATED;delete process.env.KALISTAR_OP_PARENT_COORDINATED;
 try{await assert.rejects(require('./publish.cjs').main(['--publish']),/explicit parent/);}
 finally{if(old!==undefined)process.env.KALISTAR_OP_PARENT_COORDINATED=old;}
});
test('banner adapter validates full Chroma donor before packed One Piece substitution',()=>{
 const L=require('../../atelier/lib.cjs'),A=require('./banner.cjs'),B=require('../../collaborations/one-piece-assets-01/assets.cjs');
 const donor=L.read(L.path.join(L.ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
 const layers=[{name:'ART',left:0},{name:'FACTION - Chroma',...donor}];
 A.replace(layers,{faction:'ONEPIECE'});assert.equal(layers[1].name,'FACTION - ONEPIECE');
 for(const key of Object.keys(B.FLAG))assert.equal(layers[1][key],B.FLAG[key]);
 assert.throws(()=>A.replace([{name:'FACTION - Chroma',...donor,width:98}],{faction:'ONEPIECE'}),/geometry changed/);
});
