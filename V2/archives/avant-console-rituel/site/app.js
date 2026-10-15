(() => {
  'use strict';
  const data=window.KALISTAR_DATA,E=KalistarEngine.createEngine(data),cards=data.cards;
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<i data-lucide="${n}"></i>`,ib=(action,n,title,extra='')=>`<button class="icon-button" data-action="${action}" title="${esc(title)}" aria-label="${esc(title)}" ${extra}>${icon(n)}</button>`;
  const asset=(folder,name)=>`../assets/${folder}/${encodeURIComponent(name)}.png`;
  const cardImage=c=>`assets/cards/${c.slug}.webp`,artImage=c=>`assets/cards/${c.slug}-art.webp`;
  const duelImage=c=>`../cartes/${c.slug}.png`;
  const dieLabel=(value,attack)=>value==='retry'&&attack?'Trèfle':format(value);
  const names={retry:'Relance',mana:'Potion',revive:'Cœur · Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Buff physique',shield_magic:'Bouclier magique',shield_physical:'Bouclier physique'};
  const roles=['Tank','DPS physique','Middle','DPS magique','Support'];
  const format=v=>typeof v==='number'?String(v):names[v]||v;
  let storageAvailable=true,toastTimer,aiTimer,epoch=0,rolling=false,game=null,combatController=null;
  function load(key,fallback){try{const raw=localStorage.getItem('kalistar.v2.'+key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
  function save(key,value){try{localStorage.setItem('kalistar.v2.'+key,JSON.stringify(value));}catch{storageAvailable=false;}}
  const defaultDeck=data.decks.player;
  const enemyDeck=data.decks.enemy;
  let deck=load('deck',defaultDeck);if(!Array.isArray(deck)||deck.some(id=>!E.byId[id])||deck.length>10)deck=defaultDeck.slice();
  let deckName=String(load('deckName','Les premiers Sentry')).slice(0,50);
  const savedFavorites=load('favorites',[]);
  let favorites=new Set((Array.isArray(savedFavorites)?savedFavorites:[]).filter(id=>E.byId[id]));
  const restored=load('game',null);if(restored){try{game=E.restoreGame(restored);}catch{game=null;}}
  let boardScale=Math.max(85,Math.min(140,Number(load('boardScale',100))||100));
  const ui={view:location.hash==='#arena'?'arena':'collection',filters:{search:'',element:'',faction:'',race:'',position:'',weapon:'',favorite:false},sort:'id',page:0,filtersOpen:false,attacker:null,target:null,reserve:null,detail:null,art:false};
  function icons(){if(window.lucide)lucide.createIcons();}
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
  function persist(){save('deck',deck);save('deckName',deckName);save('favorites',[...favorites]);if(game)save('game',game);$('#deck-count').textContent=deck.length;}
  function modal(id,html){const d=$('#'+id);d.innerHTML=html;if(!d.open)d.showModal();icons();}
  function head(title){return `<div class="dialog-head"><h2>${esc(title)}</h2>${ib('close','x','Fermer')}</div>`;}
  function setView(view){
    clearTimeout(aiTimer);
    if(ui.view!==view)epoch++;
    if(view==='arena'&&!game){try{createGame('ai','KALI-'+Math.floor(Math.random()*999999));}catch(e){toast(e.message);showDeck();return;}}
    ui.view=view;history.replaceState(null,'','#'+view);render();
  }
  function render(){
    combatController?.abort();
    window.KalistarFormationDrag?.cancel();
    window.KalistarFocus?.capture();
    const scroll=$('.battlefield-viewport')?.scrollLeft||0;
    document.body.classList.toggle('arena-view',ui.view==='arena');
    document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===ui.view;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
    $('#app').innerHTML=ui.view==='collection'?collection():arena();icons();
    if($('.battlefield-viewport'))$('.battlefield-viewport').scrollLeft=scroll;
    window.KalistarDice?.mount(document.querySelectorAll('.dice-stage'));
    window.KalistarFocus?.mount(document.querySelectorAll('.formation'));
    if($('#journal-dialog').open){$('#journal-dialog').innerHTML=head('Journal du duel')+journal();icons();}
    if($('#detail-dialog').open&&ui.detailContext&&$('#detail-dialog .live-bonuses')){
      $('#detail-dialog .live-bonuses').outerHTML=bonusDetails(ui.detailContext)||'<div class="live-bonuses"><p class="muted">Cette carte n’est plus sur le plateau.</p></div>';
    }
    persist();scheduleAI();
  }
  function choices(field,value,label){return `<option value="">${label}</option>`+[...new Set(cards.map(c=>c[field]))].sort((a,b)=>a.localeCompare(b,'fr')).map(v=>`<option ${v===value?'selected':''} value="${esc(v)}">${esc(v)}</option>`).join('');}
  function filtered(){
    const f=ui.filters,search=f.search.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return cards.filter(c=>(!search||[c.name,c.title,c.faction,c.race,c.id].join(' ').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(search))&&(!f.element||c.element===f.element)&&(!f.faction||c.faction===f.faction)&&(!f.race||c.race===f.race)&&(!f.weapon||c.weapon===f.weapon)&&(!f.position||c.positions.includes(Number(f.position)))&&(!f.favorite||favorites.has(c.id))).sort((a,b)=>ui.sort==='name'?a.name.localeCompare(b.name,'fr'):ui.sort==='attack'?E.mean(b.atk)-E.mean(a.atk):ui.sort==='defense'?E.mean(b.defense)-E.mean(a.defense):ui.sort==='faction'?a.faction.localeCompare(b.faction,'fr'):ui.sort==='element'?a.element.localeCompare(b.element):a.id.localeCompare(b.id));
  }
  function collectionItem(c){const n=deck.filter(id=>id===c.id).length;return `<article class="collection-item"><button class="card-open" data-action="detail" data-id="${c.id}" aria-label="Consulter ${c.name}"><img src="${cardImage(c)}" alt="Carte ${c.name}, ${c.element}" width="538" height="898" loading="lazy"></button><div class="item-tools"><span class="card-id">#${c.id}</span><button class="fav ${favorites.has(c.id)?'active':''}" data-action="favorite" data-id="${c.id}" aria-pressed="${favorites.has(c.id)}" title="Favori : ${c.name}" aria-label="Favori : ${c.name}">${icon('star')}</button><button data-action="remove" data-id="${c.id}" ${n?'':'disabled'} title="Retirer ${c.name} du deck" aria-label="Retirer ${c.name} du deck">${icon('minus')}</button><span class="amount">${n}</span><button data-action="add" data-id="${c.id}" ${canAdd(c)?'':'disabled'} title="Ajouter ${c.name} au deck" aria-label="Ajouter ${c.name} au deck">${icon('plus')}</button></div></article>`;}
  function collection(){
    const f=ui.filters,list=filtered(),perPage=8,pages=Math.max(1,Math.ceil(list.length/perPage));ui.page=Math.min(ui.page,pages-1);const visible=list.slice(ui.page*perPage,(ui.page+1)*perPage);
    const pageItems=(items)=>items.length?items.map(collectionItem).join(''):'<div class="empty-page">Aucune carte</div>';
    return `<div class="collection-shell"><aside class="filters ${ui.filtersOpen?'visible':''}" aria-label="Filtres de collection"><div class="filters-head"><span class="eyebrow">Archives de Kalistar</span>${ib('reset-filters','rotate-ccw','Réinitialiser les filtres')}</div><label class="search-wrap">Recherche<input class="search" id="search" type="search" placeholder="Nom, faction, identifiant" value="${esc(f.search)}"></label><div class="crystals-wrap"><label>Cristal</label><div class="crystal-filter">${Object.values(data.elements).map(e=>`<button data-action="element" data-id="${e.id}" class="${f.element===e.id?'selected':''}" aria-pressed="${f.element===e.id}" title="${e.id}" aria-label="${e.id}"><img src="${asset('cristaux',e.id)}" alt=""></button>`).join('')}</div></div><div class="filter-separator"></div><label>Faction<select data-filter="faction">${choices('faction',f.faction,'Toutes les factions')}</select></label><label>Race<select data-filter="race">${choices('race',f.race,'Toutes les races')}</select></label><label>Position<select data-filter="position"><option value="">Toutes les positions</option>${roles.map((r,i)=>`<option value="${i+1}" ${String(i+1)===f.position?'selected':''}>P${i+1} · ${r}</option>`).join('')}</select></label><label>Arme<select data-filter="weapon">${choices('weapon',f.weapon,'Toutes les armes')}</select></label><label class="check-label"><input type="checkbox" id="favorites-only" ${f.favorite?'checked':''}>Mes favoris</label><div class="filter-footer"><a href="../impression/KALISTAR_V2_20_CARTES.pdf" target="_blank" rel="noopener">PDF d'impression couleur</a><a href="../KALISTAR_V2_CARTES_PNG.zip" download>Les ${cards.length} cartes PNG</a></div></aside><section class="collection-main"><div class="section-heading"><div><span class="eyebrow">Le premier chapitre</span><h1>Collection</h1></div><div class="totals"><div><b>${cards.length}</b>Versions</div><div><b>${Object.keys(data.elements).length}</b>Cristaux</div><div><b>${favorites.size}</b>Favoris</div></div></div><div class="collection-tools"><div class="left"><button class="filter-mobile icon-button" data-action="toggle-filters" aria-label="Afficher les filtres" title="Filtres">${icon('sliders-horizontal')}</button><span class="result-count">${list.length} carte${list.length===1?'':'s'}${f.element?' · '+f.element:''}</span></div><select id="sort" aria-label="Trier la collection">${[['id','Numéro de collection'],['name','Nom'],['element','Cristal'],['faction','Faction'],['attack','ATK moyenne'],['defense','DEF moyenne']].map(([v,n])=>`<option value="${v}" ${ui.sort===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="book-spread"><div class="book-page">${pageItems(visible.slice(0,4))}</div><div class="book-page">${pageItems(visible.slice(4,8))}</div></div><div class="pagination">${ib('prev-page','chevron-left','Page précédente',ui.page===0?'disabled':'')}<span>Volume I · ${ui.page+1} / ${pages}</span>${ib('next-page','chevron-right','Page suivante',ui.page>=pages-1?'disabled':'')}</div></section></div>`;
  }
  function canAdd(c){return deck.length<10&&deck.filter(id=>id===c.id).length<2&&(c.element!=='RAINBOW'||!deck.some(id=>E.byId[id].element==='RAINBOW'));}
  function changeDeck(id,delta){const c=E.byId[id];if(delta>0){if(!canAdd(c))return toast('Limite du deck atteinte.');deck.push(id);}else{const i=deck.indexOf(id);if(i>=0)deck.splice(i,1);}persist();if($('#deck-dialog').open)showDeck();if(ui.view==='collection')render();}
  function showDeck(){
    const errors=E.validateDeck(deck);
    modal('deck-dialog',head('Mon deck')+`<div class="dialog-body deck-layout"><div class="deck-list">${cards.map(c=>`<div class="deck-row"><img src="${artImage(c)}" alt=""><div class="names"><b>${c.name}</b><small class="version-title">${esc(c.title)}</small><small>${c.element} · ${c.positions.map(p=>'P'+p).join(' / ')}</small></div><div class="stepper">${ib('remove','minus','Retirer '+c.name,`data-id="${c.id}" ${deck.includes(c.id)?'':'disabled'}`)}<span>${deck.filter(id=>id===c.id).length}</span>${ib('add','plus','Ajouter '+c.name,`data-id="${c.id}" ${canAdd(c)?'':'disabled'}`)}</div></div>`).join('')}</div><div class="deck-summary"><label>Nom du deck<input id="deck-name" maxlength="50" value="${esc(deckName)}"></label><div class="deck-meter">${deck.length}<small> / 10 cartes</small></div><div class="position-coverage">${roles.map((r,i)=>{const n=deck.filter(id=>E.byId[id].positions.includes(i+1)).length;return `<span class="${n?'':'missing'}" title="${r}">P${i+1} · ${n}</span>`;}).join('')}</div><div class="validation ${errors.length?'':'ok'}">${errors.length?errors.map(e=>`<p>${esc(e)}</p>`).join(''):'Formation P1 à P5 possible.'}</div><button class="primary" data-action="deck-play" ${errors.length?'disabled':''}>${icon('swords')}Jouer ce deck</button><button class="ghost" data-action="default-deck">${icon('rotate-ccw')}Deck initial</button><div class="detail-actions">${ib('export-deck','download','Exporter le deck JSON')}${ib('import-deck','upload','Importer un deck JSON')}</div><input hidden type="file" id="deck-file" accept="application/json,.json"><p class="muted">${game&&game.phase!=='over'?'La partie en cours conserve son deck initial.':''}</p></div></div>`);
  }
  function bonusDetails(context){
    const p=game?.players[context?.side],u=p?.board.find(u=>u?.uid===context?.uid);
    if(!u||u.cardId!==ui.detail)return '';
    const c=E.card(u),section=(key,title,text)=>`<section class="bonus-explanation ${context.bonus===key?'highlighted':''}" data-explains="${key}"><h3>${title}</h3><p>${text}</p></section>`;
    const group=(field,label,stat)=>{
      const matches=p.board.flatMap((other,index)=>other&&E.card(other)[field]===c[field]?[`${esc(E.card(other).name)} · P${index+1}`]:[]),value=E.synergy(p,u,field);
      return section(field,`${label} · ${esc(c[field])} <b>${stat} +${value}</b>`,`${matches.length} carte${matches.length>1?'s':''} sur votre plateau, cette carte comprise. ${matches.join(', ')}.<br>Palier actuel : +${value} ${stat}. La réserve et les cartes éliminées ne comptent pas.`);
    };
    return `<div class="live-bonuses"><h2>Bonus sur le plateau · Joueur ${context.side+1}</h2>${group('faction','Faction','ATK')}${group('race','Race','DEF')}${section('mana',`Potion <b>${u.mana?'+'+u.mana:'0'}</b>`,u.mana?'La prochaine attaque numérique magique de cette carte reçoit +60 ATK. Le jeton est ensuite consommé. Une attaque physique ne le consomme pas.':'Aucun jeton de potion actif.')}${section('physical',`Puissance physique <b>${u.physical?'+'+u.physical:'0'}</b>`,u.physical?'La prochaine attaque numérique physique de cette carte reçoit +60 ATK. Le jeton est ensuite consommé. Une attaque magique ne le consomme pas.':'Aucun bonus physique en attente.')}${section('luck',`Trèfle · Seconde chance <b>${u.luck?'Actif':'Inactif'}</b>`,u.luck?'Si le score DEF final est inférieur à l’ATK finale, ce trèfle est consommé et le dé DEF est relancé automatiquement. Tous les bonus sont recalculés sur le nouveau jet. Le Reraise reste disponible si cette seconde chance échoue. Un seul trèfle actif. Une égalité le conserve. Mort ignore les scores et ne déclenche pas ce jeton.':'Aucun trèfle actif. Un trèfle obtenu en ATK peut être attribué à cette carte par une carte alliée, ou par elle-même.')}${section('reraise',`Cœur · Reraise <b>${u.reraise?'Actif':'Inactif'}</b>`,u.reraise?'Une vie supplémentaire. À la prochaine élimination, même par Mort, ce cœur est consommé et la carte reprend vie à la même position. Un seul cœur actif à la fois.':'Aucune vie supplémentaire active. Un cœur obtenu sur le dé en accorde une à cette carte.')}</div>`;
  }
  function showDetail(id,art=false,context=null){
    ui.detail=id;ui.art=art;ui.detailContext=context;const c=E.byId[id],el=data.elements[c.element];
    const v=(x,attack=false)=>typeof x==='number'?x:`<img src="${asset('effets',x)}" alt="${dieLabel(x,attack)}" title="${dieLabel(x,attack)}">`;
    $('#detail-dialog').classList.add('card-detail');
    modal('detail-dialog',head(c.name)+`<div class="dialog-body detail-body"><div class="detail-visual" style="--element-color:#${el.color}"><img src="${art?artImage(c):'../cartes/'+c.slug+'.png'}" alt="${art?'Illustration':'Carte'} de ${c.name}"></div><div class="detail-info"><div><span class="eyebrow">${c.element} · #${c.id}</span><h2>${esc(c.title)}</h2></div>${bonusDetails(context)}<div class="identity-strip"><img src="${asset('factions',c.faction)}" alt="Drapeau ${c.faction}"><span><b>${c.faction}</b><br>${c.job}</span><img class="race-icon" src="${asset('races',c.race)}" alt=""><span>${c.race}<br>${c.positions.map(p=>'P'+p).join(' / ')}</span></div><div class="muted">${c.weapon}</div><table class="stats-table"><thead><tr><th>Dé</th>${[6,5,4,3,2,1].map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody><tr><th>ATK</th>${c.atk.map((x,i)=>`<td class="${c.magic.includes(6-i)?'magic':''}" title="${c.magic.includes(6-i)?'Magique':'Physique'}">${v(x,true)}</td>`).join('')}</tr><tr><th>DEF</th>${c.defense.map((x,i)=>`<td class="${c.barriers.includes(6-i)?'barrier':''}" title="${c.barriers.includes(6-i)?'Barrière : -30 contre magie':'Défense sans barrière'}">${v(x)}</td>`).join('')}</tr></tbody></table><div class="affinities">${c.element==='RAINBOW'?'+40 contre les cristaux classiques':`+${c.advantage} ${data.elements[el.strong_against].label}<span>-${c.disadvantage} ${data.elements[el.weak_against].label}</span>`}</div><p class="story">${esc(c.text)}</p><div class="detail-actions"><button data-action="toggle-art">${icon(art?'credit-card':'image')}${art?'Carte':'Illustration'}</button><a href="../cartes/${c.slug}.png" download>${icon('download')} PNG original</a>${ib('favorite','star','Favori',`data-id="${id}" aria-pressed="${favorites.has(id)}"`)}</div></div></div>`);
    if(context?.bonus)requestAnimationFrame(()=>$('#detail-dialog .highlighted')?.scrollIntoView({block:'nearest'}));
  }
  function showRules(){
    modal('rules-dialog',head('Règles · V2 démo')+`<div class="dialog-body rules-body"><h3>Formation et victoire</h3><p>10 cartes par joueur, 5 positions : P1 Tank, P2 DPS physique, P3 Middle, P4 DPS magique, P5 Support. Chaque carte occupe une position autorisée. Une remplaçante doit pouvoir jouer à la position libérée. Une carte vivante ne change pas de position après le début du combat.</p><h3>Un duel</h3><ol><li>L'attaquant choisit sa carte et sa cible avant les jets.</li><li>Jet ATK, puis jet DEF. D6 est la face du haut de la carte, D1 celle du bas.</li><li>ATK finale strictement supérieure à DEF finale : cible éliminée. Égalité : elle survit.</li><li>Les rôles s'inversent. Les remplacements se font avant le prochain duel.</li></ol><div class="formula">ATK = jet + arme + cristal + faction + jeton − barrière<br>DEF = jet + race<br>Les totaux négatifs sont ramenés à zéro.</div><h3>Armes, éléments et barrières</h3><p>La matrice des armes applique +50, −50 ou 0 une seule fois à l'ATK, ligne attaquante contre colonne adverse. Un avantage élémentaire vaut +30, une faiblesse −30, sans second ajustement DEF. Les exceptions imprimées restent prioritaires.</p><p>Air &gt; Eau &gt; Feu &gt; Glace &gt; Plante &gt; Terre &gt; Roche &gt; Électricité &gt; Air.<br>Sang &gt; Ténèbres &gt; Lumière &gt; Sang.</p><p>Rainbow : +40 contre les classiques ; un classique subit −40 contre Rainbow. Rainbow contre Rainbow, ou une rencontre avec une carte sans cristal : 0. Chaos est exclu.</p><p>Une face ATK magique contre une face DEF avec barrière perd 30 ATK. Aucune réduction dans les autres combinaisons.</p><h3>Synergies de plateau</h3><table><tr><th>Cartes de même groupe</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr><tr><th>Bonus</th><td>0</td><td>+10</td><td>+20</td><td>+30</td><td>+40</td></tr></table><p>Même faction : bonus ATK. Même race : bonus DEF. La carte concernée est comptée ; réserve et morts sont exclus. Les paliers ne s'additionnent pas et sont recalculés après chaque changement.</p><h3>Effets spéciaux</h3><table><tr><th>Trèfle en ATK</th><td>Action de soutien : attribue un trèfle à une carte de votre plateau, elle-même comprise. Un seul jeton actif. En cas de score DEF insuffisant, relance DEF automatique avant le Reraise. Une égalité conserve le trèfle. Mort ne le déclenche pas.</td></tr><tr><th>Trèfle en DEF</th><td>Relance immédiate du dé DEF, sans consommer de jeton. Attaquant et cible conservés.</td></tr><tr><th>Potion / Buff ATK</th><td>Action de soutien. Jeton +60 pour la prochaine attaque magique / physique numérique de la carte.</td></tr><tr><th>Cœur / Reraise</th><td>Action de soutien : la carte gagne une vie supplémentaire visible à côté d’elle. À sa prochaine élimination, même par Mort, le cœur est consommé et elle reste en place. Un seul cœur actif, regagnable après consommation. Aucun retour de carte morte.</td></tr><tr><th>Esquive</th><td>Annule toute attaque, y compris Mort.</td></tr><tr><th>Mort</th><td>Élimination instantanée sauf esquive ou bouclier spécial adapté. Un Reraise actif est consommé à la place de l’élimination.</td></tr><tr><th>Bouclier spécial</th><td>Annule le type correspondant. Distinct de la barrière ordinaire −30.</td></tr></table><h3>Conventions provisoires de la démo</h3><ul class="conventions">${data.demo.conventions.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p class="muted">Sources : cartes V2, matrice des armes du classeur Kalistar et prompt de règles validé. Les conventions ci-dessus complètent les points non tranchés ; elles ne valent pas validation définitive de l'équilibrage.</p></div>`);
  }
  function createGame(mode,seed){
    const errors=E.validateDeck(deck);if(errors.length)throw new Error(errors.join(' '));
    clearTimeout(aiTimer);epoch++;game=E.newGame(deck,enemyDeck,{mode,seed});E.autoDeploy(game,0);E.autoDeploy(game,1);ui.attacker=ui.target=ui.reserve=null;persist();
  }
  function newGameDialog(){modal('new-game-dialog',head('Nouvelle partie')+`<div class="dialog-body"><form class="dialog-form" id="new-game-form"><label>Adversaire<select id="game-mode"><option value="ai">Adversaire automatique</option><option value="local">Deux joueurs sur cet écran</option></select></label><label>Graine des dés<input id="game-seed" maxlength="60" value="KALI-${Math.floor(Math.random()*999999)}" required></label><p class="muted">Deck : ${esc(deckName)} · ${deck.length}/10</p>${game&&game.phase!=='over'?'<p class="validation">La nouvelle partie remplacera la sauvegarde de la partie en cours.</p>':''}<div class="actions"><button type="button" data-action="close">Annuler</button><button class="primary" type="submit" ${E.validateDeck(deck).length?'disabled':''}>Préparer la formation</button></div></form></div>`);}
  function buffs(p,u,side){
    const f=E.synergy(p,u,'faction'),r=E.synergy(p,u,'race');
    const chip=(key,text,title)=>`<button class="buff-chip ${key}" data-action="bonus" data-side="${side}" data-uid="${u.uid}" data-bonus="${key}" title="${title}" aria-label="${title}">${text}</button>`;
    return `${f?chip('faction','ATK +'+f,'Bonus de faction : ATK +'+f):''}${r?chip('race','DEF +'+r,'Bonus de race : DEF +'+r):''}${u.mana?chip('mana','M +'+u.mana,'Potion : prochaine attaque magique +'+u.mana):''}${u.physical?chip('physical','PHY +'+u.physical,'Bonus : prochaine attaque physique +'+u.physical):''}`;
  }
  function canDeployReserve(side,uid,slot){
    if(rolling||!game||game.mode==='ai'&&side===1||!(game.phase==='setup'||game.phase==='replace'&&game.replacing===side))return false;
    const p=game.players[side],u=p?.reserve.find(u=>u.uid===uid);
    return !!u&&Number.isInteger(slot)&&slot>=0&&slot<5&&E.card(u).positions.includes(slot+1)&&(game.phase==='setup'||!p.board[slot]);
  }
  function placeReserve(side,uid,slot){
    if(!canDeployReserve(side,uid,slot))throw new Error('Cette carte ne peut pas occuper cette position.');
    const next=E.clone(game);
    if(next.players[side].board[slot])E.recall(next,side,slot);
    E.deploy(next,side,uid,slot);E.assertState(next);game=next;ui.reserve=null;
  }
  function board(side){
    const p=game.players[side],selectedReserve=p.reserve.find(u=>u.uid===ui.reserve);
    return `<div class="formation cross-formation ${side?'right-cross':'left-cross'}" data-player="${side}">${p.board.map((u,slot)=>{
      const c=u?E.card(u):null,duel=['attack','defense','result'].includes(game.phase)?game.duel:null;
      const isA=!!u&&(duel?duel.side===side&&duel.attackerSlot===slot:game.phase==='choose'&&game.turn===side&&ui.attacker===slot),isT=!!u&&(duel?duel.side!==side&&duel.targetSlot===slot:game.phase==='choose'&&game.turn!==side&&ui.target===slot);
      const heart=u?.reraise?`<button class="life-badge" data-action="bonus" data-side="${side}" data-uid="${u.uid}" data-bonus="reraise" aria-label="Reraise actif : une vie supplémentaire" title="Reraise : survit à la prochaine élimination"><img src="${asset('effets','revive')}" alt=""><b>1</b></button>`:'';
      const clover=u?.luck?`<button class="life-badge clover-badge" data-action="bonus" data-side="${side}" data-uid="${u.uid}" data-bonus="luck" aria-label="Trèfle actif : seconde chance en défense" title="Trèfle : relance automatique si la défense est insuffisante"><img src="${asset('effets','retry')}" alt=""><b>1</b></button>`:'';
      const beneficiary=u&&game.phase==='clover'&&game.turn===side&&!(game.mode==='ai'&&side===1);
      const saved=u&&game.duel?.reraised===u.uid?'reraise-saved':'';
      return `<div class="slot ${side?'enemy':''} ${isA?'selected':''} ${isT?'target':''} ${isA||isT?'challenger':''} ${saved} ${beneficiary?'clover-eligible':''} ${selectedReserve&&canDeployReserve(side,selectedReserve.uid,slot)?'compatible':''}" data-position="${slot+1}" data-key="${side}-${slot}" data-unit="${u?.uid||''}" data-element="${c?.element||''}" style="--element-color:#${data.elements[c?.element]?.color||'B7D6C5'}"><div class="position-label"><b>P${slot+1}</b><span>${roles[slot]}</span></div><button class="slot-card ${u?'':'empty'}" data-action="slot" data-side="${side}" data-slot="${slot}" aria-pressed="${isA||isT}" aria-label="${beneficiary?'Attribuer le trèfle à ':side?'Adversaire':'Joueur'} P${slot+1}${c?' '+c.name:', emplacement libre'}">${c?`<img src="${duelImage(c)}" alt="${c.name}" width="897" height="1497" draggable="false">`:icon('plus')+'<span>P'+(slot+1)+'</span>'}</button>${isA||isT?'<canvas class="element-aura" aria-hidden="true"></canvas>':''}${heart}${clover}${c?`<button class="inspect" data-action="detail" data-id="${c.id}" data-side="${side}" data-uid="${u.uid}" aria-label="Inspecter ${c.name}" title="Inspecter ${c.name}">${icon('scan-eye')}</button>`:''}<div class="slot-buffs">${u?buffs(p,u,side):''}</div></div>`;
    }).join('')}</div>`;
  }
  function sideHeading(side){const p=game.players[side];return `<div class="side-heading"><div class="player-name ${side?'enemy':'ally'}">${side?(game.mode==='ai'?'Le Veilleur · IA':'Joueur 2'):'Joueur 1'}${game.turn===side&&game.phase!=='setup'?' · ATK':''}</div><div class="resources"><span>${p.board.filter(Boolean).length}/5</span><button data-action="reserves" data-side="${side}">${icon('layers-3')}${p.reserve.length}</button><button data-action="grave" data-side="${side}">${icon('skull')}${p.dead.length}</button></div></div>`;}
  function dice(side){
    const d=['attack','defense','clover','result'].includes(game.phase)?game.duel:null,isAttack=d?d.side===side:game.turn===side,rolls=d?(isAttack?d.attackRolls:d.defenseRolls):[],die=rolls.at(-1);
    const selected=game.phase==='choose'?game.players[side].board[isAttack?ui.attacker:ui.target]:null;
    const name=d?(isAttack?d.attackerName:d.targetName):selected?E.card(selected).name:'En attente';
    const active=(game.phase==='attack'&&game.turn===side)||(game.phase==='defense'&&game.turn!==side);
    return `<div class="duel-die player-${side} ${active?'active':''}" data-player="${side}"><div class="dice-owner">Joueur ${side+1}<span>${isAttack?'ATK':'DEF'}</span></div><b>${esc(name)}</b><div class="dice-stage" data-player="${side}" data-value="${die||6}" role="img" aria-label="Dé du joueur ${side+1}${die?' : '+die:' en attente'}"><div class="die-fallback">${icon('dice-'+(die||6))}</div></div><small>${die?'D'+die+' · '+esc(dieLabel(isAttack?d.attackValue:d.defenseValue,isAttack)):'En attente'}</small></div>`;
  }
  function duelRecap(s){
    const d=['attack','defense','clover','result'].includes(s.phase)?s.duel:null;
    if(!d?.attackRolls.length)return `<section class="duel-recap pending-recap" aria-label="Bonus en attente"><div class="recap-type">${icon('swords')}<span>Bonus du duel</span></div>${['Jet ATK','Arme','Cristal','Faction','Jeton','Barrière','Jet DEF','Race'].map(label=>`<div class="recap-row"><span>${label}</span><b>…</b></div>`).join('')}<div class="recap-totals"><div><span>ATK finale</span><strong>…</strong></div><span>/</span><div><span>DEF finale</span><strong>…</strong></div></div></section>`;
    const numeric=typeof d.attackValue==='number',final=d.formula;
    if(s.phase==='result'&&numeric&&!final)return `<div class="duel-recap special-recap">${icon(d.defenseValue==='dodge'?'move-up-right':'shield-check')}<span>${esc(format(d.defenseValue))}</span><span>Attaque annulée · aucun score appliqué</span></div>`;
    if(!numeric){
      const label=d.attackValue==='death'?'Mort · ignore les scores':s.phase==='clover'?'Trèfle à attribuer':dieLabel(d.attackValue,true);
      return `<div class="duel-recap special-recap">${d.attackValue==='retry'?`<img class="recap-clover" src="${asset('effets','retry')}" alt="">`:''}<span>${esc(label)}</span>${d.attackValue==='retry'?'<span>Seconde chance en défense</span>':''}${d.defenseRolls.length?`<span>DEF · ${esc(format(d.defenseValue))}</span>`:''}</div>`;
    }
    const a=s.players[d.side].board[d.attackerSlot],b=s.players[1-d.side].board[d.targetSlot];
    if(!final&&(!a||!b))return '';
    // Resolved duels retain their original synergies, including an eliminated target.
    const f=final||{baseAttack:d.attackValue,weapon:data.weapons[E.card(a).weapon]?.[E.card(b).weapon]||0,element:E.elementModifier(E.card(a),E.card(b)),faction:E.synergy(s.players[d.side],a,'faction'),buff:d.buff,race:E.synergy(s.players[1-d.side],b,'race')};
    const row=(key,label,value,bonus=true)=>`<div class="recap-row" data-bonus="${key}"><span>${label}</span><b class="${bonus&&value>0?'positive':value<0?'negative':''}">${value==null?'…':bonus&&value>0?'+'+value:value}</b></div>`;
    const subtotal=Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff);
    return `<section class="duel-recap" aria-label="Détail des bonus du duel"><div class="recap-type">${icon(d.magic?'sparkles':'swords')}<span>${d.magic?'Attaque magique':'Attaque physique'}</span></div>${row('baseAttack','Jet ATK · D'+d.attackDie,f.baseAttack,false)}${row('weapon','Arme',f.weapon)}${row('element','Cristal',f.element)}${row('faction','Faction',f.faction)}${row('buff','Jeton',f.buff)}${row('barrier','Barrière',final?f.barrier:null)}<div class="recap-defense">${row('baseDefense','Jet DEF'+(d.defenseDie?' · D'+d.defenseDie:''),final?f.baseDefense:null,false)}${row('race','Race',f.race)}</div>${!final&&d.defenseRolls.length?`<p class="recap-event">${esc(format(d.defenseValue))}${s.phase==='defense'?' · nouveau jet':''}</p>`:''}<div class="recap-totals"><div><span>${final?'ATK finale':'ATK avant DEF'}</span><strong data-total="attack">${final?f.attack:subtotal}</strong></div><span class="recap-versus">/</span><div><span>DEF${final?' finale':''}</span><strong data-total="defense">${final?f.defense:'…'}</strong></div></div></section>`;
  }
  function consoleBody(s=game){
    let label,title,actions='';
    if(s.phase==='setup'){
      label='AVANT LE COMBAT';title='Formation initiale';actions=`<div class="setup-actions"><button data-action="auto-formation">${icon('shuffle')}Formation auto</button><button class="primary" data-action="start" ${s.players.some(p=>p.board.some(u=>!u))?'disabled':''}>${icon('swords')}Commencer</button></div>`;
    }else if(s.phase==='choose'){
      const a=ui.attacker!==null?s.players[s.turn].board[ui.attacker]:null,b=ui.target!==null?s.players[1-s.turn].board[ui.target]:null;
      label=`JOUEUR ${s.turn+1} · CHOIX DU DUEL`;title=`${a?E.card(a).name:'Attaquant'} ${a&&b?'contre':' / '} ${b?E.card(b).name:'Cible'}`;
      if(s.turn===1&&s.mode==='ai')title='Le Veilleur choisit son duel';
      else actions=`<button class="primary" data-action="lock" ${a&&b?'':'disabled'}>${icon('swords')}Engager le duel</button>`;
    }else if(s.phase==='clover'){
      label=`TRÈFLE · JOUEUR ${s.turn+1}`;title=s.mode==='ai'&&s.turn===1?'Le Veilleur choisit un allié':'Choisir une carte alliée';
      actions=`<span class="clover-choice-status">${icon('clover')}Attribution du trèfle</span>`;
    }else if(s.phase==='attack'||s.phase==='defense'){
      const atk=s.phase==='attack',actor=atk?s.turn:1-s.turn,second=!atk&&s.duel.autoDefense,auto=second||s.mode==='ai'&&actor===1,retry=(atk?s.duel.attackRolls:s.duel.defenseRolls).length>0;
      label=`${second?'SECONDE CHANCE':atk?'ATTAQUE':'DÉFENSE'} · JOUEUR ${actor+1}`;title=second?'Trèfle consommé':retry?'Nouveau jet':atk?'L’attaque se prépare':'La défense se prépare';
      actions=`<button class="primary" data-action="roll" ${auto||rolling?'disabled':''}>${icon('dice-6')}${second?'Relance automatique…':auto?'Jet adverse…':retry?'Relancer le dé':atk?'Lancer l’attaque':'Lancer la défense'}</button>`;
    }else if(s.phase==='replace'){
      label=`RENFORTS · JOUEUR ${s.replacing+1}`;title='Position libérée';actions=`<button data-action="auto-replace">${icon('replace')}Déployer les renforts</button>`;
    }else if(s.phase==='over'){
      label='FIN DE PARTIE';title=s.winner==='draw'?'Match nul':s.winner===0?'Victoire du joueur 1':s.mode==='ai'?'Le Veilleur l’emporte':'Victoire du joueur 2';actions=`<button class="primary" data-action="new-game">${icon('rotate-ccw')}Nouvelle partie</button>`;
    }else{
      label='DUEL RÉSOLU';title=s.duel.outcome;actions=`<button class="primary" data-action="next" ${rolling?'disabled':''}>${icon('arrow-right')}Tour suivant</button>`;
    }
    return `<div class="duel-status"><div class="phase-label">${label}</div><h2 class="${s.phase==='result'?'outcome':''}">${esc(title)}</h2></div>${duelRecap(s)}<div class="duel-actions">${actions}</div>`;
  }
  function reserveZone(side){
    const p=game.players[side],hidden=game.mode==='ai'&&side===1,draggable=!hidden&&(game.phase==='setup'||game.phase==='replace'&&game.replacing===side);
    return `<div class="reserve-zone"><div class="reserve-heading"><h3>Réserve <span class="muted">${p.reserve.length}</span></h3></div><div class="reserve-cards">${p.reserve.map(u=>hidden?'<div class="reserve-card face-down"><img src="assets/back.webp" alt="Carte adverse face cachée" draggable="false"></div>':`<button class="reserve-card ${ui.reserve===u.uid?'selected':''}" data-action="reserve" data-uid="${u.uid}" data-side="${side}" ${draggable?'data-drag-reserve="true"':''} style="--element-color:#${data.elements[E.card(u).element].color}" title="${E.card(u).name} · ${E.card(u).positions.map(p=>'P'+p).join('/')}" aria-label="Sélectionner ${E.card(u).name}"><img src="${cardImage(E.card(u))}" alt="${E.card(u).name}" draggable="false">${u.reraise?'<span class="reserve-heart">+1</span>':''}</button>`).join('')||'<span class="muted">Aucune carte</span>'}</div></div>`;
  }
  function journal(){
    const f=(game.duel||game.lastDuel)?.formula;
    const row=(label,v,cls='')=>`<div class="formula-row ${cls}"><span>${label}</span><b class="${v>0?'positive':v<0?'negative':''}">${v>0&&cls!=='total'?'+':''}${v}</b></div>`;
    return `<aside class="journal"><div class="journal-top"><h2>Journal du duel</h2>${ib('export-log','download','Exporter le journal')}</div><div class="combat-summary">${f?row('Jet ATK',f.baseAttack)+row('Arme',f.weapon)+row('Cristal',f.element)+row('Faction',f.faction)+row('Jeton',f.buff)+row('Barrière',f.barrier)+row('ATK finale',f.attack,'total')+row('Jet DEF',f.baseDefense)+row('Race',f.race)+row('DEF finale',f.defense,'total'):'<span class="muted">Aucun calcul numérique résolu.</span>'}</div><ol class="log-list" aria-label="Historique">${game.log.slice(-80).reverse().map(l=>`<li class="${esc(l.type)}"><small>Échange ${l.turn} · #${l.n}</small>${esc(l.text).replace(/ = (retry|mana|revive|death|dodge)\./g,(_,n)=>' = '+dieLabel(n,l.text.includes(' : ATK '))+'.')}</li>`).join('')}</ol></aside>`;
  }
  function arena(){
    if(!game)return '<div class="resume-strip"><h2>Arène de Kalistar</h2><button class="primary" data-action="new-game">Préparer une partie</button></div>';
    return `${!storageAvailable?'<div class="storage-note">Sauvegarde navigateur indisponible. Exportez la partie pour la conserver.</div>':''}<div class="game-shell" style="--board-scale:${boardScale/100}"><div class="arena-toolbar"><div><h1>Arène de Kalistar <span class="round">Échange ${game.round} / 200</span></h1><span class="muted game-seed">${esc(game.seed)} · ${game.mode==='ai'?'Adversaire automatique':'Deux joueurs locaux'}</span></div><div class="tools"><label class="board-zoom" title="Taille des cartes">${icon('scan')}<input id="board-scale" type="range" min="85" max="140" step="5" value="${boardScale}" aria-label="Taille des cartes"><output>${boardScale}%</output></label>${ib('journal','scroll-text','Ouvrir le journal du duel')}${ib('fullscreen','maximize','Plein écran')}${ib('save-game','save','Exporter la sauvegarde')}${ib('load-game','upload','Importer une sauvegarde')}${ib('new-game','rotate-ccw','Nouvelle partie')}<input hidden type="file" id="game-file" accept="application/json,.json"></div><div class="board-navigation">${ib('focus-left','panel-left','Centrer le joueur 1')}${ib('focus-duel','dice-6','Centrer les dés')}${ib('focus-right','panel-right','Centrer le joueur 2')}</div></div><div class="arena-layout"><div class="battlefield-viewport"><section class="battlefield" aria-label="Plateau de jeu"><section class="team team-left" data-team="0">${sideHeading(0)}${board(0)}${reserveZone(0)}</section><div class="duel-console" aria-live="polite">${dice(0)}<div class="duel-centre">${consoleBody()}</div>${dice(1)}</div><section class="team team-right" data-team="1">${sideHeading(1)}${board(1)}${reserveZone(1)}</section></section></div></div></div>`;
  }
  function act(fn){if(rolling)return;try{fn();E.assertState(game);epoch++;render();}catch(e){toast(e.message);}}
  function slotClick(side,slot){
    if(game.phase==='setup'||game.phase==='replace'){
      if(game.mode==='ai'&&side===1)return;
      if(game.phase==='replace'&&side!==game.replacing)return;
      if(ui.reserve){placeReserve(side,ui.reserve,slot);}
      else if(game.phase==='setup'){E.recall(game,side,slot);ui.setupSide=side;}
      return;
    }
    if(game.phase!=='choose'||game.mode==='ai'&&game.turn===1)return;
    if(!game.players[side].board[slot])return;
    if(side===game.turn)ui.attacker=slot;else ui.target=slot;
  }
  async function animatedRoll(){
    if(rolling||!['attack','defense'].includes(game.phase))return;
    const token=epoch,phase=game.phase,actor=phase==='attack'?game.turn:1-game.turn,next=E.clone(game);
    try{
      if(phase==='attack')E.rollAttack(next);else E.rollDefense(next);E.assertState(next);
      const value=phase==='attack'?next.duel.attackDie:next.duel.defenseDie;
      rolling=true;clearTimeout(aiTimer);$('#app').classList.add('rolling');
      const button=$('[data-action="roll"]');if(button)button.disabled=true;
      const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
      const landed=window.KalistarDice?await KalistarDice.play(actor,value,reduced):await new Promise(r=>setTimeout(()=>r(true),reduced?30:700));
      if(token===epoch&&landed){
        $('.duel-centre').innerHTML=consoleBody(next);icons();
        const label=$(`.duel-die[data-player="${actor}"] small`);
        if(label)label.textContent='D'+value+' · '+dieLabel(phase==='attack'?next.duel.attackValue:next.duel.defenseValue,phase==='attack');
        combatController=new AbortController();
        const d=next.duel,c=E.card(game.players[d.side].board[d.attackerSlot]);
        await window.KalistarCombat?.play({before:game,after:next,element:c.element,color:'#'+(data.elements[c.element]?.color||'E4D5FB'),reduced,signal:combatController.signal});
        if(token===epoch&&!combatController.signal.aborted){game=next;epoch++;}
      }
    }catch(e){toast(e.message);}
    finally{combatController?.abort();combatController=null;rolling=false;$('#app').classList.remove('rolling');render();}
  }
  async function animatedClover(uid){
    if(rolling||game.phase!=='clover')return;
    const token=epoch,next=E.clone(game);
    try{
      E.grantClover(next,uid);E.assertState(next);rolling=true;clearTimeout(aiTimer);
      combatController=new AbortController();
      await window.KalistarCombat?.play({before:game,after:next,element:'',color:'#7eeb9b',reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,signal:combatController.signal});
      if(token===epoch&&!combatController.signal.aborted){game=next;epoch++;}
    }catch(e){toast(e.message);}
    finally{combatController?.abort();combatController=null;rolling=false;render();}
  }
  function scheduleAI(){
    clearTimeout(aiTimer);if(!game||ui.view!=='arena'||rolling)return;
    const p=game.phase,token=epoch;
    const second=p==='defense'&&game.duel.autoDefense;
    const active=second||game.mode==='ai'&&((p==='choose'&&game.turn===1)||(p==='clover'&&game.turn===1)||(p==='attack'&&game.turn===1)||(p==='defense'&&game.turn===0)||(p==='replace'&&game.replacing===1));
    if(!active)return;
    aiTimer=setTimeout(()=>{if(token!==epoch||ui.view!=='arena')return;
      if(p==='attack'||p==='defense')return animatedRoll();
      if(p==='clover')return animatedClover(E.aiCloverChoice(game));
      act(()=>{if(p==='choose'){const pair=E.aiChoice(game);E.lock(game,...pair);}else if(p==='replace')E.autoDeploy(game,1);});
    },second?1000:p==='choose'?650:450);
  }
  function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function inspectUnit(side,uid,bonus){
    const u=game?.players[side]?.board.find(u=>u?.uid===uid);
    if(u)showDetail(u.cardId,false,{side,uid,bonus});
  }
  window.KalistarFormationDrag?.init({
    source:button=>!rolling&&ui.view==='arena'?{side:Number(button.dataset.side),uid:button.dataset.uid,epoch}:null,
    valid:(source,side,slot)=>source.epoch===epoch&&source.side===side&&canDeployReserve(side,source.uid,slot),
    drop:(source,side,slot)=>{if(source.epoch===epoch&&source.side===side)act(()=>placeReserve(side,source.uid,slot));}
  });
  function showArchive(side,kind){const p=game.players[side],units=kind==='dead'?p.dead:p.reserve,hidden=kind==='reserve'&&side===1&&game.mode==='ai';modal('detail-dialog',head(`${kind==='dead'?'Cimetière':'Réserve'} · ${side===0?'Joueur 1':'Adversaire'}`)+`<div class="dialog-body archive-list">${units.map(u=>`<figure>${hidden?'<img src="assets/back.webp" alt="Carte adverse face cachée">':`<button class="card-open" data-action="detail" data-id="${u.cardId}"><img src="${cardImage(E.card(u))}" alt="${E.card(u).name}"></button>`}<figcaption>${hidden?'Carte en réserve':E.card(u).name}${u.revived?'<br><span class="revived">Déjà ressuscitée</span>':''}</figcaption></figure>`).join('')||'<p class="muted">Aucune carte.</p>'}</div>`);}
  document.addEventListener('click',event=>{
    const view=event.target.closest('[data-view]');if(view){setView(view.dataset.view);return;}
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
    try{
      if(action==='close'){b.closest('dialog').close();return;}
      if(action==='detail')return showDetail(id,false,b.dataset.uid?{side:Number(b.dataset.side),uid:b.dataset.uid}:null);
      if(action==='bonus')return inspectUnit(Number(b.dataset.side),b.dataset.uid,b.dataset.bonus);
      if(action==='toggle-art')return showDetail(ui.detail,!ui.art,ui.detailContext);
      if(action==='favorite'){favorites.has(id)?favorites.delete(id):favorites.add(id);persist();if($('#detail-dialog').open)b.setAttribute('aria-pressed',favorites.has(id));if(ui.view==='collection')render();return;}
      if(action==='add'||action==='remove')return changeDeck(id,action==='add'?1:-1);
      if(action==='deck')return showDeck();
      if(action==='rules')return showRules();
      if(action==='journal')return modal('journal-dialog',head('Journal du duel')+journal());
      if(action==='fullscreen'){
        const operation=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
        operation.catch(()=>toast('Le plein écran n’est pas disponible dans ce navigateur.'));return;
      }
      if(action.startsWith('focus-')){
        const viewport=$('.battlefield-viewport'),team=$(action==='focus-left'?'.team-left':action==='focus-right'?'.team-right':'.duel-console'),target=team.querySelector('.challenger')||team;
        const bounds=target.getBoundingClientRect();viewport.scrollTo({left:viewport.scrollLeft+bounds.left-viewport.getBoundingClientRect().left-(viewport.clientWidth-bounds.width)/2,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});return;
      }
      if(action==='element'){ui.filters.element=ui.filters.element===id?'':id;ui.page=0;render();return;}
      if(action==='toggle-filters'){ui.filtersOpen=!ui.filtersOpen;render();return;}
      if(action==='reset-filters'){for(const k of Object.keys(ui.filters))ui.filters[k]=k==='favorite'?false:'';ui.page=0;render();return;}
      if(action==='prev-page'||action==='next-page'){ui.page+=action==='next-page'?1:-1;render();return;}
      if(action==='default-deck'){deck=defaultDeck.slice();persist();showDeck();if(ui.view==='collection')render();return;}
      if(action==='deck-play'){$('#deck-dialog').close();newGameDialog();return;}
      if(action==='new-game')return newGameDialog();
      if(action==='export-deck')return download('Kalistar-deck.json',{schema:1,name:deckName,cards:deck});
      if(action==='import-deck')return $('#deck-file').click();
      if(action==='save-game')return download('Kalistar-partie-'+game.seed.replace(/[^a-zA-Z0-9_-]/g,'')+'.json',game);
      if(action==='load-game')return $('#game-file').click();
      if(action==='export-log')return download('Kalistar-journal.json',{seed:game.seed,rules:data.demo,log:game.log});
      if(action==='grave'||action==='reserves'){$('#detail-dialog').classList.remove('card-detail');return showArchive(Number(b.dataset.side),action==='grave'?'dead':'reserve');}
      if(action==='slot'&&game.phase==='clover'){
        const side=Number(b.dataset.side),u=game.players[side].board[Number(b.dataset.slot)];
        if(rolling||game.mode==='ai'&&game.turn===1)return;
        if(side!==game.turn||!u)return toast('Choisissez une carte de votre plateau.');
        return animatedClover(u.uid);
      }
      if(action==='slot'&&!['setup','replace','choose'].includes(game.phase)){
        const side=Number(b.dataset.side),unit=game.players[side].board[Number(b.dataset.slot)];
        if(unit)inspectUnit(side,unit.uid);return;
      }
      if(action==='roll'){
        const actor=game.phase==='attack'?game.turn:1-game.turn;
        if(game.mode==='ai'&&actor===1)return;
        return animatedRoll();
      }
      if(game?.mode==='ai'&&action==='auto-replace'&&game.replacing===1)return;
      act(()=>{
        if(action==='slot')slotClick(Number(b.dataset.side),Number(b.dataset.slot));
        else if(action==='reserve'){if(game.phase==='setup'||game.phase==='replace')ui.reserve=ui.reserve===b.dataset.uid?null:b.dataset.uid;else showDetail(game.players[Number(b.dataset.side)].reserve.find(u=>u.uid===b.dataset.uid).cardId);}
        else if(action==='auto-formation'){E.autoDeploy(game,0);E.autoDeploy(game,1);ui.reserve=null;}
        else if(action==='setup-side'){ui.setupSide=1-(ui.setupSide||0);ui.reserve=null;}
        else if(action==='start'){E.start(game);ui.reserve=null;}
        else if(action==='lock'){E.lock(game,ui.attacker,ui.target);ui.attacker=ui.target=null;}
        else if(action==='next'){E.next(game);ui.attacker=ui.target=ui.reserve=null;}
        else if(action==='auto-replace')E.autoDeploy(game,game.replacing);
      });
      if(action==='slot'&&game.phase==='choose'&&innerWidth<=900)window.KalistarFocus?.reveal(Number(b.dataset.side));
    }catch(e){toast(e.message);}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='board-scale'){
      boardScale=Number(e.target.value);$('.game-shell').style.setProperty('--board-scale',boardScale/100);
      $('.board-zoom output').value=boardScale+'%';save('boardScale',boardScale);
    }
    if(e.target.id==='search'){const pos=e.target.selectionStart;ui.filters.search=e.target.value;ui.page=0;render();const search=$('#search');search.focus();try{search.setSelectionRange(pos,pos);}catch{}}
    if(e.target.id==='deck-name'){deckName=e.target.value;persist();}
  });
  document.addEventListener('change',async e=>{
    if(e.target.dataset.filter){ui.filters[e.target.dataset.filter]=e.target.value;ui.page=0;render();}
    if(e.target.id==='sort'){ui.sort=e.target.value;ui.page=0;render();}
    if(e.target.id==='favorites-only'){ui.filters.favorite=e.target.checked;ui.page=0;render();}
    if(e.target.id==='deck-file'||e.target.id==='game-file'){
      const file=e.target.files[0];if(!file)return;
      try{if(file.size>3000000)throw new Error('Fichier trop volumineux.');const value=JSON.parse(await file.text());
        if(e.target.id==='deck-file'){if(!Array.isArray(value.cards))throw new Error('Deck invalide.');const errors=E.validateDeck(value.cards);if(errors.length)throw new Error(errors.join(' '));deck=value.cards;deckName=String(value.name||'Deck importé').slice(0,50);persist();showDeck();if(ui.view==='collection')render();}
        else{const imported=E.restoreGame(value);clearTimeout(aiTimer);epoch++;game=imported;ui.attacker=ui.target=ui.reserve=null;setView('arena');}
        toast('Import terminé.');
      }catch(err){toast('Import refusé : '+err.message);}
    }
  });
  document.addEventListener('submit',e=>{if(e.target.id!=='new-game-form')return;e.preventDefault();if(rolling)return;try{createGame($('#game-mode').value,$('#game-seed').value.trim()||'KALISTAR');$('#new-game-dialog').close();setView('arena');}catch(err){toast(err.message);}});
  window.addEventListener('hashchange',()=>setView(location.hash==='#arena'?'arena':'collection'));
  document.addEventListener('fullscreenchange',()=>{const b=$('[data-action="fullscreen"]');if(b){const label=document.fullscreenElement?'Quitter le plein écran':'Plein écran';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=icon(document.fullscreenElement?'minimize':'maximize');icons();}});
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  if(ui.view==='arena'&&!game){try{createGame('ai','KALI-2026');}catch{ui.view='collection';}}
  render();window.KALISTAR_READY=true;
})();
