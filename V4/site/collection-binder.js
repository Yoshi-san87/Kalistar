(function(root,factory){
  const C=typeof module==='object'&&module.exports?require('./collaborations.js'):root.KalistarCollaborations;
  const api=factory(C);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarCollection=api;
})(typeof globalThis==='undefined'?this:globalThis,C=>{
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
  function create({data,getOwned=()=>[],getCatalogueChanges=()=>[],getFavorites=()=>new Set(),getCareer=()=>null,getDecks=()=>[],onOpenDeck=()=>{},onFavorite=()=>{},onRegistry=()=>{},onArchives=()=>{},onHistory=()=>{},artImage=c=>globalThis.KalistarCardMedia.image(c,'art'),profile=''}={}){
    if(!Array.isArray(data?.cards)||!data.cards.length)throw new Error('Catalogue V4 requis.');
    const cards=data.cards,byId=new Map(cards.map(c=>[c.id,c])),covers=new Map();
    const elements={...data.elements,NONE:data.elements.NONE||{id:'NONE',label:'Sans cristal',color:'93AAA5'}};
    let root=null,observer=null,painting=false,scope='owned',page=0,pageSize=8,columns=2,rows=2,selected=null,tab='story',art=false,filtersOpen=false,sort='id';
    let storyPage=0,historyPage=0,copyPage=0,instance='all',textLimit=600,motion='',swipe=null,suppressClick=false,transitionTimer=null,transitioning=false;
    let singlePage=false,readerPane='visual',versionTransition=null,pagesOpen=false;
    const filters={search:'',element:'',faction:'',race:'',position:'',weapon:'',favorite:false};
    const owns=id=>getOwned(id)||[];
    const asset=C.asset;
    const image=c=>globalThis.KalistarCardMedia.image(c);
    const button=(action,symbol,label,extra='')=>`<button type="button" class="cb-icon" data-binder-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(symbol)}</button>`;
    const edgeButton=(action,symbol,label,side,disabled)=>`<button type="button" class="cb-page-edge cb-page-edge-${side}" data-binder-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${disabled?'disabled':''}><span>${icon(symbol)}</span></button>`;
    const element=c=>elements[c.element]||elements.NONE;
    const crystal=c=>`<img src="${asset('cristaux',c.element)}" alt="${esc(element(c).label)}">`;
    function filtered(){
      const favorites=getFavorites(),search=normalize(filters.search.trim());
      return cards.filter(c=>(scope==='catalogue'||C.matches(c,scope)||scope==='owned'&&owns(c.id).length)&&(!filters.favorite||favorites.has(c.id))&&
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
      const current=group.indexOf(c),behind=[...group.slice(current+1),...group.slice(0,current)],next=behind[0];
      const versionCount=`${icon('layers-3')}<b>${group.length}</b>`;
      return `<article class="cb-pocket ${owned?'':'is-unowned'}" data-character="${esc(key(c))}" data-card-id="${c.id}" style="--card-color:#${element(c).color};--pocket-order:${index}">
        <div class="cb-stack">${behind.slice(0,2).map((v,i)=>`<img class="cb-behind cb-layer-${i}" data-version-id="${v.id}" src="${image(v)}" alt="" aria-hidden="true" draggable="false">`).join('')}
        <button type="button" class="cb-card" data-binder-action="open" data-id="${c.id}" aria-label="Consulter ${esc(c.name+' : '+c.title)}"><img src="${image(c)}" alt="${esc(c.name+' : '+c.title)}" draggable="false"></button>
        </div>
        <div class="cb-caption"><span class="cb-copy-count" role="img" aria-label="${owned} exemplaire${owned>1?'s':''}" title="${owned} exemplaire${owned>1?'s':''} de ${esc(c.title)}">${icon('copy')}<b>${owned}</b></span><div class="cb-caption-title">${next?`<button type="button" class="cb-version-count" data-binder-action="cycle-version" data-id="${c.id}" aria-label="${esc(group.length+' versions de '+c.name+' · Afficher '+next.title)}" title="${esc(c.title+' · '+(current+1)+' / '+group.length+' · Suivante : '+next.title)}">${versionCount}</button>`:`<span class="cb-version-count" role="img" aria-label="1 version" title="${esc(c.title)}">${versionCount}</span>`}<h2 class="${c.name.length>8?'is-long-name':''}">${esc(c.name)}</h2></div>${button('favorite','star','Favori : '+c.name,`data-id="${c.id}" aria-pressed="${favorite}"`)}</div>
      </article>`;
    }
    function filtersHTML(){
      const choose=(field,label,options)=>`<label>${label}<select data-binder-filter="${field}"><option value="">Tous</option>${options.map(([value,text])=>`<option value="${esc(value)}" ${filters[field]===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
      const values=field=>[...new Set(cards.map(c=>c[field]))].sort((a,b)=>a.localeCompare(b,'fr')).map(value=>[value,value]);
      return `<dialog class="cb-overlay" data-active="${filtersOpen}" aria-labelledby="cb-filter-title"><div class="cb-overlay-body cb-filters"><div class="cb-filter-heading"><h2 id="cb-filter-title">Retrouver une carte</h2>${button('close-overlay','x','Fermer les filtres','autofocus')}</div>
        <fieldset class="cb-filter-crystals"><legend>Cristal</legend><div>${Object.values(elements).map(e=>`<button type="button" data-binder-action="filter-choice" data-field="element" data-id="${esc(e.id)}" aria-pressed="${filters.element===e.id}" title="${esc(e.label)}"><img src="${asset('cristaux',e.id)}" alt=""><span>${esc(e.label)}</span></button>`).join('')}</div></fieldset>
        <fieldset class="cb-filter-positions"><legend>Position</legend><div>${['Tank','DPS physique','Middle','DPS magique','Support'].map((label,i)=>`<button type="button" data-binder-action="filter-choice" data-field="position" data-id="${i+1}" aria-pressed="${filters.position===String(i+1)}" title="${label}">P${i+1}</button>`).join('')}</div></fieldset>
        ${choose('faction','Faction',values('faction'))}${choose('race','Race',values('race'))}${choose('weapon','Arme',values('weapon'))}
        <label>Ordre<select data-binder-field="sort" aria-label="Trier les cartes">${[['id','Ordre du classeur'],['name','Personnage'],['element','Cristal'],['faction','Faction']].map(([id,label])=>`<option value="${id}" ${sort===id?'selected':''}>${label}</option>`).join('')}</select></label><footer class="cb-filter-actions"><button type="button" data-binder-action="reset">${icon('filter-x')}Effacer</button><button type="button" data-binder-action="close-overlay">${icon('check')}Voir ${groupCards(filtered()).length} personnages</button></footer></div></dialog>`;
    }
    function pagesHTML(s){
      if(!pagesOpen)return '';
      return `<dialog class="cb-overlay cb-index" data-active="true" aria-labelledby="cb-index-title"><div class="cb-overlay-body"><header class="cb-filter-heading"><h2 id="cb-index-title">Sommaire du classeur</h2>${button('close-overlay','x','Fermer le sommaire')}</header><div class="cb-page-thumbnails">${Array.from({length:s.pages},(_,i)=>{
        const groups=s.groups.slice(i*pageSize,(i+1)*pageSize),perSide=singlePage?groups.length:Math.ceil(groups.length/2);
        return `<button type="button" data-binder-action="jump-page" data-id="${i}" aria-current="${i===page?'page':'false'}" aria-label="${singlePage?'Page':'Double page'} ${i+1}${groups.length?' : '+esc(groups[0][0].name+' à '+groups.at(-1)[0].name):''}" ${i===page?'autofocus':''}><span class="cb-mini-book" data-single="${singlePage}">${[0,...(singlePage?[]:[1])].map(side=>`<span class="cb-mini-leaf" style="--mini-columns:${columns}">${groups.slice(side*perSide,(side+1)*perSide).map(g=>{const c=g.find(c=>c.id===covers.get(key(c)))||g[0];return `<img src="${image(c)}" alt="" loading="lazy">`;}).join('')}</span>`).join('')}</span><span>${singlePage?'Page':'Double page'} ${i+1} ${i===page?icon('check'):''}</span></button>`;
      }).join('')}</div></div></dialog>`;
    }
    function deckUsage(c){
      const decks=getDecks().flatMap(d=>{
        const match=d.cards.map(id=>byId.get(id)).find(v=>v&&key(v)===key(c));
        return match?[{...d,match}]:[];
      });
      return `<section class="cb-deck-usage" aria-label="Présence dans les decks"><h3>Présente dans mes decks</h3>${decks.length?decks.map(d=>`<button type="button" data-binder-action="open-deck" data-id="${esc(d.id)}" data-card="${d.match.id}">${icon('layers-3')}<span><b>${esc(d.name)}</b><small>${d.match.id===c.id?'Cette version':esc(d.match.title)}</small></span>${icon('arrow-up-right')}</button>`).join(''):'<p>Aucun deck enregistré pour ce personnage.</p>'}</section>`;
    }
    function book(s){
      if(!s.current.length)return `<div class="cb-empty">${icon(scope==='owned'&&!owns().length?'book-heart':'search')}<h2>${scope==='owned'&&!owns().length?'Ton classeur attend sa première carte':'Aucune carte ici'}</h2><p>${scope==='owned'&&!owns().length?'Chaque collection commence par une rencontre.':'Essaie une autre recherche ou un autre filtre.'}</p><button type="button" data-binder-action="${scope==='owned'&&!owns().length?'registry':'reset'}">${icon(scope==='owned'&&!owns().length?'key-round':'filter-x')}${scope==='owned'&&!owns().length?'Activation et transferts':'Tout effacer'}</button>${scope==='owned'&&!owns().length?'<button type="button" class="cb-text-button" data-binder-action="scope" data-id="catalogue">Parcourir le catalogue</button>':''}</div>`;
      const perSheet=columns*rows;
      const leftCount=singlePage?s.current.length:Math.min(perSheet,Math.ceil(s.current.length/2));
      const sheet=side=>{
        const start=side?leftCount:0,end=side?s.current.length:leftCount,items=s.current.slice(start,end),shelves=[];
        const shelfCount=Math.min(rows,Math.ceil(items.length/columns));
        for(let offset=0,row=0;row<shelfCount;row++){
          const take=Math.ceil((items.length-offset)/(shelfCount-row));
          shelves.push({items:items.slice(offset,offset+take),offset});offset+=take;
        }
        const folio=singlePage?page+1:page*2+side+1;
        return `<section class="cb-sheet" style="--cb-sheet-rows:${Math.max(1,shelves.length)}" aria-label="Page ${folio}">${shelves.map(shelf=>`<div class="cb-shelf-row" style="--cb-row-count:${shelf.items.length}">${shelf.items.map((group,index)=>pocket(group,start+shelf.offset+index)).join('')}</div>`).join('')}<span class="cb-folio" aria-hidden="true">${String(folio).padStart(2,'0')}</span></section>`;
      };
      return `<div class="cb-spread" data-single-page="${singlePage}" data-motion="${motion}" data-page-size="${pageSize}" data-columns="${columns}" data-rows="${rows}" aria-label="${singlePage?'Page':'Double page'} ${page+1}">${edgeButton('previous-page','chevron-left','Page précédente','previous',page===0)}${sheet(0)}${singlePage?'':sheet(1)}${edgeButton('next-page','chevron-right','Page suivante','next',page>=s.pages-1)}</div>`;
    }
    function profileHTML(c){
      const face=(v,isAttack)=>typeof v==='number'?number(v):`<img src="${asset('effets',v)}" alt="${esc(({guard:'Garde',retry:isAttack?'Trèfle':'Relance',mana:'Potion',revive:'Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Puissance physique'})[v]||v)}">`;
      return `<div class="cb-profile"><div class="cb-identity"><img src="${asset('factions',c.faction)}" alt=""><span><b>${esc(c.faction)}</b><small>${esc(c.job)}</small></span><img src="${asset('races',c.race)}" alt=""><span><b>${esc(c.race)}</b><small>${c.positions.map(p=>'P'+p).join(' · ')}</small></span></div>
        <p class="cb-weapon">${icon('sword')}${esc(c.weapon)}<span>${esc(element(c).label)}</span></p>
        <table class="cb-faces"><caption>Faces de la carte</caption><thead><tr><th>Dé</th>${[6,5,4,3,2,1].map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${[['ATK',c.atk,true],['DEF',c.defense,false]].map(([label,faces,attack])=>`<tr><th>${label}</th>${faces.map((v,i)=>`<td class="${(attack?c.magic:c.barriers).includes(6-i)?'is-magic':''}" title="${attack?c.magic.includes(6-i)?'Magique':'Physique':c.barriers.includes(6-i)?'Barrière magique':'Défense'}">${face(v,attack)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <p class="cb-affinity">${c.element==='NONE'?'Sans cristal · aucun bonus élémentaire':c.element==='RAINBOW'?'+40 contre les cristaux classiques · +30 contre sans cristal':`+${number(c.advantage)} ${esc(elements[element(c).strong_against]?.label||'')} · −${number(c.disadvantage)} ${esc(elements[element(c).weak_against]?.label||'')} · +20 contre sans cristal`}</p>${deckUsage(c)}</div>`;
    }
    function careerHTML(c){
      const items=owns(c.id);if(instance!=='all'&&!items.some(i=>i.id===instance))instance='all';
      const stats=getCareer(c.id,instance==='all'?null:instance);
      if(!stats)return '<p class="cb-note">Carrière indisponible : le registre local n’est pas ouvert.</p>';
      const rows=stats.history||[],pages=Math.max(1,rows.length);historyPage=Math.min(historyPage,pages-1);const match=rows[historyPage];
      return `<div class="cb-career"><label class="cb-instance-select">Exemplaire<select data-binder-field="instance"><option value="all">Tous · ${items.length}</option>${items.map((i,n)=>`<option value="${esc(i.id)}" ${instance===i.id?'selected':''}>${n+1} · ${esc(i.id)}</option>`).join('')}</select></label><div class="cb-record"><strong>${stats.games?Math.round(stats.wins/stats.games*100):0}<small>% victoires</small></strong><span><b>${number(stats.wins)} V · ${number(stats.losses)} D · ${number(stats.draws)} N</b><small>${number(stats.games)} matchs terminés</small></span></div>${globalThis.KalistarCatalogue.careerStatistics(stats)}${globalThis.KalistarTrophies?.cabinet(stats)||''}<div class="cb-history">${match?`<button type="button" data-binder-action="history" data-id="${esc(match.matchId)}"><b>${match.winner==='draw'?'N':match.winner===match.side?'V':'D'}</b><span>${esc(match.seed)}<small>${new Date(match.finishedAt).toLocaleDateString('fr-FR')}</small></span>${icon('chevron-right')}</button>`:'<p>Aucune rencontre terminée.</p>'}${rows.length>1?pager('history-page',historyPage,pages,'Rencontres'):''}</div></div>`;
    }
    function copiesHTML(c){
      const items=owns(c.id),pages=Math.max(1,Math.ceil(items.length/2));copyPage=Math.min(copyPage,pages-1);
      return `<div class="cb-copies"><h3>${items.length} exemplaire${items.length>1?'s':''} dans ton classeur</h3>${items.slice(copyPage*2,copyPage*2+2).map(item=>`<article class="cb-copy">${icon('fingerprint')}<div><b>${esc(item.id)}</b><small>Émis le ${new Date(item.createdAt).toLocaleDateString('fr-FR')}</small></div></article>`).join('')||'<p class="cb-note">Cette version n’appartient pas à ce profil.</p>'}${items.length>2?pager('copy-page',copyPage,pages,'Exemplaires'):''}<button type="button" data-binder-action="registry" data-id="${c.id}">${icon(items.length?'arrow-right-left':'key-round')}${items.length?'Exemplaires et transferts':'Activer un exemplaire'}</button></div>`;
    }
    function reader(s){
      const c=byId.get(selected),versions=s.list.filter(v=>key(v)===key(c)),pages=textPages(c.text,textLimit);storyPage=Math.min(storyPage,pages.length-1);
      const content=tab==='profile'?profileHTML(c):tab==='career'?careerHTML(c):tab==='copies'?copiesHTML(c):`<div class="cb-story"><span class="cb-story-kicker">${esc(c.job)} · ${esc(c.faction)}</span><p>${esc(pages[storyPage])}</p>${pages.length>1?pager('story-page',storyPage,pages.length,'Récit'):''}</div>`;
      return `<div class="cb-reader" data-motion="${motion}" style="--card-color:#${element(c).color}"><figure class="cb-visual"><div class="cb-media-tools" role="group" aria-label="Visuel de la carte"><button type="button" data-binder-action="media" data-id="card" aria-pressed="${!art}">${icon('credit-card')}Carte</button><button type="button" data-binder-action="media" data-id="art" aria-pressed="${art}">${icon('image')}Illustration</button></div><img class="cb-hero-image ${art?'is-art':''}" src="${art?artImage(c):image(c)}" alt="${esc((art?'Illustration de ':'Carte de ')+c.name+' : '+c.title)}"><figcaption>#${c.id}<a href="${esc(globalThis.KalistarSite?.url(c.pngUrl)||c.pngUrl)}" download title="PNG d’impression" aria-label="Télécharger le PNG d’impression">${icon('download')}</a></figcaption></figure>
        <section class="cb-reading"><header class="cb-card-heading"><div><span class="cb-eyebrow">${esc(element(c).label)} · ${owns(c.id).length?'Dans ton classeur':'Non possédée'}</span><h2>${esc(c.name)}</h2><p>${esc(c.title)}</p></div>${button('favorite','star','Favori : '+c.name,`data-id="${c.id}" aria-pressed="${getFavorites().has(c.id)}"`)}</header>
        <div class="cb-versions" role="group" aria-label="Versions de ${esc(c.name)}">${versions.map(v=>`<button type="button" data-binder-action="version" data-id="${v.id}" aria-pressed="${v.id===selected}" title="${esc(v.title)}">${crystal(v)}<span>${esc(v.title)}</span>${icon('check')}</button>`).join('')}</div>
        <div class="cb-reading-tabs" role="tablist" aria-label="Détails de la carte">${[['story','book-open','Récit'],['profile','scan-line','Fiche'],['career','medal','Carrière'],['copies','fingerprint','Exemplaires']].map(([id,symbol,label])=>`<button type="button" role="tab" id="cb-tab-${id}" aria-controls="cb-read-content" aria-selected="${tab===id}" tabindex="${tab===id?0:-1}" data-binder-action="tab" data-id="${id}">${icon(symbol)}${label}</button>`).join('')}</div>
        <div id="cb-read-content" class="cb-read-content" role="tabpanel" aria-labelledby="cb-tab-${tab}">${content}</div></section></div>`;
    }
    function render(){
      const s=snapshot(),allOwned=owns(),ownedVersions=new Set(allOwned.map(i=>i.cardId)).size;
      const catalogueSize=new Set([...cards.map(c=>c.id),...getCatalogueChanges(),...allOwned.map(i=>i.cardId)]).size;
      const collaborations=C.entries.map(entry=>({...entry,count:cards.filter(c=>C.matches(c,entry.id)).length})).filter(entry=>entry.id==='ff7'||entry.count);
      const active=Object.values(filters).some(Boolean),index=s.list.findIndex(c=>c.id===selected);
      const toolbar=selected?`<button type="button" class="cb-back" data-binder-action="back">${icon('arrow-left')}Classeur</button>`:`<span class="cb-count">${s.groups.length} personnage${s.groups.length>1?'s':''} · ${s.list.length} versions</span><label class="cb-search">${icon('search')}<input type="search" data-binder-field="search" aria-label="Rechercher une carte" placeholder="Retrouver une carte" value="${esc(filters.search)}"></label>${button('favorites','star','Mes favoris',`aria-pressed="${filters.favorite}"`)}${button('filters','sliders-horizontal','Filtres du classeur',`aria-expanded="${filtersOpen}"`)}${active?button('reset','filter-x','Effacer les filtres'):''}<select data-binder-field="sort" aria-label="Trier le classeur">${[['id','Ordre du classeur'],['name','Personnage'],['element','Cristal'],['faction','Faction']].map(([id,label])=>`<option value="${id}" ${sort===id?'selected':''}>${label}</option>`).join('')}</select>`;
      const panes=selected?`<div class="cb-mobile-panes" role="group" aria-label="Page du carnet"><button data-binder-action="pane" data-id="visual" aria-pressed="${readerPane==='visual'}">${icon('image')}Carte</button><button data-binder-action="pane" data-id="notes" aria-pressed="${readerPane==='notes'}">${icon('book-open')}Carnet</button></div>`:'';
      return `<section class="cb-page" data-reader-pane="${readerPane}" data-mode="${selected?'reader':'book'}" tabindex="-1" aria-label="Classeur de collection">
        <header class="cb-heading"><div class="cb-title"><span class="cb-eyebrow">Kalistar · ${esc(profile)}</span><h1>${selected?'Au fil des cartes':'Mon classeur'}</h1></div><div class="cb-scopes" role="group" aria-label="Contenu du classeur"><button type="button" data-binder-action="scope" data-id="owned" aria-pressed="${scope==='owned'}">${icon('book-heart')}Mes cartes <b>${allOwned.length}</b></button><button type="button" data-binder-action="scope" data-id="catalogue" aria-pressed="${scope==='catalogue'}">${icon('library')}Catalogue</button>${collaborations.map(entry=>`<button type="button" data-binder-action="scope" data-collaboration="${entry.id}" data-id="${entry.id}" aria-pressed="${scope===entry.id}" title="Collaboration ${esc(entry.title)}">${icon('sparkles')}${esc(entry.faction)} <b>${entry.count}</b></button>`).join('')}</div><div class="cb-completion"><span><b>${ownedVersions}</b> / ${catalogueSize} versions</span><meter min="0" max="${catalogueSize}" value="${ownedVersions}" aria-label="Versions possédées">${ownedVersions}/${catalogueSize}</meter></div>${button('archives','archive','Archives et sauvegardes')}</header>
        <div class="cb-toolbar">${toolbar}${panes}</div>
        <div class="cb-workbench">${selected?reader(s):book(s)}</div>
        <footer class="cb-footer">${button(selected?'previous-card':'previous-page','chevron-left',selected?'Carte précédente':'Page précédente',(selected?index<=0:page===0)?'disabled':'')}<${selected?'div':'button type="button" data-binder-action="pages" title="Sommaire du classeur" aria-haspopup="dialog"'} class="cb-page-label"><b>${selected?esc(byId.get(selected).name):'Édition V4'}</b><span aria-live="polite">${selected?`${index+1} / ${s.list.length} cartes`:`${singlePage?'Page':'Double page'} ${page+1} / ${s.pages} ${icon('grid-2x2')}`}</span></${selected?'div':'button'}>${button(selected?'next-card':'next-page','chevron-right',selected?'Carte suivante':'Page suivante',(selected?index>=s.list.length-1:page>=s.pages-1)?'disabled':'')}</footer>${selected?'':filtersHTML()+pagesHTML(s)}</section>`;
    }
    function paint(focus){
      if(!root||painting)return;painting=true;
      cancelVersionTransition();
      const previousDialog=root.querySelector('.cb-overlay[open]'),scroll=previousDialog?.querySelector('.cb-overlay-body')?.scrollTop||0;
      const active=root.ownerDocument.activeElement,descriptor=focus||(root.contains(active)?{action:active.dataset.binderAction,id:active.dataset.id,field:active.dataset.binderField,filter:active.dataset.binderFilter,start:active.selectionStart,end:active.selectionEnd}:null);
      try{
        root.innerHTML=render();globalThis.lucide?.createIcons({root});motion='';
        const dialog=root.querySelector('.cb-overlay[data-active=true]');dialog?.showModal();
        if(dialog){if(previousDialog)dialog.querySelector('.cb-overlay-body').scrollTop=scroll;else dialog.classList.add('is-entering');}
        if(descriptor){const n=[...(dialog||root).querySelectorAll('button,input,select')].find(n=>n.getClientRects().length&&(descriptor.field?n.dataset.binderField===descriptor.field:descriptor.filter?n.dataset.binderFilter===descriptor.filter:descriptor.action&&n.dataset.binderAction===descriptor.action&&(!descriptor.id||n.dataset.id===descriptor.id)));if(n&&!n.disabled){n.focus({preventScroll:true});if(n.type==='search'&&descriptor.start!=null)n.setSelectionRange(descriptor.start,descriptor.end);}else if(!dialog)root.querySelector('.cb-page').focus({preventScroll:true});}
      }finally{painting=false;}
    }
    function cancelVersionTransition(){
      const previous=versionTransition;versionTransition=null;if(!previous)return;
      previous.animations.forEach(animation=>animation.cancel());
      delete previous.stack.dataset.cycling;previous.button.removeAttribute('aria-busy');
    }
    async function cycleVersion(node){
      if(versionTransition||transitioning||selected)return;
      const group=snapshot().groups.find(g=>g.some(c=>c.id===node.dataset.id));
      if(!group||group.length<2)return;
      const next=group[(group.findIndex(c=>c.id===node.dataset.id)+1)%group.length];
      const stack=node.closest('.cb-pocket')?.querySelector('.cb-stack'),front=stack?.querySelector('.cb-card'),back=stack?.querySelector('.cb-layer-0');
      covers.set(key(next),next.id);
      const focus={action:'cycle-version',id:next.id};
      if(!front?.animate||!back||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){paint(focus);return;}
      const transition={stack,button:node,animations:[]};versionTransition=transition;node.setAttribute('aria-busy','true');
      try{
        await back.decode();
        if(versionTransition!==transition)return;
        stack.dataset.cycling='true';
        const style=root.ownerDocument.defaultView.getComputedStyle(back),rest=style.transform;
        const timing={duration:640,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'};
        transition.animations=[
          front.animate([{transform:'none',filter:'brightness(1)',zIndex:1},{transform:'translate(-16%,3%) rotate(-4deg) scale(.97)',filter:'brightness(.85)',zIndex:1,offset:.48},{transform:rest,filter:'brightness(.8)',zIndex:-1}],timing),
          back.animate([{transform:rest,filter:style.filter,zIndex:-1},{transform:'translate(16%,-5%) rotate(3deg) scale(1.025)',filter:'brightness(1)',zIndex:2,offset:.48},{transform:'none',filter:'brightness(1)',zIndex:2}],timing)
        ];
        await Promise.all(transition.animations.map(animation=>animation.finished));
      }catch{/* Image failures and animation cancellation must not strand the selection. */}
      if(versionTransition===transition)paint(focus);
    }
    function navigate(delta){
      if(transitioning||!delta)return;
      const s=snapshot();
      const direction=delta>0?'next':'previous';
      if(selected){const index=s.list.findIndex(c=>c.id===selected),next=s.list[index+delta];if(!next)return;select(next.id);motion=direction;paint();return;}
      const next=page+delta;if(next<0||next>=s.pages)return;
      cancelVersionTransition();
      let committed=false;
      const commit=()=>{if(committed)return;committed=true;if(transitionTimer)globalThis.clearTimeout(transitionTimer);transitionTimer=null;page=next;motion=direction;transitioning=false;paint();};
      const spread=root?.querySelector('.cb-spread');
      if(!spread||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){commit();return;}
      transitioning=true;spread.dataset.departing=direction;
      const finish=event=>{if(event.animationName!=='cb-page-fade-out')return;spread.removeEventListener('animationend',finish);commit();};
      spread.addEventListener('animationend',finish);
      transitionTimer=globalThis.setTimeout(commit,320);
    }
    function closeOverlay(){
      const action=pagesOpen?'pages':'filters';pagesOpen=filtersOpen=false;paint({action});
    }
    function click(event){
      if(event.target.matches('.cb-overlay')){event.stopPropagation();closeOverlay();return;}
      if(suppressClick){suppressClick=false;if(event.target.closest('.cb-workbench')){event.preventDefault();event.stopPropagation();return;}}
      const node=event.target.closest('[data-binder-action]');if(!root?.contains(node)||node.disabled||painting)return;
      event.stopPropagation();const action=node.dataset.binderAction,id=node.dataset.id,returnId=selected;
      if(action==='cycle-version')return cycleVersion(node);
      if(action==='previous-page'||action==='previous-card')return navigate(-1);
      if(action==='next-page'||action==='next-card')return navigate(1);
      if(action==='archives')return onArchives();
      if(action==='registry')return onRegistry(id||null);
      if(action==='history')return onHistory(id);
      if(action==='open-deck')return onOpenDeck(id,node.dataset.card);
      if(action==='close-overlay'){closeOverlay();return;}
      if(action==='jump-page'){const next=Number(id);closeOverlay();if(Number.isInteger(next))navigate(next-page);return;}
      if(action==='pages'){pagesOpen=true;filtersOpen=false;}
      if(action==='filter-choice'&&['element','position'].includes(node.dataset.field)){const field=node.dataset.field;filters[field]=filters[field]===id?'':id;page=0;}
      if(action==='open'||action==='version'){select(id);motion='open';}
      if(action==='open')readerPane='visual';
      if(action==='pane')readerPane=id==='notes'?'notes':'visual';
      if(action==='back'){selected=null;filtersOpen=false;motion='back';}
      if(action==='scope'){scope=id==='catalogue'||C.entries.some(entry=>entry.id===id)?id:'owned';page=0;selected=null;filtersOpen=false;}
      if(action==='favorite'){onFavorite(id);}
      if(action==='favorites'){filters.favorite=!filters.favorite;page=0;}
      if(action==='filters'){filtersOpen=!filtersOpen;pagesOpen=false;}
      if(action==='reset'){Object.keys(filters).forEach(k=>filters[k]=k==='favorite'?false:'');page=0;}
      if(action==='tab'&&['story','profile','career','copies'].includes(id)){tab=id;motion='tab';}
      if(action==='media')art=id==='art';
      if(action==='story-page')storyPage=Math.max(0,Number(node.dataset.index)||0);
      if(action==='history-page')historyPage=Math.max(0,Number(node.dataset.index)||0);
      if(action==='copy-page')copyPage=Math.max(0,Number(node.dataset.index)||0);
      paint(action==='back'?{action:'open',id:returnId}:action==='open'?singlePage?{action:'pane',id:'visual'}:{action:'tab',id:tab}:undefined);
      if(action==='back'||action==='scope')size();
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
      if(filtersOpen||pagesOpen){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeOverlay();}return;}
      if(event.key==='Escape'&&(filtersOpen||selected)){event.preventDefault();event.stopPropagation();const returnId=selected,closingFilters=filtersOpen;if(closingFilters)filtersOpen=false;else selected=null;paint(closingFilters?{action:'filters'}:{action:'open',id:returnId});return;}
      if(event.target.matches('input,select,textarea'))return;
      if(event.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
        const tabs=['story','profile','career','copies'];tab=tabs[event.key==='Home'?0:event.key==='End'?3:(tabs.indexOf(event.target.dataset.id)+(event.key==='ArrowRight'?1:3))%4];event.preventDefault();paint({action:'tab',id:tab});return;
      }
      if(['ArrowLeft','ArrowRight'].includes(event.key)&&!filtersOpen){event.preventDefault();navigate(event.key==='ArrowRight'?1:-1);}
    }
    function clearSwipeVisual(){
      const surface=root?.querySelector('.cb-spread,.cb-reader');
      if(surface){delete surface.dataset.dragging;surface.style.removeProperty('--cb-drag-progress');}
    }
    function pointerDown(event){
      const interactive=event.target.closest('button,a,input,select,textarea');
      if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0)||(interactive&&!interactive.matches('.cb-card'))||!event.target.closest('.cb-workbench')){swipe=null;return;}
      const surface=event.target.closest('.cb-spread,.cb-reader');
      if(!surface){swipe=null;return;}
      const capture=event.target;
      swipe={id:event.pointerId,x:event.clientX,y:event.clientY,surface,capture,horizontal:false};
      capture.setPointerCapture?.(event.pointerId);
    }
    function pointerMove(event){
      const start=swipe;if(!start||start.id!==event.pointerId||filtersOpen)return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(!start.horizontal){
        if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)*1.2){cancelSwipe();return;}
        if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.1)return;
        start.horizontal=true;
      }
      event.preventDefault();
      const progress=Math.min(1,Math.abs(dx)/Math.max(120,start.surface.getBoundingClientRect().width*.34));
      start.surface.dataset.dragging=dx<0?'next':'previous';
      start.surface.style.setProperty('--cb-drag-progress',String(progress));
    }
    function pointerUp(event){
      const start=swipe;swipe=null;if(!start||start.id!==event.pointerId||filtersOpen)return;
      start.capture.releasePointerCapture?.(event.pointerId);
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      clearSwipeVisual();
      const threshold=Math.min(90,Math.max(52,start.surface.getBoundingClientRect().width*.07));
      if(start.horizontal&&Math.abs(dx)>threshold&&Math.abs(dx)>Math.abs(dy)*1.25){
        suppressClick=true;
        globalThis.setTimeout(()=>{suppressClick=false;},320);
        // Finish the native touch/click sequence before replacing its DOM target.
        globalThis.requestAnimationFrame(()=>{if(root)navigate(dx<0?1:-1);});
      }
    }
    function cancelSwipe(){
      const start=swipe;swipe=null;
      if(start)start.capture.releasePointerCapture?.(start.id);
      clearSwipeVisual();
    }
    function size(){
      if(!root)return;
      const {width,height}=root.getBoundingClientRect(),sheet=root.querySelector('.cb-sheet'),sheetRect=sheet?.getBoundingClientRect();
      const sheetWidth=sheetRect?.width||width/2,style=sheet?root.ownerDocument.defaultView.getComputedStyle(sheet):null,pageStyle=root.ownerDocument.defaultView.getComputedStyle(root.querySelector('.cb-page'));
      const innerHeight=sheetRect?sheetRect.height-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0):height;
      const captionHeight=parseFloat(pageStyle.getPropertyValue('--cb-caption-height'))||46,rowGap=parseFloat(style?.rowGap)||14;
      const twoRowCardWidth=((innerHeight-rowGap)/2-captionHeight-12)*.57420749;
      const phone=globalThis.matchMedia?.('(max-width:699px), (max-width:950px) and (max-height:500px)').matches||false;
      // Measure the page, including the caption, before deciding how many cards fit.
      const mobileHeight=(root.querySelector('.cb-workbench')?.clientHeight||height)-110;
      const mobileRowWidth=((mobileHeight-16)/2-44-12)*.57420749;
      const nextColumns=phone?2:sheetWidth>=700?3:sheetWidth>=480?2:1,nextRows=phone?(mobileRowWidth>=90?2:1):twoRowCardWidth<190?1:2,next=nextColumns*nextRows*(phone?1:2);
      const limit=height<450?210:width<700?270:620;
      if(next!==pageSize||nextColumns!==columns||nextRows!==rows||limit!==textLimit||phone!==singlePage){const first=page*pageSize;singlePage=phone;columns=nextColumns;rows=nextRows;pageSize=next;page=Math.floor(first/pageSize);textLimit=limit;storyPage=0;paint();}
    }
    const listeners=[['click',click],['input',input],['change',change],['keydown',keyboard],['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',cancelSwipe]];
    function destroy(){observer?.disconnect();observer=null;cancelVersionTransition();if(transitionTimer)globalThis.clearTimeout(transitionTimer);transitionTimer=null;transitioning=false;root?.querySelector('.cb-overlay')?.close();pagesOpen=filtersOpen=false;if(root)for(const [event,fn]of listeners)root.removeEventListener(event,fn);root=null;swipe=null;}
    return {render,mount(element){destroy();root=element;paint();size();for(const [event,fn]of listeners)root.addEventListener(event,fn);const Resize=root.ownerDocument.defaultView.ResizeObserver;if(Resize){observer=new Resize(size);observer.observe(root);}},refresh(){paint();},destroy,inspect:()=>({scope,page,pageSize,columns,rows,selected,tab,art,filters:{...filters},sort})};
  }
  return {create,groupCards,textPages};
});
