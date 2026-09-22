(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarTrophies=api;
})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  const categories=Object.freeze([
    {id:'crystal',key:'rating',name:'Golden Crystal',label:'MVP',help:'Meilleur indice du match : 5 par kill, 3 par stop, 2 par soutien, 1 par vie sauv\u00e9e et 1 par tranche de 30 ATK retir\u00e9e.'},
    {id:'killer',key:'kills',name:'Golden Killer',label:'Kills',help:'Le plus d\u2019\u00e9liminations d\u00e9finitives.'},
    {id:'blocker',key:'holds',name:'Golden Blocker',label:'Stops',help:'Le plus d\u2019attaques arr\u00eat\u00e9es. Les sauvetages Reraise sont exclus.'},
    {id:'clover',key:'clovers',name:'Golden Clover',label:'Tr\u00e8fles',help:'Le plus de nouveaux tr\u00e8fles attribu\u00e9s, pas consomm\u00e9s.'},
    {id:'heart',key:'hearts',name:'Golden Heart',label:'Reraise',help:'Le plus de nouveaux c\u0153urs Reraise attribu\u00e9s, pas consomm\u00e9s.'}
  ]);
  const totals=['kills','holds','attack','defense','support','debuff','reraises','clovers','hearts','physical','guards','potions','deaths','duels','defended','rating'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=n=>Number.isFinite(n)?n:0;
  function leaders(summary,key){
    const units=(summary?.units||[]).filter(u=>u.participated!==false),best=Math.max(0,...units.map(u=>number(u[key])));
    return best>0?units.filter(u=>u[key]===best):[];
  }
  function awards(summary){
    if(!summary?.complete||summary.partial)return {};
    const out={};
    for(const c of categories)for(const u of leaders(summary,c.key))(out[u.uid]??=[]).push(c.id);
    return out;
  }
  function empty(){return {games:0,wins:0,losses:0,draws:0,...Object.fromEntries(totals.map(k=>[k,0])),mvp:0,trophies:Object.fromEntries(categories.map(c=>[c.id,0])),history:[]};}
  function add(result,row,trophies=[]){
    result.games++;result[row.winner==='draw'?'draws':row.winner===row.side?'wins':'losses']++;
    for(const key of totals)result[key]+=number(row[key]);
    for(const id of new Set(trophies))if(Object.hasOwn(result.trophies,id))result.trophies[id]++;
    result.mvp=result.trophies.crystal;
    return result;
  }
  function image(id,className='trophy-image'){
    const c=categories.find(c=>c.id===id);if(!c)return '';
    return `<img class="${esc(className)}" src="assets/trophies/golden-${c.id}.webp" alt="${c.name}" width="512" height="512" draggable="false">`;
  }
  function cabinet(stats){
    return `<div class="trophy-cabinet" role="group" aria-label="Troph\u00e9es de carri\u00e8re">${categories.map(c=>{
      const n=number(stats?.trophies?.[c.id]??(c.id==='crystal'?stats?.mvp:0));
      return `<div class="trophy-keepsake" data-trophy="${c.id}" data-earned="${n>0}" title="${esc(c.name+' : '+n+'. '+c.help)}">${image(c.id)}<b>${n.toLocaleString('fr-FR')}</b><span>${c.label}</span></div>`;
    }).join('')}</div>`;
  }
  return {version:1,categories,totals,leaders,awards,empty,add,image,cabinet};
});
