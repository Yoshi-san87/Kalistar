(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarCatalogueUpdates=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  function ids(catalogue){
    if(catalogue?.version!==4||catalogue.edition!=='V4'||!Array.isArray(catalogue.cards)||!catalogue.cards.length||catalogue.cards.some(c=>c?.edition!=='V4'||typeof c.id!=='string'||!/^\d{8}$/.test(c.id)))throw Error('Catalogue V4 invalide.');
    const result=catalogue.cards.map(c=>c.id);
    if(new Set(result).size!==result.length)throw Error('Versions de catalogue en double.');
    return result;
  }
  function pending(loaded,available){
    const known=new Set(ids(loaded));
    return ids(available).filter(id=>!known.has(id));
  }
  function create({loaded,readLatest,onChange=()=>{}}){
    ids(loaded);
    let current=[],generation=0,request=null,closed=false;
    const snapshot=()=>current.slice();
    async function check(){
      if(closed)return snapshot();
      const run=++generation;request?.abort();const controller=new AbortController();request=controller;
      try{
        const next=pending(loaded,await readLatest(controller.signal));
        if(closed||run!==generation)return snapshot();
        if(next.join(',')!==current.join(',')){current=next;onChange(snapshot());}
      }catch{
        // A failed background check cannot turn archived versions into new cards.
      }finally{if(request===controller)request=null;}
      return snapshot();
    }
    return Object.freeze({ids:snapshot,check,destroy:()=>{closed=true;generation++;request?.abort();request=null;}});
  }
  return Object.freeze({pending,create});
});
