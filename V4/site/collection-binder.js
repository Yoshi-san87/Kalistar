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
  const collections=[['kalistar','Kalistar'],['final-fantasy','Final Fantasy'],['nier','NieR'],['metal-gear','Metal Gear'],['resident-evil','Resident Evil'],['one-piece','One Piece'],['witcher','The Witcher'],['batman','Batman'],['xmen','X-Men'],['street-fighter','Street Fighter'],['castlevania','Castlevania'],['chrono-trigger','Chrono Trigger'],['tortues-ninja','Tortues Ninja'],['tomb-raider','Tomb Raider'],['octopath-traveler','Octopath Traveler']];
  function groupCards(cards){
    const groups=new Map();
    for(const card of cards){if(!groups.has(key(card)))groups.set(key(card),[]);groups.get(key(card)).push(card);}
    return [...groups.values()];
  }
  function matchesScope(card,scope){
    if(scope==='kalistar')return C.universe(card)==='kalistar';
    if(scope==='final-fantasy')return ['ff6','ff7','ff8','ff9','ff10','ff13','ff15'].some(id=>C.matches(card,id));
    if(scope==='nier')return C.matches(card,'nier')||C.matches(card,'replicant');
    if(scope==='metal-gear')return ['mgs1','mgs2','mgs3','mgs4','mgs5'].some(id=>C.matches(card,id));
    if(scope==='resident-evil')return C.of(card)?.id.match(/^re[1-9]$/)!=null;
    if(scope==='one-piece')return C.matches(card,'one-piece');
    if(scope==='witcher')return C.matches(card,'witcher');
    if(scope==='batman')return C.matches(card,'batman');
    if(scope==='xmen')return C.matches(card,'xmen');
    if(scope==='street-fighter')return C.matches(card,'street-fighter');
    if(scope==='castlevania')return C.matches(card,'castlevania');
    if(scope==='chrono-trigger')return C.matches(card,'chrono-trigger');
    if(scope==='tortues-ninja')return C.matches(card,'tortues-ninja');
    if(scope==='tomb-raider')return C.matches(card,'tomb-raider');
    if(scope==='octopath-traveler')return C.matches(card,'octopath-traveler');
    return false;
  }
  function textPages(text,limit){
    const pages=[];let page='';
    for(const word of String(text||'').match(/\S+\s*/g)||[]){
      if(page&&page.length+word.length>limit){pages.push(page.trim());page='';}page+=word;
    }
    if(page)pages.push(page.trim());return pages.length?pages:[''];
  }
  function create({data,getOwned=()=>[],getCatalogueChanges=()=>[],getFavorites=()=>new Set(),getCareer=()=>null,getDecks=()=>[],onOpenDeck=()=>{},onFavorite=()=>{},onRegistry=()=>{},onArchives=()=>{},onHistory=()=>{},artImage=c=>globalThis.KalistarCardMedia.image(c,'art'),profile='',getEquipment=()=>null,onEquipment=()=>{}}={}){
    if(!Array.isArray(data?.cards)||!data.cards.length)throw new Error('Catalogue V4 requis.');
    const cards=data.cards,byId=new Map(cards.map(c=>[c.id,c])),covers=new Map();
    const searchText=new Map(cards.map(c=>[c.id,normalize([c.name,c.title,c.faction,c.race,c.id].join(' '))]));
    const elements={...data.elements,NONE:data.elements.NONE||{id:'NONE',label:'Sans cristal',color:'93AAA5'}};
    let root=null,observer=null,painting=false,scope='owned',page=0,pageSize=12,columns=4,rows=3,selected=null,tab='story',art=false,filtersOpen=false,sort='id';
    let historyPage=0,copyPage=0,instance='all',motion='',swipe=null,suppressClick=false,transitionTimer=null,transitioning=false;
    let singlePage=false,readerPane='visual',versionTransition=null,pagesOpen=false,density='comfortable',galleryScroll=0,resetGallery=false,swipeTimer=null,swipeFrame=null;
    const filters={search:'',collection:'',element:'',faction:'',race:'',position:'',weapon:'',favorite:false};
    const owns=id=>getOwned(id)||[];
    const asset=C.asset;
    const image=c=>globalThis.KalistarCardMedia.image(c);
    const button=(action,symbol,label,extra='',className='')=>`<button type="button" class="cb-icon${className?' '+esc(className):''}" data-binder-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(symbol)}</button>`;
    const element=c=>elements[c.element]||elements.NONE;
    const crystal=c=>`<img src="${asset('cristaux',c.element)}" alt="${esc(element(c).label)}">`;
    const pedestalIcon=name=>`<img class="cb-pedestal-icon" src="assets/navigation/${name}-v1.webp" width="24" height="24" alt="" aria-hidden="true" draggable="false">`;
    function filtered(){
      const favorites=getFavorites(),search=normalize(filters.search.trim());
      return cards.filter(c=>(scope==='catalogue'||owns(c.id).length)&&(!filters.collection||matchesScope(c,filters.collection))&&(!filters.favorite||favorites.has(c.id))&&
        (!search||searchText.get(c.id).includes(search))&&
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
    function clearReading(){historyPage=copyPage=0;instance='all';}
    function select(id){if(!filtered().some(c=>c.id===id))return;selected=id;covers.set(key(byId.get(id)),id);clearReading();filtersOpen=false;}
    function pager(action,index,count,label){return `<nav class="cb-subpager" aria-label="${esc(label)}">${button(action,'chevron-left','Précédent',`data-index="${index-1}" ${index===0?'disabled':''}`)}<span>${index+1} / ${count}</span>${button(action,'chevron-right','Suivant',`data-index="${index+1}" ${index>=count-1?'disabled':''}`)}</nav>`;}
    function pocket(group,index){
      const c=group.find(c=>c.id===covers.get(key(c)))||group.find(c=>getFavorites().has(c.id))||group[0],owned=owns(c.id).length,favorite=getFavorites().has(c.id);
      const current=group.indexOf(c),behind=[...group.slice(current+1),...group.slice(0,current)],next=behind[0];
      const versionCount=`<span class="cb-flip-symbol">${icon('layers-2')}</span><b>${current+1}<span> / ${group.length}</span></b>${icon('chevron-right')}`;
      return `<article class="cb-pocket ${owned?'':'is-unowned'}" data-character="${esc(key(c))}" data-card-id="${c.id}" style="--card-color:#${element(c).color};--pocket-order:${index}">
        <div class="cb-stack">${behind.slice(0,2).map((v,i)=>`<img class="cb-behind cb-layer-${i}" data-version-id="${v.id}" src="assets/back-obsidian-v1.webp" alt="" aria-hidden="true" draggable="false" width="797" height="1388">`).join('')}
        <button type="button" class="cb-card" data-binder-action="open" data-id="${c.id}" aria-label="Consulter ${esc(c.name+' : '+c.title)}"><img src="${image(c)}" alt="${esc(c.name+' : '+c.title)}" draggable="false" width="797" height="1388" loading="lazy" decoding="async"></button>
        ${button('favorite','star','Favori : '+c.name,`data-id="${c.id}" aria-pressed="${favorite}"`,'cb-card-favorite')}
        <span class="cb-copy-count cb-card-copies" role="img" aria-label="${owned} exemplaire${owned>1?'s':''}" title="${owned} exemplaire${owned>1?'s':''} de ${esc(c.title)}">${pedestalIcon('collection')}<b>${owned}</b></span>
        </div>
        <div class="cb-caption cb-pedestal" data-kui-native data-faction="${esc(c.faction)}" title="${esc('Faction : '+c.faction)}">
          <span class="cb-faction-watermark" role="img" aria-label="${esc('Faction : '+c.faction)}"><img src="${asset('factions',c.faction)}" width="160" height="128" alt="" aria-hidden="true" draggable="false"></span>
          <div class="cb-pedestal-content${next?' has-versions':''}${c.positions.length>2?' has-many-positions':''}">
          <div class="cb-caption-title"><h2 title="${esc(c.name)}">${esc(c.name)}</h2><p title="${esc(c.title)}">${esc(c.title)}</p></div>
          ${globalThis.KalistarPositions.list(c.positions,{className:'cb-pocket-positions'})}
          ${next?`<button type="button" class="cb-version-count cb-flip-control" data-binder-action="cycle-version" data-id="${c.id}" aria-label="${esc(group.length+' versions de '+c.name+' · Afficher '+next.title)}" title="${esc(c.title+' · '+(current+1)+' / '+group.length+' · Suivante : '+next.title)}">${versionCount}</button>`:''}
          </div>
        </div>
      </article>`;
    }
    function collectionChoices(){
      return collections.flatMap(([id,label])=>{
        const group=cards.filter(c=>matchesScope(c,id));
        return group.length?[[id,`${label} · ${scope==='catalogue'?group.length:group.filter(c=>owns(c.id).length).length}`]]:[];
      });
    }
    const choose=(field,label,options,all='Tous',className='')=>`<label class="${className}">${label}<select data-binder-filter="${field}"><option value="">${all}</option>${options.map(([value,text])=>`<option value="${esc(value)}" ${filters[field]===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
    function filtersHTML(){
      const values=field=>[...new Set(cards.map(c=>c[field]))].sort((a,b)=>a.localeCompare(b,'fr')).map(value=>[value,value]);
      return `<dialog class="cb-overlay" data-active="${filtersOpen}" aria-labelledby="cb-filter-title"><div class="cb-overlay-body cb-filters"><div class="cb-filter-heading"><h2 id="cb-filter-title">Filtres</h2>${button('close-overlay','x','Fermer les filtres','autofocus')}</div>
        <fieldset class="cb-filter-crystals"><legend>Cristal</legend><div>${Object.values(elements).map(e=>`<button type="button" data-binder-action="filter-choice" data-field="element" data-id="${esc(e.id)}" aria-pressed="${filters.element===e.id}" title="${esc(e.label)}"><img src="${asset('cristaux',e.id)}" alt=""><span>${esc(e.label)}</span></button>`).join('')}</div></fieldset>
        <div class="cb-filter-positions">${globalThis.KalistarPositions.picker({name:'position',value:filters.position,attributes:'data-binder-filter="position"'})}</div>
        ${choose('collection','Collection',collectionChoices(),'Toutes les collections')}${choose('faction','Faction',values('faction'))}${choose('race','Race',values('race'))}${choose('weapon','Arme',values('weapon'))}
        <label>Ordre<select data-binder-field="sort" aria-label="Trier les cartes">${[['id','Édition'],['name','Personnage'],['element','Cristal'],['faction','Faction']].map(([id,label])=>`<option value="${id}" ${sort===id?'selected':''}>${label}</option>`).join('')}</select></label><footer class="cb-filter-actions"><button type="button" data-binder-action="reset">${icon('filter-x')}Effacer</button><button type="button" data-binder-action="close-overlay">${icon('check')}Voir ${groupCards(filtered()).length} personnages</button></footer></div></dialog>`;
    }
    function pagesHTML(s){
      if(!pagesOpen)return '';
      return `<dialog class="cb-overlay cb-index" data-active="true" aria-labelledby="cb-index-title"><div class="cb-overlay-body"><header class="cb-filter-heading"><h2 id="cb-index-title">La collection</h2>${button('close-overlay','x','Fermer le sommaire')}</header><div class="cb-page-thumbnails">${Array.from({length:s.pages},(_,i)=>{
        const groups=s.groups.slice(i*pageSize,(i+1)*pageSize);
        return `<button type="button" data-binder-action="jump-page" data-id="${i}" aria-current="${i===page?'page':'false'}" aria-label="Page ${i+1}${groups.length?' : '+esc(groups[0][0].name+' à '+groups.at(-1)[0].name):''}" ${i===page?'autofocus':''}><span class="cb-mini-book">${groups.slice(0,3).map(g=>{const c=g.find(c=>c.id===covers.get(key(c)))||g[0];return `<img src="${image(c)}" alt="" loading="lazy" width="797" height="1388">`;}).join('')}</span><b>${String(i+1).padStart(2,'0')} ${i===page?icon('check'):''}</b><small>${groups.length?esc(groups[0][0].name+' · '+groups.at(-1)[0].name):''}</small></button>`;
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
      if(!s.current.length)return `<div class="cb-empty"><img src="assets/navigation/collection-v1.webp" alt="" width="90" height="90"><h2>${scope==='owned'&&!owns().length?'Le début d’une collection':'Aucune carte ici'}</h2><button type="button" data-binder-action="${scope==='owned'&&!owns().length?'registry':'reset'}">${icon(scope==='owned'&&!owns().length?'key-round':'filter-x')}${scope==='owned'&&!owns().length?'Enregistrer une carte':'Effacer les filtres'}</button>${scope==='owned'&&!owns().length?'<button type="button" class="cb-text-button" data-binder-action="scope" data-id="catalogue">Explorer le catalogue</button>':''}</div>`;
      return `<div class="cb-spread" data-motion="${motion}" data-page-size="${pageSize}" data-columns="${columns}" style="--cb-columns:${columns}" aria-label="Galerie, page ${page+1}">${s.current.map(pocket).join('')}</div>`;
    }
    function profileHTML(c){
      const face=(v,isAttack)=>typeof v==='number'?number(v):`<img src="${asset('effets',v)}" alt="${esc(({guard:'Garde',retry:isAttack?'Trèfle':'Relance',mana:'Potion',revive:'Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Puissance physique'})[v]||v)}">`;
      return `<div class="cb-profile"><div class="cb-identity"><img src="${asset('factions',c.faction)}" alt=""><span><b>${esc(c.faction)}</b><small>${esc(c.job)}</small></span><img src="${asset('races',c.race)}" alt=""><span><b>${esc(c.race)}</b>${globalThis.KalistarPositions.list(c.positions,{className:'cb-identity-positions'})}</span></div>
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
      return `<div class="cb-copies"><h3>${items.length} exemplaire${items.length>1?'s':''} dans ta collection</h3>${items.slice(copyPage*2,copyPage*2+2).map(item=>`<article class="cb-copy">${icon('fingerprint')}<div><b>${esc(item.id)}</b><small>Émis le ${new Date(item.createdAt).toLocaleDateString('fr-FR')}</small></div></article>`).join('')||'<p class="cb-note">Cette version n’appartient pas à ce profil.</p>'}${items.length>2?pager('copy-page',copyPage,pages,'Exemplaires'):''}<button type="button" data-binder-action="registry" data-id="${c.id}">${icon(items.length?'arrow-right-left':'key-round')}${items.length?'Exemplaires et transferts':'Activer un exemplaire'}</button></div>`;
    }
    function reader(s){
      const c=byId.get(selected),versions=s.list.filter(v=>key(v)===key(c));
      const content=tab==='profile'?profileHTML(c):tab==='career'?careerHTML(c):tab==='copies'?copiesHTML(c):`<div class="cb-story"><span class="cb-story-kicker">${esc(c.job)} · ${esc(c.faction)}</span><p>${esc(c.text||c.description||'')}</p><span class="cb-story-seal" aria-hidden="true">${crystal(c)}</span></div>`;
      return `<div class="cb-reader" data-motion="${motion}" style="--card-color:#${element(c).color}"><div class="cb-reader-backdrop" aria-hidden="true"><img src="${artImage(c)}" alt=""></div><figure class="cb-visual"><div class="cb-media-tools" role="group" aria-label="Visuel de la carte"><button type="button" data-binder-action="media" data-id="card" aria-pressed="${!art}">${icon('credit-card')}Carte</button><button type="button" data-binder-action="media" data-id="art" aria-pressed="${art}">${icon('image')}Illustration</button></div><div class="cb-hero-stage"><img class="cb-hero-image ${art?'is-art':''}" src="${art?artImage(c):image(c)}" alt="${esc((art?'Illustration de ':'Carte de ')+c.name+' : '+c.title)}"></div><figcaption><span>${owns(c.id).length?icon('fingerprint'):' '+icon('lock-keyhole')} ${owns(c.id).length?'Dans ma collection':'Catalogue'} <span>· ${c.id}</span></span><a href="${esc(globalThis.KalistarSite?.url(c.pngUrl)||c.pngUrl)}" download title="PNG d’impression" aria-label="Télécharger le PNG d’impression">${icon('download')}</a></figcaption></figure>
        <section class="cb-reading"><header class="cb-card-heading"><div><span class="cb-eyebrow">${crystal(c)}${esc(element(c).label)} <span>· ${esc(c.faction)}</span></span><h2>${esc(c.name)}</h2><p>${esc(c.title)}</p></div>${button('favorite','star','Favori : '+c.name,`data-id="${c.id}" aria-pressed="${getFavorites().has(c.id)}"`)}</header>
        <div class="cb-versions" role="group" aria-label="Versions de ${esc(c.name)}">${versions.map(v=>`<button type="button" data-binder-action="version" data-id="${v.id}" aria-pressed="${v.id===selected}" title="${esc(v.title)}"><span class="cb-version-thumb"><img src="${image(v)}" alt="" width="797" height="1388" loading="lazy">${icon('check')}</span><span>${esc(v.title)}</span></button>`).join('')}</div>
        ${getEquipment(c)?`<button type="button" class="cb-equipped" data-binder-action="equipment" data-id="${getEquipment(c).id}">${icon('sword')}${esc(getEquipment(c).name)}</button>`:''}<div class="cb-reading-tabs" role="tablist" aria-label="Détails de la carte">${[['story','book-open','Récit'],['profile','scan-line','Fiche'],['career','medal','Carrière'],['copies','fingerprint','Exemplaires']].map(([id,symbol,label])=>`<button type="button" role="tab" id="cb-tab-${id}" aria-controls="cb-read-content" aria-selected="${tab===id}" tabindex="${tab===id?0:-1}" data-binder-action="tab" data-id="${id}">${icon(symbol)}${label}</button>`).join('')}</div>
        <div id="cb-read-content" class="cb-read-content" role="tabpanel" aria-labelledby="cb-tab-${tab}">${content}</div></section></div>`;
    }
    function elementsHTML(){
      const available=cards.filter(c=>(scope==='catalogue'||owns(c.id).length)&&(!filters.collection||matchesScope(c,filters.collection)));
      return `<nav class="cb-elements" aria-label="Cristaux"><button type="button" data-binder-action="filter-choice" data-field="element" data-id="" aria-pressed="${!filters.element}" aria-label="Tous les cristaux">${icon('sparkles')}<span>Tous</span></button>${Object.values(elements).filter(e=>available.some(c=>c.element===e.id)||filters.element===e.id).map(e=>`<button type="button" data-binder-action="filter-choice" data-field="element" data-id="${esc(e.id)}" aria-pressed="${filters.element===e.id}" title="${esc(e.label)}" aria-label="${esc(e.label)}" style="--crystal-color:#${e.color}"><img src="${asset('cristaux',e.id)}" alt="" width="30" height="36"><span>${esc(e.label)}</span></button>`).join('')}</nav>`;
    }
    function render(){
      const s=snapshot(),allOwned=owns(),ownedVersions=new Set(allOwned.map(i=>i.cardId)).size;
      const catalogueSize=new Set([...cards.map(c=>c.id),...getCatalogueChanges(),...allOwned.map(i=>i.cardId)]).size;
      const active=Object.values(filters).some(Boolean),index=s.list.findIndex(c=>c.id===selected);
      const toolbar=selected?`<button type="button" class="cb-back" data-binder-action="back">${icon('arrow-left')}Collection</button><span class="cb-reader-count">${index+1} / ${s.list.length}</span>`:`<label class="cb-search">${icon('search')}<input type="search" data-binder-field="search" aria-label="Rechercher une carte" placeholder="Un personnage, une histoire…" value="${esc(filters.search)}"></label>${choose('collection','Univers',collectionChoices(),'Tous les univers','cb-collection-select')}${button('favorites','star','Mes favoris',`aria-pressed="${filters.favorite}"`)}${button('filters','sliders-horizontal','Filtres',`aria-expanded="${filtersOpen}"`)}${active?button('reset','filter-x','Effacer les filtres'):''}<select data-binder-field="sort" aria-label="Trier les cartes">${[['id','Édition'],['name','Personnage'],['element','Cristal'],['faction','Faction']].map(([id,label])=>`<option value="${id}" ${sort===id?'selected':''}>${label}</option>`).join('')}</select><div class="cb-density" role="group" aria-label="Taille des cartes">${button('density','layout-grid','Grandes cartes',`data-id="comfortable" aria-pressed="${density==='comfortable'}"`)}${button('density','grid-3x3','Galerie compacte',`data-id="compact" aria-pressed="${density==='compact'}"`)}</div>${button('discover','shuffle','Une carte au hasard',s.list.length?'':'disabled')}`;
      const panes=selected?`<div class="cb-mobile-panes" role="group" aria-label="Vue de la carte"><button data-binder-action="pane" data-id="visual" aria-pressed="${readerPane==='visual'}">${icon('image')}Carte</button><button data-binder-action="pane" data-id="notes" aria-pressed="${readerPane==='notes'}">${icon('book-open')}Détails</button></div>`:'';
      return `<section class="cb-page" data-kui-native data-density="${density}" data-reader-pane="${readerPane}" data-mode="${selected?'reader':'book'}" tabindex="-1" aria-label="Collection">
        <header class="cb-heading"><div class="cb-title"><img src="assets/navigation/collection-v1.webp" alt="" width="50" height="50"><div><span class="cb-eyebrow">Kalistar${profile?' · '+esc(profile):''}</span><h1>Collection</h1></div></div><div class="cb-scopes" role="group" aria-label="Contenu de la collection"><button type="button" data-binder-action="scope" data-id="owned" aria-pressed="${scope==='owned'}">Mes cartes <b>${allOwned.length}</b></button><button type="button" data-binder-action="scope" data-id="catalogue" aria-pressed="${scope==='catalogue'}">Catalogue</button></div><div class="cb-completion"><span><b>${ownedVersions}</b><span> / ${catalogueSize}</span></span><meter min="0" max="${catalogueSize}" value="${ownedVersions}" aria-label="Versions possédées">${ownedVersions}/${catalogueSize}</meter></div>${button('archives','archive','Archives et sauvegardes')}</header>
        <div class="cb-toolbar">${toolbar}${panes}</div>
        ${selected?'':elementsHTML()}
        <div class="cb-workbench" tabindex="0" aria-label="${selected?'Carte et récit':'Galerie de cartes'}">${selected?reader(s):`<div class="cb-gallery-heading"><span class="cb-count">${s.groups.length} personnage${s.groups.length>1?'s':''} <span>· ${s.list.length} versions</span></span><span>${filters.favorite?'Mes favoris':filters.element?esc(elements[filters.element]?.label||filters.element):scope==='owned'?'Ma collection':'Toutes les rencontres'}</span></div>${book(s)}`}</div>
        <footer class="cb-footer"><span class="cb-footer-label">${selected?esc(byId.get(selected).name):'KALISTAR · V4'}</span><div class="cb-paging">${button(selected?'previous-card':'previous-page','chevron-left',selected?'Carte précédente':'Page précédente',(selected?index<=0:page===0)?'disabled':'')}<${selected?'div':'button type="button" data-binder-action="pages" title="Parcourir la collection" aria-haspopup="dialog"'} class="cb-page-label"><span aria-live="polite">${selected?`${index+1} / ${s.list.length}`:`${page+1} / ${s.pages} ${icon('grid-2x2')}`}</span></${selected?'div':'button'}>${button(selected?'next-card':'next-page','chevron-right',selected?'Carte suivante':'Page suivante',(selected?index>=s.list.length-1:page>=s.pages-1)?'disabled':'')}</div><span class="cb-footer-range">${selected?esc(byId.get(selected).title):s.groups.length?`${page*pageSize+1}–${Math.min((page+1)*pageSize,s.groups.length)} / ${s.groups.length}`:'0'}</span></footer>${selected?'':filtersHTML()+pagesHTML(s)}</section>`;
    }
    function paint(focus){
      if(!root||painting)return;painting=true;
      cancelVersionTransition();
      const oldMode=root.querySelector('.cb-page')?.dataset.mode,work=root.querySelector('.cb-workbench'),oldScroll=work?.scrollTop||0,ribbonScroll=root.querySelector('.cb-elements')?.scrollLeft||0;
      if(oldMode==='book'&&!resetGallery)galleryScroll=oldScroll;
      if(resetGallery)galleryScroll=0;
      const previousDialog=root.querySelector('.cb-overlay[open]'),scroll=previousDialog?.querySelector('.cb-overlay-body')?.scrollTop||0;
      const active=root.ownerDocument.activeElement,descriptor=focus||(root.contains(active)?{action:active.dataset.binderAction,id:active.dataset.id,field:active.dataset.binderField,filter:active.dataset.binderFilter,value:active.value,start:active.selectionStart,end:active.selectionEnd}:null);
      try{
        root.innerHTML=render();globalThis.KalistarUI?.icons(root)??globalThis.lucide?.createIcons({root});
        root.querySelector('.cb-workbench').scrollTop=selected?(oldMode==='reader'&&!['open','next','previous'].includes(motion)?oldScroll:0):galleryScroll;
        const ribbon=root.querySelector('.cb-elements');if(ribbon)ribbon.scrollLeft=ribbonScroll;
        motion='';resetGallery=false;
        const dialog=root.querySelector('.cb-overlay[data-active=true]');if(dialog){if(globalThis.KalistarDialogHistory)KalistarDialogHistory.open(dialog);else dialog.showModal();}
        if(dialog){if(previousDialog)dialog.querySelector('.cb-overlay-body').scrollTop=scroll;else dialog.classList.add('is-entering');}
        if(descriptor){const n=[...(dialog||root).querySelectorAll('button,input,select')].find(n=>n.getClientRects().length&&(descriptor.field?n.dataset.binderField===descriptor.field:descriptor.filter?n.dataset.binderFilter===descriptor.filter&&(n.type!=='radio'||n.value===descriptor.value):descriptor.action&&n.dataset.binderAction===descriptor.action&&(!descriptor.id||n.dataset.id===descriptor.id)));if(n&&!n.disabled){n.focus({preventScroll:true});if(n.type==='search'&&descriptor.start!=null)n.setSelectionRange(descriptor.start,descriptor.end);}else if(!dialog)root.querySelector('.cb-page').focus({preventScroll:true});}
      }finally{painting=false;}
    }
    function cancelVersionTransition(){
      const previous=versionTransition;versionTransition=null;if(!previous)return;
      previous.cancelLoading?.();
      previous.animations.forEach(animation=>animation.cancel());
      delete previous.stack.dataset.cycling;previous.button.removeAttribute('aria-busy');
    }
    function loadVersionImage(img,card,transition){
      const source=image(card);
      return new Promise(resolve=>{
        let timeout;
        const finish=ready=>{
          globalThis.clearTimeout(timeout);img.removeEventListener('load',loaded);img.removeEventListener('error',failed);
          transition.cancelLoading=null;resolve(ready);
        };
        // CardMedia replaces the native PNG with its cropped Blob. Waiting for
        // that final load avoids decode() being interrupted by the replacement.
        const loaded=()=>{
          if(img.dataset.v4MediaSource===source&&img.dataset.v4Cropped==='card'&&img.complete&&img.naturalWidth)finish(true);
        };
        const failed=()=>finish(false);
        transition.cancelLoading=failed;img.addEventListener('load',loaded);img.addEventListener('error',failed);
        timeout=globalThis.setTimeout(failed,10000);img.src=source;globalThis.queueMicrotask(loaded);
      });
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
        const ready=await loadVersionImage(back,next,transition);
        if(versionTransition!==transition)return;
        if(!ready){cancelVersionTransition();paint(focus);return;}
        stack.dataset.cycling='true';
        const style=root.ownerDocument.defaultView.getComputedStyle(back),rest=style.transform;
        const timing={duration:640,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'};
        transition.animations=[
          front.animate([{transform:'none',opacity:1,zIndex:1},{transform:'translate(-16%,3%) rotate(-4deg) scale(.97)',opacity:.8,zIndex:1,offset:.48},{transform:rest,opacity:.7,zIndex:-1}],timing),
          back.animate([{transform:rest,opacity:.7,zIndex:-1},{transform:'translate(16%,-5%) rotate(3deg) scale(1.025)',opacity:1,zIndex:2,offset:.48},{transform:'none',opacity:1,zIndex:2}],timing)
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
      const commit=()=>{if(committed)return;committed=true;if(transitionTimer)globalThis.clearTimeout(transitionTimer);transitionTimer=null;page=next;resetGallery=true;motion=direction;transitioning=false;paint();};
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
    function cancelOverlay(event){if(event.target.matches('.cb-overlay')){event.preventDefault();closeOverlay();}}
    function click(event){
      if(event.target.matches('.cb-overlay')){event.stopPropagation();closeOverlay();return;}
      if(suppressClick){suppressClick=false;if(event.target.closest('.cb-workbench')){event.preventDefault();event.stopPropagation();return;}}
      const node=event.target.closest('[data-binder-action]');if(!root?.contains(node)||node.disabled||painting)return;
      event.stopPropagation();const action=node.dataset.binderAction,id=node.dataset.id,returnId=selected;
      if(action==='cycle-version')return cycleVersion(node);
      if(action==='pane'){
        readerPane=id==='notes'?'notes':'visual';root.querySelector('.cb-page').dataset.readerPane=readerPane;
        root.querySelectorAll('[data-binder-action=pane]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===readerPane)));
        const work=root.querySelector('.cb-workbench'),target=root.querySelector(readerPane==='notes'?'.cb-reading':'.cb-visual');
        if(target)work.scrollTo({top:work.scrollTop+target.getBoundingClientRect().top-work.getBoundingClientRect().top-12,behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
        return;
      }
      if(action==='density'){density=id==='compact'?'compact':'comfortable';size();paint({action:'density',id:density});return;}
      if(action==='discover'){const list=filtered();if(list.length){select(list[Math.floor(Math.random()*list.length)].id);motion='open';readerPane='visual';paint({action:'back'});}return;}
      if(action==='previous-page'||action==='previous-card')return navigate(-1);
      if(action==='next-page'||action==='next-card')return navigate(1);
      if(action==='archives')return onArchives();
      if(action==='registry')return onRegistry(id||null);
      if(action==='history')return onHistory(id);
      if(action==='open-deck')return onOpenDeck(id,node.dataset.card);
      if(action==='close-overlay'){closeOverlay();return;}
      if(action==='jump-page'){const next=Number(id);closeOverlay();if(Number.isInteger(next))navigate(next-page);return;}
      if(action==='pages'){pagesOpen=true;filtersOpen=false;}
      if(action==='filter-choice'&&node.dataset.field==='element'){const field=node.dataset.field;filters[field]=filters[field]===id?'':id;page=0;resetGallery=true;}
      if(action==='open'||action==='version'){select(id);motion='open';}
      if(action==='open')readerPane='visual';
      if(action==='back'){selected=null;filtersOpen=false;motion='back';}
      if(action==='scope'){scope=id==='catalogue'?'catalogue':'owned';page=0;selected=null;filtersOpen=false;resetGallery=true;}
      if(action==='equipment'){onEquipment(id);return;}
      if(action==='favorite'){onFavorite(id);}
      if(action==='favorites'){filters.favorite=!filters.favorite;page=0;resetGallery=true;}
      if(action==='filters'){filtersOpen=!filtersOpen;pagesOpen=false;}
      if(action==='reset'){Object.keys(filters).forEach(k=>filters[k]=k==='favorite'?false:'');page=0;resetGallery=true;}
      if(action==='tab'&&['story','profile','career','copies'].includes(id)){tab=id;motion='tab';}
      if(action==='media')art=id==='art';
      if(action==='history-page')historyPage=Math.max(0,Number(node.dataset.index)||0);
      if(action==='copy-page')copyPage=Math.max(0,Number(node.dataset.index)||0);
      paint(action==='back'?{action:'open',id:returnId}:action==='open'?singlePage?{action:'pane',id:'visual'}:{action:'tab',id:tab}:undefined);
      if(action==='back'||action==='scope')size();
    }
    function input(event){
      if(painting||event.target.dataset.binderField!=='search')return;event.stopPropagation();filters.search=event.target.value;page=0;selected=null;resetGallery=true;paint();
    }
    function change(event){
      if(painting)return;const n=event.target;
      if(!n.matches('[data-binder-filter],[data-binder-field]'))return;event.stopPropagation();
      if(n.dataset.binderFilter){filters[n.dataset.binderFilter]=n.value;page=0;selected=null;resetGallery=true;}
      if(n.dataset.binderField==='sort'){sort=n.value;page=0;resetGallery=true;}
      if(n.dataset.binderField==='instance'){instance=n.value;historyPage=0;}
      if(n.dataset.binderField!=='search')paint();
      if(n.dataset.binderFilter==='collection')size();
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
        globalThis.clearTimeout(swipeTimer);swipeTimer=globalThis.setTimeout(()=>{suppressClick=false;swipeTimer=null;},320);
        // Finish the native touch/click sequence before replacing its DOM target.
        swipeFrame=globalThis.requestAnimationFrame(()=>{swipeFrame=null;if(root)navigate(dx<0?1:-1);});
      }
    }
    function cancelSwipe(){
      const start=swipe;swipe=null;
      if(start)start.capture.releasePointerCapture?.(start.id);
      clearSwipeVisual();
    }
    function size(){
      if(!root)return;
      const {width}=root.getBoundingClientRect();
      const phone=globalThis.matchMedia?.('(max-width:699px), (pointer:coarse) and (max-width:1100px) and (max-height:500px)').matches||false;
      // Card size follows available width, never shrinks to squeeze into the viewport height.
      const target=density==='compact'?208:290;
      const nextColumns=width<700?2:Math.max(3,Math.min(density==='compact'?8:6,Math.floor((width-64)/target))),next=nextColumns*3;
      if(next!==pageSize||nextColumns!==columns||phone!==singlePage){const first=page*pageSize;singlePage=phone;columns=nextColumns;pageSize=next;page=Math.floor(first/pageSize);paint();}
    }
    const listeners=[['click',click],['cancel',cancelOverlay,true],['input',input],['change',change],['keydown',keyboard],['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',cancelSwipe]];
    function destroy(){observer?.disconnect();observer=null;cancelVersionTransition();globalThis.clearTimeout(transitionTimer);globalThis.clearTimeout(swipeTimer);if(swipeFrame!==null)globalThis.cancelAnimationFrame(swipeFrame);transitionTimer=swipeTimer=swipeFrame=null;transitioning=suppressClick=false;root?.querySelectorAll('.cb-overlay[open]').forEach(dialog=>dialog.close());pagesOpen=filtersOpen=false;if(root)for(const [event,fn,capture]of listeners)root.removeEventListener(event,fn,capture);root=null;swipe=null;}
    return {render,mount(element){destroy();root=element;paint();size();for(const [event,fn,capture]of listeners)root.addEventListener(event,fn,capture);const Resize=root.ownerDocument.defaultView.ResizeObserver;if(Resize){observer=new Resize(size);observer.observe(root);}},refresh(){paint();},destroy,inspect:()=>({scope,page,pageSize,columns,rows,selected,tab,art,filters:{...filters},sort,density})};
  }
  return {create,groupCards,textPages,matchesScope};
});
