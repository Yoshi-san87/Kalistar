(function(root,factory){
  const T=typeof module==='object'&&module.exports?require('./trophies.js'):root.KalistarTrophies;
  const C=typeof module==='object'&&module.exports?require('./collaborations.js'):root.KalistarCollaborations;
  const I=typeof module==='object'&&module.exports?require('./performance-index.js'):root.KalistarPerformanceIndex;
  const api=factory(T,C,I);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarStatistics=api;
})(typeof window==='undefined'?globalThis:window,(T,C,I)=>{
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const column=(key,label,icon,help,average=true)=>({key,label,icon,help,average});
  const common=[column('games','MJ','swords','Participations aux matchs termin\u00e9s, hors r\u00e9serve non d\u00e9ploy\u00e9e et historiques partiels.',false)];
  const groups={
    performance:[...common,column('wins','V','crown','Victoires.',false),column('losses','D','flag','D\u00e9faites.',false),column('winRate','V %','percent','Pourcentage de victoires.',false),column('kills','Kills','skull','\u00c9liminations d\u00e9finitives.'),column('holds','Blocks','ban','Attaques bloqu\u00e9es, hors Reraise.'),column('attack','ATK','sword','Scores ATK finaux cumul\u00e9s, pas des d\u00e9g\u00e2ts nets.'),column('defense','DEF','shield','Scores DEF finaux cumul\u00e9s.'),column('assists','Assists','waypoints','Passes decisives, nouvelles rencontres uniquement.'),column('rating','Indice','sparkles',I.help+' Archives : formule historique conservee.')],
    support:[...common,column('clovers','Tr\u00e8fles','clover','Nouveaux tr\u00e8fles attribu\u00e9s.'),column('hearts','Reraise','heart','Nouveaux c\u0153urs Reraise attribu\u00e9s.'),column('support','Soutiens','hand-heart','Tous les nouveaux soutiens attribu\u00e9s.'),column('physical','+ATK','sword','Points ATK physiques attribu\u00e9s : 60 par nouveau buff.'),column('guards','+DEF','shield-plus','Points DEF physiques attribu\u00e9s : 60 par nouvelle garde.'),column('potions','Potions','flask-conical','Nouvelles potions attribu\u00e9es.'),column('reraises','Sauv\u00e9s','heart-pulse','Coeurs consomm\u00e9s pour survivre.'),column('debuff','Entrave','shield-minus','Points ATK retir\u00e9s.')],
    trophies:[...common,...T.categories.map(c=>({...column(c.id,c.name,null,c.help,false),trophy:true}))]
  };
  groups.support.push(column('assists','Assists','waypoints','Passes decisives au donneur, hors auto-buff.'),column('cloversConsumedByRecipients','Tr\u00e8fles utilis\u00e9s','clover','Charges consommees, creditees au donneur.'),column('reraisesConsumedByRecipients','Reraise utilis\u00e9s','heart-handshake','Sauvetages credites au donneur.'));
  groups.support.push(column('defensiveAssists','Assists DEF','shield-plus','Sous-ensemble des assists : gardes natives decisives au Block d\u2019un allie, suivi depuis l\u2019indice 3.'));
  groups.performance.splice(-1,0,column('valuedAttack','ATK valoris\u00e9e','sword','ATK plafonnee a DEF + 1 par duel numerique definitif.'),column('valuedDefense','DEF valoris\u00e9e','shield','DEF plafonnee a ATK par duel numerique definitif.'));
  const defaults={query:'',element:'all',collab:'all',position:'',scope:'owned',grouping:'character',period:'all',minimum:0,mode:'average',group:'performance',sort:'rating',direction:'desc'};
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
      if(state.position&&!(c.positions||[]).includes(Number(state.position)))continue;
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
    const games=I.trackedGames(row,col.key);
    if(!games&&['assists','cloversConsumedByRecipients','reraisesConsumedByRecipients','valuedAttack','valuedDefense','defensiveAssists'].includes(col.key))return null;
    return mode==='average'&&col.average?(games?total/games:null):total;
  }
  function formatted(row,col,mode){
    const n=value(row,col,mode);if(n===null)return '\u2014';
    const decimals=col.key==='winRate'||mode==='average'&&col.average?1:0;
    return n.toLocaleString('fr-FR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
  }
  function metricTitle(row,col,mode){
    const current=row.ratingVersions?.[3]||0,previous=row.ratingVersions?.[2]||0,legacy=row.ratingVersions?.[1]||0,tracked=I.trackedGames(row,col.key);
    const provenance=col.key==='rating'?` (${current} indice 3, ${previous} indice 2, ${legacy} indice 1)`:
      ['assists','cloversConsumedByRecipients','reraisesConsumedByRecipients','valuedAttack','valuedDefense','defensiveAssists'].includes(col.key)?` (${tracked} rencontres suivies, ${row.games-tracked} historiques non renseignes)`+(col.key==='assists'?` ; dont ${row.defensiveAssists||0} assists DEF sur ${current} rencontres indice 3`:''):'';
    return col.label+' : '+formatted(row,col,mode)+provenance;
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
    const header=['Personnage','Versions','Cristal',...columns.map(c=>c.label+(state.mode==='average'&&c.average?' / match':'')),'Matchs indice 3','Matchs indice 2','Matchs historiques'];
    const body=items.map(r=>[r.card.name,r.versions.map(c=>c.title).join(' | '),r.card.element,...columns.map(c=>formatted(r,c,state.mode).replace(/[\u00a0\u202f]/g,'')),r.ratingVersions?.[3]||0,r.ratingVersions?.[2]||0,r.ratingVersions?.[1]||0]);
    return '\ufeff'+[header,...body].map(row=>row.map(cell).join(';')).join('\r\n');
  }
  function create({data,getDB,onDetail}){
    let root=null,controller=null,state={...defaults},items=[],snapshot=null,expanded=null;
    const button=(action,id,label,symbol,extra='')=>`<button type="button" data-sheet-action="${action}" data-id="${id}" ${extra}>${symbol?icon(symbol):''}${label}</button>`;
    const choices=(name,options)=>`<label>${name[1]}<select data-sheet-field="${name[0]}">${options.map(([id,label])=>`<option value="${esc(id)}" ${String(state[name[0]])===String(id)?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
    const compactQuery='(max-width:699px),(pointer:coarse) and (max-width:1100px) and (max-height:500px)';
    const compact=()=>matchMedia(compactQuery).matches;
    const rowKey=row=>state.grouping+':'+row.id;
    const panelId=row=>'sheet-details-'+encodeURIComponent(rowKey(row));
    const positions=row=>[...new Set(row.versions.flatMap(c=>c.positions||[]))].filter(p=>Number.isInteger(p)&&p>=1&&p<=5).sort((a,b)=>a-b);
    function accordion(row){
      const metrics=(name,columns)=>`<section class="sheet-detail-metrics" aria-label="${name}"><h3>${name}</h3><dl>${columns.map(c=>`<div data-detail-metric="${c.key}" data-empty="${value(row,c,state.mode)===null}" title="${esc(c.help+' '+metricTitle(row,c,state.mode))}"><dt>${icon(c.icon)}${esc(c.label)}</dt><dd>${formatted(row,c,state.mode)}</dd></div>`).join('')}</dl></section>`;
      const number=n=>(n||0).toLocaleString('fr-FR');
      return `<header class="sheet-detail-heading">
        <div><h2>${esc(row.card.name)}</h2><p>${esc(row.card.title)}${row.versions.length>1?' \u00b7 '+row.versions.length+' versions':''}</p>${globalThis.KalistarPositions.list(positions(row),{className:'sheet-detail-positions'})}</div>
        ${button('collapse',esc(rowKey(row)),'','chevron-up','class="icon-button" title="Fermer les d\u00e9tails" aria-label="Fermer les d\u00e9tails de '+esc(row.card.name)+'"')}
      </header>
      <div class="sheet-detail-summary"><span>${state.mode==='average'?'Par match':'Totaux'} \u00b7 ${number(row.games)} MJ</span>${button('detail',esc(row.card.id),'Ouvrir la carte','scan-eye','data-kui="command" aria-label="Ouvrir la carte '+esc(row.card.name)+' \u00b7 '+esc(row.card.title)+'"')}</div>
      ${metrics('Performances',groups.performance)}
      ${metrics('Soutiens',groups.support.filter(c=>c.key!=='games'&&c.key!=='assists'))}
      <section class="sheet-detail-trophies" aria-label="Troph\u00e9es"><h3>Troph\u00e9es</h3><ul>${T.categories.map(c=>`<li data-detail-trophy="${c.id}" data-earned="${!!row.trophies[c.id]}">${T.image(c.id)}<span>${esc(c.name)}<b>${number(row.trophies[c.id])}</b></span></li>`).join('')}</ul></section>
      <section class="sheet-detail-provenance" aria-label="Provenance de l\u2019indice"><h3>${icon('archive')}Provenance de l\u2019indice</h3>
        <dl>${[3,2,1].map(v=>`<div data-rating-version="${v}"><dt>Indice ${v}</dt><dd>${number(row.ratingVersions?.[v])} MJ</dd></div>`).join('')}</dl>
        <p>${row.games?'Notes d\u2019origine conserv\u00e9es.':'Aucune rencontre termin\u00e9e.'} ATK valoris\u00e9e, DEF valoris\u00e9e et assists DEF : indice 3. Assists et charges utilis\u00e9es : indices 2/3. ${number(row.ratingVersions?.[1])} MJ sans suivi des donneurs.</p>
      </section>`;
    }
    function toggleAccordion(key,close=false){
      if(!compact())return;
      const row=items.find(r=>rowKey(r)===key);if(!row)return;
      const previous=expanded;
      expanded=close||expanded===key?null:key;
      for(const r of items.filter(r=>rowKey(r)===previous||rowKey(r)===key)){
        const panel=document.getElementById(panelId(r)),trigger=document.getElementById(panelId(r)+'-toggle');
        if(!panel||!trigger)continue;
        const open=rowKey(r)===expanded;
        panel.closest('.sheet-detail-row').hidden=!open;
        panel.innerHTML=open?accordion(r):'';
        trigger.setAttribute('aria-expanded',String(open));
        trigger.closest('[data-sheet-row]').dataset.expanded=String(open);
      }
      globalThis.KalistarUI?.icons(root)??globalThis.lucide?.createIcons({root});
      document.getElementById(panelId(row)+'-toggle')?.focus({preventScroll:true});
    }
    function closeFilters(focus=false){
      const filters=root?.querySelector('.sheet-filters');
      if(!filters?.open)return;
      filters.open=false;if(focus)filters.querySelector('summary').focus();
    }
    function mount(node){
      destroy();root=node;controller=new AbortController();
      root.innerHTML=`<section class="statistics-sheet" aria-label="Statistiques de carri\u00e8re">
        <header class="sheet-heading">
          <img class="sheet-emblem" src="assets/navigation/statistics-v1.webp" alt="" width="64" height="64">
          <div class="sheet-title"><span class="eyebrow">REGISTRE DES RENCONTRES</span><h1>Statistiques</h1></div>
          <div class="sheet-record" role="status"></div>
          ${button('export','','','download','class="icon-button" title="Exporter les lignes filtr\u00e9es en CSV pour Excel" aria-label="Exporter les statistiques en CSV"')}
        </header>
        <div class="sheet-toolbar">
          <label class="sheet-search">${icon('search')}<input data-sheet-field="query" type="search" placeholder="Personnage, version..." aria-label="Rechercher un personnage ou une version" value="${esc(state.query)}"></label>
          <div class="sheet-segment" role="group" aria-label="Valeurs affich\u00e9es">${[['average','Par match'],['total','Totaux']].map(([id,label])=>button('mode',id,label,null,`aria-pressed="${state.mode===id}"`)).join('')}</div>
        </div>
        <details class="sheet-filters" ${!compact()?'open':''}>
          <summary title="Filtres" aria-label="Filtres">${icon('sliders-horizontal')}Filtres<span class="sheet-filter-count" aria-hidden="true"></span>${icon('chevron-down')}</summary>
          <div class="sheet-filter-fields">
            ${choices(['scope','P\u00e9rim\u00e8tre'],[['owned','Ma collection'],['all','Toutes les \u00e9quipes']])}
            ${choices(['grouping','Regrouper'],[['character','Personnages'],['version','Versions']])}
            ${choices(['element','Cristal'],[['all','Tous les cristaux'],...Object.entries(data.elements).map(([id,e])=>[id,e.label]),...(!data.elements.NONE?[['NONE','Sans cristal']]:[])])}
            ${choices(['collab','Univers'],[['all','Tous les univers'],['kalistar','Kalistar'],...C.choices(data.cards)])}
            ${choices(['period','P\u00e9riode'],[['all','Toute la carri\u00e8re'],['30','30 derniers jours'],['90','90 derniers jours']])}
            ${choices(['minimum','Matchs minimum'],[[0,'Tous'],[1,'1 match'],[5,'5 matchs'],[10,'10 matchs']])}
            <div class="sheet-position-filter">${globalThis.KalistarPositions.picker({name:'position',value:state.position,attributes:'data-sheet-field="position"'})}</div>
            <div class="sheet-filter-actions">
              ${button('reset','','','rotate-ccw','class="icon-button" title="R\u00e9initialiser les filtres" aria-label="R\u00e9initialiser les filtres"')}
              ${button('close-filters','','','check','class="icon-button sheet-filter-done" title="Appliquer et fermer les filtres" aria-label="Appliquer et fermer les filtres"')}
            </div>
          </div>
        </details>
        <div class="sheet-viewbar">
          <nav class="sheet-tabs" aria-label="Colonnes de statistiques">${[['performance','Performances','chart-no-axes-combined'],['support','Soutiens','hand-heart'],['trophies','Troph\u00e9es','award']].map(([id,label,symbol])=>button('group',id,label,symbol,`aria-pressed="${state.group===id}"`)).join('')}</nav>
          <div class="sheet-order"><label>Classer par<select data-sheet-field="sort" aria-label="Classer par"></select></label>${button('direction','','','arrow-down-wide-narrow','class="icon-button" aria-label="Ordre d\u00e9croissant" title="Changer le sens du classement"')}</div>
        </div>
        <div class="sheet-scroll" tabindex="0" role="region" aria-label="Tableau des statistiques"><table class="sheet-table" aria-label="Classement des personnages"></table></div>
        <footer class="sheet-footer"><span class="sheet-count" role="status"></span><span>${icon('archive')} Archives locales <span aria-hidden="true">\u00b7</span> matchs termin\u00e9s</span></footer>
      </section>`;
      root.addEventListener('click',click,{signal:controller.signal});
      root.addEventListener('input',change,{signal:controller.signal});
      root.addEventListener('change',change,{signal:controller.signal});
      matchMedia(compactQuery).addEventListener('change',()=>{
        closeFilters();refresh({reload:false});
      },{signal:controller.signal});
      document.addEventListener('pointerdown',event=>{
        if(compact()&&!event.target.closest('.sheet-filters'))closeFilters();
      },{signal:controller.signal});
      root.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&event.target.closest('.sheet-filters')){event.preventDefault();closeFilters(true);}
        else if(event.key==='Escape'&&expanded&&event.target.closest('.sheet-table')){event.preventDefault();toggleAccordion(expanded,true);}
      },{signal:controller.signal});
      refresh();
    }
    function refresh({reload=true}={}){
      if(!root)return;
      const table=root.querySelector('.sheet-table'),active=table.contains(document.activeElement)?document.activeElement.closest('[data-sheet-action]'):null;
      const focus=active?{action:active.dataset.sheetAction,id:active.dataset.id}:null;
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
      if(expanded&&!items.some(r=>rowKey(r)===expanded))expanded=null;
      const columns=groups[state.group],selected=columns.find(c=>c.key===state.sort);
      // Put the chosen metric beside the fixed identity on phones, not off-screen.
      const phone=compact(),cols=phone&&selected?[selected,...columns.filter(c=>c!==selected)]:columns;
      const sort=key=>state.sort===key?(state.direction==='asc'?'ascending':'descending'):'none';
      const rank=(row,index)=>index>0&&state.sort!=='name'&&value(items[index-1],cols.find(c=>c.key===state.sort)||cols[0],state.mode)===value(row,cols.find(c=>c.key===state.sort)||cols[0],state.mode)?'=':index+1;
      const activeColumn=cols.find(c=>c.key===state.sort);
      table.innerHTML=`<thead><tr>
        <th scope="col" class="sheet-rank">#</th>
        <th scope="col" class="sheet-identity" aria-sort="${sort('name')}">${button('sort','name','Personnage',state.sort==='name'?state.direction==='asc'?'arrow-up':'arrow-down':null,'aria-label="Trier par personnage"')}</th>
        ${cols.map(c=>`<th scope="col" aria-sort="${sort(c.key)}" class="${state.sort===c.key?'sheet-sorted':''}">${button('sort',c.key,(c.trophy?T.image(c.key):'')+`<span>${esc(c.label)}</span>`,c.icon,`title="${esc(c.help)}" aria-label="Trier par ${esc(c.label)}"`)}${state.sort===c.key?`<span class="sheet-sort-arrow" aria-hidden="true">${icon(state.direction==='asc'?'arrow-up':'arrow-down')}</span>`:''}</th>`).join('')}
      </tr></thead><tbody>${items.map((r,index)=>{
        const score=activeColumn?value(r,activeColumn,state.mode):null;
        const ranked=state.sort!=='name'&&r.games>0&&score!==null&&score>0;
        const open=phone&&expanded===rowKey(r),id=panelId(r),compatible=positions(r);
        return `<tr data-sheet-row="${esc(r.id)}" data-sheet-key="${esc(rowKey(r))}" data-sheet-alternate="${index%2===1}" data-expanded="${open}" data-played="${r.games>0}" data-leader="${ranked&&index===0&&state.direction==='desc'}">
          <td class="sheet-rank">${ranked?rank(r,index):'\u2014'}</td>
          <th scope="row" class="sheet-identity"><button type="button" data-sheet-action="${phone?'accordion':'detail'}" data-id="${esc(phone?rowKey(r):r.card.id)}" ${phone?`id="${id}-toggle" aria-expanded="${open}" aria-controls="${id}"`:''} aria-label="${phone?'D\u00e9tails de':'Voir'} ${esc([r.card.name,...compatible.map(p=>globalThis.KalistarPositions.label(p))].join(' \u00b7 '))}">
            <img src="${esc(KalistarCardMedia.image(r.card,'art'))}" alt="" width="36" height="44" loading="lazy">
            <span><b>${esc(r.card.name)}</b><small>${state.grouping==='version'?esc(r.card.title):esc(data.elements[r.card.element]?.label||'Sans cristal')+(r.versions.length>1?' \u00b7 '+r.versions.length+' versions':'')}</small>${globalThis.KalistarPositions.list(compatible,{className:'sheet-row-positions'})}</span>
            ${phone?icon('chevron-down'):''}
          </button></th>
          ${cols.map(c=>`<td data-metric="${c.key}" data-empty="${value(r,c,state.mode)===null}" class="${state.sort===c.key?'sheet-sorted':''}" title="${esc(metricTitle(r,c,state.mode))}">${formatted(r,c,state.mode)}</td>`).join('')}
        </tr>${phone?`<tr class="sheet-detail-row" ${open?'':'hidden'}><td colspan="${cols.length+2}"><section class="sheet-accordion" id="${id}" role="region" aria-labelledby="${id}-toggle">${open?accordion(r):''}</section></td></tr>`:''}`;
      }).join('')}</tbody>`;
      root.querySelector('.sheet-order select').innerHTML=[['name','Personnage'],...columns.map(c=>[c.key,c.label])].map(([id,label])=>`<option value="${id}" ${state.sort===id?'selected':''}>${esc(label)}</option>`).join('');
      const directionButton=root.querySelector('[data-sheet-action=direction]');
      directionButton.setAttribute('aria-label',state.direction==='asc'?'Ordre croissant':'Ordre d\u00e9croissant');
      directionButton.innerHTML=icon(state.direction==='asc'?'arrow-up-narrow-wide':'arrow-down-wide-narrow');
      let empty=root.querySelector('.sheet-empty');
      if(!items.length&&!empty){empty=document.createElement('div');empty.className='sheet-empty';empty.setAttribute('role','status');root.querySelector('.sheet-scroll').append(empty);}
      if(empty){empty.hidden=!!items.length;empty.innerHTML=`${icon(db?'search-x':'database')}<b>${db?'Aucun personnage pour ces filtres.':'Base locale indisponible.'}</b>${db?button('reset','','R\u00e9initialiser les filtres','rotate-ccw','data-kui="command"'):''}`;}
      const matchCount=new Set(items.flatMap(r=>r.history.map(h=>h.matchId))).size;
      root.querySelector('.sheet-record').innerHTML=`<span><b>${matchCount}</b>Rencontres</span><span><b>${items.length}</b>${state.grouping==='character'?'Personnages':'Versions'}</span>`;
      root.querySelector('.sheet-count').textContent=items.length+' '+(state.grouping==='character'?'personnages':'versions')+' · '+(state.mode==='average'?'Moyennes / match':'Totaux');
      root.querySelector('.sheet-filter-count').textContent=Object.keys(defaults).filter(k=>['scope','element','collab','position','grouping','period','minimum'].includes(k)&&String(state[k])!==String(defaults[k])).length||'';
      root.querySelectorAll('[data-sheet-action=mode],[data-sheet-action=group]').forEach(b=>b.setAttribute('aria-pressed',state[b.dataset.sheetAction]===b.dataset.id));
      root.querySelector('[data-sheet-action=export]').disabled=!items.length;
      globalThis.KalistarUI?.icons(root)??globalThis.lucide?.createIcons({root});
      if(focus){
        const target=[...table.querySelectorAll('[data-sheet-action]')].find(b=>b.dataset.sheetAction===focus.action&&b.dataset.id===focus.id);
        (target||root.querySelector('.sheet-scroll')).focus({preventScroll:true});
      }
    }
    function change(event){
      const key=event.target.dataset.sheetField;if(!Object.hasOwn(defaults,key))return;
      if(event.type==='input'&&key!=='query'||event.type==='change'&&key==='query')return;
      if(key==='sort'&&!['name',...groups[state.group].map(c=>c.key)].includes(event.target.value))return;
      state[key]=event.target.value;refresh({reload:false});
      if(key==='sort'&&compact())root.querySelector('.sheet-scroll').scrollLeft=0;
    }
    function click(event){
      const b=event.target.closest('[data-sheet-action]');
      if(!b){const row=event.target.closest('[data-sheet-row]');if(row&&compact())toggleAccordion(row.dataset.sheetKey);return;}
      if(b.disabled)return;
      const {sheetAction:action,id}=b.dataset;
      if(action==='accordion'||action==='collapse'){toggleAccordion(id,action==='collapse');return;}
      if(action==='close-filters'){closeFilters(true);return;}
      if(action==='detail'){onDetail(id);return;}
      if(action==='export'){
        const url=URL.createObjectURL(new Blob([csv(items,state)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
        a.href=url;a.download='Kalistar-statistiques-'+state.group+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
      }
      if(action==='reset'){state={...defaults};mount(root);return;}
      if(action==='sort'){state.direction=state.sort===id&&state.direction==='desc'?'asc':'desc';state.sort=id;}
      if(action==='direction')state.direction=state.direction==='desc'?'asc':'desc';
      if(action==='sort'&&compact())root.querySelector('.sheet-scroll').scrollLeft=0;
      if(action==='mode')state.mode=id;
      if(action==='group'){state.group=id;state.sort=id==='performance'?'rating':id==='support'?'support':'crystal';state.direction='desc';root.querySelector('.sheet-scroll').scrollTo(0,0);}
      refresh({reload:false});root.querySelector(`[data-sheet-action="${action}"][data-id="${id}"]`)?.focus({preventScroll:true});
    }
    function destroy(){controller?.abort();controller=null;root=null;expanded=null;}
    return {mount,destroy,refresh};
  }
  return {defaults,groups,rows,value,metricTitle,sorted,csv,create};
});
