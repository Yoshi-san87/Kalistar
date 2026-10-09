(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./combat-timeline.js'):root.KalistarCombatTimeline);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarBattleReport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Timeline){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const number=n=>Math.round(n*1000)/1000;
  function model(state){
    const history=state.match,events=history?.events||[],units=new Map();
    state.players.forEach((p,side)=>[...p.board.filter(Boolean),...p.reserve,...p.dead].forEach(u=>units.set(u.uid,{...u,side})));
    const first=Math.max(0,(history?.fromRound||1)-1),last=Math.max(first+1,events.at(-1)?.round||first+1);
    const scores=[0,0],kills=[],series=[[{turn:first,value:0}],[{turn:first,value:0}]];
    for(const event of events){
      if(!event.kill)continue;
      const attacker=units.get(event.attacker),target=units.get(event.target);if(!attacker||!target)continue;
      const side=attacker.side; scores[side]++;
      series[side].push({turn:event.round,value:scores[side]});
      kills.push({index:kills.length,turn:event.round,round:Timeline.position(state,event.round)?.round||null,
        side,attacker,target,magic:event.magic,attack:event.attack,defense:event.defense,scores:scores.slice()});
    }
    for(let side=0;side<2;side++)series[side].push({turn:last,value:scores[side]});
    return {first,last,kills,series,scores,partial:history?.partial??true,available:!!history};
  }
  function geometry(data){
    const x=turn=>number((turn-data.first)/(data.last-data.first)*1000),y=value=>300-value*30;
    return {x,y,paths:data.series.map(points=>points.map((p,i)=>`${i?'H':'M'}${x(p.turn)}${i?'V':' '}${y(p.value)}`).join(' '))};
  }
  function render(state,{selected=null,player,identity,name=u=>u.uid}={}){
    const data=model(state),g=geometry(data),index=Number.isInteger(selected)?Math.max(0,Math.min(selected,data.kills.length-1)):data.kills.length-1;
    const current=data.kills[index],label=k=>`${player(k.side)} : ${k.scores[k.side]} éliminations · Tour ${k.turn}${k.round?' · Round '+k.round:''}`;
    const pointLabel=k=>`${label(k)} · ${name(k.attacker)} élimine ${name(k.target)} · ${k.scores.join(' – ')}`;
    const button=(id,symbol,title,disabled)=>`<button type="button" data-action="stats-battle" data-id="${id}" title="${title}" aria-label="${title}" ${disabled?'disabled':''}>${icon(symbol)}</button>`;
    const ticks=Array.from({length:5},(_,i)=>Math.round(data.first+(data.last-data.first)*i/4)).filter((t,i,a)=>i===0||t!==a[i-1]);
    const legend=`<div class="battle-legend">${[0,1].map(side=>`<span class="team-color-${side}"><i aria-hidden="true"></i>${esc(player(side))}<b>${data.scores[side]}</b></span>`).join('')}</div>`;
    const paths=g.paths.map((d,side)=>`<path class="battle-area battle-side-${side}" d="${d} V300 H0 Z"/><path class="battle-line battle-side-${side}" d="${d}"/>`).join('');
    const cursor=current?`<path class="battle-cursor" d="M${g.x(current.turn)} 0 V300"/>`:'';
    const description=`${player(0)} : ${data.scores[0]} éliminations ; ${player(1)} : ${data.scores[1]} éliminations. Tours ${data.first} à ${data.last}.${data.partial?' Historique partiel, éliminations consignées seulement.':''}`;
    const numeric=current&&(current.attack!==0||current.defense!==0);
    const chart=`<div class="battle-chart"><div class="battle-y-axis" aria-hidden="true">${[10,8,6,4,2,0].map(n=>`<span>${n}</span>`).join('')}</div><div class="battle-plot"><svg viewBox="0 0 1000 300" preserveAspectRatio="none" role="img" aria-label="${esc(description)}"><g class="battle-grid">${[0,2,4,6,8,10].map(n=>`<path d="M0 ${g.y(n)} H1000"/>`).join('')}</g>${paths}${cursor}</svg><div class="battle-points" role="group" aria-label="Éliminations de la bataille">${data.kills.map(k=>`<button type="button" class="battle-point team-color-${k.side}" data-action="stats-battle" data-id="${k.index}" data-turn="${k.turn}" aria-pressed="${k.index===index}" tabindex="${k.index===index?'0':'-1'}" style="left:${g.x(k.turn)/10}%;top:${g.y(k.scores[k.side])/3}%" aria-label="${esc(pointLabel(k))}" title="${esc(pointLabel(k))}"><span aria-hidden="true"></span></button>`).join('')}</div></div><div class="battle-x-axis" aria-hidden="true">${ticks.map(t=>`<span style="left:${g.x(t)/10}%">${t}</span>`).join('')}</div></div>`;
    const duel=current?`<section class="battle-duel" data-battle-selection="${index}" aria-label="Élimination sélectionnée"><header><span>${icon('swords')}Tour ${current.turn}${current.round?`<small>Round ${current.round}</small>`:''}</span><b class="battle-score"><span class="team-color-0">${current.scores[0]}</span><i>–</i><span class="team-color-1">${current.scores[1]}</span></b><nav aria-label="Parcourir les éliminations">${button(index-1,'chevron-left','Élimination précédente',index<=0)}<output aria-live="polite" aria-atomic="true">${index+1} / ${data.kills.length}</output>${button(index+1,'chevron-right','Élimination suivante',index>=data.kills.length-1)}</nav></header><div class="battle-versus">${identity(current.attacker,'battle-killer')}<div class="battle-outcome">${icon('skull')}<strong>Élimine</strong><small>${numeric?(current.magic?'Attaque magique':'Attaque physique'):'Élimination directe'}</small>${numeric?`<span>${current.attack} <i>/</i> ${current.defense}</span>`:''}</div>${identity(current.target,'battle-victim')}</div></section>`:`<p class="battle-empty">${icon('swords')}${data.available?'Aucune élimination consignée.':'Le détail des échanges n’a pas été conservé pour cette rencontre.'}</p>`;
    return `<section class="match-battle" data-battle-count="${data.kills.length}"><header class="battle-heading"><span>${icon('skull')}${data.partial?'Éliminations consignées':'Éliminations'}</span>${legend}</header>${chart}<div class="battle-axis-title">Tours</div>${duel}</section>`;
  }
  return Object.freeze({model,geometry,render});
});
