(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarMatchMetrics=api;
})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  const core=[
    {key:'kills',label:'Kills',icon:'skull',help:'\u00c9liminations r\u00e9elles. Un Reraise ne compte pas comme un kill.'},
    {key:'holds',label:'Stops',icon:'ban',help:'Attaques arr\u00eat\u00e9es par une d\u00e9fense suffisante, une esquive ou un ancien bouclier DEF. Reraise exclu.'},
    {key:'attack',label:'ATK cumul\u00e9e',icon:'sword',help:'Somme des scores ATK finaux de ce match, bonus inclus. Les jets interm\u00e9diaires ne se cumulent pas.'},
    {key:'defense',label:'DEF cumul\u00e9e',icon:'shield',help:'Somme des scores DEF finaux de ce match, bonus de race, d\u2019ar\u00e8ne et de garde (ward) inclus, apr\u00e8s les relances.'},
    {key:'clovers',label:'Tr\u00e8fles accord\u00e9s',icon:'clover',help:'Nouveaux tr\u00e8fles attribu\u00e9s par cette carte, \u00e0 soi ou \u00e0 un alli\u00e9. Ni consommations ni renouvellements.'},
    {key:'hearts',label:'Reraise accord\u00e9s',icon:'heart',help:'Nouveaux Reraise attribu\u00e9s par cette carte, \u00e0 soi ou \u00e0 un alli\u00e9. Ni consommations ni renouvellements.'}
  ];
  const extras=[
    {key:'debuff',label:'Debuff',icon:'shield-minus',help:'Points ATK retir\u00e9s par les armes, cristaux et barri\u00e8res.'},
    {key:'support',label:'Soutiens',icon:'hand-heart',help:'Nouveaux traits accord\u00e9s, \u00e0 soi ou \u00e0 un alli\u00e9. Renouvellements exclus.'},
    {key:'reraises',label:'Vies sauv\u00e9es',icon:'heart-pulse',help:'Reraise consomm\u00e9s par cette carte, distincts des Reraise accord\u00e9s.'},
    {key:'luckUsed',label:'Secondes chances',icon:'rotate-ccw',help:'Tr\u00e8fles consomm\u00e9s pour relancer la d\u00e9fense, distincts des tr\u00e8fles accord\u00e9s.'},
    {key:'rating',label:'Indice',icon:'trophy',help:'5 par kill + 3 par stop + 2 par soutien + 1 par vie sauv\u00e9e + 1 par tranche de 30 ATK retir\u00e9e.'}
  ];
  // V3 physical grants are fixed at 60 points; stored support counters stay in grants.
  const duelMetrics=core.concat([
    {key:'physical',label:'Points de buff ATK physique accord\u00e9s',icon:'sword',plus:true,pointsPerGrant:60,help:'Total des points ATK physiques attribu\u00e9s par cette carte, \u00e0 soi ou \u00e0 un alli\u00e9 : 60 par nouveau buff. Ni buffs re\u00e7us ni renouvellements.'},
    {key:'guards',label:'Points de buff DEF physique accord\u00e9s',icon:'shield',plus:true,pointsPerGrant:60,help:'Total des points DEF physiques attribu\u00e9s par cette carte, \u00e0 soi ou \u00e0 un alli\u00e9 : 60 par nouvelle garde. Ni buffs re\u00e7us ni renouvellements.'}
  ]);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function strip(unit,{partial=false,fromRound=null}={}){
    if(!unit)return '';
    const scope=partial?'Match partiel \u00b7 depuis E'+fromRound:'Ce match';
    return `<div class="duel-match-stats" data-match-unit="${esc(unit.uid)}" data-stat-scope="match" role="group" aria-label="Performances de cette carte dans ce match"><small title="${esc(scope)}">${esc(scope)}</small><dl>${duelMetrics.map(m=>{
      const value=Number.isFinite(unit[m.key])?(unit[m.key]*(m.pointsPerGrant??1)).toLocaleString('fr-FR'):'-';
      return `<div data-metric="${m.key}" title="${esc(m.label+' : '+value+'. '+m.help)}"><dt>${m.plus?'<span class="match-metric-plus" aria-hidden="true">+</span>':''}<i data-lucide="${m.icon}" aria-hidden="true"></i><span class="match-metric-label">${esc(m.label)}</span></dt><dd>${value}</dd></div>`;
    }).join('')}</dl></div>`;
  }
  return {core,extras,strip};
});
