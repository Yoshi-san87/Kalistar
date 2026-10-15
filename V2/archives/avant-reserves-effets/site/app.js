(() => {
  'use strict';
  const data=window.KALISTAR_DATA,E=KalistarEngine.createEngine(data),cards=data.cards;
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<i data-lucide="${n}"></i>`,ib=(action,n,title,extra='')=>`<button class="icon-button" data-action="${action}" title="${esc(title)}" aria-label="${esc(title)}" ${extra}>${icon(n)}</button>`;
  const asset=(folder,name)=>`../assets/${folder}/${encodeURIComponent(name)}.png`;
  const cardImage=c=>`assets/cards/${c.slug}.webp`,artImage=c=>`assets/cards/${c.slug}-art.webp`;
  const names={retry:'Relance',mana:'Potion',revive:'Cœur · Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Buff physique',shield_magic:'Bouclier magique',shield_physical:'Bouclier physique'};
  const roles=['Tank','DPS physique','Middle','DPS magique','Support'];
  const format=v=>typeof v==='number'?String(v):names[v]||v;
  let storageAvailable=true,toastTimer,aiTimer,epoch=0,rolling=false,game=null;
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
    const scroll=$('.battlefield-viewport')?.scrollLeft||0;
    document.body.classList.toggle('arena-view',ui.view==='arena');
    document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===ui.view;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
    $('#app').innerHTML=ui.view==='collection'?collection():arena();icons();
    if($('.battlefield-viewport'))$('.battlefield-viewport').scrollLeft=scroll;
    window.KalistarDice?.mount(document.querySelectorAll('.dice-stage'));
    if($('#journal-dialog').open){$('#journal-dialog').innerHTML=head('Journal du duel')+journal();icons();}
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
  function showDetail(id,art=false){
    ui.detail=id;ui.art=art;const c=E.byId[id],el=data.elements[c.element];
    const v=x=>typeof x==='number'?x:`<img src="${asset('effets',x)}" alt="${format(x)}" title="${format(x)}">`;
    modal('detail-dialog',head(c.name)+`<div class="dialog-body detail-body"><div class="detail-visual"><img src="${art?artImage(c):'../cartes/'+c.slug+'.png'}" alt="${art?'Illustration':'Carte'} de ${c.name}"></div><div class="detail-info"><div><span class="eyebrow">${c.element} · #${c.id}</span><h2>${esc(c.title)}</h2></div><div class="identity-strip"><img src="${asset('factions',c.faction)}" alt="Drapeau ${c.faction}"><span><b>${c.faction}</b><br>${c.job}</span><img class="race-icon" src="${asset('races',c.race)}" alt=""><span>${c.race}<br>${c.positions.map(p=>'P'+p).join(' / ')}</span></div><div class="muted">${c.weapon}</div><table class="stats-table"><thead><tr><th>Dé</th>${[6,5,4,3,2,1].map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody><tr><th>ATK</th>${c.atk.map((x,i)=>`<td class="${c.magic.includes(6-i)?'magic':''}" title="${c.magic.includes(6-i)?'Magique':'Physique'}">${v(x)}</td>`).join('')}</tr><tr><th>DEF</th>${c.defense.map((x,i)=>`<td class="${c.barriers.includes(6-i)?'barrier':''}" title="${c.barriers.includes(6-i)?'Barrière : -30 contre magie':'Défense sans barrière'}">${v(x)}</td>`).join('')}</tr></tbody></table><div class="affinities">${c.element==='RAINBOW'?'+40 contre les cristaux classiques':`+${c.advantage} ${data.elements[el.strong_against].label}<span>-${c.disadvantage} ${data.elements[el.weak_against].label}</span>`}</div><p class="story">${esc(c.text)}</p><div class="detail-actions"><button data-action="toggle-art">${icon(art?'credit-card':'image')}${art?'Carte':'Illustration'}</button><a href="../cartes/${c.slug}.png" download>${icon('download')} PNG original</a>${ib('favorite','star','Favori',`data-id="${id}" aria-pressed="${favorites.has(id)}"`)}</div></div></div>`);
  }
  function showRules(){
    modal('rules-dialog',head('Règles · V2 démo')+`<div class="dialog-body rules-body"><h3>Formation et victoire</h3><p>10 cartes par joueur, 5 positions : P1 Tank, P2 DPS physique, P3 Middle, P4 DPS magique, P5 Support. Chaque carte occupe une position autorisée. Une remplaçante doit pouvoir jouer à la position libérée. Une carte vivante ne change pas de position après le début du combat.</p><h3>Un duel</h3><ol><li>L'attaquant choisit sa carte et sa cible avant les jets.</li><li>Jet ATK, puis jet DEF. D6 est la face du haut de la carte, D1 celle du bas.</li><li>ATK finale strictement supérieure à DEF finale : cible éliminée. Égalité : elle survit.</li><li>Les rôles s'inversent. Les remplacements se font avant le prochain duel.</li></ol><div class="formula">ATK = jet + arme + cristal + faction + jeton − barrière<br>DEF = jet + race<br>Les totaux négatifs sont ramenés à zéro.</div><h3>Armes, éléments et barrières</h3><p>La matrice des armes applique +50, −50 ou 0 une seule fois à l'ATK, ligne attaquante contre colonne adverse. Un avantage élémentaire vaut +30, une faiblesse −30, sans second ajustement DEF. Les exceptions imprimées restent prioritaires.</p><p>Air &gt; Eau &gt; Feu &gt; Glace &gt; Plante &gt; Terre &gt; Roche &gt; Électricité &gt; Air.<br>Sang &gt; Ténèbres &gt; Lumière &gt; Sang.</p><p>Rainbow : +40 contre les classiques ; un classique subit −40 contre Rainbow. Rainbow contre Rainbow, ou une rencontre avec une carte sans cristal : 0. Chaos est exclu.</p><p>Une face ATK magique contre une face DEF avec barrière perd 30 ATK. Aucune réduction dans les autres combinaisons.</p><h3>Synergies de plateau</h3><table><tr><th>Cartes de même groupe</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr><tr><th>Bonus</th><td>0</td><td>+10</td><td>+20</td><td>+30</td><td>+40</td></tr></table><p>Même faction : bonus ATK. Même race : bonus DEF. La carte concernée est comptée ; réserve et morts sont exclus. Les paliers ne s'additionnent pas et sont recalculés après chaque changement.</p><h3>Effets spéciaux</h3><table><tr><th>Relance</th><td>Nouveau jet du même dé, attaquant et cible conservés.</td></tr><tr><th>Potion / Buff ATK</th><td>Action de soutien. Jeton +60 pour la prochaine attaque magique / physique numérique de la carte.</td></tr><tr><th>Cœur / Reraise</th><td>Action de soutien : la carte gagne une vie supplémentaire visible à côté d’elle. À sa prochaine élimination, même par Mort, le cœur est consommé et elle reste en place. Un seul cœur actif, regagnable après consommation. Aucun retour de carte morte.</td></tr><tr><th>Esquive</th><td>Annule toute attaque, y compris Mort.</td></tr><tr><th>Mort</th><td>Élimination instantanée sauf esquive ou bouclier spécial adapté. Un Reraise actif est consommé à la place de l’élimination.</td></tr><tr><th>Bouclier spécial</th><td>Annule le type correspondant. Distinct de la barrière ordinaire −30.</td></tr></table><h3>Conventions provisoires de la démo</h3><ul class="conventions">${data.demo.conventions.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p class="muted">Sources : cartes V2, matrice des armes du classeur Kalistar et prompt de règles validé. Les conventions ci-dessus complètent les points non tranchés ; elles ne valent pas validation définitive de l'équilibrage.</p></div>`);
  }
  function createGame(mode,seed){
    const errors=E.validateDeck(deck);if(errors.length)throw new Error(errors.join(' '));
    clearTimeout(aiTimer);epoch++;game=E.newGame(deck,enemyDeck,{mode,seed});E.autoDeploy(game,0);E.autoDeploy(game,1);ui.attacker=ui.target=ui.reserve=null;persist();
  }
  function newGameDialog(){modal('new-game-dialog',head('Nouvelle partie')+`<div class="dialog-body"><form class="dialog-form" id="new-game-form"><label>Adversaire<select id="game-mode"><option value="ai">Adversaire automatique</option><option value="local">Deux joueurs sur cet écran</option></select></label><label>Graine des dés<input id="game-seed" maxlength="60" value="KALI-${Math.floor(Math.random()*999999)}" required></label><p class="muted">Deck : ${esc(deckName)} · ${deck.length}/10</p>${game&&game.phase!=='over'?'<p class="validation">La nouvelle partie remplacera la sauvegarde de la partie en cours.</p>':''}<div class="actions"><button type="button" data-action="close">Annuler</button><button class="primary" type="submit" ${E.validateDeck(deck).length?'disabled':''}>Préparer la formation</button></div></form></div>`);}
  function buffs(p,u){const f=E.synergy(p,u,'faction'),r=E.synergy(p,u,'race');return `${f?`<span>ATK +${f}</span>`:''}${r?`<span>DEF +${r}</span>`:''}${u.mana?`<span class="mana" title="Potion : prochaine ATK magique +60">M +${u.mana}</span>`:''}${u.physical?`<span>PHY +${u.physical}</span>`:''}`;}
  function board(side){
    const p=game.players[side],selectedReserve=p.reserve.find(u=>u.uid===ui.reserve);
    return `<div class="formation cross-formation ${side?'right-cross':'left-cross'}" data-player="${side}">${p.board.map((u,slot)=>{
      const c=u?E.card(u):null,isA=(game.duel?game.duel.side===side&&game.duel.attackerSlot===slot:game.turn===side&&ui.attacker===slot),isT=(game.duel?game.duel.side!==side&&game.duel.targetSlot===slot:game.turn!==side&&ui.target===slot);
      const heart=u?.reraise?`<span class="life-badge" role="img" aria-label="Reraise actif : une vie supplémentaire" title="Reraise : survit à la prochaine élimination"><img src="${asset('effets','revive')}" alt=""><b>1</b></span>`:'';
      const saved=u&&game.duel?.reraised===u.uid?'reraise-saved':'';
      return `<div class="slot ${side?'enemy':''} ${isA?'selected':''} ${isT?'target':''} ${saved} ${!u&&selectedReserve&&E.card(selectedReserve).positions.includes(slot+1)?'compatible':''}" data-position="${slot+1}"><div class="position-label"><b>P${slot+1}</b><span>${roles[slot]}</span></div><button class="slot-card ${u?'':'empty'}" data-action="slot" data-side="${side}" data-slot="${slot}" aria-label="${side?'Adversaire':'Joueur'} P${slot+1}${c?' '+c.name:', emplacement libre'}">${c?`<img src="${cardImage(c)}" alt="${c.name}" width="538" height="898">`:icon('plus')+'<span>P'+(slot+1)+'</span>'}</button>${heart}${c?`<button class="inspect" data-action="detail" data-id="${c.id}" aria-label="Inspecter ${c.name}" title="Inspecter ${c.name}">${icon('scan-eye')}</button>`:''}<div class="slot-buffs">${u?buffs(p,u):''}</div></div>`;
    }).join('')}</div>`;
  }
  function sideHeading(side){const p=game.players[side];return `<div class="side-heading"><div class="player-name ${side?'enemy':'ally'}">${side?(game.mode==='ai'?'Le Veilleur · IA':'Joueur 2'):'Joueur 1'}${game.turn===side&&game.phase!=='setup'?' · ATK':''}</div><div class="resources"><span>${p.board.filter(Boolean).length}/5</span><button data-action="reserves" data-side="${side}">${icon('layers-3')}${p.reserve.length}</button><button data-action="grave" data-side="${side}">${icon('skull')}${p.dead.length}</button></div></div>`;}
  function dice(side){
    const d=game.duel,isAttack=d?d.side===side:game.turn===side,rolls=d?(isAttack?d.attackRolls:d.defenseRolls):[],die=rolls.at(-1);
    const name=d?(isAttack?d.attackerName:d.targetName):'Aucun duel';
    const active=(game.phase==='attack'&&game.turn===side)||(game.phase==='defense'&&game.turn!==side);
    return `<div class="duel-die player-${side} ${active?'active':''}" data-player="${side}"><div class="dice-owner">Joueur ${side+1}<span>${isAttack?'ATK':'DEF'}</span></div><b>${esc(name)}</b><div class="dice-stage" data-player="${side}" data-value="${die||6}" role="img" aria-label="Dé du joueur ${side+1}${die?' : '+die:' en attente'}"><div class="die-fallback">${icon('dice-'+(die||6))}</div></div><small>${die?'D'+die+' · '+esc(format(isAttack?d.attackValue:d.defenseValue)):'En attente'}</small></div>`;
  }
  function consoleBody(){
    const s=game;
    if(s.phase==='setup')return `<div class="phase-label">AVANT LE COMBAT</div><h2>Formation initiale</h2><div class="setup-actions"><button data-action="auto-formation">${icon('shuffle')}Formation auto</button><button class="primary" data-action="start" ${s.players.some(p=>p.board.some(u=>!u))?'disabled':''}>${icon('swords')}Commencer</button></div>`;
    if(s.phase==='choose'){
      if(s.turn===1&&s.mode==='ai')return '<div class="phase-label">TOUR ADVERSE</div><h2>Le Veilleur choisit son duel</h2>';
      const a=ui.attacker!==null?s.players[s.turn].board[ui.attacker]:null,b=ui.target!==null?s.players[1-s.turn].board[ui.target]:null;
      return `<div class="phase-label">${s.turn===0?'JOUEUR 1':'JOUEUR 2'} · CHOIX DU DUEL</div><h2>${a?E.card(a).name:'Attaquant'} ${a&&b?'contre':' / '} ${b?E.card(b).name:'Cible'}</h2><button class="primary" data-action="lock" ${a&&b?'':'disabled'}>${icon('swords')}Engager le duel</button>`;
    }
    if(s.phase==='attack'||s.phase==='defense'){
      const atk=s.phase==='attack',actor=atk?s.turn:1-s.turn,auto=s.mode==='ai'&&actor===1,retry=(atk?s.duel.attackRolls:s.duel.defenseRolls).length>0;
      return `<div class="phase-label">${atk?'ATTAQUE':'DÉFENSE'} · ${actor===0?'JOUEUR 1':s.mode==='ai'?'LE VEILLEUR':'JOUEUR 2'}</div><h2>${retry?'Nouveau jet':atk?'L’attaque se prépare':'La défense se prépare'}</h2><button class="primary" data-action="roll" ${auto||rolling?'disabled':''}>${icon('dice-6')}${auto?'Jet adverse…':retry?'Relancer le dé':atk?'Lancer l’attaque':'Lancer la défense'}</button>`;
    }
    if(s.phase==='replace')return `<div class="phase-label">RENFORTS · ${s.replacing===0?'JOUEUR 1':'ADVERSAIRE'}</div><h2>Position libérée</h2><button data-action="auto-replace">${icon('replace')}Déployer les renforts</button>`;
    if(s.phase==='over')return `<div class="phase-label">FIN DE PARTIE</div><h2 class="game-over">${s.winner==='draw'?'Match nul':s.winner===0?'Victoire du joueur 1':s.mode==='ai'?'Le Veilleur l’emporte':'Victoire du joueur 2'}</h2><button class="primary" data-action="new-game">${icon('rotate-ccw')}Nouvelle partie</button>`;
    const f=s.duel?.formula;return `<div class="phase-label">DUEL RÉSOLU</div><p class="outcome">${esc(s.duel.outcome)}</p>${f?`<div class="formula-mini">ATK ${f.attack} · DEF ${f.defense}${f.magic?' · Magique':' · Physique'}</div>`:''}<button class="primary" data-action="next">${icon('arrow-right')}Tour suivant</button>`;
  }
  function reserveZone(side){
    const p=game.players[side],hidden=game.mode==='ai'&&side===1;
    return `<div class="reserve-zone"><div class="reserve-heading"><h3>Réserve <span class="muted">${p.reserve.length}</span></h3></div><div class="reserve-cards">${p.reserve.map(u=>hidden?'<div class="reserve-card face-down"><img src="assets/back.webp" alt="Carte adverse face cachée"></div>':`<button class="reserve-card ${ui.reserve===u.uid?'selected':''}" data-action="reserve" data-uid="${u.uid}" data-side="${side}" title="${E.card(u).name} · ${E.card(u).positions.map(p=>'P'+p).join('/')}" aria-label="Sélectionner ${E.card(u).name}"><img src="${cardImage(E.card(u))}" alt="${E.card(u).name}">${u.reraise?'<span class="reserve-heart">+1</span>':''}</button>`).join('')||'<span class="muted">Aucune carte</span>'}</div></div>`;
  }
  function journal(){
    const f=(game.duel||game.lastDuel)?.formula;
    const row=(label,v,cls='')=>`<div class="formula-row ${cls}"><span>${label}</span><b class="${v>0?'positive':v<0?'negative':''}">${v>0&&cls!=='total'?'+':''}${v}</b></div>`;
    return `<aside class="journal"><div class="journal-top"><h2>Journal du duel</h2>${ib('export-log','download','Exporter le journal')}</div><div class="combat-summary">${f?row('Jet ATK',f.baseAttack)+row('Arme',f.weapon)+row('Cristal',f.element)+row('Faction',f.faction)+row('Jeton',f.buff)+row('Barrière',f.barrier)+row('ATK finale',f.attack,'total')+row('Jet DEF',f.baseDefense)+row('Race',f.race)+row('DEF finale',f.defense,'total'):'<span class="muted">Aucun calcul numérique résolu.</span>'}</div><ol class="log-list" aria-label="Historique">${game.log.slice(-80).reverse().map(l=>`<li class="${esc(l.type)}"><small>Échange ${l.turn} · #${l.n}</small>${esc(l.text).replace(/ = (retry|mana|revive|death|dodge)\./g,(_,n)=>' = '+names[n]+'.')}</li>`).join('')}</ol></aside>`;
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
      if(ui.reserve){E.deploy(game,side,ui.reserve,slot);ui.reserve=null;}
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
      if(token===epoch&&landed){game=next;epoch++;}
    }catch(e){toast(e.message);}
    finally{rolling=false;$('#app').classList.remove('rolling');render();}
  }
  function scheduleAI(){
    clearTimeout(aiTimer);if(!game||ui.view!=='arena'||game.mode!=='ai'||rolling)return;
    const p=game.phase,token=epoch;
    const active=(p==='choose'&&game.turn===1)||(p==='attack'&&game.turn===1)||(p==='defense'&&game.turn===0)||(p==='replace'&&game.replacing===1);
    if(!active)return;
    aiTimer=setTimeout(()=>{if(token!==epoch||ui.view!=='arena')return;
      if(p==='attack'||p==='defense')return animatedRoll();
      act(()=>{if(p==='choose'){const pair=E.aiChoice(game);E.lock(game,...pair);}else if(p==='replace')E.autoDeploy(game,1);});
    },p==='choose'?650:450);
  }
  function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function showArchive(side,kind){const p=game.players[side],units=kind==='dead'?p.dead:p.reserve,hidden=kind==='reserve'&&side===1&&game.mode==='ai';modal('detail-dialog',head(`${kind==='dead'?'Cimetière':'Réserve'} · ${side===0?'Joueur 1':'Adversaire'}`)+`<div class="dialog-body archive-list">${units.map(u=>`<figure>${hidden?'<img src="assets/back.webp" alt="Carte adverse face cachée">':`<button class="card-open" data-action="detail" data-id="${u.cardId}"><img src="${cardImage(E.card(u))}" alt="${E.card(u).name}"></button>`}<figcaption>${hidden?'Carte en réserve':E.card(u).name}${u.revived?'<br><span class="revived">Déjà ressuscitée</span>':''}</figcaption></figure>`).join('')||'<p class="muted">Aucune carte.</p>'}</div>`);}
  document.addEventListener('click',event=>{
    const view=event.target.closest('[data-view]');if(view){setView(view.dataset.view);return;}
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
    try{
      if(action==='close'){b.closest('dialog').close();return;}
      if(action==='detail')return showDetail(id);
      if(action==='toggle-art')return showDetail(ui.detail,!ui.art);
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
        const viewport=$('.battlefield-viewport'),target=$(action==='focus-left'?'.team-left':action==='focus-right'?'.team-right':'.duel-console');
        viewport.scrollTo({left:viewport.scrollLeft+target.getBoundingClientRect().left-viewport.getBoundingClientRect().left-(viewport.clientWidth-target.clientWidth)/2,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});return;
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
      if(action==='grave'||action==='reserves')return showArchive(Number(b.dataset.side),action==='grave'?'dead':'reserve');
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
