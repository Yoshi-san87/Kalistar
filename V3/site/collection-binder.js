(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarCollection=api;
})(typeof globalThis==='undefined'?this:globalThis,()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const number=v=>Number(v||0).toLocaleString('fr-FR');
  const key=c=>c.characterId||c.id;
  const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  function groupCards(cards){
    const groups=new Map();
    for(const card of cards){if(!groups.has(key(card)))groups.set(key(card),[]);groups.get(key(card)).push(card);}
    return [...groups.values()];
  }
  function textPages(text,limit){
    const pages=[];let page='';
    for(const word of String(text||'').match(/\S+\s*/g)||[]){
      if(page&&page.length+word.length>limit){pages.push(page.trim());page='';}page+=word;
    }
    if(page)pages.push(page.trim());return pages.length?pages:[''];
  }
  function create({data,getOwned=()=>[],getFavorites=()=>new Set(),getCareer=()=>null,onFavorite=()=>{},onRegistry=()=>{},onArchives=()=>{},onHistory=()=>{},artImage=c=>'assets/cards/'+c.slug+'-art.webp',profile=''}={}){
    if(!Array.isArray(data?.cards)||!data.cards.length)throw new Error('Catalogue V3 requis.');
    const cards=data.cards,byId=new Map(cards.map(c=>[c.id,c])),covers=new Map();
    const elements={...data.elements,NONE:data.elements.NONE||{id:'NONE',label:'Sans cristal',color:'93AAA5'}};
    let root=null,observer=null,painting=false,scope='owned',page=0,pageSize=8,selected=null,tab='story',art=false,filtersOpen=false,sort='id';
    let storyPage=0,historyPage=0,copyPage=0,instance='all',textLimit=600,motion='',swipe=null;
    const filters={search:'',element:'',faction:'',race:'',position:'',weapon:'',favorite:false};
    const owns=id=>getOwned(id)||[];
    const asset=(folder,name)=>'../assets/'+folder+'/'+encodeURIComponent(name)+'.png';
    const image=c=>'assets/cards/'+encodeURIComponent(c.slug)+'-full.png';
    const button=(action,symbol,label,extra='')=>`<button type="button" class="cb-icon" data-binder-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(symbol)}</button>`;
    const element=c=>elements[c.element]||elements.NONE;
    const crystal=c=>`<img src="${asset('cristaux',c.element)}" alt="${esc(element(c).label)}">`;
    function filtered(){
      const favorites=getFavorites(),search=normalize(filters.search.trim());
      return cards.filter(c=>(scope==='catalogue'||owns(c.id).length)&&(!filters.favorite||favorites.has(c.id))&&
        (!search||normalize([c.name,c.title,c.faction,c.race,c.id].join(' ')).includes(search))&&
        ['element','faction','race','weapon'].every(field=>!filters[field]||filters[field]===c[field])&&
        (!filters.position||c.positions.includes(Number(filters.position))))
        .sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'fr'):sort==='element'?a.element.localeCompare(b.element):sort==='faction'?a.faction.localeCompare(b.faction,'fr'):a.id.localeCompare(b.id));
    }
    function snapshot(){
      const list=filtered(),groups=groupCards(list),pages=Math.max(1,Math.ceil(groups.length/pageSize));
      page=Math.max(0,Math.min(page,pages-1));
      if(selected&&!list.some(c=>c.id===selected))selected=null;
      if(selected){const index=groups.findIndex(g=>g.some(c=>c.id===selected));page=Math.floor(index/pageSize);}
      return {list,groups,pages,current:groups.slice(page*pageSize,(page+1)*pageSize)};
    }
    function clearReading(){storyPage=historyPage=copyPage=0;instance='all';}
    function select(id){if(!filtered().some(c=>c.id===id))return;selected=id;covers.set(key(byId.get(id)),id);clearReading();filtersOpen=false;}
    function pager(action,index,count,label){return `<nav class="cb-subpager" aria-label="${esc(label)}">${button(action,'chevron-left','Précédent',`data-index="${index-1}" ${index===0?'disabled':''}`)}<span>${index+1} / ${count}</span>${button(action,'chevron-right','Suivant',`data-index="${index+1}" ${index>=count-1?'disabled':''}`)}</nav>`;}
    function pocket(group,index){
      const c=group.find(c=>c.id===covers.get(key(c)))||group.find(c=>getFavorites().has(c.id))||group[0],owned=owns(c.id).length,favorite=getFavorites().has(c.id);
      return `<article class="cb-pocket ${owned?'':'is-unowned'}" data-character="${esc(key(c))}" data-card-id="${c.id}" style="--card-color:#${element(c).color};--pocket-order:${index}">
        <div class="cb-stack">${group.filter(v=>v.id!==c.id).slice(0,2).map((v,i)=>`<img class="cb-behind cb-layer-${i}" src="${image(v)}" alt="" aria-hidden="true" draggable="false">`).join('')}
        <button type="button" class="cb-card" data-binder-action="open" data-id="${c.id}" aria-label="Consulter ${esc(c.name+' : '+c.title)}"><img src="${image(c)}" alt="${esc(c.name+' : '+c.title)}" draggable="false"></button>
        ${group.length>1?`<span class="cb-version-count" title="${group.length} versions">${icon('layers-3')}${group.length}</span>`:''}</div>
        <div class="cb-caption"><div><h2>${esc(c.name)}</h2><span>${owned?`${owned} exemplaire${owned>1?'s':''}`:'Non possédée'}${group.length>1?' · '+group.length+' versions':''}</span></div>${button('favorite','star','Favori : '+c.name,`data-id="${c.id}" aria-pressed="${favorite}"`)}</div>
      </article>`;
    }
    function filtersHTML(){
      const choose=(field,label,options)=>`<label>${label}<select data-binder-filter="${field}"><option value="">Tous</option>${options.map(([value,text])=>`<option value="${esc(value)}" ${filters[field]===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
      const values=field=>[...new Set(cards.map(c=>c[field]))].sort((a,b)=>a.localeCompare(b,'fr')).map(value=>[value,value]);
      return `<aside class="cb-filters" aria-label="Filtres du classeur" ${filtersOpen?'':'hidden'}><div class="cb-filter-heading"><h2>Retrouver une carte</h2>${button('filters','x','Fermer les filtres')}</div>
        ${choose('element','Cristal',Object.values(elements).map(e=>[e.id,e.label]))}${choose('faction','Faction',values('faction'))}${choose('race','Race',values('race'))}
        ${choose('position','Poste',[['1','P1 · Tank'],['2','P2 · DPS physique'],['3','P3 · Middle'],['4','P4 · DPS magique'],['5','P5 · Support']])}${choose('weapon','Arme',values('weapon'))}
        <button type="button" data-binder-action="reset">${icon('filter-x')}Tout effacer</button></aside>`;
    }
    function book(s){
      if(!s.current.length)return `<div class="cb-empty">${icon(scope==='owned'&&!owns().length?'book-heart':'search')}<h2>${scope==='owned'&&!owns().length?'Ton classeur attend sa première carte':'Aucune carte ici'}</h2><p>${scope==='owned'&&!owns().length?'Chaque collection commence par une rencontre.':'Essaie une autre recherche ou un autre filtre.'}</p><button type="button" data-binder-action="${scope==='owned'&&!owns().length?'registry':'reset'}">${icon(scope==='owned'&&!owns().length?'key-round':'filter-x')}${scope==='owned'&&!owns().length?'Activation et transferts':'Tout effacer'}</button>${scope==='owned'&&!owns().length?'<button type="button" class="cb-text-button" data-binder-action="scope" data-id="catalogue">Parcourir le catalogue</button>':''}</div>`;
      const half=pageSize/2;
      return `<div class="cb-spread" data-motion="${motion}" style="--cb-rows:${pageSize===8?2:1};--cb-columns:${pageSize===2?1:2}" aria-label="Double page ${page+1}">${[0,1].map(side=>`<section class="cb-sheet" aria-label="Page ${page*2+side+1}">${Array.from({length:half},(_,i)=>s.current[side*half+i]?pocket(s.current[side*half+i],i):'<div class="cb-pocket cb-pocket-empty" aria-hidden="true"></div>').join('')}<span class="cb-folio" aria-hidden="true">${String(page*2+side+1).padStart(2,'0')}</span></section>`).join('')}</div>`;
    }
    function profileHTML(c){
      const face=(v,isAttack)=>typeof v==='number'?number(v):`<img src="${asset('effets',v)}" alt="${esc(({guard:'Garde',retry:isAttack?'Trèfle':'Relance',mana:'Potion',revive:'Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Puissance physique'})[v]||v)}">`;
      return `<div class="cb-profile"><div class="cb-identity"><img src="${asset('factions',c.faction)}" alt=""><span><b>${esc(c.faction)}</b><small>${esc(c.job)}</small></span><img src="${asset('races',c.race)}" alt=""><span><b>${esc(c.race)}</b><small>${c.positions.map(p=>'P'+p).join(' · ')}</small></span></div>
        <p class="cb-weapon">${icon('sword')}${esc(c.weapon)}<span>${esc(element(c).label)}</span></p>
        <table class="cb-faces"><caption>Faces de la carte</caption><thead><tr><th>Dé</th>${[6,5,4,3,2,1].map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${[['ATK',c.atk,true],['DEF',c.defense,false]].map(([label,faces,attack])=>`<tr><th>${label}</th>${faces.map((v,i)=>`<td class="${(attack?c.magic:c.barriers).includes(6-i)?'is-magic':''}" title="${attack?c.magic.includes(6-i)?'Magique':'Physique':c.barriers.includes(6-i)?'Barrière magique':'Défense'}">${face(v,attack)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <p class="cb-affinity">${c.element==='NONE'?'Sans cristal · aucun bonus élémentaire':c.element==='RAINBOW'?'+40 contre les cristaux classiques · +30 contre sans cristal':`+${number(c.advantage)} ${esc(elements[element(c).strong_against]?.label||'')} · −${number(c.disadvantage)} ${esc(elements[element(c).weak_against]?.label||'')} · +20 contre sans cristal`}</p></div>`;
    }
    function careerHTML(c){
      const items=owns(c.id);if(instance!=='all'&&!items.some(i=>i.id===instance))instance='all';
      const stats=getCareer(c.id,instance==='all'?null:instance);
      if(!stats)return '<p class="cb-note">Carrière indisponible : le registre local n’est pas ouvert.</p>';
      const rows=stats.history||[],pages=Math.max(1,rows.length);historyPage=Math.min(historyPage,pages-1);const match=rows[historyPage];
      const metrics=[['trophy','mvp','MVP'],['skull','kills','Kills'],['ban','holds','Stops'],['hand-heart','support','Soutiens'],['sword','attack','ATK cumulée'],['shield','defense','DEF cumulée']];
      return `<div class="cb-career"><label class="cb-instance-select">Exemplaire<select data-binder-field="instance"><option value="all">Tous · ${items.length}</option>${items.map((i,n)=>`<option value="${esc(i.id)}" ${instance===i.id?'selected':''}>${n+1} · ${esc(i.id)}</option>`).join('')}</select></label><div class="cb-record"><strong>${stats.games?Math.round(stats.wins/stats.games*100):0}<small>% victoires</small></strong><span><b>${number(stats.wins)} V · ${number(stats.losses)} D · ${number(stats.draws)} N</b><small>${number(stats.games)} matchs terminés</small></span></div><dl class="cb-career-grid">${metrics.map(([symbol,k,label])=>`<div><dt>${icon(symbol)}${label}</dt><dd>${number(stats[k])}</dd></div>`).join('')}</dl><div class="cb-history">${match?`<button type="button" data-binder-action="history" data-id="${esc(match.matchId)}"><b>${match.winner==='draw'?'N':match.winner===match.side?'V':'D'}</b><span>${esc(match.seed)}<small>${new Date(match.finishedAt).toLocaleDateString('fr-FR')}</small></span>${icon('chevron-right')}</button>`:'<p>Aucune rencontre terminée.</p>'}${rows.length>1?pager('history-page',historyPage,pages,'Rencontres'):''}</div></div>`;
    }
    function copiesHTML(c){
      const items=owns(c.id),pages=Math.max(1,Math.ceil(items.length/2));copyPage=Math.min(copyPage,pages-1);
      return `<div class="cb-copies"><h3>${items.length} exemplaire${items.length>1?'s':''} dans ton classeur</h3>${items.slice(copyPage*2,copyPage*2+2).map(item=>`<article class="cb-copy">${icon('fingerprint')}<div><b>${esc(item.id)}</b><small>Émis le ${new Date(item.createdAt).toLocaleDateString('fr-FR')}</small></div></article>`).join('')||'<p class="cb-note">Cette version n’appartient pas à ce profil.</p>'}${items.length>2?pager('copy-page',copyPage,pages,'Exemplaires'):''}<button type="button" data-binder-action="registry" data-id="${c.id}">${icon(items.length?'arrow-right-left':'key-round')}${items.length?'Exemplaires et transferts':'Activer un exemplaire'}</button></div>`;
    }
    function reader(s){
      const c=byId.get(selected),versions=s.list.filter(v=>key(v)===key(c)),pages=textPages(c.text,textLimit);storyPage=Math.min(storyPage,pages.length-1);
      const content=tab==='profile'?profileHTML(c):tab==='career'?careerHTML(c):tab==='copies'?copiesHTML(c):`<div class="cb-story"><span class="cb-story-kicker">${esc(c.job)} · ${esc(c.faction)}</span><p>${esc(pages[storyPage])}</p>${pages.length>1?pager('story-page',storyPage,pages.length,'Récit'):''}</div>`;
      return `<div class="cb-reader" data-motion="${motion}" style="--card-color:#${element(c).color}"><figure class="cb-visual"><div class="cb-media-tools" role="group" aria-label="Visuel de la carte"><button type="button" data-binder-action="media" data-id="card" aria-pressed="${!art}">${icon('credit-card')}Carte</button><button type="button" data-binder-action="media" data-id="art" aria-pressed="${art}">${icon('image')}Illustration</button></div><img class="cb-hero-image ${art?'is-art':''}" src="${art?artImage(c):image(c)}" alt="${esc((art?'Illustration de ':'Carte de ')+c.name+' : '+c.title)}"><figcaption>#${c.id}<a href="../cartes/${encodeURIComponent(c.slug)}.png" download title="PNG d’impression" aria-label="Télécharger le PNG d’impression">${icon('download')}</a></figcaption></figure>
        <section class="cb-reading"><header class="cb-card-heading"><div><span class="cb-eyebrow">${esc(element(c).label)} · ${owns(c.id).length?'Dans ton classeur':'Non possédée'}</span><h2>${esc(c.name)}</h2><p>${esc(c.title)}</p></div>${button('favorite','star','Favori : '+c.name,`data-id="${c.id}" aria-pressed="${getFavorites().has(c.id)}"`)}</header>
        <div class="cb-versions" aria-label="Versions de ${esc(c.name)}">${versions.map((v,i)=>`<button type="button" data-binder-action="version" data-id="${v.id}" aria-pressed="${v.id===selected}" title="${esc(v.title)}">${crystal(v)}<span>${versions.length>1?'Version '+(i+1):'Édition V3'}</span></button>`).join('')}</div>
        <div class="cb-reading-tabs" role="tablist" aria-label="Détails de la carte">${[['story','book-open','Récit'],['profile','scan-line','Fiche'],['career','medal','Carrière'],['copies','fingerprint','Exemplaires']].map(([id,symbol,label])=>`<button type="button" role="tab" id="cb-tab-${id}" aria-controls="cb-read-content" aria-selected="${tab===id}" tabindex="${tab===id?0:-1}" data-binder-action="tab" data-id="${id}">${icon(symbol)}${label}</button>`).join('')}</div>
        <div id="cb-read-content" class="cb-read-content" role="tabpanel" aria-labelledby="cb-tab-${tab}">${content}</div></section></div>`;
    }
    function render(){
      const s=snapshot(),allOwned=owns(),ownedVersions=new Set(allOwned.map(i=>i.cardId)).size;
      const active=Object.values(filters).some(Boolean),index=s.list.findIndex(c=>c.id===selected);
      return `<section class="cb-page" data-mode="${selected?'reader':'book'}" tabindex="-1" aria-label="Classeur de collection">
        <header class="cb-heading"><div class="cb-title"><span class="cb-eyebrow">Kalistar · ${esc(profile)}</span><h1>${selected?'Au fil des cartes':'Mon classeur'}</h1></div><div class="cb-scopes" role="group" aria-label="Contenu du classeur"><button type="button" data-binder-action="scope" data-id="owned" aria-pressed="${scope==='owned'}">${icon('book-heart')}Mes cartes <b>${allOwned.length}</b></button><button type="button" data-binder-action="scope" data-id="catalogue" aria-pressed="${scope==='catalogue'}">${icon('library')}Catalogue</button></div><div class="cb-completion"><span><b>${ownedVersions}</b> / ${cards.length} versions</span><meter min="0" max="${cards.length}" value="${ownedVersions}" aria-label="Versions possédées">${ownedVersions}/${cards.length}</meter></div>${button('archives','archive','Archives et sauvegardes')}</header>
        <div class="cb-toolbar">${selected?`<button type="button" class="cb-back" data-binder-action="back">${icon('arrow-left')}Classeur</button>`:`<span class="cb-count">${s.groups.length} personnage${s.groups.length>1?'s':''} · ${s.list.length} versions</span>`}<label class="cb-search">${icon('search')}<input type="search" data-binder-field="search" aria-label="Rechercher une carte" placeholder="Retrouver une carte" value="${esc(filters.search)}"></label>${button('favorites','star','Mes favoris',`aria-pressed="${filters.favorite}"`)}${button('filters','sliders-horizontal','Filtres du classeur',`aria-expanded="${filtersOpen}"`)}${active?button('reset','filter-x','Effacer les filtres'):''}<select data-binder-field="sort" aria-label="Trier le classeur">${[['id','Ordre du classeur'],['name','Personnage'],['element','Cristal'],['faction','Faction']].map(([id,label])=>`<option value="${id}" ${sort===id?'selected':''}>${label}</option>`).join('')}</select></div>
        ${filtersHTML()}<div class="cb-workbench">${selected?reader(s):book(s)}</div>
        <footer class="cb-footer">${button(selected?'previous-card':'previous-page','chevron-left',selected?'Carte précédente':'Page précédente',(selected?index<=0:page===0)?'disabled':'')}<div class="cb-page-label" role="status" aria-live="polite"><b>${selected?esc(byId.get(selected).name):'Édition V3'}</b><span>${selected?`${index+1} / ${s.list.length} cartes`:`Double page ${page+1} / ${s.pages}`}</span></div>${button(selected?'next-card':'next-page','chevron-right',selected?'Carte suivante':'Page suivante',(selected?index>=s.list.length-1:page>=s.pages-1)?'disabled':'')}</footer></section>`;
    }
    function paint(focus){
      if(!root||painting)return;painting=true;
      const active=root.ownerDocument.activeElement,descriptor=focus||(root.contains(active)?{action:active.dataset.binderAction,id:active.dataset.id,field:active.dataset.binderField,start:active.selectionStart,end:active.selectionEnd}:null);
      try{
        root.innerHTML=render();globalThis.lucide?.createIcons({root});motion='';
        if(descriptor){const n=[...root.querySelectorAll('button,input,select')].find(n=>descriptor.field?n.dataset.binderField===descriptor.field:descriptor.action&&n.dataset.binderAction===descriptor.action&&(!descriptor.id||n.dataset.id===descriptor.id));if(n&&!n.disabled){n.focus({preventScroll:true});if(n.type==='search'&&descriptor.start!=null)n.setSelectionRange(descriptor.start,descriptor.end);}else root.querySelector('.cb-page').focus({preventScroll:true});}
      }finally{painting=false;}
    }
    function navigate(delta){
      const s=snapshot();
      if(selected){const index=s.list.findIndex(c=>c.id===selected),next=s.list[index+delta];if(!next)return;select(next.id);}
      else{const next=page+delta;if(next<0||next>=s.pages)return;page=next;}
      motion=delta>0?'next':'previous';paint();
    }
    function click(event){
      const node=event.target.closest('[data-binder-action]');if(!root?.contains(node)||node.disabled||painting)return;
      event.stopPropagation();const action=node.dataset.binderAction,id=node.dataset.id,returnId=selected;
      if(action==='previous-page'||action==='previous-card')return navigate(-1);
      if(action==='next-page'||action==='next-card')return navigate(1);
      if(action==='archives')return onArchives();
      if(action==='registry')return onRegistry(id||null);
      if(action==='history')return onHistory(id);
      if(action==='open'||action==='version'){select(id);motion='open';}
      if(action==='back'){selected=null;filtersOpen=false;motion='back';}
      if(action==='scope'){scope=id==='catalogue'?'catalogue':'owned';page=0;selected=null;filtersOpen=false;}
      if(action==='favorite'){onFavorite(id);}
      if(action==='favorites'){filters.favorite=!filters.favorite;page=0;}
      if(action==='filters')filtersOpen=!filtersOpen;
      if(action==='reset'){Object.keys(filters).forEach(k=>filters[k]=k==='favorite'?false:'');page=0;}
      if(action==='tab'&&['story','profile','career','copies'].includes(id)){tab=id;motion='tab';}
      if(action==='media')art=id==='art';
      if(action==='story-page')storyPage=Math.max(0,Number(node.dataset.index)||0);
      if(action==='history-page')historyPage=Math.max(0,Number(node.dataset.index)||0);
      if(action==='copy-page')copyPage=Math.max(0,Number(node.dataset.index)||0);
      paint(action==='back'?{action:'open',id:returnId}:action==='open'?{action:'tab',id:tab}:undefined);
    }
    function input(event){
      if(painting||event.target.dataset.binderField!=='search')return;event.stopPropagation();filters.search=event.target.value;page=0;selected=null;paint();
    }
    function change(event){
      if(painting)return;const n=event.target;
      if(!n.matches('[data-binder-filter],[data-binder-field]'))return;event.stopPropagation();
      if(n.dataset.binderFilter){filters[n.dataset.binderFilter]=n.value;page=0;selected=null;}
      if(n.dataset.binderField==='sort'){sort=n.value;page=0;}
      if(n.dataset.binderField==='instance'){instance=n.value;historyPage=0;}
      if(n.dataset.binderField!=='search')paint();
    }
    function keyboard(event){
      if(event.key==='Escape'&&(filtersOpen||selected)){event.preventDefault();event.stopPropagation();const returnId=selected,closingFilters=filtersOpen;if(closingFilters)filtersOpen=false;else selected=null;paint(closingFilters?{action:'filters'}:{action:'open',id:returnId});return;}
      if(event.target.matches('input,select,textarea'))return;
      if(event.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
        const tabs=['story','profile','career','copies'];tab=tabs[event.key==='Home'?0:event.key==='End'?3:(tabs.indexOf(event.target.dataset.id)+(event.key==='ArrowRight'?1:3))%4];event.preventDefault();paint({action:'tab',id:tab});return;
      }
      if(['ArrowLeft','ArrowRight'].includes(event.key)&&!filtersOpen){event.preventDefault();navigate(event.key==='ArrowRight'?1:-1);}
    }
    function pointerDown(event){if(event.pointerType==='touch'&&event.isPrimary&&event.target.closest('.cb-workbench')&&!event.target.closest('button,a,input,select'))swipe={id:event.pointerId,x:event.clientX,y:event.clientY};else swipe=null;}
    function pointerUp(event){const start=swipe;swipe=null;if(!start||start.id!==event.pointerId||filtersOpen)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)navigate(dx<0?1:-1);}
    function cancelSwipe(){swipe=null;}
    function size(){
      if(!root)return;const {width,height}=root.getBoundingClientRect(),next=width<700?2:height<720?4:8,limit=height<450?210:width<700?270:620;
      if(next!==pageSize||limit!==textLimit){const first=page*pageSize;pageSize=next;page=Math.floor(first/pageSize);textLimit=limit;storyPage=0;paint();}
    }
    const listeners=[['click',click],['input',input],['change',change],['keydown',keyboard],['pointerdown',pointerDown],['pointerup',pointerUp],['pointercancel',cancelSwipe]];
    function destroy(){observer?.disconnect();observer=null;if(root)for(const [event,fn]of listeners)root.removeEventListener(event,fn);root=null;swipe=null;}
    return {render,mount(element){destroy();root=element;paint();size();for(const [event,fn]of listeners)root.addEventListener(event,fn);const Resize=root.ownerDocument.defaultView.ResizeObserver;if(Resize){observer=new Resize(size);observer.observe(root);}},refresh(){paint();},destroy,inspect:()=>({scope,page,pageSize,selected,tab,art,filters:{...filters},sort})};
  }
  return {create,groupCards,textPages};
});
