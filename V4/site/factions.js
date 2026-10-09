(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarFactions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Old printed profiles and saves retain their original keys.
  const canonical=name=>name==='Niveria'?'Ysilis':name==='Gotham'?'Batman':name;
  const assetName=name=>canonical(name)==='Ysilis'?'Niveria':canonical(name)==='Batman'?'Gotham':name;
  const same=(a,b)=>canonical(a)===canonical(b);
  return Object.freeze({canonical,assetName,same});
});
