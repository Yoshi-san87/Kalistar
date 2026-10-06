(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarFactions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Niveria remains a region; old printed profiles and saves retain its key.
  const canonical=name=>name==='Niveria'?'Ysilis':name;
  const assetName=name=>canonical(name)==='Ysilis'?'Niveria':name;
  const same=(a,b)=>canonical(a)===canonical(b);
  return Object.freeze({canonical,assetName,same});
});
