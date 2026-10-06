(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./base-weapons.js'):root.KalistarBaseWeapons,node?require('./factions.js'):root.KalistarFactions);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarCollaborations=api;
})(typeof globalThis==='undefined'?this:globalThis,(W,F)=>{
  'use strict';
  const entries=Object.freeze([
    {id:'ff7',faction:'FF7',title:'Final Fantasy VII'},
    {id:'ff8',faction:'FF8',title:'Final Fantasy VIII'},
    {id:'ff10',faction:'FF10',title:'Final Fantasy X'},
    {id:'nier',faction:'NieR',title:'NieR:Automata'},
    {id:'replicant',faction:'Replicant',title:'NieR Replicant'},
    {id:'mgs1',faction:'MGS1',title:'Metal Gear Solid'},
    {id:'mgs2',faction:'MGS2',title:'Metal Gear Solid 2'},
    {id:'mgs3',faction:'MGS3',title:'Metal Gear Solid 3'},
    {id:'mgs4',faction:'MGS4',title:'Metal Gear Solid 4'},
    {id:'mgs5',faction:'MGS5',title:'Metal Gear Solid V'},
    {id:'one-piece',faction:'ONEPIECE',title:'One Piece'},
    {id:'witcher',faction:'WITCHER',title:'The Witcher'},
    ...Array.from({length:9},(_,i)=>({id:'re'+(i+1),faction:'RE'+(i+1),title:i===0?'Resident Evil':i===6?'Resident Evil 7 biohazard':i===7?'Resident Evil Village':i===8?'Resident Evil Requiem':'Resident Evil '+(i+1)}))
  ].map(Object.freeze));
  const find=value=>entries.find(entry=>entry.faction.toLowerCase()===String(value||'').trim().toLowerCase());
  // Faction distinguishes versions from the same series and shared character ID.
  const of=card=>find(card?.faction)||find(card?.collaboration);
  const universe=card=>of(card)?.faction||'kalistar';
  const matches=(card,id)=>of(card)?.id===id;
  const choices=cards=>entries.filter(entry=>entry.id==='ff7'||entry.id==='ff8'||cards.some(card=>matches(card,entry.id))).map(entry=>[entry.faction,entry.faction]);
  const asset=(folder,name)=>folder==='armes'&&W?.asset(name)?W.asset(name):(folder==='factions'&&(find(name)||name==='Solaria')||folder==='races'&&['ANDROID','BUZZY','SERPES','SHARKAN','CRUSTOS'].includes(name)?'assets/':'shared/')+folder+'/'+encodeURIComponent(folder==='factions'?F.assetName(name):name)+'.png';
  return {entries,of,universe,matches,choices,asset};
});
