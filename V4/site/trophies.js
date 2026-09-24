(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarTrophies=api;
})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  const categories=Object.freeze([
    {id:'crystal',key:'rating',name:'Golden Crystal',label:'MVP',help:'Meilleur indice du match : 5 par kill, 3 par Block, 2 par soutien, 1 par vie sauv\u00e9e et 1 par tranche de 30 ATK retir\u00e9e.'},
    {id:'killer',key:'kills',name:'Golden Killer',label:'Kills',help:'Le plus d\u2019\u00e9liminations d\u00e9finitives.'},
    {id:'blocker',key:'holds',name:'Golden Blocker',label:'Blocks',help:'Le plus d\u2019attaques bloqu\u00e9es. Les sauvetages Reraise sont exclus.'},
    {id:'clover',key:'clovers',name:'Golden Clover',label:'Tr\u00e8fles',help:'Le plus de nouveaux tr\u00e8fles attribu\u00e9s, pas consomm\u00e9s.'},
    {id:'heart',key:'hearts',name:'Golden Heart',label:'Reraise',help:'Le plus de nouveaux c\u0153urs Reraise attribu\u00e9s, pas consomm\u00e9s.'}
  ]);
  const totals=['kills','holds','attack','defense','support','debuff','reraises','clovers','hearts','physical','guards','potions','deaths','duels','defended','rating'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=n=>Number.isFinite(n)?n:0;
  const killMedals=Object.freeze(['Double','Triple','Quadra','Penta','Hexa','Hepta','Octo','Nona','Deca'].map((name,i)=>{
    const tier=i+2;
    const shape=tier===2?'circle(48% at 50% 50%)':tier===3?'polygon(50% 3%,98% 91%,2% 91%)':tier===4?'polygon(8% 8%,92% 8%,92% 92%,8% 92%)':
      'polygon('+Array.from({length:tier},(_,n)=>{const angle=-Math.PI/2+n*2*Math.PI/tier;return (50+48*Math.cos(angle)).toFixed(2)+'% '+(50+48*Math.sin(angle)).toFixed(2)+'%';}).join(',')+')';
    return Object.freeze({tier,name:name+'-Kill',shape});
  }));
  const killTier=kills=>Number.isInteger(kills)&&kills>=2?Math.min(kills,10):0;
  function medal(kills,{decorative=false}={}){
    const tier=killTier(kills),definition=killMedals.find(m=>m.tier===tier);if(!definition)return '';
    return `<span class="kill-medal" data-kill-tier="${tier}" style="--medal-shape:${definition.shape}" title="${definition.name}" ${decorative?'aria-hidden="true"':`role="img" aria-label="${definition.name} : ${tier} \u00e9liminations"`}><span>${tier}</span></span>`;
  }
  // Only a newly resolved kill can announce a threshold. Repaints and restores cannot.
  function killMilestone(before,after,uid){
    if(!before||!after||before.partial||after.partial||before.matchId!==after.matchId||after.exchanges!==before.exchanges+1)return null;
    const old=before.units.find(u=>u.uid===uid),current=after.units.find(u=>u.uid===uid);
    if(!old||!current||current.participated===false||current.kills!==old.kills+1||killTier(current.kills)===killTier(old.kills))return null;
    return killMedals.find(m=>m.tier===killTier(current.kills))||null;
  }
  function leaders(summary,key){
    const units=(summary?.units||[]).filter(u=>u.participated!==false),best=Math.max(0,...units.map(u=>number(u[key])));
    const tied=best>0?units.filter(u=>u[key]===best):[];
    if(key!=='rating')return tied;
    // A unique MVP, independent of rendering order or the current viewer's team.
    return tied.sort((a,b)=>{
      for(const metric of ['kills','holds','support','reraises','debuff']){
        const difference=number(b[metric])-number(a[metric]);if(difference)return difference;
      }
      return String(a.uid)<String(b.uid)?-1:String(a.uid)>String(b.uid)?1:0;
    }).slice(0,1);
  }
  function awards(summary){
    if(!summary?.complete||summary.partial)return {};
    const out={};
    for(const c of categories)for(const u of leaders(summary,c.key))(out[u.uid]??=[]).push(c.id);
    return out;
  }
  function empty(){return {games:0,wins:0,losses:0,draws:0,...Object.fromEntries(totals.map(k=>[k,0])),mvp:0,trophies:Object.fromEntries(categories.map(c=>[c.id,0])),killMedals:Object.fromEntries(killMedals.map(m=>[m.tier,0])),history:[]};}
  function add(result,row,trophies=[]){
    result.games++;result[row.winner==='draw'?'draws':row.winner===row.side?'wins':'losses']++;
    for(const key of totals)result[key]+=number(row[key]);
    for(const id of new Set(trophies))if(Object.hasOwn(result.trophies,id))result.trophies[id]++;
    result.mvp=result.trophies.crystal;
    const tier=killTier(row.kills);
    if(tier&&!row.partial&&row.participated!==false)result.killMedals[tier]++;
    return result;
  }
  function image(id,className='trophy-image'){
    const c=categories.find(c=>c.id===id);if(!c)return '';
    return `<img class="${esc(className)}" src="assets/trophies/golden-${c.id}.webp" alt="${c.name}" width="512" height="512" draggable="false">`;
  }
  function cabinet(stats){
    return `<div class="trophy-cabinet" role="group" aria-label="Troph\u00e9es de carri\u00e8re">${categories.map(c=>{
      const n=number(stats?.trophies?.[c.id]??(c.id==='crystal'?stats?.mvp:0));
      return `<div class="trophy-keepsake" data-trophy="${c.id}" data-earned="${n>0}" title="${esc(c.name+' : '+n+'. '+c.help)}">${image(c.id)}<b>${n.toLocaleString('fr-FR')}</b><span>${c.name}</span></div>`;
    }).join('')}</div>`+medalCabinet(stats);
  }
  function medalCabinet(stats){
    const earned=killMedals.filter(m=>number(stats?.killMedals?.[m.tier])>0);if(!earned.length)return '';
    return `<div class="kill-medal-cabinet" role="group" aria-label="M\u00e9dailles de carri\u00e8re">${earned.map(m=>{
      const count=stats.killMedals[m.tier];
      return `<div class="kill-medal-keepsake" title="${m.name} : ${count.toLocaleString('fr-FR')} fois">${medal(m.tier)}<b aria-label="${count} fois">${count.toLocaleString('fr-FR')}</b></div>`;
    }).join('')}</div>`;
  }
  return {version:2,categories,totals,leaders,awards,empty,add,image,cabinet,killMedals,killTier,medal,medalCabinet,killMilestone};
});
