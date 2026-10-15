(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarCollaborations=api;
})(typeof globalThis==='undefined'?this:globalThis,()=>{
  'use strict';
  const entries=Object.freeze([
    {id:'ff7',faction:'FF7',title:'Final Fantasy VII'},
    {id:'ff8',faction:'FF8',title:'Final Fantasy VIII'},
    {id:'nier',faction:'NieR',title:'NieR:Automata'},
    {id:'replicant',faction:'Replicant',title:'NieR Replicant'}
  ].map(Object.freeze));
  const find=value=>entries.find(entry=>entry.faction.toLowerCase()===String(value||'').trim().toLowerCase());
  // Faction distinguishes versions from the same series and shared character ID.
  const of=card=>find(card?.faction)||find(card?.collaboration);
  const universe=card=>of(card)?.faction||'kalistar';
  const matches=(card,id)=>of(card)?.id===id;
  const choices=cards=>entries.filter(entry=>entry.id==='ff7'||entry.id==='ff8'||cards.some(card=>matches(card,entry.id))).map(entry=>[entry.faction,entry.faction]);
  const asset=(folder,name)=>(folder==='factions'&&(find(name)||name==='Solaria')||folder==='races'&&name==='ANDROID'?'assets/':'shared/')+folder+'/'+encodeURIComponent(name)+'.png';
  return {entries,of,universe,matches,choices,asset};
});
