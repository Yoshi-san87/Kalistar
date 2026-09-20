(() => {
  'use strict';
  const engine=KalistarEngine.createEngine(window.KALISTAR_DATA);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${esc(name)}" aria-hidden="true"></i>`;
  const num=value=>(Number.isFinite(value)?value:0).toLocaleString('fr-FR');
  const coreDefaults=[
    {key:'kills',label:'Éliminations',icon:'skull',help:'Cartes réellement éliminées. Une carte sauvée par Reraise ne compte pas.'},
    {key:'holds',label:'Arrêts',icon:'ban',help:'Attaques arrêtées par une défense suffisante, une esquive ou un bouclier. Reraise est compté séparément.'},
    {key:'attack',label:'ATK',icon:'sword',help:'Somme des scores ATK finaux des duels numériques, bonus compris. Les relances intermédiaires ne sont pas ajoutées.'},
    {key:'defense',label:'DEF',icon:'shield',help:'Somme des scores DEF finaux, après bonus de race, arène et ward. Un seul score par duel numérique.'},
    {key:'clovers',label:'Trèfles',icon:'clover',help:'Nouveaux trèfles accordés par cette carte, à elle-même ou à un allié. Ce ne sont pas les trèfles consommés.'},
    {key:'hearts',label:'Cœurs',icon:'heart',help:'Nouveaux cœurs accordés par cette carte, à elle-même ou à un allié. Ce ne sont pas les Reraise consommés.'}
  ];
  const extraDefaults=[
    {key:'debuff',label:'Entrave',icon:'shield-minus',help:'Points ATK retirés par les rapports d’armes, de cristaux et les barrières, crédités au défenseur.'},
    {key:'support',label:'Soutiens',icon:'hand-heart',help:'Nouveaux traits accordés, à soi ou à un allié : cœurs, trèfles, potions, puissance et garde. Renouvellements exclus.'},
    {key:'reraises',label:'Vies sauvées',icon:'heart-pulse',help:'Cœurs consommés pour survivre à une élimination. À distinguer des cœurs accordés.'},
    {key:'luckUsed',label:'Trèfles utilisés',icon:'rotate-ccw',help:'Trèfles consommés pour relancer une défense insuffisante. À distinguer des trèfles accordés.'},
    {key:'rating',label:'Indice',icon:'trophy',help:'5 par élimination + 3 par arrêt + 2 par soutien + 1 par vie sauvée + 1 par tranche de 30 ATK retirée.'}
  ];
  const tabs=[['awards','Palmarès','trophy'],['teams','Équipes','swords'],['lineup','Feuille','list-ordered'],['definitions','Décompte','chart-no-axes-combined']];
  const categories=[['rating','MVP','trophy'],['kills','Finisseur','skull'],['holds','Rempart','ban'],['support','Soutien','hand-heart'],['debuff','Entrave','shield-minus']];
  const integer=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
  function metrics(defaults,provided){
    return defaults.map(metric=>{
      const custom=Array.isArray(provided)?provided.find(item=>item?.key===metric.key):null;
      let help=typeof custom?.help==='string'?custom.help:metric.help;
      if(metric.key==='defense'&&!/ward/i.test(help))help+=' Bonus de race, arène et ward inclus.';
      return {...metric,label:typeof custom?.label==='string'?custom.label:metric.label,help};
    });
  }
  function render(s,{sort='rating',side='all',profiles=null,arenas=null,tab='lineup',page=0,group='core',award=0,spotlight='rating'}={}){
    const core=metrics(coreDefaults,window.KalistarMatchMetrics?.core),extras=metrics(extraDefaults,window.KalistarMatchMetrics?.extras),allMetrics=[...core,...extras];
    const byId={...engine.byId};
    if(Array.isArray(profiles))for(const c of profiles)if(c&&engine.byId[c.id])byId[c.id]={...c,slug:engine.byId[c.id].slug};
    const stats=engine.matchStats(s),units=stats.units;
    const currentArenas=window.KALISTAR_DATA.arenas||[],arena=(Array.isArray(arenas)?arenas:currentArenas).find(a=>a.id===s.arenaId);
    const arenaVisual=currentArenas.find(a=>a.id===s.arenaId),accent=window.KALISTAR_DATA.elements?.[arenaVisual?.element]?.color;
    const arenaStyle=`--match-arena:url(${JSON.stringify(arenaVisual?.image||'assets/arena.webp')});--match-accent:#${/^[\da-f]{6}$/i.test(accent)?accent:'BDA77A'}`;
    spotlight=categories.some(([key])=>key===spotlight)?spotlight:'rating';
    side=['0','1'].includes(String(side))?String(side):'all';
    tab=tabs.some(([id])=>id===tab)?tab:'lineup';group=group==='extras'?'extras':'core';
    const columns=group==='core'?core:extras,key=columns.some(metric=>metric.key===sort)?sort:columns[0].key;
    const height=Number(window.innerHeight)||900,mobile=(Number(window.innerWidth)||1200)<=640;
    const spacious=!mobile&&height>650;
    const rowBudget=height-(mobile?330:spacious?height>900?450:400:360);
    const pageSize=tab==='teams'&&!mobile&&height>=850?columns.length:Math.max(1,Math.min(mobile?3:height>900?10:5,Math.floor(rowBudget/(mobile||spacious?96:74))));
    const player=side=>side===0?'Joueur 1':s.mode==='ai'?'Le Veilleur':'Joueur 2';
    const portrait=u=>`<img src="${KalistarCardMedia.image(engine.byId[u.cardId])}" alt="" width="34" height="46">`;
    const artwork=u=>{
      const c=engine.byId[u.cardId];
      return `<img class="award-art" src="${esc(KalistarCardMedia.image(c,'art'))}" alt="${esc('Illustration de '+byId[u.cardId].name)}" draggable="false">`;
    };
    const identity=(u,className='match-unit')=>{
      const c=byId[u.cardId];
      return `<button type="button" class="${className}" data-action="detail" data-id="${esc(u.cardId)}" data-instance="${esc(u.instanceId)}" title="${esc(c.name+' · '+c.title)}" aria-label="${esc(c.name+' · '+c.title+' · '+player(u.side)+' · '+u.uid)}">${portrait(u)}<span><b>${esc(c.name)}</b><small>${esc(c.title)}</small><small class="team-color-${u.side}">${player(u.side)} · #${esc(u.uid)}</small></span></button>`;
    };
    const controls=(action,current,count,label,range='')=>{
      const button=(target,symbol,name,disabled)=>`<button type="button" data-action="${action}" data-id="${Math.max(0,target)}" ${disabled?'disabled':''} aria-label="${name}" title="${name}">${icon(symbol)}</button>`;
      return `<nav class="match-pagination" aria-label="${label}">${button(0,'chevrons-left','Première page',current===0)}${button(current-1,'chevron-left','Page précédente',current===0)}<span role="status" aria-live="polite">${range?`<b>${range}</b>`:''}<span>${current+1} / ${count}</span></span>${button(current+1,'chevron-right','Page suivante',current>=count-1)}${button(count-1,'chevrons-right','Dernière page',current>=count-1)}</nav>`;
    };
    let reportPage=0,reportPages=1;
    const paginate=items=>{
      const count=Math.max(1,Math.ceil(items.length/pageSize)),current=Math.min(integer(page),count-1),start=current*pageSize;
      reportPage=current;reportPages=count;
      return {items:items.slice(start,start+pageSize),footer:controls('stats-page',current,count,'Pages du bilan',items.length?`${start+1}–${Math.min(start+pageSize,items.length)} / ${items.length}`:'0 résultat')};
    };
    const groupControls=()=>`<div class="match-groups" role="group" aria-label="Mesures affichées">${[['core','Essentiels'],['extras','Compléments']].map(([id,label])=>`<button type="button" data-action="stats-group" data-id="${id}" aria-pressed="${group===id}">${label}</button>`).join('')}</div>`;
    const sideControls=()=>`<div class="match-filters" role="group" aria-label="Équipe affichée">${[['all','Tous'],['0','Joueur 1'],['1','Joueur 2']].map(([id,label])=>`<button type="button" data-action="stats-side" data-id="${id}" aria-pressed="${side===id}">${label}</button>`).join('')}</div>`;
    const metricIcon=metric=>`<span class="match-metric-icon" title="${esc(metric.label+' : '+metric.help)}">${icon(metric.icon)}<span class="match-sr-only">${esc(metric.label)}</span></span>`;
    let content;
    if(tab==='lineup'){
      const visible=units.filter(u=>side==='all'||String(u.side)===side).slice().sort((a,b)=>b[key]-a[key]||a.uid.localeCompare(b.uid)),slice=paginate(visible);
      content=`<section class="match-lineup"><div class="match-table-heading">${groupControls()}${sideControls()}</div><div class="match-table-scroll"><table class="match-table" data-group="${group}" style="--metric-count:${columns.length}" aria-label="Feuille de match"><thead><tr><th scope="col">Carte</th>${columns.map(metric=>`<th scope="col" aria-sort="${key===metric.key?'descending':'none'}"><button type="button" data-action="stats-sort" data-id="${metric.key}" title="${esc(metric.label+' : '+metric.help)}" aria-label="${esc('Trier par '+metric.label)}">${metricIcon(metric)}${key===metric.key?icon('arrow-down'):''}</button></th>`).join('')}</tr></thead><tbody>${slice.items.map(u=>`<tr data-stat-unit="${esc(u.uid)}"><th scope="row">${identity(u)}</th>${columns.map(metric=>`<td data-stat="${metric.key}" data-value="${u[metric.key]||0}" class="${key===metric.key?'sorted':''}" title="${esc(metric.label+' : '+num(u[metric.key]))}">${num(u[metric.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>${slice.items.length?'':'<p class="match-empty">Aucune carte</p>'}</div>${slice.footer}</section>`;
    }else if(tab==='teams'){
      const slice=paginate(columns);
      content=`<section class="match-team-stats"><div class="match-table-heading">${groupControls()}</div><div class="match-team-names"><b>${player(0)}</b><span>Face à face</span><b>${player(1)}</b></div><div class="match-comparisons">${slice.items.map(metric=>{
        const a=stats.teams[0][metric.key]||0,b=stats.teams[1][metric.key]||0,total=a+b;
        return `<div class="team-comparison" data-stat="${metric.key}" title="${esc(metric.help)}"><b>${num(a)}</b><div><span>${icon(metric.icon)}${esc(metric.label)}</span><div class="comparison-track" aria-hidden="true"><i style="width:${total?a/total*100:50}%"></i></div></div><b>${num(b)}</b></div>`;
      }).join('')}</div>${slice.footer}</section>`;
    }else if(tab==='definitions'){
      const slice=paginate(columns);
      content=`<section class="match-definitions"><div class="match-table-heading">${groupControls()}</div><dl>${slice.items.map(metric=>`<div data-definition="${metric.key}"><dt>${icon(metric.icon)}${esc(metric.label)}</dt><dd>${esc(metric.help)}</dd></div>`).join('')}</dl>${slice.footer}</section>`;
    }else{
      const leaders=metric=>{const best=Math.max(0,...units.map(u=>u[metric]||0));return best>0?units.filter(u=>u[metric]===best):[];};
      const ties=categories.map(([metric])=>leaders(metric)),count=Math.max(1,...ties.map(list=>list.length)),current=Math.min(integer(award),count-1);
      reportPage=current;reportPages=count;
      const distinction=(index,mvp=false)=>{
        const [metric,label,symbol]=categories[index],list=ties[index],position=list.length?current%list.length:0,u=list[position];
        const c=u?byId[u.cardId]:null,help=allMetrics.find(item=>item.key===metric);
        const awardIdentity=u?`<button type="button" class="match-unit award-portrait ${mvp?'mvp-portrait':''}" data-action="detail" data-id="${esc(u.cardId)}" data-instance="${esc(u.instanceId)}" aria-label="${esc(c.name+' · '+c.title+' · '+player(u.side)+' · '+u.uid)}" title="${esc('Voir '+c.name+' · '+c.title)}">${artwork(u)}<span class="award-identity"><b>${esc(c.name)}</b><small>${esc(c.title)}</small><small class="team-color-${u.side}">${player(u.side)} · #${esc(u.uid)}</small></span><span class="award-inspect" aria-hidden="true">${icon('scan-eye')}</span></button>`:'';
        const highlights=mvp&&u?`<dl class="mvp-metrics" aria-label="Statistiques du MVP">${['kills','holds','attack','defense'].map(key=>{const metric=core.find(m=>m.key===key);return `<div title="${esc(metric.help)}"><dt>${icon(metric.icon)}<span>${esc(metric.label)}</span></dt><dd data-mvp-stat="${key}">${num(u[key])}</dd></div>`;}).join('')}</dl>`:'';
        return `<article class="${mvp?'match-mvp':'match-award'} award-${metric}" data-spotlight="${metric}" data-featured="${spotlight===metric}" ${u?`data-award-unit="${esc(u.uid)}"`:''}><div class="award-label">${icon(symbol)}<span>${label}</span>${list.length>1?`<small>${position+1}/${list.length} ex æquo</small>`:''}</div>${u?`${awardIdentity}<strong class="award-value" title="${esc(help.help)}">${num(u[metric])}<small>${esc(help.label)}</small></strong>${highlights}`:`<p class="award-empty">${icon(symbol)}Pas encore attribué</p>`}</article>`;
      };
      content=`<section class="match-palmares"><div class="match-spotlight-tabs" role="group" aria-label="Distinction en vedette">${categories.map(([key,label,symbol])=>`<button type="button" data-action="stats-spotlight" data-id="${key}" aria-label="${label}" title="${label}" aria-pressed="${spotlight===key}">${icon(symbol)}<span>${label}</span></button>`).join('')}</div>${distinction(0,true)}<div class="match-awards" aria-label="Distinctions du match">${categories.slice(1).map((_,index)=>distinction(index+1)).join('')}</div>${controls('stats-award',current,count,'Navigation des ex æquo',count>1?`${count} ex æquo au maximum`:'Distinctions')}</section>`;
    }
    const winner=s.winner==='draw'?'Match nul':s.winner===null?'Match en cours':player(s.winner)+' remporte le match';
    const teamScore=side=>`<div class="match-score-team team-color-${side}" data-score-side="${side}" data-winner="${s.winner===side}"><b>${player(side)}</b><strong class="match-final-score" aria-label="${player(side)+' : '+stats.teams[side].kills+' éliminations'}">${num(stats.teams[side].kills)}</strong><small>${icon(s.winner===side?'crown':'skull')}${s.winner===side?'Victoire':'Éliminations'}</small></div>`;
    return `<div class="match-report" style="${esc(arenaStyle)}" data-tab="${tab}" data-spotlight="${spotlight}" data-complete="${s.phase==='over'}" data-report-page="${reportPage}" data-report-pages="${reportPages}" data-page-size="${pageSize}" data-compact="${height<650}"><header class="match-banner">${teamScore(0)}<div class="match-outcome">${icon(s.phase==='over'?'swords':'hourglass')}<h2>${esc(winner)}</h2><p>${esc(arena?.name||'Kalistar')} · ${stats.exchanges} échanges</p><small class="match-seed" title="${esc(s.seed)}">${esc(s.seed)}</small></div>${teamScore(1)}</header>${stats.partial?`<p class="match-partial">${icon('history')}Historique partiel depuis l’échange ${stats.fromRound}.</p>`:''}<nav class="match-tabs" role="tablist" aria-label="Vues du bilan">${tabs.map(([id,label,symbol])=>`<button type="button" id="match-tab-${id}" role="tab" tabindex="${tab===id?'0':'-1'}" aria-selected="${tab===id}" aria-controls="match-panel-${id}" data-action="stats-tab" data-id="${id}">${icon(symbol)}<span>${label}</span></button>`).join('')}</nav><div class="match-view" id="match-panel-${tab}" role="tabpanel" aria-labelledby="match-tab-${tab}">${content}</div><footer class="match-report-actions"><button type="button" data-action="export-stats" aria-label="Exporter le bilan" title="Exporter le bilan">${icon('download')}<span>Exporter</span></button><button type="button" data-action="close" aria-label="Revoir le plateau" title="Revoir le plateau">${icon('layout-dashboard')}<span>Revoir le plateau</span></button>${s.phase==='over'?`<button type="button" class="primary" data-action="rematch" aria-label="Nouvelle rencontre" title="Nouvelle rencontre">${icon('swords')}<span>Nouvelle rencontre</span></button>`:''}</footer></div>`;
  }
  window.KalistarMatchReport={render};
})();
