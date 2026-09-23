(function(root,factory){
  const T=typeof module==='object'&&module.exports?require('./trophies.js'):root.KalistarTrophies;
  const C=typeof module==='object'&&module.exports?require('./collaborations.js'):root.KalistarCollaborations;
  const api=factory(T,C);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarStatistics=api;
})(typeof window==='undefined'?globalThis:window,(T,C)=>{
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const column=(key,label,icon,help,average=true)=>({key,label,icon,help,average});
  const common=[column('games','MJ','swords','Participations aux matchs termin\u00e9s, hors r\u00e9serve non d\u00e9ploy\u00e9e et historiques partiels.',false)];
  const groups={
    performance:[...common,column('wins','V','crown','Victoires.',false),column('losses','D','flag','D\u00e9faites.',false),column('winRate','V %','percent','Pourcentage de victoires.',false),column('kills','Kills','skull','\u00c9liminations d\u00e9finitives.'),column('holds','Stops','ban','Attaques arr\u00eat\u00e9es, hors Reraise.'),column('attack','ATK','sword','Scores ATK finaux cumul\u00e9s, pas des d\u00e9g\u00e2ts nets.'),column('defense','DEF','shield','Scores DEF finaux cumul\u00e9s.'),column('rating','Indice','sparkles','5 par kill + 3 par stop + 2 par soutien + 1 par vie sauv\u00e9e + 1 par tranche de 30 ATK retir\u00e9e.')],
    support:[...common,column('clovers','Tr\u00e8fles','clover','Nouveaux tr\u00e8fles attribu\u00e9s.'),column('hearts','Reraise','heart','Nouveaux c\u0153urs Reraise attribu\u00e9s.'),column('support','Soutiens','hand-heart','Tous les nouveaux soutiens attribu\u00e9s.'),column('physical','+ATK','sword','Points ATK physiques attribu\u00e9s : 60 par nouveau buff.'),column('guards','+DEF','shield-plus','Points DEF physiques attribu\u00e9s : 60 par nouvelle garde.'),column('potions','Potions','flask-conical','Nouvelles potions attribu\u00e9es.'),column('reraises','Sauv\u00e9s','heart-pulse','Coeurs consomm\u00e9s pour survivre.'),column('debuff','Entrave','shield-minus','Points ATK retir\u00e9s.')],
    trophies:[...common,...T.categories.map(c=>({...column(c.id,c.name,null,c.help,false),trophy:true}))]
  };
  const defaults={query:'',element:'all',collab:'all',scope:'owned',grouping:'character',period:'all',minimum:0,mode:'average',group:'performance',sort:'rating',direction:'desc'};
  function rows(data,db,state,now=Date.now()){
    if(!db)return [];
    const since=state.period==='all'?0:now-Number(state.period)*86400000;
    const matches=db.matches().filter(m=>m.finalized&&!m.summary.partial),matchIds=new Set(matches.map(m=>m.id)),histories=new Map();
    if(state.scope==='all')for(const m of matches){
      const awarded=T.awards(m.summary);
      for(const u of m.summary.units.filter(u=>u.participated)){
        const list=histories.get(u.cardId)||[];
        list.push({...u,matchId:m.id,winner:m.state.winner,finishedAt:m.updatedAt,trophies:awarded[u.uid]||[]});histories.set(u.cardId,list);
      }
    }
    const out=new Map(),query=normalize(state.query);
    for(const c of data.cards){
      if(state.scope!=='all'&&!db.instances(c.id).length)continue;
      if(state.element!=='all'&&c.element!==state.element)continue;
      const collab=C.universe(c);
      if(state.collab!=='all'&&collab!==state.collab)continue;
      if(query&&!normalize([c.name,c.title,c.id,c.faction].join(' ')).includes(query))continue;
      const key=state.grouping==='version'?c.id:c.characterId;
      if(!out.has(key))out.set(key,{id:key,card:c,versions:[],...T.empty()});
      const r=out.get(key);r.versions.push(c);
      const history=state.scope==='all'?histories.get(c.id)||[]:db.career(c.id).history;
      for(const row of history){
        if(!row.participated||row.partial||state.scope==='all'&&!matchIds.has(row.matchId)||Date.parse(row.finishedAt)<since)continue;
        T.add(r,row,row.trophies);r.history.push(row);
      }
    }
    return [...out.values()].filter(r=>r.games>=Number(state.minimum||0));
  }
  function value(row,col,mode){
    if(col.trophy)return row.trophies[col.key]||0;
    if(col.key==='winRate')return row.games?row.wins/row.games*100:null;
    const total=(row[col.key]||0)*(['physical','guards'].includes(col.key)?60:1);
    return mode==='average'&&col.average?(row.games?total/row.games:null):total;
  }
  function formatted(row,col,mode){
    const n=value(row,col,mode);if(n===null)return '\u2014';
    const decimals=col.key==='winRate'||mode==='average'&&col.average?1:0;
    return n.toLocaleString('fr-FR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
  }
  function sorted(items,state){
    const col=groups[state.group].find(c=>c.key===state.sort),direction=state.direction==='asc'?1:-1;
    return items.slice().sort((a,b)=>{
      if(state.sort==='name')return direction*a.card.name.localeCompare(b.card.name,'fr')||a.id.localeCompare(b.id);
      const av=col?value(a,col,state.mode):0,bv=col?value(b,col,state.mode):0;
      if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
      return direction*((av||0)-(bv||0))||a.card.name.localeCompare(b.card.name,'fr')||a.id.localeCompare(b.id);
    });
  }
  function csv(items,state){
    const columns=groups[state.group],cell=s=>{
      const text=String(s),safe=/^\s*[=+@-]|^[\t\r\n]/.test(text)?"'"+text:text;
      return '"'+safe.replace(/"/g,'""')+'"';
    };
    const header=['Personnage','Versions','Cristal',...columns.map(c=>c.label+(state.mode==='average'&&c.average?' / match':''))];
    const body=items.map(r=>[r.card.name,r.versions.map(c=>c.title).join(' | '),r.card.element,...columns.map(c=>formatted(r,c,state.mode).replace(/[\u00a0\u202f]/g,''))]);
    return '\ufeff'+[header,...body].map(row=>row.map(cell).join(';')).join('\r\n');
  }
  function create({data,getDB,onDetail}){
    let root=null,controller=null,state={...defaults},items=[],snapshot=null;
    const button=(action,id,label,symbol,extra='')=>`<button type="button" data-sheet-action="${action}" data-id="${id}" ${extra}>${symbol?icon(symbol):''}${label}</button>`;
    const choices=(name,options)=>`<label>${name[1]}<select data-sheet-field="${name[0]}">${options.map(([id,label])=>`<option value="${id}" ${String(state[name[0]])===String(id)?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
    function mount(node){
      destroy();root=node;controller=new AbortController();
      root.innerHTML=`<section class="statistics-sheet" aria-label="Statistiques de carri\u00e8re"><header class="sheet-heading"><div><span class="eyebrow">REGISTRE DES RENCONTRES</span><h1>Statistiques</h1></div><div class="sheet-record" role="status"></div>${button('export','','','download','class="icon-button" title="Exporter les lignes filtr\u00e9es en CSV pour Excel" aria-label="Exporter les statistiques en CSV"')}</header><div class="sheet-toolbar"><label class="sheet-search">${icon('search')}<input data-sheet-field="query" type="search" placeholder="Personnage, version..." aria-label="Rechercher un personnage ou une version" value="${esc(state.query)}"></label><div class="sheet-segment" role="group" aria-label="Valeurs affichees">${[['average','Par match'],['total','Totaux']].map(([id,label])=>button('mode',id,label,null,`aria-pressed="${state.mode===id}"`)).join('')}</div></div><details class="sheet-filters" ${innerWidth>699?'open':''}><summary>${icon('sliders-horizontal')}Filtres<span class="sheet-filter-count"></span></summary><div>${choices(['scope','P\u00e9rim\u00e8tre'],[['owned','Ma collection'],['all','Toutes les \u00e9quipes']])}${choices(['grouping','Regrouper'],[['character','Personnages'],['version','Versions']])}${choices(['element','Cristal'],[['all','Tous les cristaux'],...Object.entries(data.elements).map(([id,e])=>[id,e.label]),...(!data.elements.NONE?[['NONE','Sans cristal']]:[])])}${choices(['collab','Univers'],[['all','Tous'],['kalistar','Kalistar'],...C.choices(data.cards)])}${choices(['period','P\u00e9riode'],[['all','Toute la carri\u00e8re'],['30','30 derniers jours'],['90','90 derniers jours']])}${choices(['minimum','Matchs minimum'],[[0,'Tous'],[1,'1 match'],[5,'5 matchs'],[10,'10 matchs']])}${button('reset','','','rotate-ccw','class="icon-button" title="R\u00e9initialiser les filtres" aria-label="R\u00e9initialiser les filtres"')}</div></details><nav class="sheet-tabs" aria-label="Colonnes de statistiques">${[['performance','Performances','chart-no-axes-combined'],['support','Soutiens','hand-heart'],['trophies','Troph\u00e9es','award']].map(([id,label,symbol])=>button('group',id,label,symbol,`aria-pressed="${state.group===id}"`)).join('')}</nav><div class="sheet-scroll" tabindex="0" role="region" aria-label="Tableau des statistiques"><table class="sheet-table" aria-label="Classement des personnages"></table></div><footer class="sheet-footer"><span class="sheet-count" role="status"></span><span>Archives locales · matchs termin\u00e9s</span></footer></section>`;
      root.addEventListener('click',click,{signal:controller.signal});
      root.addEventListener('input',change,{signal:controller.signal});
      root.addEventListener('change',change,{signal:controller.signal});
      refresh();
    }
    function refresh({reload=true}={}){
      if(!root)return;
      if(reload)snapshot=null;
      if(!snapshot){
        const source=getDB();
        if(source){
          const matches=source.matches(),instances=new Map(),careers=new Map();
          // Sorting and typing reuse one read snapshot; a persisted match refreshes it.
          snapshot={matches:()=>matches,instances:id=>{if(!instances.has(id))instances.set(id,source.instances(id));return instances.get(id);},career:id=>{if(!careers.has(id))careers.set(id,source.career(id));return careers.get(id);}};
        }
      }
      const db=snapshot;items=sorted(rows(data,db,state),state);
      const cols=groups[state.group],sort=key=>state.sort===key?(state.direction==='asc'?'ascending':'descending'):'none';
      const rank=(row,index)=>index>0&&state.sort!=='name'&&value(items[index-1],cols.find(c=>c.key===state.sort)||cols[0],state.mode)===value(row,cols.find(c=>c.key===state.sort)||cols[0],state.mode)?'=':index+1;
      root.querySelector('.sheet-table').innerHTML=`<thead><tr><th scope="col" class="sheet-rank">#</th><th scope="col" class="sheet-identity" aria-sort="${sort('name')}">${button('sort','name','Personnage',state.sort==='name'?state.direction==='asc'?'arrow-up':'arrow-down':null,'aria-label="Trier par personnage"')}</th>${cols.map(c=>`<th scope="col" aria-sort="${sort(c.key)}" class="${state.sort===c.key?'sheet-sorted':''}">${button('sort',c.key,(c.trophy?T.image(c.key):'')+`<span>${esc(c.trophy?T.categories.find(t=>t.id===c.key).label:c.label)}</span>`,c.icon,`title="${esc(c.help)}" aria-label="Trier par ${esc(c.label)}"`)}${state.sort===c.key?`<span class="sheet-sort-arrow" aria-hidden="true">${icon(state.direction==='asc'?'arrow-up':'arrow-down')}</span>`:''}</th>`).join('')}</tr></thead><tbody>${items.map((r,index)=>`<tr data-sheet-row="${esc(r.id)}"><td class="sheet-rank">${rank(r,index)}</td><th scope="row" class="sheet-identity"><button type="button" data-sheet-action="detail" data-id="${esc(r.card.id)}"><img src="${esc(KalistarCardMedia.image(r.card))}" alt="" width="32" height="50" loading="lazy"><span><b>${esc(r.card.name)}</b><small>${state.grouping==='version'?esc(r.card.title):esc(data.elements[r.card.element]?.label||'Sans cristal')+(r.versions.length>1?' · '+r.versions.length+' versions':'')}</small></span></button></th>${cols.map(c=>`<td data-metric="${c.key}" class="${state.sort===c.key?'sheet-sorted':''}" title="${esc(c.label+' : '+formatted(r,c,state.mode))}">${formatted(r,c,state.mode)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      let empty=root.querySelector('.sheet-empty');
      if(!items.length&&!empty){empty=document.createElement('p');empty.className='sheet-empty';root.querySelector('.sheet-scroll').append(empty);}
      if(empty){empty.hidden=!!items.length;empty.textContent=db?'Aucun personnage pour ces filtres.':'Base locale indisponible.';}
      const matchCount=new Set(items.flatMap(r=>r.history.map(h=>h.matchId))).size;
      root.querySelector('.sheet-record').innerHTML=`<b>${matchCount}</b> rencontres <span>·</span> <b>${data.cards.length}</b> versions V4`;
      root.querySelector('.sheet-count').textContent=items.length+' '+(state.grouping==='character'?'personnages':'versions')+' · '+(state.mode==='average'?'Moyennes / match':'Totaux');
      root.querySelector('.sheet-filter-count').textContent=Object.keys(defaults).filter(k=>['scope','element','collab','grouping','period','minimum'].includes(k)&&String(state[k])!==String(defaults[k])).length||'';
      root.querySelectorAll('[data-sheet-action=mode],[data-sheet-action=group]').forEach(b=>b.setAttribute('aria-pressed',state[b.dataset.sheetAction]===b.dataset.id));
      root.querySelector('[data-sheet-action=export]').disabled=!items.length;
      globalThis.lucide?.createIcons();
    }
    function change(event){
      const key=event.target.dataset.sheetField;if(!Object.hasOwn(defaults,key))return;
      if(event.type==='input'&&key!=='query'||event.type==='change'&&key==='query')return;
      state[key]=event.target.value;refresh({reload:false});
    }
    function click(event){
      const b=event.target.closest('[data-sheet-action]');if(!b)return;
      const {sheetAction:action,id}=b.dataset;
      if(action==='detail'){onDetail(id);return;}
      if(action==='export'){
        const url=URL.createObjectURL(new Blob([csv(items,state)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
        a.href=url;a.download='Kalistar-statistiques-'+state.group+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
      }
      if(action==='reset'){state={...defaults};mount(root);return;}
      if(action==='sort'){state.direction=state.sort===id&&state.direction==='desc'?'asc':'desc';state.sort=id;}
      if(action==='mode')state.mode=id;
      if(action==='group'){state.group=id;state.sort=id==='performance'?'rating':id==='support'?'support':'crystal';state.direction='desc';}
      refresh({reload:false});root.querySelector(`[data-sheet-action="${action}"][data-id="${id}"]`)?.focus({preventScroll:true});
    }
    function destroy(){controller?.abort();controller=null;root=null;}
    return {mount,destroy,refresh};
  }
  return {defaults,groups,rows,value,sorted,csv,create};
});
