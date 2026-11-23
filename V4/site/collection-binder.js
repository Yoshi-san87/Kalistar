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
  function create({data,getOwned=()=>[],canView=id=>(getOwned(id)||[]).length>0,getCatalogueChanges=()=>[],getFavorites=()=>new Set(),getCareer=()=>null,getDecks=()=>[],onOpenDeck=()=>{},onFavorite=()=>{},onRegistry=()=>{},onArchives=()=>{},onHistory=()=>{},artImage=c=>globalThis.KalistarCardMedia.image(c,'art'),profile='',getEquipment=()=>null,onEquipment=()=>{}}={}){

    if(!Array.isArray(data?.cards)||!data.cards.length)throw new Error('Catalogue V4 requis.');
    const cards=data.cards,byId=new Map(cards.map(c=>[c.id,c]));
    const searchText=new Map(cards.map(c=>[c.id,normalize([c.name,c.title,c.faction,c.race,c.id].join(' '))]));
    const elements={...data.elements,NONE:data.elements.NONE||{id:'NONE',label:'Sans cristal',color:'93AAA5'}};
    const pageSize=12,asset=C.asset,backImage='assets/back-obsidian-v1.webp';
    const owns=id=>getOwned(id)||[],image=c=>globalThis.KalistarCardMedia.image(c);
    const element=c=>elements[c.element]||elements.NONE;
    const crystal=c=>'<img src="'+asset('cristaux',c.element)+'" alt="'+esc(element(c).label)+'">';
    const versionLabel=c=>canView(c.id)?c.title:'Version non découverte';
    const button=(action,symbol,label,extra='',className='')=>'<button type="button" class="cb-icon '+className+'" data-binder-action="'+action+'" aria-label="'+esc(label)+'" title="'+esc(label)+'" '+extra+'>'+icon(symbol)+'</button>';
    let root=null,observer=null,motionQuery=null,mediaModal=null,painting=false,scope='owned',page=0,selected=null,tab='story',art=false,filtersOpen=false,pagesOpen=false,sort='id';
    let historyPage=0,copyPage=0,instance='all',readPage=0,readPages=1,measureFrame=null,transition=null,serial=0,swipe=null,suppressClick=false,swipeTimer=null;
    const filters={search:'',collection:'',element:'',faction:'',race:'',position:'',weapon:'',favorite:false};
    function filtered(){
      const favorites=getFavorites(),search=normalize(filters.search.trim());
      return cards.filter(c=>(scope==='catalogue'||owns(c.id).length)&&(!filters.collection||matchesScope(c,filters.collection))&&(!filters.favorite||favorites.has(c.id))&&
        (!search||(canView(c.id)?searchText.get(c.id):normalize(c.name)).includes(search))&&
        ['element','faction','race','weapon'].every(field=>!filters[field]||filters[field]===c[field])&&
        (!filters.position||c.positions.includes(Number(filters.position))))
        .sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'fr'):sort==='element'?a.element.localeCompare(b.element):sort==='faction'?a.faction.localeCompare(b.faction,'fr'):a.id.localeCompare(b.id));
    }

    function snapshot(){
      const list=filtered(),pages=Math.max(1,Math.ceil(list.length/pageSize));
      page=Math.max(0,Math.min(page,pages-1));
      if(selected&&(!canView(selected)||!list.some(c=>c.id===selected)))selected=null;
      return {list,pages,current:list.slice(page*pageSize,(page+1)*pageSize)};
    }
    function clearReading(){historyPage=copyPage=readPage=0;instance='all';}
    function select(id){
      if(!canView(id)||!filtered().some(c=>c.id===id))return false;
      selected=id;clearReading();filtersOpen=pagesOpen=false;return true;
    }
    function pager(action,index,count,label){
      return '<nav class="cb-subpager" aria-label="'+esc(label)+'">'+button(action,'chevron-left','Précédent','data-index="'+(index-1)+'" '+(index===0?'disabled':''))+'<span>'+(index+1)+' / '+count+'</span>'+button(action,'chevron-right','Suivant','data-index="'+(index+1)+'" '+(index>=count-1?'disabled':''))+'</nav>';
    }
    function pocket(c,index){
      const ordinal=page*pageSize+index+1;
      if(!c)return '<article class="cb-pocket is-empty" aria-label="Emplacement libre '+ordinal+'"><div class="cb-slot"><span class="cb-empty-mark" aria-hidden="true">'+icon('diamond')+'</span></div><span class="cb-slot-number">'+String(ordinal).padStart(3,'0')+'</span></article>';
      const visible=canView(c.id),count=owns(c.id).length;
      return '<article class="cb-pocket '+(visible?'':'is-undiscovered')+'" data-character="'+esc(key(c))+'" data-card-id="'+c.id+'">'+
        '<div class="cb-slot">'+(visible?'<button type="button" class="cb-card" data-binder-action="open" data-id="'+c.id+'" aria-label="Consulter '+esc(c.name+' : '+c.title)+'"><img src="'+image(c)+'" alt="'+esc(c.name+' : '+c.title)+'" width="797" height="1388" loading="lazy" decoding="async" draggable="false"></button>':'<div class="cb-card cb-locked-face" role="img" aria-label="'+esc(c.name)+' : version non découverte"><img src="'+backImage+'" alt="" width="797" height="1388" loading="lazy" draggable="false"><span class="cb-discovery-lock">'+icon('lock-keyhole')+'</span></div>')+
        (visible?'<span class="cb-card-copies" role="img" aria-label="'+count+' exemplaire'+(count>1?'s':'')+'" title="'+count+' exemplaire'+(count>1?'s':'')+'">'+icon('copy')+'<b>'+count+'</b></span>'+button('favorite','star','Favori : '+c.name,'data-id="'+c.id+'" aria-pressed="'+getFavorites().has(c.id)+'"','cb-card-favorite'):'')+(visible&&getFavorites().has(c.id)?'<span class="cb-favorite-mark" aria-hidden="true">'+icon('star')+'</span>':'')+'</div>'+
        '<div class="cb-caption"><h2 title="'+esc(c.name)+'">'+esc(c.name)+'</h2><span class="cb-slot-number">'+String(ordinal).padStart(3,'0')+'</span></div></article>';
    }
    function book(s){
      const slots=Array.from({length:pageSize},(_,i)=>pocket(s.current[i],i));
      return '<div class="cb-album" data-album-mode="gallery" aria-label="Album, page '+(page+1)+'"><div class="cb-spread">'+[0,1].map(side=>'<section class="cb-leaf cb-gallery-leaf" data-leaf="'+(side?'right':'left')+'" aria-label="Emplacements '+(side*6+1)+' à '+(side*6+6)+'">'+slots.slice(side*6,side*6+6).join('')+'<span class="cb-folio">'+(page*2+side+1)+'</span></section>').join('')+'</div>'+footer(s)+'</div>';
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
        <label>Ordre<select data-binder-field="sort" aria-label="Trier les cartes">${[['id','Édition'],['name','Personnage'],['element','Cristal'],['faction','Faction']].map(([id,label])=>`<option value="${id}" ${sort===id?'selected':''}>${label}</option>`).join('')}</select></label><footer class="cb-filter-actions"><button type="button" data-binder-action="reset">${icon('filter-x')}Effacer</button><button type="button" data-binder-action="close-overlay">${icon('check')}Voir ${filtered().length} cartes</button></footer></div></dialog>`;
    }
    function pagesHTML(s){
      if(!pagesOpen)return '';
      return '<dialog class="cb-overlay cb-index" data-active="true" aria-labelledby="cb-index-title"><div class="cb-overlay-body"><header class="cb-filter-heading"><h2 id="cb-index-title">L’album</h2>'+button('close-overlay','x','Fermer le sommaire')+'</header><div class="cb-page-thumbnails">'+Array.from({length:s.pages},(_,i)=>{
        const entries=s.list.slice(i*pageSize,(i+1)*pageSize);
        return '<button type="button" data-binder-action="jump-page" data-id="'+i+'" aria-current="'+(i===page?'page':'false')+'" aria-label="Double page '+(i+1)+(entries.length?' : '+esc(entries[0].name+' à '+entries.at(-1).name):'')+'"><span class="cb-mini-book">'+entries.slice(0,3).map(c=>'<img src="'+(canView(c.id)&&Math.abs(i-page)<=1?image(c):backImage)+'" alt="" loading="lazy" width="797" height="1388">').join('')+'</span><b>'+String(i+1).padStart(2,'0')+'</b><small>'+esc(entries[0]?.name||'')+'</small></button>';
      }).join('')+'</div></div></dialog>';
    }
    function deckUsage(c){
      const decks=getDecks().flatMap(d=>{
        const match=d.cards.map(id=>byId.get(id)).find(v=>v&&key(v)===key(c));
        return match?[{...d,match}]:[];
      });
      return `<section class="cb-deck-usage" aria-label="Présence dans les decks"><h3>Présente dans mes decks</h3>${decks.length?decks.map(d=>`<button type="button" data-binder-action="open-deck" data-id="${esc(d.id)}" data-card="${d.match.id}">${icon('layers-3')}<span><b>${esc(d.name)}</b><small>${d.match.id===c.id?'Cette version':esc(d.match.title)}</small></span>${icon('arrow-up-right')}</button>`).join(''):'<p>Aucun deck enregistré pour ce personnage.</p>'}</section>`;
    }
    function profileHTML(c){
      const face=(v,attack)=>typeof v==='number'?number(v):'<img src="'+asset('effets',v)+'" alt="'+esc(({guard:'Garde',retry:attack?'Trèfle':'Relance',mana:'Potion',revive:'Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Puissance physique'})[v]||v)+'">';
      return '<div class="cb-profile"><div class="cb-identity"><img src="'+asset('factions',c.faction)+'" alt=""><p><b>'+esc(c.faction)+'</b><span>'+esc(c.job)+'</span></p><img src="'+asset('races',c.race)+'" alt=""><p><b>'+esc(c.race)+'</b></p></div>'+globalThis.KalistarPositions.list(c.positions,{className:'cb-identity-positions'})+
        '<p class="cb-weapon">'+icon('sword')+esc(c.weapon)+' · '+esc(element(c).label)+'</p><div class="cb-face-head"><span>Face</span><b>ATK</b><b>DEF</b></div><dl class="cb-faces">'+[6,5,4,3,2,1].map((value,i)=>'<div class="cb-face-row"><dt>'+value+'</dt><dd class="'+(c.magic.includes(value)?'is-magic':'')+'">'+face(c.atk[i],true)+'</dd><dd class="'+(c.barriers.includes(value)?'is-magic':'')+'">'+face(c.defense[i],false)+'</dd></div>').join('')+'</dl>'+
        '<p class="cb-affinity">'+(c.element==='NONE'?'Sans cristal · aucun bonus élémentaire':c.element==='RAINBOW'?'+40 contre les cristaux classiques · +30 contre sans cristal':'+'+number(c.advantage)+' '+esc(elements[element(c).strong_against]?.label||'')+' · −'+number(c.disadvantage)+' '+esc(elements[element(c).weak_against]?.label||'')+' · +20 contre sans cristal')+'</p>'+deckUsage(c)+'</div>';
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
      const c=byId.get(selected),versions=s.list.filter(v=>key(v)===key(c)),equipment=getEquipment(c);
      const tabs=[['story','book-open','Récit'],['profile','scan-line','Fiche'],['career','medal','Carrière'],['copies','fingerprint','Exemplaires']];
      const content=tab==='profile'?profileHTML(c):tab==='career'?careerHTML(c):tab==='copies'?copiesHTML(c):'<div class="cb-story"><span class="cb-story-kicker">'+esc(c.job)+' · '+esc(c.faction)+'</span><p>'+esc(c.text||c.description||'')+'</p></div>';
      return '<div class="cb-album cb-reader" data-album-mode="reader"><div class="cb-spread">'+
        '<figure class="cb-leaf cb-visual" data-leaf="left"><div class="cb-hero-stage"><img class="cb-hero-image '+(art?'is-art':'')+'" src="'+(art?artImage(c):image(c))+'" alt="'+esc(c.name+' : '+c.title)+'"></div>'+
        '<figcaption><span>'+icon('fingerprint')+' '+owns(c.id).length+' exemplaire'+(owns(c.id).length>1?'s':'')+'</span><div class="cb-media-tools" role="group" aria-label="Visuel de la carte">'+button('media','credit-card','Carte','data-id="card" aria-pressed="'+!art+'"')+button('media','image','Illustration','data-id="art" aria-pressed="'+art+'"')+button('favorite','star','Favori : '+c.name,'data-id="'+c.id+'" aria-pressed="'+getFavorites().has(c.id)+'"')+'<a class="cb-icon" href="'+esc(globalThis.KalistarSite?.url(c.pngUrl)||c.pngUrl)+'" download title="PNG d’impression" aria-label="Télécharger le PNG d’impression">'+icon('download')+'</a></div></figcaption>'+
        (versions.length>1?'<label class="cb-version-select"><span>Version</span><select data-binder-field="version" aria-label="Versions de '+esc(c.name)+'">'+versions.map(v=>'<option value="'+v.id+'" '+(v.id===selected?'selected ':'')+(canView(v.id)?'':'disabled')+'>'+esc(versionLabel(v))+'</option>').join('')+'</select></label>':'')+
        (equipment?'<button type="button" class="cb-equipped" data-binder-action="equipment" data-id="'+equipment.id+'">'+icon('sword')+esc(equipment.name)+'</button>':'')+button('media-tools','ellipsis','Options de la carte','aria-haspopup="dialog" aria-expanded="false"','cb-media-toggle')+'<span class="cb-folio">'+(page*2+1)+'</span></figure>'+
        '<section class="cb-leaf cb-reading" data-leaf="right"><header class="cb-card-heading"><span class="cb-eyebrow">'+crystal(c)+esc(element(c).label)+'</span><h2>'+esc(c.name)+'</h2><p>'+esc(c.title)+'</p></header>'+
        '<div class="cb-reading-tabs" role="tablist" aria-label="Détails de la carte">'+tabs.map(([id,symbol,label])=>'<button type="button" role="tab" id="cb-tab-'+id+'" aria-controls="cb-read-content" aria-selected="'+(tab===id)+'" tabindex="'+(tab===id?0:-1)+'" data-binder-action="tab" data-id="'+id+'">'+icon(symbol)+'<span>'+label+'</span></button>').join('')+'</div>'+
        '<select class="cb-reading-select" data-binder-field="tab" aria-label="Détails de la carte">'+tabs.map(([id,,label])=>'<option value="'+id+'" '+(tab===id?'selected':'')+'>'+label+'</option>').join('')+'</select>'+
        '<div class="cb-read-window"><div id="cb-read-content" class="cb-read-content" role="tabpanel" aria-label="'+tabs.find(t=>t[0]===tab)[2]+'">'+content+'</div></div>'+
        '<nav class="cb-reading-pager" aria-label="Pages du texte">'+button('read-previous','chevron-left','Page de texte précédente','disabled')+'<span data-reading-page aria-live="polite">1 / 1</span>'+button('read-next','chevron-right','Page de texte suivante','disabled')+'</nav><span class="cb-folio">'+(page*2+2)+'</span></section></div>'+footer(s)+'</div>';
    }
    function footer(s){
      const readable=s.list.filter(c=>canView(c.id)),index=readable.findIndex(c=>c.id===selected);
      return '<footer class="cb-footer"><span class="cb-footer-label">'+(selected?esc(byId.get(selected).name):esc(profile||'KALISTAR'))+'</span><div class="cb-paging">'+button(selected?'previous-card':'previous-page','chevron-left',selected?'Carte précédente':'Page précédente',(selected?index<=0:page===0)?'disabled':'')+
        '<'+(selected?'span':'button type="button" data-binder-action="pages" title="Parcourir l’album" aria-haspopup="dialog"')+' class="cb-page-label" aria-live="polite">'+(selected?(index+1)+' / '+readable.length:String(page+1).padStart(2,'0')+' / '+s.pages+' '+icon('book-open'))+'</'+(selected?'span':'button')+'>'+
        button(selected?'next-card':'next-page','chevron-right',selected?'Carte suivante':'Page suivante',(selected?index>=readable.length-1:page>=s.pages-1)?'disabled':'')+'</div><span class="cb-footer-range">'+(selected?'':s.list.length?Math.min(page*pageSize+1,s.list.length)+'–'+Math.min((page+1)*pageSize,s.list.length)+' / '+s.list.length:'0 / 0')+'</span></footer>';
    }
    function render(){
      const s=snapshot(),allOwned=owns(),ownedVersions=new Set(allOwned.map(i=>i.cardId)).size;
      const catalogueSize=new Set([...cards.map(c=>c.id),...getCatalogueChanges(),...allOwned.map(i=>i.cardId)]).size;
      const readable=s.list.filter(c=>canView(c.id)),index=readable.findIndex(c=>c.id===selected),active=Object.values(filters).some(Boolean);
      const tools=selected?'<button type="button" class="cb-back" data-binder-action="back">'+icon('arrow-left')+'<span>L’album</span></button><span class="cb-reader-count">'+(index+1)+' / '+readable.length+'</span>':
        '<label class="cb-search">'+icon('search')+'<input type="search" data-binder-field="search" aria-label="Rechercher une carte" placeholder="Rechercher une carte…" value="'+esc(filters.search)+'"></label>'+choose('collection','Univers',collectionChoices(),'Tous les univers','cb-collection-select')+button('favorites','star','Mes favoris','aria-pressed="'+filters.favorite+'"')+button('filters','sliders-horizontal','Filtres','aria-expanded="'+filtersOpen+'"')+(active?button('reset','filter-x','Effacer les filtres'):'')+button('discover','shuffle','Une carte au hasard',readable.length?'':'disabled');
      return '<section class="cb-page" data-kui-native data-mode="'+(selected?'reader':'book')+'" tabindex="-1" aria-label="Collection">'+
        '<header class="cb-heading"><div class="cb-title"><img src="assets/navigation/collection-v1.webp" alt="" width="44" height="44"><h1>Collection</h1></div><div class="cb-scopes" role="group" aria-label="Contenu de la collection"><button type="button" data-binder-action="scope" data-id="owned" aria-pressed="'+(scope==='owned')+'">Mes cartes <b>'+allOwned.length+'</b></button><button type="button" data-binder-action="scope" data-id="catalogue" aria-pressed="'+(scope==='catalogue')+'">Catalogue</button></div><div class="cb-completion"><span><b>'+ownedVersions+'</b> / '+catalogueSize+'</span><meter min="0" max="'+catalogueSize+'" value="'+ownedVersions+'" aria-label="Versions possédées"></meter></div>'+button('archives','archive','Archives et sauvegardes')+'</header>'+
        '<div class="cb-toolbar">'+tools+'</div><div class="cb-workbench" tabindex="0" aria-label="'+(selected?'Carte et récit':'Album de cartes')+'">'+(selected?reader(s):book(s))+'</div>'+(!selected?filtersHTML()+pagesHTML(s):'')+'</section>';
    }
    function cancelTurn(){
      const previous=transition;transition=null;serial++;
      if(previous){previous.animation.cancel();previous.layer.remove();}
    }
    function queueMeasure(){
      if(measureFrame!==null)globalThis.cancelAnimationFrame(measureFrame);
      measureFrame=globalThis.requestAnimationFrame(()=>{measureFrame=null;measureReading();});
    }
    function updateReading(){
      if(!root)return;
      const viewport=root.querySelector('.cb-read-window'),content=root.querySelector('.cb-read-content');
      if(!viewport||!content)return;
      readPage=Math.max(0,Math.min(readPage,readPages-1));
      const stride=viewport.getBoundingClientRect().width+24;
      content.style.transform='translateX('+(-readPage*stride)+'px)';
      viewport.scrollLeft=0;
      root.querySelector('[data-reading-page]').textContent=(readPage+1)+' / '+readPages;
      root.querySelector('[data-binder-action=read-previous]').disabled=readPage===0;
      root.querySelector('[data-binder-action=read-next]').disabled=readPage>=readPages-1;
      const bounds=viewport.getBoundingClientRect();
      content.querySelectorAll('button,a,input,select').forEach(node=>{
        const box=node.getBoundingClientRect();node.inert=box.right>bounds.right+1||box.left<bounds.left-1;
      });
    }
    function measureReading(){
      if(!root||!selected)return;
      const viewport=root.querySelector('.cb-read-window'),content=root.querySelector('.cb-read-content');
      if(!viewport||!content)return;
      const width=viewport.getBoundingClientRect().width;if(!width)return;
      content.style.setProperty('--cb-read-width',width+'px');
      content.style.transform='none';
      readPages=Math.max(1,Math.ceil((content.scrollWidth+23)/(width+24)));
      updateReading();
    }
    function paint(focus){
      if(!root||painting)return;painting=true;cancelTurn();
      const active=root.ownerDocument.activeElement;
      const previousDialog=root.querySelector('.cb-overlay[open]'),dialogScroll=previousDialog?.querySelector('.cb-overlay-body')?.scrollTop;
      const dialogKey=previousDialog?.getAttribute('aria-labelledby');
      const descriptor=focus||(root.contains(active)?{action:active.dataset.binderAction,id:active.dataset.id,field:active.dataset.binderField,filter:active.dataset.binderFilter,value:active.matches('input[type=radio],input[type=checkbox]')?active.value:undefined,start:active.selectionStart,end:active.selectionEnd}:null);
      closeMedia(false);
      try{
        root.innerHTML=render();globalThis.KalistarUI?.icons(root)??globalThis.lucide?.createIcons({root});
        const dialog=root.querySelector('.cb-overlay[data-active=true]');
        if(dialog){
          if(globalThis.KalistarDialogHistory)globalThis.KalistarDialogHistory.open(dialog);else dialog.showModal();
          if(dialogScroll!==undefined&&dialog.getAttribute('aria-labelledby')===dialogKey)dialog.querySelector('.cb-overlay-body').scrollTop=dialogScroll;
        }
        if(descriptor){
          const target=[...(dialog||root).querySelectorAll('button,input,select')].find(n=>n.getClientRects().length&&(descriptor.field?n.dataset.binderField===descriptor.field:descriptor.filter?n.dataset.binderFilter===descriptor.filter&&(descriptor.value===undefined||n.value===descriptor.value):descriptor.action&&n.dataset.binderAction===descriptor.action&&(!descriptor.id||n.dataset.id===descriptor.id)));
          if(target&&!target.disabled){target.focus({preventScroll:true});if(target.type==='search'&&descriptor.start!=null)target.setSelectionRange(descriptor.start,descriptor.end);}
          else if(!dialog)root.querySelector('.cb-page').focus({preventScroll:true});
        }
        queueMeasure();
      }finally{painting=false;}
    }
    function turn(commit,direction='next'){
      if(transition)return;
      const album=root?.querySelector('.cb-album');
      const single=album&&getComputedStyle(album).getPropertyValue('--cb-single-leaf').trim()==='1';
      const leaves=album?(single?[album.querySelector('.cb-spread')]:[...album.querySelectorAll('.cb-spread>.cb-leaf')]):[];
      if(!leaves.length||globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches||!album.animate){commit();return;}
      const mode=album.dataset.albumMode;
      const old=leaves.map(leaf=>leaf.cloneNode(true)),bounds=album.getBoundingClientRect(),rects=leaves.map(leaf=>leaf.getBoundingClientRect());
      commit();
      const target=root?.querySelector('.cb-album');if(!target)return;
      const layer=root.ownerDocument.createElement('div');layer.className='cb-page-turn';layer.inert=true;layer.setAttribute('aria-hidden','true');
      const targetSingle=getComputedStyle(target).getPropertyValue('--cb-single-leaf').trim()==='1';
      let animation;
      if(mode!==target.dataset.albumMode||single!==targetSingle){
        target.append(layer);animation=target.animate([{opacity:.35},{opacity:1}],{duration:180,easing:'ease-out'});
      }else{
        const moving=single?0:direction==='next'?1:0,stationary=1-moving;
        const place=(node,index)=>{const r=rects[index];Object.assign(node.style,{position:'absolute',left:(r.left-bounds.left)+'px',top:(r.top-bounds.top)+'px',width:r.width+'px',height:r.height+'px'});};
        if(!single){const rest=old[stationary];place(rest,stationary);layer.append(rest);}
        const sheet=root.ownerDocument.createElement('div');sheet.className='cb-turn-sheet';place(sheet,moving);sheet.style.transformOrigin=direction==='next'?'left center':'right center';
        const front=old[moving],back=(single?target.querySelector('.cb-spread'):target.querySelectorAll('.cb-spread>.cb-leaf')[stationary]).cloneNode(true);
        front.classList.add('cb-turn-face','cb-turn-front');back.classList.add('cb-turn-face','cb-turn-back');
        if(single){front.classList.add('cb-single-turn');back.classList.add('cb-single-turn');}
        sheet.append(front,back);layer.append(sheet);
        layer.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));target.append(layer);
        animation=sheet.animate([{transform:'rotateY(0deg)'},{transform:'rotateY('+(direction==='next'?'-180':'180')+'deg)'}],{duration:720,easing:'cubic-bezier(.35,.1,.25,1)',fill:'forwards'});
      }
      const token=++serial;
      transition={animation,layer};
      animation.finished.catch(()=>{}).then(()=>{if(serial===token){layer.remove();transition=null;queueMeasure();}});
    }
    function navigate(delta){
      if(transition||!delta)return;
      const s=snapshot();
      if(selected){
        const readable=s.list.filter(c=>canView(c.id)),next=readable[readable.findIndex(c=>c.id===selected)+delta];
        if(next)turn(()=>{select(next.id);paint();},delta>0?'next':'previous');
      }else{
        const next=page+delta;if(next<0||next>=s.pages)return;
        turn(()=>{page=next;paint();},delta>0?'next':'previous');
      }
    }
    function closeMedia(focus=true){
      if(!mediaModal)return;
      const current=mediaModal;mediaModal=null;
      current.dialog.close();
      for(const {node,marker}of current.items)marker.replaceWith(node);
      current.dialog.remove();
      root?.querySelector('[data-binder-action=media-tools]')?.setAttribute('aria-expanded','false');
      if(focus&&root){
        const target=[...root.querySelectorAll('.cb-media-toggle,.cb-visual [data-binder-action=media]')].find(node=>node.getClientRects().length);
        (target||root.querySelector('.cb-page'))?.focus({preventScroll:true});
      }
    }
    function openMedia(){
      if(mediaModal||!root)return;
      const visual=root.querySelector('.cb-visual');if(!visual)return;
      const dialog=root.ownerDocument.createElement('dialog');dialog.className='cb-overlay cb-media-overlay';dialog.setAttribute('aria-label','Options de la carte');
      dialog.innerHTML='<div class="cb-overlay-body"><header class="cb-filter-heading"><h2>'+esc(byId.get(selected).name)+'</h2>'+button('close-overlay','x','Fermer les options de la carte','autofocus')+'</header><figure class="cb-media-content"></figure></div>';
      // Move the real controls, never a second copy of the download/version actions.
      const content=dialog.querySelector('.cb-media-content'),nodes=[...visual.querySelectorAll(':scope>figcaption,:scope>.cb-version-select,:scope>.cb-equipped')];
      const readingSelect=root.querySelector('.cb-reading-select');
      if(readingSelect&&getComputedStyle(readingSelect).display==='none')nodes.push(readingSelect);
      const items=nodes.map(node=>{
        const marker=root.ownerDocument.createComment('media-control');node.replaceWith(marker);content.append(node);return {node,marker};
      });
      root.querySelector('.cb-page').append(dialog);mediaModal={dialog,items};
      visual.querySelector('[data-binder-action=media-tools]').setAttribute('aria-expanded','true');
      globalThis.KalistarUI?.icons(dialog)??globalThis.lucide?.createIcons({root:dialog});
      if(globalThis.KalistarDialogHistory)globalThis.KalistarDialogHistory.open(dialog);else dialog.showModal();
    }
    function closeOverlay(){if(mediaModal){closeMedia();return;}const action=pagesOpen?'pages':'filters';pagesOpen=filtersOpen=false;paint({action});}
    function click(event){
      if(event.target.matches('.cb-overlay')){event.stopPropagation();closeOverlay();return;}
      if(suppressClick){suppressClick=false;event.preventDefault();event.stopPropagation();return;}
      const node=event.target.closest('[data-binder-action]');if(!root?.contains(node)||node.disabled||painting||node.closest('.cb-page-turn'))return;
      event.stopPropagation();const action=node.dataset.binderAction,id=node.dataset.id;
      if(action==='previous-page'||action==='previous-card')return navigate(-1);
      if(action==='next-page'||action==='next-card')return navigate(1);
      if(action==='read-previous'||action==='read-next'){readPage+=action==='read-next'?1:-1;updateReading();return;}
      if(action==='archives')return onArchives();
      if(action==='registry')return onRegistry(id||null);
      if(action==='history')return onHistory(id);
      if(action==='open-deck')return onOpenDeck(id,node.dataset.card);
      if(action==='equipment')return onEquipment(id);
      if(action==='close-overlay')return closeOverlay();
      if(action==='media-tools')return openMedia();
      if(action==='open'||action==='discover'){
        const list=filtered().filter(c=>canView(c.id)),target=action==='discover'?list[Math.floor(Math.random()*list.length)]?.id:id;
        if(target&&canView(target))turn(()=>{tab='story';art=false;select(target);paint({action:'back'});});return;
      }
      if(action==='back'){
        const id=selected;turn(()=>{page=Math.floor(filtered().findIndex(c=>c.id===id)/pageSize);selected=null;paint({action:'open',id});},'previous');return;
      }
      if(action==='scope'){scope=id==='catalogue'?'catalogue':'owned';page=0;selected=null;filtersOpen=pagesOpen=false;}
      if(action==='pages'){pagesOpen=true;filtersOpen=false;}
      if(action==='jump-page'){const next=Number(id);pagesOpen=false;if(Number.isInteger(next)){page=Math.max(0,Math.min(next,snapshot().pages-1));}paint({action:'pages'});return;}
      if(action==='filter-choice'&&node.dataset.field==='element'){filters.element=filters.element===id?'':id;page=0;}
      if(action==='favorite'&&canView(id))onFavorite(id);
      if(action==='favorites'){filters.favorite=!filters.favorite;page=0;}
      if(action==='filters'){filtersOpen=!filtersOpen;pagesOpen=false;}
      if(action==='reset'){Object.keys(filters).forEach(k=>filters[k]=k==='favorite'?false:'');page=0;}
      if(action==='tab'&&['story','profile','career','copies'].includes(id)){tab=id;readPage=0;}
      if(action==='media')art=id==='art';
      if(action==='history-page'){historyPage=Math.max(0,Number(node.dataset.index)||0);readPage=0;}
      if(action==='copy-page'){copyPage=Math.max(0,Number(node.dataset.index)||0);readPage=0;}
      paint();
    }
    function input(event){
      if(painting||event.target.dataset.binderField!=='search')return;
      event.stopPropagation();filters.search=event.target.value;page=0;selected=null;paint();
    }
    function change(event){
      const n=event.target;if(painting||!n.matches('[data-binder-filter],[data-binder-field]'))return;
      event.stopPropagation();
      if(n.dataset.binderFilter){filters[n.dataset.binderFilter]=n.value;page=0;selected=null;}
      if(n.dataset.binderField==='sort'){sort=n.value;page=0;}
      if(n.dataset.binderField==='instance'){instance=n.value;historyPage=readPage=0;}
      if(n.dataset.binderField==='version'){if(!select(n.value))return;paint();return;}
      if(n.dataset.binderField==='tab'){tab=n.value;readPage=0;}
      if(n.dataset.binderField!=='search')paint();
    }
    function keyboard(event){
      if(event.key==='Escape'){
        if(filtersOpen||pagesOpen||mediaModal){event.preventDefault();event.stopPropagation();closeOverlay();}
        else if(selected){event.preventDefault();event.stopPropagation();root.querySelector('[data-binder-action=back]').click();}
        return;
      }
      if(event.target.matches('input,select,textarea')||filtersOpen||pagesOpen||mediaModal)return;
      if(event.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
        const tabs=['story','profile','career','copies'];tab=tabs[event.key==='Home'?0:event.key==='End'?3:(tabs.indexOf(tab)+(event.key==='ArrowRight'?1:3))%4];readPage=0;event.preventDefault();paint({action:'tab',id:tab});return;
      }
      if(['ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault();const delta=event.key==='ArrowRight'?1:-1;
        if(event.target.closest('.cb-reading')&&readPages>1){readPage+=delta;updateReading();}else navigate(delta);
      }
    }
    function pointerDown(event){
      const control=event.target.closest('button,a,input,select,textarea');
      if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0)||(control&&!control.matches('.cb-card'))||!event.target.closest('.cb-album')){swipe=null;return;}
      swipe={id:event.pointerId,x:event.clientX,y:event.clientY,reading:!!event.target.closest('.cb-reading')};
    }
    function pointerUp(event){
      const start=swipe;swipe=null;if(!start||event.pointerId!==start.id)return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(Math.abs(dx)<45||Math.abs(dx)<Math.abs(dy)*1.25)return;
      suppressClick=true;globalThis.clearTimeout(swipeTimer);swipeTimer=globalThis.setTimeout(()=>{suppressClick=false;},250);
      if(start.reading&&selected&&readPages>1){readPage+=dx<0?1:-1;updateReading();}else navigate(dx<0?1:-1);
    }
    function resized(){cancelTurn();queueMeasure();}
    function visibility(){if(root?.ownerDocument.hidden)cancelTurn();}
    function cancelOverlay(event){if(event.target.matches('.cb-overlay')){event.preventDefault();closeOverlay();}}
    const listeners=[['click',click],['input',input],['change',change],['keydown',keyboard],['pointerdown',pointerDown],['pointerup',pointerUp],['pointercancel',()=>{swipe=null;}],['cancel',cancelOverlay,true]];
    function destroy(){
      cancelTurn();closeMedia(false);observer?.disconnect();observer=null;
      motionQuery?.removeEventListener('change',resized);motionQuery=null;
      if(measureFrame!==null)globalThis.cancelAnimationFrame(measureFrame);measureFrame=null;
      globalThis.clearTimeout(swipeTimer);swipeTimer=null;swipe=null;suppressClick=false;
      if(root){root.ownerDocument.removeEventListener('visibilitychange',visibility);root.querySelectorAll('.cb-overlay[open]').forEach(d=>d.close());for(const [name,fn,capture]of listeners)root.removeEventListener(name,fn,capture);}
      root=null;filtersOpen=pagesOpen=false;
    }
    return {
      render,mount(element){
        destroy();root=element;paint();for(const [name,fn,capture]of listeners)root.addEventListener(name,fn,capture);
        root.ownerDocument.addEventListener('visibilitychange',visibility);
        motionQuery=globalThis.matchMedia?.('(prefers-reduced-motion:reduce)');motionQuery?.addEventListener('change',resized);
        const Resize=root.ownerDocument.defaultView.ResizeObserver;
        if(Resize){observer=new Resize(resized);observer.observe(root);}
        root.ownerDocument.fonts?.ready.then(()=>{if(root)queueMeasure();});
      },
      refresh(){paint();},destroy,
      inspect:()=>({scope,page,pageSize,selected,tab,art,mediaOpen:!!mediaModal,filters:{...filters},sort,readPage,readPages,turning:!!transition})
    };
  }
  return {create,groupCards,textPages,matchesScope};
});
