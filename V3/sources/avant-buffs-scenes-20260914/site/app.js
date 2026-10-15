(async () => {
  'use strict';
  const data=window.KALISTAR_DATA,E=KalistarEngine.createEngine(data),cards=data.cards,Catalogue=window.KalistarCatalogue;
  let db=null,dbError='',lastStored='',reportGame=null;
  const covers={};
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<i data-lucide="${n}"></i>`,ib=(action,n,title,extra='')=>`<button class="icon-button" data-action="${action}" title="${esc(title)}" aria-label="${esc(title)}" ${extra}>${icon(n)}</button>`;
  const asset=(folder,name)=>`../assets/${folder}/${encodeURIComponent(name)}.png`;
  const cardImage=c=>`assets/cards/${c.slug}.webp`,artImage=c=>`../${(c.art||'assets/illustrations/'+c.slug+'.png').replace(/^V3[\\/]/,'')}`;
  const duelImage=c=>`assets/cards/${c.slug}-full.png`;
  const noCrystal={id:'NONE',label:'SANS CRISTAL',color:'93AAA5',hue:160};
  const elementInfo=c=>data.elements[c?.element]||noCrystal;
  const hasCrystal=c=>!!c?.element&&c.element!=='NONE'&&!!data.elements[c.element];
  const elements={...data.elements,NONE:data.elements.NONE||noCrystal};
  const dieLabel=(value,attack)=>value==='retry'&&attack?'Trèfle':format(value);
  const names={guard:'Garde · Bouclier',retry:'Relance',mana:'Potion',revive:'Cœur · Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Buff physique',shield_magic:'Bouclier magique',shield_physical:'Bouclier physique'};
  const traitInfo={ward:{asset:'guard',name:'Garde physique'},reraise:{asset:'revive',name:'Reraise'},luck:{asset:'retry',name:'Trèfle'},mana:{asset:'mana',name:'Potion magique'},physical:{asset:'buff_atk',name:'Puissance physique'}};
  const roles=['Tank','DPS physique','Middle','DPS magique','Support'];
  const arenas=data.arenas?.length?data.arenas:[{id:'ruins',name:'Ruines',subtitle:'Terrain neutre',image:'assets/arena.webp',element:'NONE',elementBonus:0,homeCharacters:[],homeAttack:0,homeDefense:0}];
  const arenaById=id=>arenas.find(a=>a.id===id)||arenas[0];
  let statsSort='rating',statsSide='all';
  const format=v=>typeof v==='number'?String(v):names[v]||v;
  let storageAvailable=true,toastTimer,aiTimer,epoch=0,rolling=false,game=null,combatController=null;
  function load(key,fallback){try{const raw=localStorage.getItem('kalistar.v3.'+key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
  function save(key,value){try{localStorage.setItem('kalistar.v3.'+key,JSON.stringify(value));}catch{storageAvailable=false;}}
  const defaultDeck=data.decks.player;
  const deckPresets=[{id:'player',name:'Deck initial joueur',cards:defaultDeck},{id:'enemy',name:'Deck initial adverse',cards:data.decks.enemy},...(Array.isArray(data.decks.presets)?data.decks.presets:[])].filter((p,i,list)=>p&&typeof p.id==='string'&&typeof p.name==='string'&&list.findIndex(other=>other?.id===p.id)===i);
  const presetById=id=>deckPresets.find(p=>p.id===id);
  const savedPreset=(key,fallback)=>{const p=presetById(load(key,fallback));return p&&!E.validateDeck(p.cards).length?p.id:fallback;};
  let deckPresetId=savedPreset('deckPreset','player'),enemyPresetId=savedPreset('enemyDeckPreset','enemy');
  function validatedPreset(id){
    const preset=presetById(id);if(!preset)throw new Error('Deck prédéfini inconnu.');
    const errors=E.validateDeck(preset.cards);if(errors.length)throw new Error('Deck prédéfini invalide : '+errors.join(' '));
    return preset;
  }
  function presetOptions(selected){return deckPresets.map(p=>{const errors=E.validateDeck(p.cards);return `<option value="${esc(p.id)}" ${p.id===selected?'selected':''} ${errors.length?'disabled':''}>${esc(p.name)}${errors.length?' · indisponible':''}</option>`;}).join('');}
  let deck=load('deck',defaultDeck.slice());if(!Array.isArray(deck)||deck.some(id=>!E.byId[id])||deck.length>10)deck=defaultDeck.slice();
  let deckName=String(load('deckName','Les premiers Sentry')).slice(0,50);
  const savedFavorites=load('favorites',[]);
  let favorites=new Set((Array.isArray(savedFavorites)?savedFavorites:[]).filter(id=>E.byId[id]));
  const restored=load('game',null);let restoreError='';
  if(restored){try{game=E.restoreGame(KalistarLocalDB.validateGame(restored));}catch(error){game=null;restoreError=error.message;}}
  let boardScale=Math.max(85,Math.min(140,Number(load('boardScale',100))||100));
  const ui={view:location.hash==='#arena'?'arena':'collection',filters:{search:'',element:'',faction:'',race:'',position:'',weapon:'',favorite:false},sort:'id',page:0,filtersOpen:false,attacker:null,target:null,reserve:null,detail:null,art:false};
  function icons(){if(window.lucide)lucide.createIcons();}
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
  function persist(){
    save('deckPreset',deckPresetId);save('enemyDeckPreset',enemyPresetId);
    save('deck',deck);save('deckName',deckName);save('favorites',[...favorites]);if(game)save('game',game);$('#deck-count').textContent=deck.length;
    if(db&&game){
      const fingerprint=JSON.stringify(game);
      if(fingerprint!==lastStored){
        lastStored=fingerprint;
        db.saveGame(game).then(()=>{
          document.querySelectorAll('[data-career-card]').forEach(node=>{node.innerHTML=Catalogue.brief(db.career(node.dataset.careerCard));});
          if($('#detail-dialog').open&&ui.detail&&$('#detail-dialog .career-panel'))$('#detail-dialog .career-panel').outerHTML=Catalogue.career(ui.detail,db,ui.careerInstance);
          if($('#database-dialog').open)showDatabase();
          icons();
        }).catch(error=>{lastStored='';dbError=error.message;toast('Base locale : '+error.message);});
      }
    }
  }
  function showDatabase(){modal('database-dialog',head('Archives personnelles')+Catalogue.database(db,dbError));}
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
    $('#app').innerHTML=ui.view==='collection'?collection():arena();syncConsole();icons();
    if($('.battlefield-viewport'))$('.battlefield-viewport').scrollLeft=scroll;
    window.KalistarDice?.mount(document.querySelectorAll('.dice-stage'));
    window.KalistarFocus?.mount(document.querySelectorAll('.formation'));
    if($('#journal-dialog').open){$('#journal-dialog').innerHTML=head('Journal du duel')+journal();icons();}
    if($('#detail-dialog').open&&ui.detailContext&&$('#detail-dialog .live-bonuses')){
      $('#detail-dialog .live-bonuses').outerHTML=bonusDetails(ui.detailContext)||'<div class="live-bonuses"><p class="muted">Cette carte n’est plus sur le plateau.</p></div>';
    }
    persist();scheduleAI();
    if(ui.view==='arena'&&game?.phase==='over'&&!ui.endShown){ui.endShown=true;showMatchStats(game);}
  }
  function choices(field,value,label){return `<option value="">${label}</option>`+[...new Set(cards.map(c=>c[field]))].sort((a,b)=>a.localeCompare(b,'fr')).map(v=>`<option ${v===value?'selected':''} value="${esc(v)}">${esc(v)}</option>`).join('');}
  function filtered(){
    const f=ui.filters,search=f.search.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return cards.filter(c=>(!search||[c.name,c.title,c.faction,c.race,c.id].join(' ').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(search))&&(!f.element||c.element===f.element)&&(!f.faction||c.faction===f.faction)&&(!f.race||c.race===f.race)&&(!f.weapon||c.weapon===f.weapon)&&(!f.position||c.positions.includes(Number(f.position)))&&(!f.favorite||favorites.has(c.id))).sort((a,b)=>ui.sort==='name'?a.name.localeCompare(b.name,'fr'):ui.sort==='attack'?E.mean(b.atk)-E.mean(a.atk):ui.sort==='defense'?E.mean(b.defense)-E.mean(a.defense):ui.sort==='faction'?a.faction.localeCompare(b.faction,'fr'):ui.sort==='element'?a.element.localeCompare(b.element):a.id.localeCompare(b.id));
  }
  function collection(){
    const f=ui.filters,list=filtered(),groups=Catalogue.groups(list);
    return `<div class="collection-shell"><aside class="filters ${ui.filtersOpen?'visible':''}" aria-label="Filtres de collection"><div class="filters-head"><span class="eyebrow">Archives de Kalistar</span>${ib('reset-filters','rotate-ccw','Réinitialiser les filtres')}</div><label class="search-wrap">Recherche<input class="search" id="search" type="search" placeholder="Nom, faction, identifiant" value="${esc(f.search)}"></label><div class="crystals-wrap"><label>Cristal</label><div class="crystal-filter">${Object.values(elements).map(e=>`<button data-action="element" data-id="${e.id}" class="${f.element===e.id?'selected':''}" aria-pressed="${f.element===e.id}" title="${esc(e.label)}" aria-label="${esc(e.label)}">${e.id==='NONE'?icon('circle-slash'):`<img src="${asset('cristaux',e.id)}" alt="">`}</button>`).join('')}</div></div><div class="filter-separator"></div><label>Faction<select data-filter="faction">${choices('faction',f.faction,'Toutes les factions')}</select></label><label>Race<select data-filter="race">${choices('race',f.race,'Toutes les races')}</select></label><label>Position<select data-filter="position"><option value="">Toutes les positions</option>${roles.map((r,i)=>`<option value="${i+1}" ${String(i+1)===f.position?'selected':''}>P${i+1} · ${r}</option>`).join('')}</select></label><label>Arme<select data-filter="weapon">${choices('weapon',f.weapon,'Toutes les armes')}</select></label><label class="check-label"><input type="checkbox" id="favorites-only" ${f.favorite?'checked':''}>Mes favoris</label></aside><section class="collection-main"><div class="section-heading"><div><span class="eyebrow">Édition V3</span><h1>Collection</h1></div><div class="totals"><div><b>${Catalogue.groups(cards).length}</b>Personnages</div><div><b>${cards.length}</b>Versions</div><div><b>${Object.keys(elements).filter(id=>id!=='NONE').length}</b>Cristaux</div><div><b>${favorites.size}</b>Favoris</div></div></div><div class="collection-tools"><div class="left"><button class="filter-mobile icon-button" data-action="toggle-filters" aria-label="Afficher les filtres" title="Filtres">${icon('sliders-horizontal')}</button><span class="result-count">${groups.length} personnage${groups.length===1?'':'s'} · ${list.length} versions${f.element?' · '+f.element:''}</span></div>${ib('database','database','Archives et sauvegarde locale')}<select id="sort" aria-label="Trier la collection">${[['id','Numéro de collection'],['name','Nom'],['element','Cristal'],['faction','Faction'],['attack','ATK moyenne'],['defense','DEF moyenne']].map(([v,n])=>`<option value="${v}" ${ui.sort===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="character-grid">${groups.map(group=>Catalogue.item(group,{deck,favorites,covers,canAdd,db})).join('')||'<div class="empty-page">Aucun personnage</div>'}</div></section></div>`;
  }
  function canAdd(c){return deck.length<10&&deck.filter(id=>id===c.id).length<2&&(c.element!=='RAINBOW'||!deck.some(id=>E.byId[id].element==='RAINBOW'));}
  function changeDeck(id,delta){const c=E.byId[id];if(delta>0){if(!canAdd(c))return toast('Limite du deck atteinte.');deck.push(id);}else{const i=deck.indexOf(id);if(i>=0)deck.splice(i,1);}persist();if($('#deck-dialog').open)showDeck();if(ui.view==='collection')render();}
  function loadPreset(id){
    const preset=validatedPreset(id);deck=preset.cards.slice();deckName=preset.name.slice(0,50);deckPresetId=preset.id;
    persist();showDeck();if(ui.view==='collection')render();
  }
  function showDeck(){
    const errors=E.validateDeck(deck);
    modal('deck-dialog',head('Mon deck')+`<div class="dialog-body deck-layout"><div class="deck-list">${cards.map(c=>`<div class="deck-row"><img src="${cardImage(c)}" alt=""><div class="names"><b>${c.name}</b><small class="version-title">${esc(c.title)}</small><small>${c.element} · ${c.positions.map(p=>'P'+p).join(' / ')}</small></div><div class="stepper">${ib('remove','minus','Retirer '+c.name,`data-id="${c.id}" ${deck.includes(c.id)?'':'disabled'}`)}<span>${deck.filter(id=>id===c.id).length}</span>${ib('add','plus','Ajouter '+c.name,`data-id="${c.id}" ${canAdd(c)?'':'disabled'}`)}</div></div>`).join('')}</div><div class="deck-summary"><label>Deck prédéfini<select id="deck-preset">${presetOptions(deckPresetId)}</select></label><button class="ghost" data-action="load-preset">${icon('folder-open')}Charger</button><label>Nom du deck<input id="deck-name" maxlength="50" value="${esc(deckName)}"></label><div class="deck-meter">${deck.length}<small> / 10 cartes</small></div><div class="position-coverage">${roles.map((r,i)=>{const n=deck.filter(id=>E.byId[id].positions.includes(i+1)).length;return `<span class="${n?'':'missing'}" title="${r}">P${i+1} · ${n}</span>`;}).join('')}</div><div class="validation ${errors.length?'':'ok'}">${errors.length?errors.map(e=>`<p>${esc(e)}</p>`).join(''):'Formation P1 à P5 possible.'}</div><button class="primary" data-action="deck-play" ${errors.length?'disabled':''}>${icon('swords')}Jouer ce deck</button><button class="ghost" data-action="default-deck">${icon('rotate-ccw')}Deck initial</button><div class="detail-actions">${ib('export-deck','download','Exporter le deck JSON')}${ib('import-deck','upload','Importer un deck JSON')}</div><input hidden type="file" id="deck-file" accept="application/json,.json"><p class="muted">${game&&game.phase!=='over'?'La partie en cours conserve son deck initial.':''}</p></div></div>`);
  }
  function bonusDetails(context){
    const p=game?.players[context?.side],u=p?.board.find(u=>u?.uid===context?.uid);
    if(!u||u.cardId!==ui.detail)return '';
    const c=E.card(u),arena=E.arenaBonuses(game,u),section=(key,title,text)=>`<section class="bonus-explanation ${context.bonus===key?'highlighted':''}" data-explains="${key}"><h3>${title}</h3><p>${text}</p></section>`;
    const group=(field,label,stat)=>{
      const matches=p.board.flatMap((other,index)=>other&&E.card(other)[field]===c[field]?[`${esc(E.card(other).name)} · P${index+1}`]:[]),value=E.synergy(p,u,field);
      return section(field,`${label} · ${esc(c[field])} <b>${stat} +${value}</b>`,`${matches.length} carte${matches.length>1?'s':''} sur votre plateau, cette carte comprise. ${matches.join(', ')}.<br>Palier actuel : +${value} ${stat}. La réserve et les cartes éliminées ne comptent pas.`);
    };
    return `<div class="live-bonuses"><h2>Bonus sur le plateau · Joueur ${context.side+1}</h2><p class="single-trait-note">Un seul trait actif : tout nouveau trait remplace le précédent. Les bonus de faction et de race restent cumulables.</p>${group('faction','Faction','ATK')}${group('race','Race','DEF')}${section('arena',`Arène · ${esc(arenaById(game.arenaId).name)} <b>ATK +${arena.attack} / DEF +${arena.defense}</b>`,`Cristal : +${arena.element} ATK. Affinité du personnage : +${arena.homeAttack} ATK et +${arena.homeDefense} DEF. Bonus identiques pour les deux camps, sur les scores numériques uniquement.`)}${section('ward',`Garde physique <b>${u.ward?'+60 DEF':'Inactive'}</b>`,u.ward?'La prochaine défense numérique contre une ATK physique reçoit +60 DEF. Consommation unique, bonus conservé pour les relances du même duel. Magie, esquive et Mort ne le consomment pas ; Mort le contourne.':'Aucun bouclier physique en attente.')}${section('mana',`Potion <b>${u.mana?'+'+u.mana:'0'}</b>`,u.mana?'La prochaine attaque numérique magique de cette carte reçoit +60 ATK. Le jeton est ensuite consommé. Une attaque physique ne le consomme pas.':'Aucun jeton de potion actif.')}${section('physical',`Puissance physique <b>${u.physical?'+'+u.physical:'0'}</b>`,u.physical?'La prochaine attaque numérique physique de cette carte reçoit +60 ATK. Le jeton est ensuite consommé. Une attaque magique ne le consomme pas.':'Aucun bonus physique en attente.')}${section('luck',`Trèfle · Seconde chance <b>${u.luck?'Actif':'Inactif'}</b>`,u.luck?'Si le score DEF final est inférieur à l’ATK finale, ce trèfle est consommé et le dé DEF est relancé automatiquement. Tous les bonus sont recalculés sur le nouveau jet. Si cette seconde chance échoue, la carte est éliminée. Ce trait ne se cumule pas avec le Reraise. Une égalité le conserve. Mort ignore les scores et ne déclenche pas ce jeton.':'Aucun trèfle actif. Un trèfle obtenu en ATK peut être attribué à cette carte par une carte alliée, ou par elle-même.')}${section('reraise',`Cœur · Reraise <b>${u.reraise?'Actif':'Inactif'}</b>`,u.reraise?'Une vie supplémentaire. À la prochaine élimination, même par Mort, ce cœur est consommé et la carte reprend vie à la même position. Un seul cœur actif à la fois.':'Aucune vie supplémentaire active. Un cœur obtenu en ATK peut être attribué à toute carte de votre plateau, elle-même comprise.')}</div>`;
  }
  function showDetail(id,art=false,context=null){
    ui.detail=id;ui.art=art;ui.detailContext=context;ui.careerInstance=context?.instanceId||game?.players[context?.side]?.board.find(u=>u?.uid===context?.uid)?.instanceId||'all';const c=E.byId[id],el=elementInfo(c);
    const v=(x,attack=false)=>typeof x==='number'?x:`<img src="${asset('effets',x)}" alt="${dieLabel(x,attack)}" title="${dieLabel(x,attack)}">`;
    $('#detail-dialog').classList.add('card-detail');
    modal('detail-dialog',head(c.name)+`<div class="dialog-body detail-body"><div class="detail-visual" style="--element-color:#${el.color}"><img src="${art?artImage(c):duelImage(c)}" alt="${art?'Illustration':'Carte'} de ${c.name}"></div><div class="detail-info"><div><span class="eyebrow">${c.element} · #${c.id}</span><h2>${esc(c.title)}</h2></div>${Catalogue.versionStrip(id)}${bonusDetails(context)}<div class="identity-strip"><img src="${asset('factions',c.faction)}" alt="Drapeau ${c.faction}"><span><b>${c.faction}</b><br>${c.job}</span><img class="race-icon" src="${asset('races',c.race)}" alt=""><span>${c.race}<br>${c.positions.map(p=>'P'+p).join(' / ')}</span></div><div class="muted">${c.weapon}</div><table class="stats-table"><thead><tr><th>Dé</th>${[6,5,4,3,2,1].map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody><tr><th>ATK</th>${c.atk.map((x,i)=>`<td class="${c.magic.includes(6-i)?'magic':''}" title="${c.magic.includes(6-i)?'Magique':'Physique'}">${v(x,true)}</td>`).join('')}</tr><tr><th>DEF</th>${c.defense.map((x,i)=>`<td class="${hasCrystal(c)&&c.barriers.includes(6-i)?'barrier':''}" title="${hasCrystal(c)&&c.barriers.includes(6-i)?'Barrière : -30 contre magie':'Défense sans barrière'}">${v(x)}</td>`).join('')}</tr></tbody></table><div class="affinities">${!hasCrystal(c)?'Sans cristal · aucun bonus élémentaire ni barrière':c.element==='RAINBOW'?'+40 contre les cristaux classiques · +30 contre sans cristal':`+${c.advantage} ${esc(data.elements[el.strong_against]?.label||'')}<span>-${c.disadvantage} ${esc(data.elements[el.weak_against]?.label||'')}</span> · +20 contre sans cristal`}</div><p class="story">${esc(c.text)}</p>${Catalogue.career(id,db,ui.careerInstance)}<div class="detail-actions"><button data-action="toggle-art">${icon(art?'credit-card':'image')}${art?'Carte':'Illustration'}</button><a href="../cartes/${c.slug}.png" download>${icon('download')} PNG d’impression</a>${ib('favorite','star','Favori',`data-id="${id}" aria-pressed="${favorites.has(id)}"`)}</div></div></div>`);
    if(context?.bonus)requestAnimationFrame(()=>$('#detail-dialog .highlighted')?.scrollIntoView({block:'nearest'}));
  }
  function showRules(){
    modal('rules-dialog',head('Règles · V3')+`<div class="dialog-body rules-body"><h3>Formation et victoire</h3><p>10 cartes, 5 positions : Tank, DPS physique, Middle, DPS magique et Support. Deux exemplaires par version au maximum, une seule Rainbow. Une carte vivante reste à sa position après le début du match. ATK strictement supérieure à DEF élimine la cible ; une égalité la conserve.</p><div class="formula">ATK = jet + arme + cristal + faction + jeton + arène − barrière<br>DEF = jet + race + arène + ward<br>Totaux négatifs ramenés à zéro. Faces spéciales résolues séparément.</div><h3>Arènes</h3><p>Lieu verrouillé au début du match, identique pour les deux camps. Cristal correspondant : +15 ATK. Affinité de personnage : +10 ATK et +10 DEF, toutes ses versions comprises. Maximum +25 ATK et +10 DEF, uniquement sur les scores numériques.</p><h3>Cristaux et barrières</h3><p>Classique contre sans cristal : +20 ATK. Rainbow contre sans cristal : +30. Sans cristal contre un cristal : 0. Sans cristal n’a ni halo ni barrière élémentaire. Rainbow contre classique : +40 ; classique contre Rainbow : −40.</p><p>Air &gt; Eau &gt; Feu &gt; Glace &gt; Plante &gt; Terre &gt; Roche &gt; Électricité &gt; Air. Sang &gt; Ténèbres &gt; Lumière &gt; Sang. Les avantages imprimés et la matrice d’armes s’appliquent une seule fois à l’ATK. Une barrière retire 30 ATK uniquement contre une attaque magique.</p><h3>Trait unique</h3><p>Un nouveau trait remplace le précédent. Aucun cumul entre Garde, Reraise, trèfle, potion et puissance physique. Faction, race et arène restent cumulables.</p><table><tr><th>Garde / ward 60</th><td>La face bouclier ATK permet de choisir un allié vivant du plateau, auteur compris. Il reçoit +60 DEF sur sa prochaine défense numérique contre une ATK physique. Le bonus est consommé une seule fois et conservé dans le même duel en cas de relance. Magie, esquive et Mort ne le consomment pas. Mort le contourne.</td></tr><tr><th>Trèfle</th><td>En ATK : choix d’un allié, auteur compris. Sa prochaine défense insuffisante déclenche une relance automatique. Égalité et Mort ne le consomment pas. En DEF : relance immédiate.</td></tr><tr><th>Potion / puissance</th><td>+60 sur la prochaine attaque numérique du type correspondant : magique pour la potion, physique pour la puissance. La potion est attribuable à un allié, auteur compris.</td></tr><tr><th>Reraise</th><td>Face réservée aux soigneurs P5. Choix d’un allié vivant, auteur compris. À sa prochaine élimination, même par Mort, le cœur est consommé et la carte reste à sa place.</td></tr><tr><th>Esquive / Mort</th><td>Esquive annule l’attaque, y compris Mort. Mort ignore les scores, la barrière et ward ; Reraise peut sauver la cible.</td></tr></table><h3>Synergies</h3><p>Pour 1 à 5 cartes de même faction ou race sur le plateau : +0, +10, +20, +30, +40. Faction en ATK, race en DEF. Réserve et cartes éliminées exclues.</p><h3>Archives V3</h3><p>Les parties et statistiques V3 sont séparées de V2. Une sauvegarde V2 est refusée sans modifier les données V2.</p></div>`);
  }
  function createGame(mode,seed,arenaId=load('arena',arenas[0].id),opponentId=enemyPresetId){
    if(!['grantGuard','aiGuardChoice','arenaBonuses','setArena'].every(key=>typeof E[key]==='function')||cards.some(c=>!/^30\d{6}$/.test(c.id)||!c.characterId))throw new Error('Moteur ou profils V3 en attente. Aucune partie V2 ne sera créée dans V3.');
    const errors=E.validateDeck(deck);if(errors.length)throw new Error(errors.join(' '));
    const opponent=validatedPreset(opponentId),next=E.newGame(deck.slice(),opponent.cards.slice(),{mode,seed,arenaId:arenaById(arenaId).id});
    E.setArena(next,arenaById(arenaId).id);KalistarLocalDB.validateGame(next);E.autoDeploy(next,0);E.autoDeploy(next,1);E.assertState(next);
    clearTimeout(aiTimer);epoch++;game=next;enemyPresetId=opponent.id;ui.attacker=ui.target=ui.reserve=null;ui.endShown=false;statsSort='rating';statsSide='all';save('arena',game.arenaId);persist();
  }
  function arenaRule(a){
    const crystal=a.element&&a.element!=='NONE'?(data.elements[a.element]?.label||a.element)+' : +'+(a.elementBonus||0)+' ATK':'Terrain neutre';
    const home=(a.homeCharacters||[]).map(id=>cards.find(c=>c.characterId===id)?.name||id);
    return esc(crystal+(home.length?' · '+home.join(', ')+' : +'+(a.homeAttack||0)+' ATK / +'+(a.homeDefense||0)+' DEF':''));
  }
  function arenaChoices(id){return `<fieldset class="arena-options"><legend>Lieu de la rencontre</legend>${arenas.map(a=>`<label class="arena-option"><input type="radio" name="arena" value="${a.id}" ${arenaById(id).id===a.id?'checked':''}><img src="${a.image}" alt="${a.name}"><span>${a.name}<small>${esc(a.subtitle)}</small><small class="arena-bonus-rule">${arenaRule(a)}</small></span></label>`).join('')}</fieldset>`;}
  function showArenaPicker(){
    if(rolling)return toast('Le duel se termine…');
    if(game&&game.phase!=='setup')return toast('Arène verrouillée : la rencontre a commencé.');
    modal('arena-dialog',head('Choisir une arène')+`<div class="dialog-body"><form id="arena-form">${arenaChoices(game?.arenaId||load('arena','ruins'))}<div class="actions"><button type="button" data-action="close">Annuler</button><button class="primary" type="submit">${icon('check')}Choisir cette arène</button></div></form></div>`);
  }
  function showMatchStats(state=reportGame||game){reportGame=state;if(state)modal('match-dialog',head(state.phase==='over'?'Palmarès de la rencontre':'Statistiques du match')+KalistarMatchReport.render(state,{sort:statsSort,side:statsSide}));}
  function newGameDialog(){$('#new-game-dialog').classList.add('arena-picker-dialog');modal('new-game-dialog',head('Nouvelle partie')+`<div class="dialog-body"><form class="dialog-form" id="new-game-form">${arenaChoices(game?.arenaId||load('arena','ruins'))}<label>Adversaire<select id="game-mode"><option value="ai">Adversaire automatique</option><option value="local">Deux joueurs sur cet écran</option></select></label><label><span id="enemy-deck-label">Deck IA</span><select id="enemy-deck-preset">${presetOptions(enemyPresetId)}</select></label><label>Graine des dés<input id="game-seed" maxlength="60" value="KALI-${Math.floor(Math.random()*999999)}" required></label><p class="muted">Deck : ${esc(deckName)} · ${deck.length}/10</p>${game&&game.phase!=='over'?'<p class="validation">La nouvelle partie remplacera la sauvegarde de la partie en cours.</p>':''}<div class="actions"><button type="button" data-action="close">Annuler</button><button class="primary" type="submit" ${E.validateDeck(deck).length?'disabled':''}>Préparer la formation</button></div></form></div>`);}
  function buffs(p,u,side){
    const f=E.synergy(p,u,'faction'),r=E.synergy(p,u,'race'),arena=E.arenaBonuses(game,u);
    const chip=(key,text,title)=>`<button class="buff-chip ${key}" data-action="bonus" data-side="${side}" data-uid="${u.uid}" data-bonus="${key}" title="${title}" aria-label="${title}">${text}</button>`;
    return `${f?chip('faction','ATK +'+f,'Bonus de faction : ATK +'+f):''}${r?chip('race','DEF +'+r,'Bonus de race : DEF +'+r):''}${arena.attack||arena.defense?chip('arena','A +'+arena.attack+'/'+arena.defense,'Arène : ATK +'+arena.attack+' / DEF +'+arena.defense):''}`;
  }
  function traitBadge(side,u){
    const key=E.trait(u);if(!key||!traitInfo[key])return '';
    const info=traitInfo[key];if(!info)return '';
    const title=info.name+(u[key]>1?' : +'+u[key]+(key==='ward'?' DEF':' ATK'):' actif');
    return `<button class="life-badge trait-badge ${key}-badge ${key==='luck'?'clover-badge':''}" data-action="bonus" data-side="${side}" data-uid="${u.uid}" data-bonus="${key}" aria-label="${title}" title="${title}"><img src="${asset('effets',info.asset)}" alt="">${u[key]>1?`<b>${u[key]}</b>`:''}</button>`;
  }
  function reserveTrait(u){
    const key=E.trait(u);if(!key||!traitInfo[key])return '';
    return `<span class="reserve-trait" title="${traitInfo[key].name}"><img src="${asset('effets',traitInfo[key].asset)}" alt="${traitInfo[key].name}">${u[key]>1?`<b>${u[key]}</b>`:''}</span>`;
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
      const beneficiary=u&&['clover','potion','heart','guard'].includes(game.phase)&&game.turn===side&&!(game.mode==='ai'&&side===1);
      const currentTrait=E.trait(u),grantName=game.phase==='guard'?'la garde physique':game.phase==='heart'?'le Reraise':game.phase==='potion'?'la potion magique':'le trèfle';
      const grantTitle=beneficiary?`Attribuer ${grantName} à ${c.name}${currentTrait?' · remplace '+traitInfo[currentTrait].name:''}`:'';
      const saved=u&&game.duel?.reraised===u.uid?'reraise-saved':'';
      return `<div class="slot ${side?'enemy':''} ${isA?'selected':''} ${isT?'target':''} ${isA||isT?'challenger':''} ${saved} ${beneficiary?'trait-eligible '+game.phase+'-eligible':''} ${selectedReserve&&canDeployReserve(side,selectedReserve.uid,slot)?'compatible':''}" data-position="${slot+1}" data-key="${side}-${slot}" data-unit="${u?.uid||''}" data-element="${c?.element||''}" style="--element-color:#${elementInfo(c).color};--trait-color:${game.phase==='guard'?'#a6d8eb':game.phase==='heart'?'#ff96b7':game.phase==='potion'?'#8adbf5':'#9cf3b7'}"><div class="position-label"><b>P${slot+1}</b><span>${roles[slot]}</span></div><button class="slot-card ${u?'':'empty'}" data-action="slot" data-side="${side}" data-slot="${slot}" aria-pressed="${isA||isT}" ${beneficiary?`title="${esc(grantTitle)}"`:''} aria-label="${beneficiary?esc(grantTitle):`${side?'Adversaire':'Joueur'} P${slot+1}${c?' '+c.name:', emplacement libre'}`}">${c?`<img src="${duelImage(c)}" alt="${c.name}" width="797" height="1388" draggable="false">`:icon('plus')+'<span>P'+(slot+1)+'</span>'}</button>${(isA||isT)&&hasCrystal(c)?'<canvas class="element-aura" aria-hidden="true"></canvas>':''}${u?traitBadge(side,u):''}${c?`<button class="inspect" data-action="detail" data-id="${c.id}" data-side="${side}" data-uid="${u.uid}" aria-label="Inspecter ${c.name}" title="Inspecter ${c.name}">${icon('scan-eye')}</button>`:''}<div class="slot-buffs">${u?buffs(p,u,side):''}</div></div>`;
    }).join('')}</div>`;
  }
  function sideHeading(side){const p=game.players[side];return `<div class="side-heading"><div class="player-name ${side?'enemy':'ally'}">${side?(game.mode==='ai'?'Le Veilleur · IA':'Joueur 2'):'Joueur 1'}${game.turn===side&&game.phase!=='setup'?' · ATK':''}</div><div class="resources"><span>${p.board.filter(Boolean).length}/5</span><button data-action="reserves" data-side="${side}">${icon('layers-3')}${p.reserve.length}</button><button data-action="grave" data-side="${side}">${icon('skull')}${p.dead.length}</button></div></div>`;}
  function dice(side){
    const d=['attack','defense','clover','potion','heart','guard','result'].includes(game.phase)?game.duel:null,isAttack=d?d.side===side:game.turn===side,rolls=d?(isAttack?d.attackRolls:d.defenseRolls):[],die=rolls.at(-1);
    const selected=game.phase==='choose'?game.players[side].board[isAttack?ui.attacker:ui.target]:null;
    const name=d?(isAttack?d.attackerName:d.targetName):selected?E.card(selected).name:'En attente';
    const active=(game.phase==='attack'&&game.turn===side)||(game.phase==='defense'&&game.turn!==side);
    return `<div class="duel-die player-${side} ${active?'active':''}" data-player="${side}"><div class="dice-owner">Joueur ${side+1}<span>${isAttack?'ATK':'DEF'}</span></div><b>${esc(name)}</b><div class="dice-stage" data-player="${side}" data-value="${die||6}" role="img" aria-label="Dé du joueur ${side+1}${die?' : '+die:' en attente'}"><div class="die-fallback">${icon('dice-'+(die||6))}</div></div><small>${die?'D'+die+' · '+esc(dieLabel(isAttack?d.attackValue:d.defenseValue,isAttack)):'En attente'}</small></div>`;
  }
  function consoleParticipants(s){
    const d=['attack','defense','clover','potion','heart','guard','result'].includes(s.phase)?s.duel:null,side=d?.side??s.turn;
    const unit=(player,uid)=>[...player.board,...player.reserve,...player.dead].find(u=>u?.uid===uid);
    return {side,a:d?unit(s.players[side],d.attacker):s.phase==='choose'?s.players[side].board[ui.attacker]:null,b:d?unit(s.players[1-side],d.target):s.phase==='choose'?s.players[1-side].board[ui.target]:null};
  }
  function syncConsole(s=game){
    const node=$('.duel-console');if(!node||!s)return;
    const {a,b}=consoleParticipants(s),ac=a?E.card(a):null,bc=b?E.card(b):null;
    const color=c=>data.elements[c?.element]?'#'+data.elements[c.element].color:null;
    node.style.setProperty('--ritual-color',color(ac)||'#d3b7ab');
    node.style.setProperty('--ward-color',color(bc)||'#9acdd5');
    node.style.setProperty('--action-color',s.phase==='guard'?'#a6d8eb':s.phase==='heart'?'#ff96b7':s.phase==='potion'?'#8adbf5':s.phase==='clover'||s.duel?.autoDefense?'#9bebac':s.phase==='defense'?color(bc)||'#9acdd5':color(ac)||'#d3b7ab');
    node.dataset.phase=s.phase;node.dataset.element=ac?.element||'NONE';
  }
  function recapRow(key,label,value,bonus=true,help=''){
    const symbols={baseAttack:'swords',weapon:'axe',element:'gem',faction:'flag',buff:'sparkles',barrier:'shield-half',baseDefense:'shield',race:'users',arenaAttack:'map',arenaDefense:'map',ward:'shield-check'};
    return `<div class="recap-row" data-bonus="${key}" ${help?`title="${esc(help)}"`:''}><span>${icon(symbols[key])}${label}</span><b class="${value==null?'unknown':typeof value!=='number'?'conditional':bonus&&value>0?'positive':value<0?'negative':''}">${value==null?'…':bonus&&value>0?'+'+value:esc(value)}</b></div>`;
  }
  function scoreTotals(side,attackLabel,attackValue,defenseLabel,defenseValue,preview=false){
    const scores=[{role:'attack',label:attackLabel,value:attackValue},{role:'defense',label:defenseLabel,value:defenseValue}];
    if(side===1)scores.reverse();
    const cell=(score,player)=>`<div class="score-player-${player}" data-score-player="${player}" data-score-role="${score.role}"><small class="score-owner">Joueur ${player+1}</small><span class="score-role">${score.label}</span><strong data-${preview?'preview-total':'total'}="${score.role}" class="${String(score.value).startsWith('-')?'negative':''}">${esc(score.value)}</strong></div>`;
    return `<div class="recap-totals ${preview?'preview-totals':''}">${cell(scores[0],0)}<span class="recap-versus">/</span>${cell(scores[1],1)}</div>`;
  }
  function previewRecap(s){
    const {side,a,b}=consoleParticipants(s),ac=a?E.card(a):null,bc=b?E.card(b):null,pair=!!a&&!!b;
    const weapon=pair?(data.weapons[ac.weapon]?.[bc.weapon]||0):null,element=pair?E.elementModifier(ac,bc):null;
    const faction=a?E.synergy(s.players[side],a,'faction'):null,race=b?E.synergy(s.players[1-side],b,'race'):null;
    const attackArena=a?E.arenaBonuses(s,a):null,defenseArena=b?E.arenaBonuses(s,b):null;
    const tokens=a?[a.mana?'M +'+a.mana:'',a.physical?'P +'+a.physical:''].filter(Boolean).join(' / ')||0:null;
    const barrier=pair?(hasCrystal(bc)&&ac.atk.some((v,i)=>typeof v==='number'&&ac.magic.includes(6-i))&&bc.defense.some((v,i)=>typeof v==='number'&&bc.barriers.includes(6-i))?'-'+E.rules.barrier+' possible':0):null;
    const ward=b?(b.ward?'+60 si physique':0):null;
    const fixed=pair?weapon+element+faction+attackArena.attack:null,defense=b?race+defenseArena.defense:null;
    const signed=v=>v==null?'…':v>0?'+'+v:String(v),row=recapRow;
    const arenaHelp=bonus=>bonus?`Cristal +${bonus.element} ATK ; affinité +${bonus.homeAttack} ATK / +${bonus.homeDefense} DEF.`:'Selon le personnage et le lieu';
    return `<section class="duel-recap preview-recap ${!a&&!b?'pending-recap':''}" aria-label="Aperçu des bonus avant les dés"><div class="recap-type">${icon('scan-eye')}<span>Forces engagées</span><small>AVANT JET</small></div>${row('baseAttack','Jet ATK','À lancer',false)}${row('weapon','Arme',weapon)}${row('element','Cristal',element,true,pair?elementInfo(ac).label+' contre '+elementInfo(bc).label:'Selon les deux cristaux')}${row('faction','Faction',faction)}${row('arenaAttack','Arène ATK',attackArena?.attack,true,arenaHelp(attackArena))}${row('buff','Jeton',tokens,true,'M : attaque magique. P : attaque physique. Aucun jeton consommé avant le jet.')}${row('barrier','Barrière',barrier,true,'Seulement contre une attaque magique ; aucune barrière sans cristal.')}<div class="recap-defense">${row('baseDefense','Jet DEF','À lancer',false)}${row('race','Race',race)}${row('arenaDefense','Arène DEF',defenseArena?.defense,true,arenaHelp(defenseArena))}${row('ward','Garde',ward,true,'Ward 60 : prochaine défense numérique contre une ATK physique. Mort le contourne.')}</div>${scoreTotals(side,'Modif. ATK',signed(fixed),'Bonus DEF',signed(defense),true)}<p class="preview-note">Hors dés et effets conditionnels</p></section>`;
  }
  function duelRecap(s){
    const d=['attack','defense','clover','potion','heart','guard','result'].includes(s.phase)?s.duel:null;
    if(!d?.attackRolls.length)return previewRecap(s);
    const numeric=typeof d.attackValue==='number',final=d.formula;
    if(s.phase==='result'&&numeric&&!final)return `<div class="duel-recap special-recap">${icon(d.defenseValue==='dodge'?'move-up-right':'shield-check')}<span>${esc(format(d.defenseValue))}</span><span>Attaque annulée · aucun score appliqué</span></div>`;
    if(!numeric){
      const support=['retry','mana','revive','guard'].includes(d.attackValue),label=s.phase==='guard'?'Garde à attribuer':d.attackValue==='death'?'Mort · ignore les scores':s.phase==='heart'?'Reraise à attribuer':s.phase==='clover'?'Trèfle à attribuer':s.phase==='potion'?'Potion magique à attribuer':dieLabel(d.attackValue,true);
      return `<div class="duel-recap special-recap">${support?`<img class="recap-clover" src="${asset('effets',d.attackValue)}" alt="">`:''}<span>${esc(label)}</span>${support?`<span>${d.attackValue==='guard'?'+60 DEF contre la prochaine ATK physique':d.attackValue==='revive'?'Une vie supplémentaire':d.attackValue==='mana'?'+60 à la prochaine attaque magique':'Seconde chance en défense'}</span><span class="single-trait-note">Un seul trait par carte.<br>Le nouveau remplace l’ancien.</span>`:''}${d.defenseRolls.length?`<span>DEF · ${esc(format(d.defenseValue))}</span>`:''}</div>`;
    }
    const a=s.players[d.side].board[d.attackerSlot],b=s.players[1-d.side].board[d.targetSlot];
    if(!final&&(!a||!b))return '';
    // Resolved duels retain their original synergies, including an eliminated target.
    const f=final||{baseAttack:d.attackValue,weapon:data.weapons[E.card(a).weapon]?.[E.card(b).weapon]||0,element:E.elementModifier(E.card(a),E.card(b)),faction:E.synergy(s.players[d.side],a,'faction'),buff:d.buff||0,race:E.synergy(s.players[1-d.side],b,'race'),arenaAttack:E.arenaBonuses(s,a).attack,arenaDefense:E.arenaBonuses(s,b).defense,ward:d.magic?0:d.ward||b.ward||0};
    const row=recapRow;
    const subtotal=Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+(f.arenaAttack||0));
    return `<section class="duel-recap" aria-label="Détail des bonus du duel"><div class="recap-type">${icon(d.magic?'sparkles':'swords')}<span>${d.magic?'Attaque magique':'Attaque physique'}</span></div>${row('baseAttack','Jet ATK · D'+d.attackDie,f.baseAttack,false)}${row('weapon','Arme',f.weapon)}${row('element','Cristal',f.element)}${row('faction','Faction',f.faction)}${row('arenaAttack','Arène ATK',f.arenaAttack||0)}${row('buff','Jeton',f.buff)}${row('barrier','Barrière',final?f.barrier:null)}<div class="recap-defense">${row('baseDefense','Jet DEF'+(d.defenseDie?' · D'+d.defenseDie:''),final?f.baseDefense:null,false)}${row('race','Race',f.race)}${row('arenaDefense','Arène DEF',f.arenaDefense||0)}${row('ward','Garde',final?f.ward||0:f.ward?'+60 si numérique':0)}</div>${!final&&d.defenseRolls.length?`<p class="recap-event">${esc(format(d.defenseValue))}${s.phase==='defense'?' · nouveau jet':''}</p>`:''}${scoreTotals(d.side,final?'ATK finale':'ATK avant DEF',final?f.attack:subtotal,final?'DEF finale':'DEF',final?f.defense:'…')}</section>`;
  }
  function duelAction(action,symbol,label,{disabled=false,mode=action}={}){
    return `<button class="primary ritual-action" data-action="${action}" data-mode="${mode}" ${disabled?'disabled':''}><span class="action-sigil" aria-hidden="true">${icon(symbol)}</span><span class="action-label">${label}</span><span class="action-tail" aria-hidden="true">${icon(action==='next'?'chevrons-right':'chevron-right')}</span><span class="action-charge" aria-hidden="true"></span></button>`;
  }
  function consoleBody(s=game){
    let label,title,actions='';
    if(s.phase==='setup'){
      label='AVANT LE COMBAT';title='Formation initiale';actions=`<div class="setup-actions"><button class="formation-auto" data-action="auto-formation">${icon('shuffle')}Formation auto</button>${duelAction('start','swords','Commencer',{disabled:s.players.some(p=>p.board.some(u=>!u))})}</div>`;
    }else if(s.phase==='choose'){
      const a=ui.attacker!==null?s.players[s.turn].board[ui.attacker]:null,b=ui.target!==null?s.players[1-s.turn].board[ui.target]:null;
      label=`JOUEUR ${s.turn+1} · CHOIX DU DUEL`;title=`${a?E.card(a).name:'Attaquant'} ${a&&b?'contre':' / '} ${b?E.card(b).name:'Cible'}`;
      if(s.turn===1&&s.mode==='ai')title='Le Veilleur choisit son duel';
      else actions=duelAction('lock','swords','Engager le duel',{disabled:!a||!b});
    }else if(['clover','potion','heart','guard'].includes(s.phase)){
      const potion=s.phase==='potion',heart=s.phase==='heart',guard=s.phase==='guard';label=`${guard?'GARDE PHYSIQUE':heart?'RERAISE':potion?'POTION MAGIQUE':'TRÈFLE'} · JOUEUR ${s.turn+1}`;title=s.mode==='ai'&&s.turn===1?'Le Veilleur choisit un allié':'Choisir une carte alliée';
      actions=`<span class="clover-choice-status">${icon(guard?'shield-check':heart?'heart-pulse':potion?'flask-conical':'clover')}${guard?'Attribution de la garde':heart?'Attribution du Reraise':potion?'Attribution de la potion':'Attribution du trèfle'}</span>`;
    }else if(s.phase==='attack'||s.phase==='defense'){
      const atk=s.phase==='attack',actor=atk?s.turn:1-s.turn,second=!atk&&s.duel.autoDefense,auto=second||s.mode==='ai'&&actor===1,retry=(atk?s.duel.attackRolls:s.duel.defenseRolls).length>0;
      label=`${second?'SECONDE CHANCE':atk?'ATTAQUE':'DÉFENSE'} · JOUEUR ${actor+1}`;title=second?'Trèfle consommé':retry?'Nouveau jet':atk?'L’attaque se prépare':'La défense se prépare';
      actions=duelAction('roll',second?'clover':atk?'dice-6':'shield',second?'Seconde chance…':auto?'Jet adverse…':retry?'Relancer le dé':atk?'Lancer l’attaque':'Lancer la défense',{disabled:auto||rolling,mode:second?'luck':atk?'attack':'defense'});
    }else if(s.phase==='replace'){
      label=`RENFORTS · JOUEUR ${s.replacing+1}`;title='Position libérée';actions=duelAction('auto-replace','replace','Déployer les renforts',{disabled:s.mode==='ai'&&s.replacing===1});
    }else if(s.phase==='over'){
      label='FIN DE PARTIE';title=s.winner==='draw'?'Match nul':s.winner===0?'Victoire du joueur 1':s.mode==='ai'?'Le Veilleur l’emporte':'Victoire du joueur 2';actions=duelAction('new-game','rotate-ccw','Nouvelle partie');
    }else{
      label='DUEL RÉSOLU';title=s.duel.outcome;actions=duelAction('next','arrow-right','Tour suivant',{disabled:rolling});
    }
    const {a}=consoleParticipants(s),element=a?E.card(a).element:null;
    return `<div class="duel-status"><div class="phase-label">${hasCrystal({element})?`<img class="console-crystal" src="${asset('cristaux',element)}" alt="Cristal ${element}">`:icon(element==='NONE'?'circle-slash':'swords')}<span>${label}</span></div><h2 class="${s.phase==='result'?'outcome':''}">${esc(title)}</h2></div>${duelRecap(s)}<div class="duel-actions">${actions}</div>`;
  }
  function reserveZone(side){
    const p=game.players[side],hidden=game.mode==='ai'&&side===1,draggable=!hidden&&(game.phase==='setup'||game.phase==='replace'&&game.replacing===side);
    return `<div class="reserve-zone"><div class="reserve-heading"><h3>Réserve <span class="muted">${p.reserve.length}</span></h3></div><div class="reserve-cards">${p.reserve.map(u=>hidden?'<div class="reserve-card face-down"><img src="assets/back.webp" alt="Carte adverse face cachée" draggable="false"></div>':`<button class="reserve-card ${ui.reserve===u.uid?'selected':''}" data-element="${E.card(u).element}" data-action="reserve" data-uid="${u.uid}" data-side="${side}" ${draggable?'data-drag-reserve="true"':''} style="--element-color:#${elementInfo(E.card(u)).color}" title="${E.card(u).name} · ${E.card(u).positions.map(p=>'P'+p).join('/')}" aria-label="Sélectionner ${E.card(u).name}"><img src="${cardImage(E.card(u))}" alt="${E.card(u).name}" draggable="false">${reserveTrait(u)}</button>`).join('')||'<span class="muted">Aucune carte</span>'}</div></div>`;
  }
  function journal(){
    const f=(game.duel||game.lastDuel)?.formula;
    const row=(label,v,cls='')=>`<div class="formula-row ${cls}"><span>${label}</span><b class="${v>0?'positive':v<0?'negative':''}">${v>0&&cls!=='total'?'+':''}${v}</b></div>`;
    return `<aside class="journal"><div class="journal-top"><h2>Journal du duel</h2>${ib('export-log','download','Exporter le journal')}</div><div class="combat-summary">${f?row('Jet ATK',f.baseAttack)+row('Arme',f.weapon)+row('Cristal',f.element)+row('Faction',f.faction)+row('Arène ATK',f.arenaAttack||0)+row('Jeton',f.buff)+row('Barrière',f.barrier)+row('ATK finale',f.attack,'total')+row('Jet DEF',f.baseDefense)+row('Race',f.race)+row('Arène DEF',f.arenaDefense||0)+row('Garde',f.ward||0)+row('DEF finale',f.defense,'total'):'<span class="muted">Aucun calcul numérique résolu.</span>'}</div><ol class="log-list" aria-label="Historique">${game.log.slice(-80).reverse().map(l=>`<li class="${esc(l.type)}"><small>Échange ${l.turn} · #${l.n}</small>${esc(l.text).replace(/ = (retry|mana|revive|guard|death|dodge)\./g,(_,n)=>' = '+dieLabel(n,l.text.includes(' : ATK '))+'.')}</li>`).join('')}</ol></aside>`;
  }
  function arena(){
    if(!game)return '<div class="resume-strip"><h2>Arène de Kalistar</h2><button class="primary" data-action="new-game">Préparer une partie</button></div>';
    return `${!storageAvailable?'<div class="storage-note">Sauvegarde navigateur indisponible. Exportez la partie pour la conserver.</div>':''}<div class="game-shell" style="--board-scale:${boardScale/100};--arena-image:url('${arenaById(game.arenaId).image}')"><div class="arena-toolbar"><div><h1>${arenaById(game.arenaId).name} <span class="round">Échange ${game.round} / 200</span></h1><span class="muted game-seed">${esc(game.seed)} · ${game.mode==='ai'?'Adversaire automatique':'Deux joueurs locaux'}</span><span class="arena-rules">${arenaRule(arenaById(game.arenaId))}</span></div><div class="tools"><label class="board-zoom" title="Taille des cartes">${icon('scan')}<input id="board-scale" type="range" min="85" max="140" step="5" value="${boardScale}" aria-label="Taille des cartes"><output>${boardScale}%</output></label>${ib('arena-picker','map',game.phase==='setup'?'Choisir une arène':'Arène verrouillée',game.phase==='setup'?'':'disabled')}${ib('match-stats','trophy','Bilan et statistiques du match')}${ib('journal','scroll-text','Ouvrir le journal du duel')}${ib('fullscreen','maximize','Plein écran')}${ib('save-game','save','Exporter la sauvegarde')}${ib('load-game','upload','Importer une sauvegarde')}${ib('new-game','rotate-ccw','Nouvelle partie')}<input hidden type="file" id="game-file" accept="application/json,.json"></div><div class="board-navigation">${ib('focus-left','panel-left','Centrer le joueur 1')}${ib('focus-duel','dice-6','Centrer les dés')}${ib('focus-right','panel-right','Centrer le joueur 2')}</div></div><div class="arena-layout"><div class="battlefield-viewport"><section class="battlefield" aria-label="Plateau de jeu"><section class="team team-left" data-team="0">${sideHeading(0)}${board(0)}${reserveZone(0)}</section><div class="duel-console" aria-live="polite">${dice(0)}<div class="duel-centre">${consoleBody()}</div>${dice(1)}</div><section class="team team-right" data-team="1">${sideHeading(1)}${board(1)}${reserveZone(1)}</section></section></div></div></div>`;
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
      const button=$('[data-action="roll"]');if(button){button.disabled=true;button.classList.add('is-casting');button.setAttribute('aria-busy','true');button.querySelector('.action-label').textContent='Jet en cours…';}
      $('.duel-console').dataset.casting=phase;
      const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
      const landed=window.KalistarDice?await KalistarDice.play(actor,value,reduced):await new Promise(r=>setTimeout(()=>r(true),reduced?30:700));
      if(token===epoch&&landed){
        $('.duel-centre').innerHTML=consoleBody(next);syncConsole(next);delete $('.duel-console').dataset.casting;icons();
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
  async function animatedTrait(uid){
    if(rolling||!['clover','potion','heart','guard'].includes(game.phase))return;
    const token=epoch,next=E.clone(game);
    try{
      if(game.phase==='guard')E.grantGuard(next,uid);else if(game.phase==='heart')E.grantReraise(next,uid);else if(game.phase==='potion')E.grantPotion(next,uid);else E.grantClover(next,uid);
      E.assertState(next);rolling=true;clearTimeout(aiTimer);
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
    const active=second||game.mode==='ai'&&((p==='choose'&&game.turn===1)||(['clover','potion','heart','guard'].includes(p)&&game.turn===1)||(p==='attack'&&game.turn===1)||(p==='defense'&&game.turn===0)||(p==='replace'&&game.replacing===1));
    if(!active)return;
    aiTimer=setTimeout(()=>{if(token!==epoch||ui.view!=='arena')return;
      if(p==='attack'||p==='defense')return animatedRoll();
      if(['clover','potion','heart','guard'].includes(p))return animatedTrait(p==='guard'?E.aiGuardChoice(game):p==='heart'?E.aiReraiseChoice(game):p==='potion'?E.aiPotionChoice(game):E.aiCloverChoice(game));
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
      if(action==='detail')return showDetail(id,false,b.dataset.instance?{instanceId:b.dataset.instance}:b.dataset.uid?{side:Number(b.dataset.side),uid:b.dataset.uid}:null);
      if(action==='detail-version')return showDetail(id);
      if(action==='cover-version'){covers[Catalogue.key(E.byId[id])]=id;render();return;}
      if(action==='database')return showDatabase();
      if(action==='export-library'){db?.exportBackup().then(value=>download('Kalistar-collection-'+new Date().toISOString().slice(0,10)+'.json',value)).catch(e=>toast(e.message));return;}
      if(action==='import-library')return $('#library-file').click();
      if(action==='history-match'){const archived=db?.match(id);if(archived)return showMatchStats(archived.state);return;}
      if(action==='bonus')return inspectUnit(Number(b.dataset.side),b.dataset.uid,b.dataset.bonus);
      if(action==='toggle-art')return showDetail(ui.detail,!ui.art,ui.detailContext);
      if(action==='favorite'){favorites.has(id)?favorites.delete(id):favorites.add(id);persist();if($('#detail-dialog').open)b.setAttribute('aria-pressed',favorites.has(id));if(ui.view==='collection')render();return;}
      if(action==='add'||action==='remove')return changeDeck(id,action==='add'?1:-1);
      if(action==='deck')return showDeck();
      if(action==='rules')return showRules();
      if(action==='arena-picker')return showArenaPicker();
      if(action==='match-stats')return showMatchStats(game);
      if(action==='stats-sort'){statsSort=id;return showMatchStats();}
      if(action==='stats-side'){statsSide=id;return showMatchStats();}
      if(action==='export-stats'){const state=reportGame||game;return download('Kalistar-bilan-'+state.seed.replace(/[^a-zA-Z0-9_-]/g,'')+'.json',E.matchStats(state));}
      if(action==='rematch'){$('#match-dialog').close();return newGameDialog();}
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
      if(action==='load-preset')return loadPreset($('#deck-preset').value);
      if(action==='default-deck')return loadPreset('player');
      if(action==='deck-play'){$('#deck-dialog').close();newGameDialog();return;}
      if(action==='new-game')return newGameDialog();
      if(action==='export-deck')return download('Kalistar-V3-deck.json',{schema:1,edition:'V3',name:deckName,cards:deck});
      if(action==='import-deck')return $('#deck-file').click();
      if(action==='save-game')return download('Kalistar-partie-'+game.seed.replace(/[^a-zA-Z0-9_-]/g,'')+'.json',game);
      if(action==='load-game')return $('#game-file').click();
      if(action==='export-log')return download('Kalistar-journal.json',{seed:game.seed,rules:data.demo,log:game.log});
      if(action==='grave'||action==='reserves'){$('#detail-dialog').classList.remove('card-detail');return showArchive(Number(b.dataset.side),action==='grave'?'dead':'reserve');}
      if(action==='slot'&&['clover','potion','heart','guard'].includes(game.phase)){
        const side=Number(b.dataset.side),u=game.players[side].board[Number(b.dataset.slot)];
        if(rolling||game.mode==='ai'&&game.turn===1)return;
        if(side!==game.turn||!u)return toast('Choisissez une carte de votre plateau.');
        return animatedTrait(u.uid);
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
    if(e.target.id==='deck-preset'||e.target.id==='enemy-deck-preset'){
      const enemy=e.target.id==='enemy-deck-preset';
      try{const preset=validatedPreset(e.target.value);if(enemy)enemyPresetId=preset.id;else deckPresetId=preset.id;save(enemy?'enemyDeckPreset':'deckPreset',preset.id);}
      catch(error){e.target.value=enemy?enemyPresetId:deckPresetId;toast(error.message);}return;
    }
    if(e.target.id==='game-mode')$('#enemy-deck-label').textContent=e.target.value==='ai'?'Deck IA':'Deck du joueur 2';
    if(e.target.dataset.filter){ui.filters[e.target.dataset.filter]=e.target.value;ui.page=0;render();}
    if(e.target.id==='sort'){ui.sort=e.target.value;ui.page=0;render();}
    if(e.target.id==='favorites-only'){ui.filters.favorite=e.target.checked;ui.page=0;render();}
    if(e.target.id==='career-instance'){ui.careerInstance=e.target.value;$('#detail-dialog .career-panel').outerHTML=Catalogue.career(ui.detail,db,ui.careerInstance);icons();}
    if(e.target.id==='library-file'){
      const file=e.target.files[0];if(!file||!db)return;
      try{if(file.size>50000000)throw new Error('Fichier trop volumineux (50 Mo maximum).');await db.importBackup(JSON.parse(await file.text()));showDatabase();if(ui.view==='collection')render();toast('Collection et historique importés.');}catch(error){toast('Import refusé : '+error.message);}return;
    }
    if(e.target.id==='deck-file'||e.target.id==='game-file'){
      const file=e.target.files[0];if(!file)return;
      try{if(file.size>3000000)throw new Error('Fichier trop volumineux.');const value=JSON.parse(await file.text());
        if(e.target.id==='deck-file'){if(!Array.isArray(value.cards))throw new Error('Deck invalide.');if(value.edition!=='V3'||value.cards.some(id=>!/^30\d{6}$/.test(id)))throw new Error('Import V2 refusé : deck incompatible avec V3. Vos données V2 restent intactes.');const errors=E.validateDeck(value.cards);if(errors.length)throw new Error(errors.join(' '));deck=value.cards;deckName=String(value.name||'Deck importé').slice(0,50);persist();showDeck();if(ui.view==='collection')render();}
        else{const imported=E.restoreGame(KalistarLocalDB.validateGame(value));clearTimeout(aiTimer);epoch++;game=imported;ui.endShown=false;ui.attacker=ui.target=ui.reserve=null;setView('arena');}
        toast('Import terminé.');
      }catch(err){toast('Import refusé : '+err.message);}
    }
  });
  document.addEventListener('submit',e=>{
    if(e.target.id==='arena-form'){
      e.preventDefault();if(rolling)return;const id=new FormData(e.target).get('arena');
      if(!arenas.some(a=>a.id===id))return;
      try{if(game)E.setArena(game,id);save('arena',id);$('#arena-dialog').close();render();}catch(error){toast(error.message);}return;
    }
    if(e.target.id!=='new-game-form')return;
    e.preventDefault();if(rolling)return;
    try{createGame($('#game-mode').value,$('#game-seed').value.trim()||'KALISTAR',new FormData(e.target).get('arena'),$('#enemy-deck-preset').value);$('#new-game-dialog').close();setView('arena');}catch(err){toast(err.message);}
  });
  document.addEventListener('error',event=>{
    const img=event.target;
    if(img instanceof HTMLImageElement&&img.getAttribute('src')===asset('effets','guard'))img.src=asset('effets','shield_physical');
  },true);
  window.addEventListener('hashchange',()=>setView(location.hash==='#arena'?'arena':'collection'));
  document.addEventListener('fullscreenchange',()=>{const b=$('[data-action="fullscreen"]');if(b){const label=document.fullscreenElement?'Quitter le plein écran':'Plein écran';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=icon(document.fullscreenElement?'minimize':'maximize');icons();}});
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  if(ui.view==='arena'&&!game){try{createGame('ai','KALI-2026');}catch{ui.view='collection';}}
  try{db=await KalistarLocalDB.open(data);window.KALISTAR_DB=db;}catch(error){dbError=error.message;toast('Base locale indisponible : exportez vos parties pour les conserver.');}
  render();if(restoreError)toast(restoreError);window.KALISTAR_READY=true;
})();
