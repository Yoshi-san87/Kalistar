(async () => {
  'use strict';
  const data=window.KALISTAR_DATA,E=KalistarEngine.createEngine(data),cards=data.cards,Catalogue=window.KalistarCatalogue;
  let db=null,dbError='',lastStored='',reportGame=null,reportArchive=null,accountsUI=null;
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<i data-lucide="${n}"></i>`,ib=(action,n,title,extra='')=>`<button class="icon-button" data-action="${action}" title="${esc(title)}" aria-label="${esc(title)}" ${extra}>${icon(n)}</button>`;
  const asset=window.KalistarCollaborations.asset;
  const cardImage=c=>KalistarCardMedia.image(c),artImage=c=>KalistarCardMedia.image(c,'art');
  const duelImage=cardImage;
  const noCrystal={id:'NONE',label:'SANS CRISTAL',color:'93AAA5',hue:160};
  const elementInfo=c=>data.elements[c?.element]||noCrystal;
  const hasCrystal=c=>!!c?.element&&c.element!=='NONE'&&!!data.elements[c.element];
  const elements={...data.elements,NONE:data.elements.NONE||noCrystal};
  const dieLabel=(value,attack)=>value==='retry'&&attack?'Trèfle':format(value);
  const names={guard:'Garde · Bouclier',retry:'Relance',mana:'Potion',revive:'Cœur · Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Buff physique',shield_magic:'Bouclier magique',shield_physical:'Bouclier physique'};
  const traitInfo={ward:{asset:'guard',name:'Garde physique'},reraise:{asset:'revive',name:'Reraise'},luck:{asset:'retry',name:'Trèfle'},mana:{asset:'mana',name:'Potion magique'},physical:{asset:'buff_atk',name:'Puissance physique'}};
  const roles=['Tank','DPS physique','Middle','DPS magique','Support'];
  const arenas=(data.arenas?.length?data.arenas:[{id:'ruins',name:'Ruines',subtitle:'Terrain neutre',image:'assets/arena.webp',element:'NONE',elementBonus:0,homeCharacters:[],homeAttack:0,homeDefense:0}]).map(a=>({...a,image:window.KalistarSite?.url(a.image)||a.image}));
  const arenaById=id=>arenas.find(a=>a.id===id)||arenas[0];
  let statsSort='kills',statsSide='all',statsTab='lineup',statsPage=0,statsGroup='core',statsAward=0,statsSpotlight='rating';
  const format=v=>typeof v==='number'?String(v):names[v]||v;
  let storageAvailable=true,toastTimer,aiTimer,epoch=0,rolling=false,game=null,combatController=null;
  try{db=await KalistarLocalDB.open(data);window.KALISTAR_DB=db;}catch(error){dbError=error.message;}
  let accountId=KalistarOwnership.PARIS;
  try{const saved=localStorage.getItem('kalistar.v4.activeUser');if(db?.registry?.user(saved))accountId=saved;}catch{storageAvailable=false;}
  window.KALISTAR_ACTIVE_USER=accountId;
  const preferencePrefix=accountId===KalistarOwnership.PARIS?'kalistar.v4.':'kalistar.v4.'+accountId+'.';
  function load(key,fallback){try{const raw=localStorage.getItem(preferencePrefix+key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
  function save(key,value){try{localStorage.setItem(preferencePrefix+key,JSON.stringify(value));}catch{storageAvailable=false;}}
  const owned=(id)=>db?.registry?.owned(accountId,id)||[];
  const ownershipErrors=ids=>db?.registry?db.registry.deckErrors(accountId,ids):['Registre local indisponible.'];
  const deckErrors=ids=>[...E.validatePlayableDeck(ids),...ownershipErrors(ids)];
  function collectionDB(){return db?.registry?{...db,career:(id,instance)=>db.registry.career(accountId,id,instance),instances:id=>owned(id),matches:()=>db.registry.matches(accountId),ownedCount:()=>owned().length}:db;}
  function ownershipBanner(id){const items=owned(id);return `<div class="ownership-banner">${icon(items.length?'fingerprint':'lock-keyhole')}<span><b>${items.length?items.length+' exemplaire'+(items.length>1?'s':'')+' dans ta collection':'Non possedee'}</b><small>${esc(db?.registry?.user(accountId)?.email||'Registre indisponible')}</small></span><button data-action="owned-cards" data-id="${id}">${icon(items.length?'arrow-right-left':'key-round')}${items.length?'Exemplaires / transfert':'Activer'}</button></div>`;}
  const defaultDeck=data.decks.player;
  const deckPresets=[{id:'player',name:'Deck initial joueur',cards:defaultDeck},{id:'enemy',name:'Deck initial adverse',cards:data.decks.enemy},...(Array.isArray(data.decks.presets)?data.decks.presets:[])].filter((p,i,list)=>p&&typeof p.id==='string'&&typeof p.name==='string'&&list.findIndex(other=>other?.id===p.id)===i);
  const presetById=id=>deckPresets.find(p=>p.id===id);
  const savedPreset=(key,fallback)=>{const p=presetById(load(key,fallback));return p&&!E.validatePlayableDeck(p.cards).length?p.id:fallback;};
  let deckPresetId=savedPreset('deckPreset','player'),enemyPresetId=savedPreset('enemyDeckPreset','enemy');
  function validatedPreset(id){
    const preset=presetById(id);if(!preset)throw new Error('Deck prédéfini inconnu.');
    const errors=E.validatePlayableDeck(preset.cards);if(errors.length)throw new Error('Deck prédéfini invalide : '+errors.join(' '));
    return preset;
  }
  function presetOptions(selected){return deckPresets.map(p=>{const errors=E.validatePlayableDeck(p.cards);return `<option value="${esc(p.id)}" ${p.id===selected?'selected':''} ${errors.length?'disabled':''}>${esc(p.name)}${errors.length?' · indisponible':''}</option>`;}).join('');}
  const initialDeck=accountId===KalistarOwnership.PARIS?defaultDeck.slice():[];
  let deck=load('deck',initialDeck);if(!Array.isArray(deck)||deck.some(id=>!E.byId[id])||deck.length>10)deck=initialDeck;
  {const counts={};deck=deck.filter(id=>(counts[id]=(counts[id]||0)+1)<=owned(id).length);}
  let deckName=String(load('deckName','Les premiers Sentry')).slice(0,50);
  const savedFavorites=load('favorites',[]);
  let favorites=new Set((Array.isArray(savedFavorites)?savedFavorites:[]).filter(id=>E.byId[id]));
  const restored=load('game',null);let restoreError='';
  if(restored){try{game=E.restoreGame(KalistarLocalDB.validateGame(restored));db.registry.validateGame(game,accountId);}catch(error){game=null;restoreError=error.message;}}
  let boardScale=Math.max(85,Math.min(140,Number(load('boardScale',100))||100));
  const views=window.KalistarSite?.online?['arena','decks','statistics']:['arena','decks','statistics','atelier'];
  const hashView=()=>views.includes(location.hash.slice(1))?location.hash.slice(1):'collection';
  const ui={view:hashView(),attacker:null,target:null,reserve:null,replacementSlot:null,detail:null,art:false};
  let deckBuilder=null,collectionBinder=null,statisticsSheet=null;
  const overlayOpen=()=>!!document.querySelector('dialog[open]')||!!window.KalistarReservePreview?.isOpen();
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
          document.querySelectorAll('[data-career-card]').forEach(node=>{node.innerHTML=Catalogue.brief(collectionDB().career(node.dataset.careerCard));});
          if($('#detail-dialog').open&&ui.detail&&$('#detail-dialog .career-panel'))$('#detail-dialog .career-panel').outerHTML=Catalogue.career(ui.detail,ui.detailContext?.profile?db:collectionDB(),ui.careerInstance);
          if($('#database-dialog').open)showDatabase();
          if(ui.view==='collection')collectionBinder?.refresh();
          if(ui.view==='statistics')statisticsSheet?.refresh();
          icons();
        }).catch(error=>{lastStored='';dbError=error.message;if(error.name==='OwnershipError'&&game?.matchId===JSON.parse(fingerprint).matchId)suspendGame();toast('Base locale : '+error.message);});
      }
    }
  }
  function showDatabase(){
    modal('database-dialog',head('Archives personnelles')+Catalogue.database(collectionDB(),dbError));
    if(accountId!==KalistarOwnership.PARIS){$('#database-dialog .database-actions')?.remove();$('#database-dialog .database-inspector')?.remove();}
    const notice=$('#database-dialog .database-notice');if(notice)notice.textContent='Profil local : '+(db?.registry?.user(accountId)?.email||'indisponible')+'. Stockage de ce navigateur uniquement. La sauvegarde complete du registre est disponible depuis Paris, profil administrateur local.';
  }
  function openAccounts(tab='transfers',id=null){if(!accountsUI)return toast('Registre local indisponible : '+dbError);accountsUI.open(tab,id).catch(e=>toast(e.message));}
  async function ownershipChanged(){
    if(game){try{db.registry.validateGame(game,accountId);}catch{suspendGame();}}
    const counts={};deck=deck.filter(id=>(counts[id]=(counts[id]||0)+1)<=owned(id).length);
    render();
  }
  function suspendGame(){clearTimeout(aiTimer);epoch++;game=null;lastStored='';save('game',null);ui.view='collection';history.replaceState(null,'','#collection');render();}
  function checkGame(value=game){try{db.registry.validateGame(value,accountId);}catch(error){suspendGame();throw error;}}
  function modal(id,html){const d=$('#'+id);d.innerHTML=html;if(!d.open)d.showModal();icons();}
  function head(title){return `<div class="dialog-head"><h2>${esc(title)}</h2>${ib('close','x','Fermer')}</div>`;}
  async function setView(view){
    if(view==='atelier'&&window.KalistarSite?.online)return;
    if(rolling)return toast('Le duel se termine…');
    clearTimeout(aiTimer);
    if(ui.view!==view)epoch++;
    if(view==='arena'&&!game){try{await createGame('ai','KALI-'+Math.floor(Math.random()*999999));}catch(e){toast(e.message);showDeck();return;}}
    ui.view=view;history.replaceState(null,'','#'+view);render();
  }
  function render(){
    combatController?.abort();
    window.KalistarCombat?.cancelKillCelebration();
    window.KalistarFormationDrag?.cancel();
    window.KalistarFocus?.capture();
    const scroll=$('.battlefield-viewport')?.scrollLeft||0;
    document.body.classList.toggle('arena-view',ui.view==='arena');
    document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===ui.view;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
    deckBuilder?.destroy();collectionBinder?.destroy();statisticsSheet?.destroy();
    document.body.classList.toggle('statistics-view',ui.view==='statistics');
    document.body.classList.toggle('decks-view',ui.view==='decks');
    document.body.classList.toggle('collection-view',ui.view==='collection');
    document.body.classList.toggle('atelier-view',ui.view==='atelier');
    $('#app').hidden=ui.view==='atelier';$('#atelier-panel').hidden=ui.view!=='atelier';
    if(ui.view==='atelier'){
      window.KalistarDice?.cancel();
      if(!$('#atelier-frame')){
        const frame=document.createElement('iframe');frame.id='atelier-frame';frame.title='Atelier Kalistar V4';frame.src='/?embedded=1';
        $('#atelier-panel').append(frame);
      }
      $('#account-name').textContent=accountId===KalistarOwnership.PARIS?'Paris':'Tokyo';
      icons();persist();return;
    }
    $('#app').innerHTML=ui.view==='collection'?collection():ui.view==='decks'?decksPage():ui.view==='statistics'?'<div id="statistics-root"></div>':arena();
    if(ui.view==='statistics'){
      statisticsSheet??=KalistarStatistics.create({data,getDB:collectionDB,onDetail:id=>showDetail(id)});
      statisticsSheet.mount($('#statistics-root'));
    }
    if(ui.view==='decks')builder().mount($('#deck-builder-root'));
    if(ui.view==='collection')collectionView().mount($('#collection-binder-root'));
    syncConsole();icons();
    $('#account-name').textContent=accountId===KalistarOwnership.PARIS?'Paris':'Tokyo';
    $('[data-action="account"]').title='Profil local : '+(db?.registry?.user(accountId)?.email||'indisponible');
    if($('.battlefield-viewport'))$('.battlefield-viewport').scrollLeft=scroll;
    window.KalistarFocus?.mount(document.querySelectorAll('.formation'));
    window.KalistarDice?.mount(document.querySelectorAll('.dice-stage'));
    if($('#journal-dialog').open){$('#journal-dialog').innerHTML=head('Journal du duel')+journal();icons();}
    if($('#detail-dialog').open&&ui.detailContext&&$('#detail-dialog .live-bonuses')){
      $('#detail-dialog .live-bonuses').outerHTML=bonusDetails(ui.detailContext)||'<div class="live-bonuses"><p class="muted">Cette carte n’est plus sur le plateau.</p></div>';
    }
    window.KalistarReservePreview?.mount({getGame:()=>ui.view==='arena'?game:null,data,engine:E,canPlace:canDeployReserve,onSelect:(side,uid)=>{if(['setup','replace'].includes(game?.phase)){ui.reserve=uid;render();}},onPlace:(side,uid,slot)=>act(()=>{placeReserve(side,uid,slot);ui.replacementSlot=null;}),onDetail:showDetail});
    decorateArena();persist();scheduleAI();
    if(ui.view==='arena'&&game?.phase==='over'&&!ui.endShown){ui.endShown=true;showMatchStats(game);}
  }
  function collectionView(){
    if(!collectionBinder)collectionBinder=KalistarCollection.create({
      data,getOwned:owned,getCatalogueChanges:()=>db?.catalogueChanges()||[],getFavorites:()=>favorites,getCareer:(id,instance)=>collectionDB()?.career(id,instance),artImage,
      profile:accountId===KalistarOwnership.PARIS?'Paris':'Tokyo',
      getDecks:()=>builder().listDecks(),
      onOpenDeck:async(id,cardId)=>{try{builder().openDeck(id,cardId);await setView('decks');}catch(error){toast(error.message);}},
      onFavorite:id=>{favorites.has(id)?favorites.delete(id):favorites.add(id);save('favorites',[...favorites]);},
      onRegistry:id=>openAccounts(id&&owned(id).length?'collection':'activation',id?owned(id)[0]?.id:null),
      onArchives:showDatabase,onHistory:id=>{const archived=db?.match(id);if(archived)showMatchStats(archived.state,archived);}
    });
    return collectionBinder;
  }
  function collection(){return '<div id="collection-binder-root"></div>';}
  function changeDeck(id,delta){const c=E.byId[id];if(delta>0){if(!canAdd(c))return toast('Limite du deck atteinte.');deck.push(id);}else{const i=deck.indexOf(id);if(i>=0)deck.splice(i,1);}persist();if(['collection','decks'].includes(ui.view))render();}
  function loadPreset(id){
    const preset=validatedPreset(id),errors=ownershipErrors(preset.cards);if(errors.length)throw new Error(errors.join(' '));deck=preset.cards.slice();deckName=preset.name.slice(0,50);deckPresetId=preset.id;
    persist();showDeck();if(ui.view==='collection')render();
  }
function showDeck(){setView('decks');}
  function builder(){
    if(!deckBuilder)deckBuilder=KalistarDeckBuilder.create({data,engine:E,registry:db?.registry,userId:accountId,getDraft:()=>({cards:deck.slice(),name:deckName}),onDraft:next=>{deck=next.cards.filter(id=>id!==null);deckName=next.name;persist();},onPlay:newGameDialog,onDetail:showDetail,toast});
    return deckBuilder;
  }
  function decksPage(){
    builder().refresh();
    return `<div class="decks-shell"><div class="decks-preset-tools"><label>Deck de démonstration<select id="deck-preset">${presetOptions(deckPresetId)}</select></label><button data-action="load-preset">${icon('folder-open')}Charger</button>${ib('export-deck','download','Exporter le deck courant')}${ib('import-deck','upload','Importer un deck courant')}<input hidden type="file" id="deck-file" accept="application/json,.json"></div><div id="deck-builder-root">${builder().render()}</div></div>`;
  }
  function bonusDetails(context){
    const p=game?.players[context?.side],u=p?.board.find(u=>u?.uid===context?.uid);
    if(!u||u.cardId!==ui.detail)return '';
    const c=E.card(u),arena=E.arenaBonuses(game,u),section=(key,title,text)=>`<section class="bonus-explanation ${context.bonus===key?'highlighted':''}" data-explains="${key}"><h3>${title}</h3><p>${text}</p></section>`;
    const group=(field,label,stat)=>{
      const matches=p.board.flatMap((other,index)=>other&&E.card(other)[field]===c[field]?[`${esc(E.card(other).name)} · P${index+1}`]:[]),value=E.synergy(p,u,field);
      return section(field,`${label} · ${esc(c[field])} <b>${stat} +${value}</b>`,`${matches.length} carte${matches.length>1?'s':''} sur votre plateau, cette carte comprise. ${matches.join(', ')}.<br>Palier actuel : +${value} ${stat}. La réserve et les cartes éliminées ne comptent pas.`);
    };
    return `<div class="live-bonuses"><h2>Bonus sur le plateau · Joueur ${context.side+1}</h2><p class="single-trait-note">Les catégories de buffs se cumulent, avec une seule charge par catégorie. Résolution automatique : bouclier, puis trèfle, puis Reraise.</p>${group('faction','Faction','ATK')}${group('race','Race','DEF')}${section('arena',`Arène · ${esc(arenaById(game.arenaId).name)} <b>ATK +${arena.attack} / DEF +${arena.defense}</b>`,`Cristal : +${arena.element} ATK. Affinité du personnage : +${arena.homeAttack} ATK et +${arena.homeDefense} DEF. Bonus identiques pour les deux camps, sur les scores numériques uniquement.`)}${section('ward',`Garde physique <b>${u.ward?'+60 DEF':'Inactive'}</b>`,u.ward?'La prochaine défense numérique contre une ATK physique reçoit +60 DEF. Consommation unique, bonus conservé pour les relances du même duel. Magie, esquive et Mort ne le consomment pas ; Mort le contourne.':'Aucun bouclier physique en attente.')}${section('mana',`Potion <b>${u.mana?'+'+u.mana:'0'}</b>`,u.mana?'La prochaine attaque numérique magique de cette carte reçoit +60 ATK. Le jeton est ensuite consommé. Une attaque physique ne le consomme pas.':'Aucun jeton de potion actif.')}${section('physical',`Puissance physique <b>${u.physical?'+'+u.physical:'0'}</b>`,u.physical?'La prochaine attaque numérique physique de cette carte reçoit +60 ATK. Le jeton est ensuite consommé. Une attaque magique ne le consomme pas.':'Aucun bonus physique en attente.')}${section('luck',`Trèfle · Seconde chance <b>${u.luck?'Actif':'Inactif'}</b>`,u.luck?'Si le score DEF final est inférieur à l’ATK finale, ce trèfle est consommé et le dé DEF est relancé automatiquement. Tous les bonus sont recalculés sur le nouveau jet. Si cette seconde chance échoue, le Reraise sauve la carte s’il est actif ; sinon elle est éliminée. Le bouclier physique s’applique avant le trèfle et reste compté pendant la relance. Une égalité le conserve. Mort ignore les scores et ne déclenche pas ce jeton.':'Aucun trèfle actif. Un trèfle obtenu en ATK peut être attribué à cette carte par une carte alliée, ou par elle-même.')}${section('reraise',`Cœur · Reraise <b>${u.reraise?'Actif':'Inactif'}</b>`,u.reraise?'Une vie supplémentaire. À la prochaine élimination, même par Mort, ce cœur est consommé et la carte reprend vie à la même position. Un seul cœur actif à la fois.':'Aucune vie supplémentaire active. Un cœur obtenu en ATK peut être attribué à toute carte de votre plateau, elle-même comprise.')}</div>`;
  }
  function showDetail(id,art=false,context=null){
    ui.detail=id;ui.art=art;ui.detailContext=context;ui.careerInstance=context?.instanceId||game?.players[context?.side]?.board.find(u=>u?.uid===context?.uid)?.instanceId||'all';
    const current=E.byId[id],profile=context?.profile;
    if(profile)KalistarEngine.createEngine({...data,cards:[profile]});
    const c=profile?{...profile,id:current.id,slug:current.slug,pngUrl:current.pngUrl}:current,el=elementInfo(c);
    const v=(x,attack=false)=>typeof x==='number'?x:`<img src="${asset('effets',x)}" alt="${dieLabel(x,attack)}" title="${dieLabel(x,attack)}">`;
    $('#detail-dialog').classList.add('card-detail');
    modal('detail-dialog',head(c.name)+`<div class="dialog-body detail-body"><div class="detail-visual" style="--element-color:#${el.color}"><img src="${art?artImage(c):duelImage(c)}" alt="${art?'Illustration':'Carte'} de ${esc(c.name)}"></div><div class="detail-info"><div><span class="eyebrow">${esc(c.element)} · #${c.id}</span><h2>${esc(c.title)}</h2>${profile?'<p class="muted">Profil du match archivé · visuel actuel</p>':''}</div>${profile?'':Catalogue.versionStrip(id)}${bonusDetails(context)}<div class="identity-strip"><img src="${asset('factions',c.faction)}" alt="Drapeau ${esc(c.faction)}"><span><b>${esc(c.faction)}</b><br>${esc(c.job)}</span><img class="race-icon" src="${asset('races',c.race)}" alt=""><span>${esc(c.race)}<br>${c.positions.map(p=>'P'+p).join(' / ')}</span></div><div class="muted">${esc(c.weapon)}</div><table class="stats-table"><thead><tr><th>Dé</th>${[6,5,4,3,2,1].map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody><tr><th>ATK</th>${c.atk.map((x,i)=>`<td class="${c.magic.includes(6-i)?'magic':''}" title="${c.magic.includes(6-i)?'Magique':'Physique'}">${v(x,true)}</td>`).join('')}</tr><tr><th>DEF</th>${c.defense.map((x,i)=>`<td class="${hasCrystal(c)&&c.barriers.includes(6-i)?'barrier':''}" title="${hasCrystal(c)&&c.barriers.includes(6-i)?'Barrière : -30 contre magie':'Défense sans barrière'}">${v(x)}</td>`).join('')}</tr></tbody></table><div class="affinities">${!hasCrystal(c)?'Sans cristal · aucun bonus élémentaire ni barrière':c.element==='RAINBOW'?'+40 contre les cristaux classiques · +30 contre sans cristal':`+${esc(c.advantage)} ${esc(data.elements[el.strong_against]?.label||'')}<span>-${esc(c.disadvantage)} ${esc(data.elements[el.weak_against]?.label||'')}</span> · +20 contre sans cristal`}</div><p class="story">${esc(c.text)}</p>${Catalogue.career(id,db,ui.careerInstance)}<div class="detail-actions"><button data-action="toggle-art">${icon(art?'credit-card':'image')}${art?'Carte':'Illustration'}</button><a href="${esc(globalThis.KalistarSite?.url(c.pngUrl)||c.pngUrl)}" download>${icon('download')} PNG d’impression${profile?' actuel':''}</a>${ib('favorite','star','Favori',`data-id="${id}" aria-pressed="${favorites.has(id)}"`)}</div></div></div>`);
    if(!profile){$('#detail-dialog .career-panel').outerHTML=Catalogue.career(id,collectionDB(),ui.careerInstance);$('#detail-dialog .detail-info>div').insertAdjacentHTML('afterend',ownershipBanner(id));icons();}
    if(context?.bonus)requestAnimationFrame(()=>$('#detail-dialog .highlighted')?.scrollIntoView({block:'nearest'}));
  }
  function showRules(){
    modal('rules-dialog',head('Règles · V4')+`<div class="dialog-body rules-body"><h3>Formation et victoire</h3><p>10 cartes, 5 positions : Tank, DPS physique, Middle, DPS magique et Support. Chaque deck doit couvrir au moins deux fois chaque position P1 à P5. Une carte polyvalente compte dans chacun de ses postes. Une seule carte par personnage, toutes versions confondues, et une seule Rainbow. Une carte vivante reste à sa position après le début du match. ATK strictement supérieure à DEF élimine la cible ; une égalité la conserve. Le premier à dix éliminations définitives gagne ; un Reraise sauve la carte et ne compte pas comme kill. Limite de démo : match nul après 200 échanges.</p><div class="formula">ATK = jet + arme + cristal + faction + jeton + arène − barrière<br>DEF = jet + race + arène + ward<br>Totaux négatifs ramenés à zéro. Faces spéciales résolues séparément.</div><h3>Arènes</h3><p>Lieu verrouillé au début du match, identique pour les deux camps. Cristal correspondant : +15 ATK. Affinité de personnage : +10 ATK et +10 DEF, toutes ses versions comprises. Maximum +25 ATK et +10 DEF, uniquement sur les scores numériques.</p><h3>Cristaux et barrières</h3><p>Classique contre sans cristal : +20 ATK. Rainbow contre sans cristal : +30. Sans cristal contre un cristal : 0. Sans cristal n’a ni halo ni barrière élémentaire. Rainbow contre classique : +40 ; classique contre Rainbow : −40.</p><p>Air &gt; Eau &gt; Feu &gt; Glace &gt; Plante &gt; Terre &gt; Roche &gt; Électricité &gt; Air. Sang &gt; Ténèbres &gt; Lumière &gt; Sang. Les avantages imprimés et la matrice d’armes s’appliquent une seule fois à l’ATK. Une barrière retire 30 ATK uniquement contre une attaque magique.</p><h3>Buffs complémentaires</h3><p>Garde, trèfle, Reraise, potion magique et puissance physique peuvent coexister. Une seule charge par catégorie : attribuer à nouveau le même buff ne le double pas. Résolution automatique : bouclier dans le score DEF, trèfle si ce score ne suffit pas, puis Reraise si la seconde chance échoue. Faction, race et arène restent cumulables.</p><table><tr><th>Garde / ward 60</th><td>La face bouclier ATK permet de choisir un allié vivant du plateau, auteur compris. Il reçoit +60 DEF sur sa prochaine défense numérique contre une ATK physique. Le bonus est consommé une seule fois et conservé dans le même duel en cas de relance. Magie, esquive et Mort ne le consomment pas. Mort le contourne.</td></tr><tr><th>Trèfle</th><td>En ATK : choix d’un allié, auteur compris. Sa prochaine défense insuffisante déclenche une relance automatique. Égalité et Mort ne le consomment pas. En DEF : relance immédiate.</td></tr><tr><th>Potion / puissance</th><td>+60 sur la prochaine attaque numérique du type correspondant : magique pour la potion, physique pour la puissance. La potion magique et la puissance physique sont toutes deux attribuables à un allié vivant du plateau, auteur compris.</td></tr><tr><th>Reraise</th><td>Face réservée aux soigneurs P5. Choix d’un allié vivant, auteur compris. À sa prochaine élimination, même par Mort, le cœur est consommé et la carte reste à sa place.</td></tr><tr><th>Esquive / Mort</th><td>Esquive annule l’attaque, y compris Mort. Mort ignore les scores, la barrière et ward ; Reraise peut sauver la cible.</td></tr></table><h3>Synergies</h3><p>Pour 1 à 5 cartes de même faction ou race sur le plateau : +0, +10, +20, +30, +40. Faction en ATK, race en DEF. Réserve et cartes éliminées exclues.</p><h3>Archives V4</h3><p>Les parties et statistiques V4 sont séparées de V2. Une sauvegarde V2 est refusée sans modifier les données V2.</p></div>`);
    $('#rules-dialog .formula').insertAdjacentHTML('beforebegin','<h3>Éclats de Kalistel</h3><p>Deux éclats par joueur dans les nouvelles rencontres, partagés par toute l’équipe, même sans cristal. Après le premier jet ATK et avant la défense, gardez le jet ou utilisez le diamant. Une seule relance par attaque, avec les mêmes participants ; le nouveau résultat est obligatoire, même moins favorable. Les effets et jetons ne sont appliqués qu’au résultat conservé. Aucun objet de collection n’est consommé. Les sauvegardes antérieures conservent leurs règles sans éclats.</p>');
  }
  async function createGame(mode,seed,arenaId=load('arena',arenas[0].id),opponentId=enemyPresetId){
    if(!['grantGuard','aiGuardChoice','arenaBonuses','setArena'].every(key=>typeof E[key]==='function')||cards.some(c=>!/^[34]\d{7}$/.test(c.id)||!c.characterId))throw new Error('Moteur ou profils V4 en attente. Aucune partie V2 ne sera créée dans V4.');
    const errors=deckErrors(deck);if(errors.length)throw new Error(errors.join(' '));
    const opponent=validatedPreset(opponentId),next=E.newGame(deck.slice(),opponent.cards.slice(),{mode,seed,arenaId:arenaById(arenaId).id,deckCoverage:2});
    E.setArena(next,arenaById(arenaId).id);KalistarLocalDB.validateGame(next);E.autoDeploy(next,0);E.autoDeploy(next,1);E.assertState(next);
    const bound=db.registry.bindGame(accountId,next);
    await db.idle();
    await db.saveGame(bound);
    if(game?.collection&&game.phase!=='over')await db.registry.releaseGame(accountId,game.matchId);
    clearTimeout(aiTimer);epoch++;game=bound;enemyPresetId=opponent.id;ui.attacker=ui.target=ui.reserve=null;ui.endShown=false;statsSort='kills';statsSide='all';save('arena',game.arenaId);persist();
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
  function showMatchStats(state=reportGame||game,archive=state===reportGame?reportArchive:null){
    const focused=$('#match-dialog').contains(document.activeElement)?document.activeElement:null;
    const focusAction=focused?.dataset.action,focusId=focused?.dataset.id,focusLabel=focused?.getAttribute('aria-label');
    if(state!==reportGame){statsTab=state?.phase==='over'?'awards':'lineup';statsPage=0;statsGroup='core';statsAward=0;statsSpotlight='rating';statsSide='all';}
    reportGame=state;reportArchive=archive;
    if(state)modal('match-dialog',head(state.phase==='over'?'Palmarès de la rencontre':'Statistiques du match')+KalistarMatchReport.render(state,{sort:statsSort,side:statsSide,tab:statsTab,page:statsPage,group:statsGroup,award:statsAward,spotlight:statsSpotlight,profiles:archive?.profiles,arenas:archive?.arenas}));
    if(focusAction){
      const controls=[...$('#match-dialog').querySelectorAll('[data-action]')].filter(b=>b.dataset.action===focusAction&&!b.disabled&&b.getClientRects().length);
      const paging=focusAction==='stats-page'||focusAction==='stats-award';
      const control=controls.find(b=>paging?b.getAttribute('aria-label')===focusLabel:b.dataset.id===focusId)||(paging?controls[0]:null);
      (control||$('#match-dialog [role=tab][aria-selected=true]'))?.focus({preventScroll:true});
    }
  }
  function newGameDialog(){$('#new-game-dialog').classList.add('arena-picker-dialog');modal('new-game-dialog',head('Nouvelle partie')+`<div class="dialog-body"><form class="dialog-form" id="new-game-form">${arenaChoices(game?.arenaId||load('arena','ruins'))}<label>Adversaire<select id="game-mode"><option value="ai">Adversaire automatique</option><option value="local">Deux joueurs sur cet écran</option></select></label><label><span id="enemy-deck-label">Deck IA</span><select id="enemy-deck-preset">${presetOptions(enemyPresetId)}</select></label><label>Graine des dés<input id="game-seed" maxlength="60" value="KALI-${Math.floor(Math.random()*999999)}" required></label><p class="muted">Deck : ${esc(deckName)} · ${deck.length}/10</p>${game&&game.phase!=='over'?'<p class="validation">La nouvelle partie remplacera la sauvegarde de la partie en cours.</p>':''}<div class="actions"><button type="button" data-action="close">Annuler</button><button class="primary" type="submit" ${deckErrors(deck).length?'disabled':''}>Préparer la formation</button></div></form></div>`);}
  function buffs(p,u,side){
    const f=E.synergy(p,u,'faction'),r=E.synergy(p,u,'race'),arena=E.arenaBonuses(game,u);
    const chip=(key,text,title)=>`<button class="buff-chip ${key}" data-action="bonus" data-side="${side}" data-uid="${u.uid}" data-bonus="${key}" title="${title}" aria-label="${title}">${text}</button>`;
    return `${f?chip('faction','ATK +'+f,'Bonus de faction : ATK +'+f):''}${r?chip('race','DEF +'+r,'Bonus de race : DEF +'+r):''}${arena.attack||arena.defense?chip('arena','A +'+arena.attack+'/'+arena.defense,'Arène : ATK +'+arena.attack+' / DEF +'+arena.defense):''}`;
  }
  function traitBadge(side,u){
    const keys=E.traits(u);if(!keys.length)return '';
    return '<div class="trait-stack" aria-label="Buffs actifs">'+keys.map(key=>{
      const info=traitInfo[key],title=info.name+(u[key]>1?' : +'+u[key]+(key==='ward'?' DEF':' ATK'):' actif');
      return `<button class="life-badge trait-badge ${key}-badge ${key==='luck'?'clover-badge':''}" data-action="bonus" data-side="${side}" data-uid="${u.uid}" data-bonus="${key}" aria-label="${title}" title="${title}"><img src="${asset('effets',info.asset)}" alt="">${u[key]>1?`<b>${u[key]}</b>`:''}</button>`;
    }).join('')+'</div>';
  }
  function reserveTrait(u){
    const keys=E.traits(u);if(!keys.length)return '';
    return '<span class="reserve-traits">'+keys.map(key=>`<span class="reserve-trait" title="${traitInfo[key].name}"><img src="${asset('effets',traitInfo[key].asset)}" alt="${traitInfo[key].name}">${u[key]>1?`<b>${u[key]}</b>`:''}</span>`).join('')+'</span>';
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
    const stats=E.matchStats(game),performance=new Map(stats.units.map(u=>[u.uid,u]));
    const participants=consoleParticipants(game),chosen=side===participants.side?participants.a:participants.b;
    const mobileStats=chosen&&p.board.includes(chosen)&&['choose','attack','kalistel','defense','result'].includes(game.phase)?`<div class="mobile-duel-stats" role="group" aria-label="${esc(E.card(chosen).name)} · statistiques du match">${KalistarMatchMetrics.strip(performance.get(chosen.uid),stats)}</div>`:'';
    return `${mobileStats}<div class="formation cross-formation ${side?'right-cross':'left-cross'}" data-player="${side}">${p.board.map((u,slot)=>{
      const c=u?E.card(u):null,duel=['attack','kalistel','defense','result'].includes(game.phase)?game.duel:null;
      const isA=!!u&&(duel?duel.side===side&&duel.attackerSlot===slot:game.phase==='choose'&&game.turn===side&&ui.attacker===slot),isT=!!u&&(duel?duel.side!==side&&duel.targetSlot===slot:game.phase==='choose'&&game.turn!==side&&ui.target===slot);
      const beneficiary=u&&['clover','potion','physical','heart','guard'].includes(game.phase)&&game.turn===side&&!(game.mode==='ai'&&side===1);
      const grantKey={guard:'ward',heart:'reraise',potion:'mana',physical:'physical',clover:'luck'}[game.phase],grantName=grantKey?traitInfo[grantKey].name:'';
      const grantTitle=beneficiary?`Attribuer ${grantName} à ${c.name}${u[grantKey]?' · déjà actif, sans charge supplémentaire':''}`:'';
      const saved=u&&game.duel?.reraised===u.uid?'reraise-saved':'';
      return `<div class="slot ${side?'enemy':''} ${isA?'selected':''} ${isT?'target':''} ${isA||isT?'challenger':''} ${saved} ${beneficiary?'trait-eligible '+game.phase+'-eligible':''} ${selectedReserve&&canDeployReserve(side,selectedReserve.uid,slot)?'compatible':''}" data-position="${slot+1}" data-key="${side}-${slot}" data-unit="${u?.uid||''}" data-element="${c?.element||''}" style="--element-color:#${elementInfo(c).color};--trait-color:${game.phase==='guard'?'#a6d8eb':game.phase==='heart'?'#ff96b7':game.phase==='potion'?'#8adbf5':game.phase==='physical'?'#f4b08a':'#9cf3b7'}"><div class="position-label"><b>P${slot+1}</b><span>${roles[slot]}</span></div><button class="slot-card ${u?'':'empty'}" data-action="slot" data-side="${side}" data-slot="${slot}" aria-pressed="${isA||isT}" ${beneficiary?`title="${esc(grantTitle)}"`:''} aria-label="${beneficiary?esc(grantTitle):`${side?'Adversaire':'Joueur'} P${slot+1}${c?' '+c.name:', emplacement libre'}`}">${c?`<img src="${duelImage(c)}" alt="${c.name}" width="797" height="1388" draggable="false">`:icon('plus')+'<span>P'+(slot+1)+'</span>'}</button>${(isA||isT)&&hasCrystal(c)?'<canvas class="element-aura" aria-hidden="true"></canvas>':''}${u?traitBadge(side,u):''}${c?`<button class="inspect" data-action="detail" data-id="${c.id}" data-side="${side}" data-uid="${u.uid}" aria-label="Inspecter ${c.name}" title="Inspecter ${c.name}">${icon('scan-eye')}</button>`:''}<div class="slot-buffs">${u?buffs(p,u,side):''}</div>${isA||isT?KalistarMatchMetrics.strip(performance.get(u.uid),stats):''}</div>`;
    }).join('')}</div>`;
  }
  function sideHeading(side){const p=game.players[side];return `<div class="side-heading"><div class="player-name ${side?'enemy':'ally'}">${side?(game.mode==='ai'?'Le Veilleur · IA':'Joueur 2'):'Joueur 1'}${game.turn===side&&game.phase!=='setup'?' · ATK':''}</div><div class="resources"><span>${p.board.filter(Boolean).length}/5</span><button data-action="reserves" data-side="${side}">${icon('layers-3')}${p.reserve.length}</button><button data-action="grave" data-side="${side}">${icon('skull')}${p.dead.length}</button></div></div>`;}
  function dice(side){
    const d=['attack','kalistel','defense','clover','potion','physical','heart','guard','result'].includes(game.phase)?game.duel:null,isAttack=d?d.side===side:game.turn===side,rolls=d?(isAttack?d.attackRolls:d.defenseRolls):[],die=rolls.at(-1);
    const selected=game.phase==='choose'?game.players[side].board[isAttack?ui.attacker:ui.target]:null;
    const participants=consoleParticipants(game),unit=side===participants.side?participants.a:participants.b,c=unit?E.card(unit):null;
    const locked=!!d,element=c?.element||'NONE',crystal=element==='NONE'?'':asset('cristaux',element);
    const weapon=c&&element==='NONE'?asset('armes',String(c.weapon_index).padStart(2,'0')):'';
    const stageData=`data-selected="${!!c}" data-locked="${locked}" data-element="${element}" data-crystal="${crystal}" data-weapon="${weapon}" data-color="#${data.elements[element]?.color||'B8C7BC'}" data-slot="${d?(isAttack?d.attackerSlot:d.targetSlot)+1:0}" data-role="${isAttack?'ATK':'DEF'}" data-result="${die||''}"`;
    const name=d?(isAttack?d.attackerName:d.targetName):selected?E.card(selected).name:'En attente';
    const active=(game.phase==='attack'&&game.turn===side)||(game.phase==='defense'&&game.turn!==side);
    const charges=E.kalistelRemaining(game,side),available=game.phase==='kalistel'&&game.turn===side&&!(game.mode==='ai'&&side===1)&&!rolling;
    const hint=`Éclat de Kalistel · ${charges}/2 · Relancer l’attaque, nouveau résultat obligatoire`;
    const shard=game.kalistel?`<button class="kalistel-control ${charges?'':'depleted'}" data-action="kalistel" data-side="${side}" ${available?'':'disabled'} title="${hint}" aria-label="${hint}"><span class="kalistel-art" aria-hidden="true"><img src="${asset('cristaux','RAINBOW')}" alt="" draggable="false"></span><span class="kalistel-charges" aria-hidden="true">${[0,1].map(i=>`<i class="${i<charges?'lit':''}"></i>`).join('')}</span></button>`:'';
    return `<div class="duel-die player-${side} ${active?'active':''}" data-player="${side}"><div class="dice-owner">Joueur ${side+1}<span>${isAttack?'ATK':'DEF'}</span></div><b>${esc(name)}</b><div class="dice-well"><div class="dice-stage" ${stageData} data-player="${side}" data-value="${die||6}" role="img" aria-label="${weapon?esc(c.weapon):'Kalistel'} du joueur ${side+1}${die?' : '+die:' en attente'}"><div class="die-fallback">${icon('dice-'+(die||6))}</div></div>${shard}</div><small>${die?'D'+die+' · '+esc(dieLabel(isAttack?d.attackValue:d.defenseValue,isAttack)):'En attente'}</small></div>`;
  }
  function consoleParticipants(s){
    const d=['attack','kalistel','defense','clover','potion','physical','heart','guard','result'].includes(s.phase)?s.duel:null,side=d?.side??s.turn;
    const unit=(player,uid)=>[...player.board,...player.reserve,...player.dead].find(u=>u?.uid===uid);
    return {side,a:d?unit(s.players[side],d.attacker):s.phase==='choose'?s.players[side].board[ui.attacker]:null,b:d?unit(s.players[1-side],d.target):s.phase==='choose'?s.players[1-side].board[ui.target]:null};
  }
  function syncConsole(s=game){
    const node=$('.duel-console');if(!node||!s)return;
    const {a,b}=consoleParticipants(s),ac=a?E.card(a):null,bc=b?E.card(b):null;
    const color=c=>data.elements[c?.element]?'#'+data.elements[c.element].color:null;
    node.style.setProperty('--ritual-color',color(ac)||'#d3b7ab');
    node.style.setProperty('--ward-color',color(bc)||'#9acdd5');
    node.style.setProperty('--action-color',s.phase==='guard'?'#a6d8eb':s.phase==='heart'?'#ff96b7':s.phase==='potion'?'#8adbf5':s.phase==='physical'?'#f4b08a':s.phase==='clover'||s.duel?.autoDefense?'#9bebac':s.phase==='defense'?color(bc)||'#9acdd5':color(ac)||'#d3b7ab');
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
    const d=['attack','kalistel','defense','clover','potion','physical','heart','guard','result'].includes(s.phase)?s.duel:null;
    if(!d?.attackRolls.length)return previewRecap(s);
    const numeric=typeof d.attackValue==='number',final=d.formula;
    if(s.phase==='result'&&numeric&&!final)return `<div class="duel-recap special-recap">${icon(d.defenseValue==='dodge'?'move-up-right':'shield-check')}<span>${esc(format(d.defenseValue))}</span><span>Attaque annulée · aucun score appliqué</span></div>`;
    if(!numeric){
      const support=['retry','mana','buff_atk','revive','guard'].includes(d.attackValue),label=s.phase==='guard'?'Garde à attribuer':d.attackValue==='death'?'Mort · ignore les scores':s.phase==='heart'?'Reraise à attribuer':s.phase==='clover'?'Trèfle à attribuer':s.phase==='potion'?'Potion magique à attribuer':s.phase==='physical'?'Puissance physique à attribuer':dieLabel(d.attackValue,true);
      return `<div class="duel-recap special-recap">${support?`<img class="recap-clover" src="${asset('effets',d.attackValue)}" alt="">`:''}<span>${esc(label)}</span>${support?`<span>${d.attackValue==='guard'?'+60 DEF contre la prochaine ATK physique':d.attackValue==='revive'?'Une vie supplémentaire':d.attackValue==='mana'?'+60 à la prochaine attaque magique':d.attackValue==='buff_atk'?'+60 à la prochaine attaque physique':'Seconde chance en défense'}</span><span class="single-trait-note">Buffs différents cumulables.<br>Une seule charge par catégorie.</span>`:''}${d.defenseRolls.length?`<span>DEF · ${esc(format(d.defenseValue))}</span>`:''}</div>`;
    }
    const a=s.players[d.side].board[d.attackerSlot],b=s.players[1-d.side].board[d.targetSlot];
    if(!final&&(!a||!b))return '';
    // Resolved duels retain their original synergies, including an eliminated target.
    const f=final||{baseAttack:d.attackValue,weapon:data.weapons[E.card(a).weapon]?.[E.card(b).weapon]||0,element:E.elementModifier(E.card(a),E.card(b)),faction:E.synergy(s.players[d.side],a,'faction'),buff:s.phase==='kalistel'?a[d.magic?'mana':'physical']||0:d.buff||0,race:E.synergy(s.players[1-d.side],b,'race'),arenaAttack:E.arenaBonuses(s,a).attack,arenaDefense:E.arenaBonuses(s,b).defense,ward:d.magic?0:d.ward||b.ward||0};
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
    }else if(s.phase==='kalistel'){
      const auto=s.mode==='ai'&&s.turn===1;
      label=`ÉCLAT DE KALISTEL · JOUEUR ${s.turn+1}`;title=auto?'Le Veilleur décide':'Le destin est entre vos mains';
      actions=duelAction('accept-attack','check',auto?'Décision adverse…':'Garder le jet',{disabled:auto||rolling});
    }else if(['clover','potion','physical','heart','guard'].includes(s.phase)){
      const potion=s.phase==='potion',physical=s.phase==='physical',heart=s.phase==='heart',guard=s.phase==='guard';label=`${guard?'GARDE PHYSIQUE':heart?'RERAISE':potion?'POTION MAGIQUE':physical?'PUISSANCE PHYSIQUE':'TRÈFLE'} · JOUEUR ${s.turn+1}`;title=s.mode==='ai'&&s.turn===1?'Le Veilleur choisit un allié':'Choisir une carte alliée';
      actions=`<span class="clover-choice-status">${icon(guard?'shield-check':heart?'heart-pulse':potion?'flask-conical':physical?'swords':'clover')}${guard?'Attribution de la garde':heart?'Attribution du Reraise':potion?'Attribution de la potion':physical?'Attribution de la puissance':'Attribution du trèfle'}</span>`;
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
    return `<div class="duel-status" tabindex="0" role="region" aria-label="État du duel"><div class="phase-label">${hasCrystal({element})?`<img class="console-crystal" src="${asset('cristaux',element)}" alt="Cristal ${element}">`:icon(element==='NONE'?'circle-slash':'swords')}<span>${label}</span></div><h2 class="${s.phase==='result'?'outcome':''}">${esc(title)}</h2></div>${duelRecap(s)}<div class="duel-actions">${actions}</div>`;
  }
  function reserveZone(side){
    const p=game.players[side],hidden=game.mode==='ai'&&side===1,draggable=!hidden&&(game.phase==='setup'||game.phase==='replace'&&game.replacing===side);
    const slot=game.phase==='replace'&&game.replacing===side?replacementSlot():null;
    return `<div class="reserve-zone"><div class="reserve-heading"><h3>${slot===null?'Réserve':'Renfort P'+(slot+1)} <span class="muted">${p.reserve.length}</span></h3></div><div class="reserve-cards">${p.reserve.map(u=>{const c=E.card(u),eligible=slot!==null&&canDeployReserve(side,u.uid,slot);return hidden?'<div class="reserve-card face-down"><img src="assets/back.webp" alt="Carte adverse face cachée" draggable="false"></div>':`<button class="reserve-card ${ui.reserve===u.uid?'selected':''} ${slot!==null?eligible?'reinforcement-eligible':'reinforcement-unavailable':''}" data-element="${c.element}" data-reserve-card data-uid="${u.uid}" data-side="${side}" ${draggable?'data-drag-reserve="true"':''} style="--element-color:#${elementInfo(c).color}" aria-label="${esc(c.name)} · ${c.positions.map(p=>'P'+p).join('/')} ${eligible?'· compatible P'+(slot+1):''}"><img src="${cardImage(c)}" alt="${c.name}" draggable="false">${eligible?`<span class="reserve-eligibility">P${slot+1}</span>`:''}${reserveTrait(u)}</button>`;}).join('')||'<span class="muted">Aucune carte</span>'}</div></div>`;
  }
  function replacementSlot(){
    if(game?.phase!=='replace')return null;
    const p=game.players[game.replacing],vacant=p.board.flatMap((u,i)=>!u&&p.reserve.some(r=>E.card(r).positions.includes(i+1))?[i]:[]);
    return vacant.includes(ui.replacementSlot)?ui.replacementSlot:vacant[0]??null;
  }
  function decorateArena(){
    const shell=$('.game-shell'),console=$('.duel-console');if(!shell||!console||!game)return;
    const arena=arenaById(game.arenaId),styles={aero:['wind','#acdccc','#152322','bridge'],hydro:['waves','#82dce3','#112429','water'],electro:['zap','#f2d668','#20232c','circuit'],pyro:['flame','#ee9b72','#2b1c1e','forge'],cryo:['snowflake','#b8eaf0','#1b2830','ice'],luxo:['sun','#e8d590','#262521','sun'],minero:['mountain','#b5cbae','#232922','stone'],herbo:['leaf','#a6d88d','#1b2a23','leaves'],hemato:['droplets','#ee879a','#291d28','gates'],necro:['moon','#b2aedf','#211f2e','gates'],geo:['brick-wall','#cfb87f','#282620','stone'],rainbow:['gem','#e4c5e2','#242231','prism'],z13:['pickaxe','#7fded6','#162a2c','circuit'],'trone-fer':['crown','#ddc799','#24282a','gates'],astraball:['goal','#e5b184','#242924','street'],ruins:['landmark','#b7c7ae','#232723','stone']};
    const [symbol,accent,surface,material]=styles[arena.id]||styles.ruins;
    shell.dataset.arena=arena.id;console.dataset.material=material;console.style.setProperty('--arena-accent',accent);console.style.setProperty('--arena-surface',surface);
    $('.arena-toolbar .tools').insertAdjacentHTML('beforeend',`<button class="icon-button mobile-only" data-action="arena-menu" aria-label="Options du match" title="Options du match">${icon('ellipsis')}</button>`);
    shell.querySelectorAll('.resources [data-action]').forEach(button=>button.setAttribute('aria-label',(button.dataset.action==='reserves'?'Réserve':'Cimetière')+' du joueur '+(Number(button.dataset.side)+1)));
    console.insertAdjacentHTML('beforeend',`<div class="arena-crown" title="${esc(arena.name)}" aria-label="${esc(arena.name)}">${icon(symbol)}</div>`);
    const score=[game.players[1].dead.length,game.players[0].dead.length];
    const toolbar=$('.arena-toolbar');toolbar.querySelector('.tools').insertAdjacentHTML('beforebegin',`<div class="match-scoreboard" aria-label="Score du match : joueur 1 ${score[0]}, joueur 2 ${score[1]}"><div><small>Joueur 1</small><strong data-kills="0">${score[0]}</strong></div><span>${icon('crosshair')}<small>10 KILLS</small></span><div><small>${game.mode==='ai'?'Le Veilleur':'Joueur 2'}</small><strong data-kills="1">${score[1]}</strong></div></div>`);
    if(game.phase==='replace'){
      const slot=replacementSlot(),target=$(`.formation[data-player="${game.replacing}"] .slot[data-position="${slot+1}"]`);
      target?.classList.add('replacement-target');
      if(target&&phoneLayout()&&!(game.mode==='ai'&&game.replacing===1))target.querySelector('.slot-card').setAttribute('aria-label','Ouvrir la réserve pour la position P'+(slot+1));
    }
    icons();
  }
  function journal(){
    const f=(game.duel||game.lastDuel)?.formula;
    const row=(label,v,cls='')=>`<div class="formula-row ${cls}"><span>${label}</span><b class="${v>0?'positive':v<0?'negative':''}">${v>0&&cls!=='total'?'+':''}${v}</b></div>`;
    return `<aside class="journal"><div class="journal-top"><h2>Journal du duel</h2>${ib('export-log','download','Exporter le journal')}</div><div class="combat-summary">${f?row('Jet ATK',f.baseAttack)+row('Arme',f.weapon)+row('Cristal',f.element)+row('Faction',f.faction)+row('Arène ATK',f.arenaAttack||0)+row('Jeton',f.buff)+row('Barrière',f.barrier)+row('ATK finale',f.attack,'total')+row('Jet DEF',f.baseDefense)+row('Race',f.race)+row('Arène DEF',f.arenaDefense||0)+row('Garde',f.ward||0)+row('DEF finale',f.defense,'total'):'<span class="muted">Aucun calcul numérique résolu.</span>'}</div><ol class="log-list" aria-label="Historique">${game.log.slice(-80).reverse().map(l=>`<li class="${esc(l.type)}"><small>Échange ${l.turn} · #${l.n}</small>${esc(l.text).replace(/ = (retry|mana|buff_atk|revive|guard|death|dodge)\./g,(_,n)=>' = '+dieLabel(n,l.text.includes(' : ATK '))+'.')}</li>`).join('')}</ol></aside>`;
  }
  function arena(){
    if(!game)return '<div class="resume-strip"><h2>Arène de Kalistar</h2><button class="primary" data-action="new-game">Préparer une partie</button></div>';
    return `${!storageAvailable?'<div class="storage-note">Sauvegarde navigateur indisponible. Exportez la partie pour la conserver.</div>':''}<div class="game-shell" style="--board-scale:${boardScale/100};--arena-image:url('${arenaById(game.arenaId).image}')"><div class="arena-toolbar"><div><h1>${arenaById(game.arenaId).name} <span class="round">Échange ${game.round} / 200</span></h1><span class="muted game-seed">${esc(game.seed)} · ${game.mode==='ai'?'Adversaire automatique':'Deux joueurs locaux'}</span><span class="arena-rules">${arenaRule(arenaById(game.arenaId))}</span></div><div class="tools"><label class="board-zoom" title="Taille des cartes">${icon('scan')}<input id="board-scale" type="range" min="85" max="140" step="5" value="${boardScale}" aria-label="Taille des cartes"><output>${boardScale}%</output></label>${ib('arena-picker','map',game.phase==='setup'?'Choisir une arène':'Arène verrouillée',game.phase==='setup'?'':'disabled')}${ib('match-stats','trophy','Bilan et statistiques du match')}${ib('journal','scroll-text','Ouvrir le journal du duel')}${ib('fullscreen','maximize','Plein écran')}${ib('save-game','save','Exporter la sauvegarde')}${ib('load-game','upload','Importer une sauvegarde')}${ib('new-game','rotate-ccw','Nouvelle partie')}<input hidden type="file" id="game-file" accept="application/json,.json"></div><div class="board-navigation">${ib('focus-left','panel-left','Centrer le joueur 1')}${ib('focus-duel','dice-6','Centrer les dés')}${ib('focus-right','panel-right','Centrer le joueur 2')}</div></div><div class="arena-layout"><div class="battlefield-viewport"><section class="battlefield" aria-label="Plateau de jeu"><section class="team team-left" data-team="0">${sideHeading(0)}${board(0)}${reserveZone(0)}</section><div class="duel-console" aria-live="polite">${dice(0)}<div class="duel-centre">${consoleBody()}</div>${dice(1)}</div><section class="team team-right" data-team="1">${sideHeading(1)}${board(1)}${reserveZone(1)}</section></section></div></div></div>`;
  }
  function act(fn){if(rolling)return;try{checkGame();fn();E.assertState(game);epoch++;render();}catch(e){toast(e.message);}}
  function engageDuel(){
    if(rolling||game?.phase!=='choose')return;
    act(()=>{E.lock(game,ui.attacker,ui.target);ui.attacker=ui.target=null;});
    if(game?.phase==='attack')window.KalistarDice?.engage();
  }
  function slotClick(side,slot){
    if(game.phase==='setup'||game.phase==='replace'){
      if(game.mode==='ai'&&side===1)return;
      if(game.phase==='replace'&&side!==game.replacing)return;
      if(ui.reserve){placeReserve(side,ui.reserve,slot);}
      else if(game.phase==='setup'){E.recall(game,side,slot);ui.setupSide=side;}
      else if(!game.players[side].board[slot])ui.replacementSlot=slot;
      return;
    }
    if(game.phase!=='choose'||game.mode==='ai'&&game.turn===1)return;
    if(!game.players[side].board[slot])return;
    if(side===game.turn)ui.attacker=slot;else ui.target=slot;
  }
  async function animatedRoll(kalistel=false){
    if(rolling||!(kalistel?game.phase==='kalistel':['attack','defense'].includes(game.phase)))return;
    const token=epoch,phase=kalistel?'attack':game.phase,actor=phase==='attack'?game.turn:1-game.turn,next=E.clone(game);
    let celebration=null;
    try{
      checkGame();
      if(kalistel)E.useKalistel(next);else if(phase==='attack')E.rollAttack(next);else E.rollDefense(next);E.assertState(next);
      const value=phase==='attack'?next.duel.attackDie:next.duel.defenseDie;
      rolling=true;clearTimeout(aiTimer);$('#app').classList.add('rolling');
      document.querySelectorAll('.kalistel-control').forEach(button=>{button.disabled=true;if(kalistel&&Number(button.dataset.side)===actor)button.classList.add('is-spent');});
      const button=$('[data-action="roll"]');if(button){button.disabled=true;button.classList.add('is-casting');button.setAttribute('aria-busy','true');button.querySelector('.action-label').textContent='Jet en cours…';}
      $('.duel-console').dataset.casting=phase;
      const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
      combatController=new AbortController();
      if(kalistel)await window.KalistarCombat?.shatterKalistel($(`.kalistel-control[data-side="${actor}"]`),{reduced,signal:combatController.signal});
      if(token!==epoch||combatController.signal.aborted)return;
      const landed=window.KalistarDice?await KalistarDice.play(actor,value,reduced,combatController.signal):await new Promise(r=>setTimeout(()=>r(true),reduced?30:700));
      if(token===epoch&&landed){
        $('.duel-centre').innerHTML=consoleBody(next);syncConsole(next);delete $('.duel-console').dataset.casting;icons();
        const label=$(`.duel-die[data-player="${actor}"] small`);
        if(label)label.textContent='D'+value+' · '+dieLabel(phase==='attack'?next.duel.attackValue:next.duel.defenseValue,phase==='attack');
        const d=next.duel,c=E.card(game.players[d.side].board[d.attackerSlot]);
        await window.KalistarCombat?.play({before:game,after:next,element:c.element,color:'#'+(data.elements[c.element]?.color||'E4D5FB'),reduced,signal:combatController.signal});
        if(token===epoch&&!combatController.signal.aborted){
          checkGame(next);
          const medal=window.KalistarTrophies?.killMilestone(E.matchStats(game),E.matchStats(next),d.attacker);
          if(medal)celebration={tier:medal.tier,name:c.name,side:d.side,reduced};
          game=next;epoch++;
        }
      }
    }catch(e){toast(e.message);}
    finally{combatController?.abort();combatController=null;rolling=false;$('#app').classList.remove('rolling');render();if(celebration&&ui.view==='arena')window.KalistarCombat?.celebrateKill(celebration);}
  }
  async function animatedTrait(uid){
    if(rolling||!['clover','potion','physical','heart','guard'].includes(game.phase))return;
    const token=epoch,next=E.clone(game);
    try{
      checkGame();
      if(game.phase==='guard')E.grantGuard(next,uid);else if(game.phase==='heart')E.grantReraise(next,uid);else if(game.phase==='potion')E.grantPotion(next,uid);else if(game.phase==='physical')E.grantPhysical(next,uid);else E.grantClover(next,uid);
      E.assertState(next);rolling=true;clearTimeout(aiTimer);
      combatController=new AbortController();
      await window.KalistarCombat?.play({before:game,after:next,element:'',color:'#7eeb9b',reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,signal:combatController.signal});
      if(token===epoch&&!combatController.signal.aborted){checkGame(next);game=next;epoch++;}
    }catch(e){toast(e.message);}
    finally{combatController?.abort();combatController=null;rolling=false;render();}
  }
  function scheduleAI(){
    clearTimeout(aiTimer);if(!game||ui.view!=='arena'||rolling||document.hidden||overlayOpen())return;
    const p=game.phase,token=epoch;
    const second=p==='defense'&&game.duel.autoDefense;
    const active=second||game.mode==='ai'&&((p==='choose'&&game.turn===1)||(['kalistel','clover','potion','physical','heart','guard'].includes(p)&&game.turn===1)||(p==='attack'&&game.turn===1)||(p==='defense'&&game.turn===0)||(p==='replace'&&game.replacing===1));
    if(!active)return;
    // Card focus needs 520ms to settle; the crystal ignition then gets its own beat.
    const delay=second?1000:p==='choose'?(ui.attacker===null?450:650):p==='attack'||p==='defense'?850:650;
    aiTimer=setTimeout(()=>{if(token!==epoch||ui.view!=='arena'||document.hidden||overlayOpen())return;
      if(p==='choose'){
        if(ui.attacker!==null&&ui.target!==null)return engageDuel();
        return act(()=>{const pair=E.aiChoice(game);if(ui.attacker===null)ui.attacker=pair[0];else ui.target=pair[1];});
      }
      if(p==='attack'||p==='defense')return animatedRoll();
      if(p==='kalistel')return E.aiUseKalistel(game)?animatedRoll(true):act(()=>E.acceptAttack(game));
      if(['clover','potion','physical','heart','guard'].includes(p))return animatedTrait(p==='guard'?E.aiGuardChoice(game):p==='heart'?E.aiReraiseChoice(game):p==='potion'?E.aiPotionChoice(game):p==='physical'?E.aiPhysicalChoice(game):E.aiCloverChoice(game));
      if(p==='replace')act(()=>E.autoDeploy(game,1));
    },delay);
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
  const phoneLayout=()=>matchMedia('(max-width:699px), (max-width:950px) and (max-height:500px)').matches;
  function showArenaMenu(){
    const items=[['duel-details','list-plus','Calculs et effets du duel'],['arena-picker','map','Choisir l’arène'],['auto-formation','shuffle','Formation automatique'],['match-stats','trophy','Bilan du match'],['journal','scroll-text','Journal du duel'],['rules','book-open','Règles'],['save-game','download','Exporter la partie'],['load-game','upload','Importer une partie'],['new-game','rotate-ccw','Nouvelle partie']];
    modal('mobile-dialog',head('La rencontre')+`<div class="dialog-body mobile-menu"><button data-view="collection">${icon('book-open')}Collection${icon('chevron-right')}</button><button data-view="decks">${icon('layers-3')}Mes decks${icon('chevron-right')}</button><button data-view="statistics">${icon('chart-no-axes-combined')}Statistiques${icon('chevron-right')}</button>${items.map(([action,symbol,label])=>`<button data-action="${action}" ${['arena-picker','auto-formation'].includes(action)&&game.phase!=='setup'?'disabled':''}>${icon(symbol)}${label}${icon('chevron-right')}</button>`).join('')}</div>`);
    $('#mobile-dialog .mobile-menu').insertAdjacentHTML('beforeend',`<button data-action="reserves" data-side="1">${icon('layers-3')}Réserve adverse · ${game.players[1].reserve.length}${icon('chevron-right')}</button><button data-action="grave" data-side="1">${icon('skull')}Cimetière adverse · ${game.players[1].dead.length}${icon('chevron-right')}</button>`);icons();
  }
  function showArchive(side,kind,slot=null){
    if(slot===null&&kind==='reserve'&&phoneLayout()&&game.phase==='replace'&&game.replacing===side)slot=replacementSlot();
    const p=game.players[side],hidden=kind==='reserve'&&side===1&&game.mode==='ai',target=kind==='reserve'&&!hidden&&Number.isInteger(slot)?slot:null;
    const units=(kind==='dead'?p.dead:p.reserve).filter(u=>target===null||canDeployReserve(side,u.uid,target));
    modal('detail-dialog',head(`${kind==='dead'?'Cimetière':'Réserve'} · ${side===0?'Joueur 1':'Adversaire'}${target===null?'':' · P'+(target+1)}`)+`<div class="dialog-body archive-list">${units.map(u=>{
      const c=E.card(u),positions=kind==='reserve'&&!hidden?c.positions.filter(pos=>(target===null||pos===target+1)&&canDeployReserve(side,u.uid,pos-1)):[];
      const direct=phoneLayout()&&target!==null&&positions.length;
      if(direct)return `<figure class="reinforcement-choice"><div class="reinforcement-image"><button class="card-open reinforcement-card" data-action="deploy-reserve" data-side="${side}" data-uid="${u.uid}" data-slot="${target}" aria-label="Déployer ${esc(c.name)} en P${target+1}"><img src="${cardImage(c)}" alt="${esc(c.name)}"></button><button class="reinforcement-inspect" data-action="detail" data-id="${u.cardId}" aria-label="Inspecter ${esc(c.name)}" title="Inspecter ${esc(c.name)}">${icon('scan-eye')}</button></div><figcaption><span class="reinforcement-position">P${target+1}</span>${esc(c.name)}</figcaption></figure>`;
      return `<figure>${hidden?'<img src="assets/back.webp" alt="Carte adverse face cachée">':`<button class="card-open" data-action="detail" data-id="${u.cardId}" aria-label="Inspecter ${esc(c.name)}"><img src="${cardImage(c)}" alt="${esc(c.name)}"></button>`}<figcaption>${hidden?'Carte en réserve':esc(c.name)}${u.revived?'<br><span class="revived">Déjà ressuscitée</span>':''}</figcaption>${positions.length?`<div class="reserve-placements" aria-label="Déployer ${esc(c.name)}">${positions.map(pos=>`<button data-action="deploy-reserve" data-side="${side}" data-uid="${u.uid}" data-slot="${pos-1}" title="${p.board[pos-1]?'Remplacer '+esc(E.card(p.board[pos-1]).name):'Déployer'} en P${pos}">${icon('plus')}P${pos}</button>`).join('')}</div>`:''}</figure>`;
    }).join('')||'<p class="muted">Aucune carte.</p>'}</div>`);
  }
  document.addEventListener('click',event=>{
    const view=event.target.closest('[data-view]');if(view){view.closest('dialog')?.close();setView(view.dataset.view);return;}
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
    try{
      if(action==='close'){b.closest('dialog').close();return;}
      if(b.closest('#mobile-dialog')&&action!=='duel-details')$('#mobile-dialog').close();
      if(action==='arena-menu')return showArenaMenu();
      if(action==='duel-details')return modal('mobile-dialog',head('Calculs du duel')+`<div class="dialog-body mobile-recap">${duelRecap(game)}</div>`);
      if(action==='deploy-reserve'){
        const side=Number(b.dataset.side),slot=Number(b.dataset.slot);
        if(!canDeployReserve(side,b.dataset.uid,slot))return toast('Ce poste n’est plus disponible.');
        $('#detail-dialog').close();return act(()=>placeReserve(side,b.dataset.uid,slot));
      }
      if(action==='slot'&&phoneLayout()&&game.phase==='setup'){
        $('#detail-dialog').classList.remove('card-detail');return showArchive(Number(b.dataset.side),'reserve',Number(b.dataset.slot));
      }
      if(action==='slot'&&phoneLayout()&&game.phase==='replace'&&!rolling){
        const side=Number(b.dataset.side),slot=Number(b.dataset.slot);
        if(side===game.replacing&&!game.players[side].board[slot]&&game.players[side].reserve.some(u=>canDeployReserve(side,u.uid,slot))){
          ui.replacementSlot=slot;ui.reserve=null;render();
          $('#detail-dialog').classList.remove('card-detail');return showArchive(side,'reserve',slot);
        }
      }
      if(action==='catalogue-refresh')return refreshCatalogue();
      if(action==='phone-preview'){
        if(rolling)return toast('Le duel se termine…');
        persist();
        if(!storageAvailable)return toast('La sauvegarde locale est indisponible.');
        clearTimeout(aiTimer);
        Promise.resolve(db?.idle()).then(()=>{if(!window.KalistarPhonePreview.enter())scheduleAI();}).catch(error=>{toast(error.message);scheduleAI();});return;
      }
      if(action==='account')return openAccounts();
      if(action==='owned-cards')return openAccounts(owned(id).length?'collection':'activation',owned(id)[0]?.id||null);
      if(action==='detail'){
        const context=b.dataset.instance?{instanceId:b.dataset.instance}:b.dataset.uid?{side:Number(b.dataset.side),uid:b.dataset.uid}:{};
        if(b.closest('#match-dialog')&&reportArchive)context.profile=reportArchive.profiles.find(c=>c.id===id);
        return showDetail(id,false,context);
      }
      if(action==='detail-version')return showDetail(id);
      if(action==='database')return showDatabase();
      if(action==='export-library'){if(accountId!==KalistarOwnership.PARIS)return toast('Sauvegarde complete reservee au profil administrateur local.');db?.exportBackup().then(value=>download('Kalistar-collection-'+new Date().toISOString().slice(0,10)+'.json',value)).catch(e=>toast(e.message));return;}
      if(action==='import-library')return $('#library-file').click();
      if(action==='history-match'){const archived=db?.match(id);if(archived)return showMatchStats(archived.state,archived);return;}
      if(action==='bonus')return inspectUnit(Number(b.dataset.side),b.dataset.uid,b.dataset.bonus);
      if(action==='toggle-art')return showDetail(ui.detail,!ui.art,ui.detailContext);
      if(action==='favorite'){favorites.has(id)?favorites.delete(id):favorites.add(id);persist();if($('#detail-dialog').open)b.setAttribute('aria-pressed',favorites.has(id));if(ui.view==='collection')render();return;}
      if(action==='add'||action==='remove')return changeDeck(id,action==='add'?1:-1);
      if(action==='deck')return showDeck();
      if(action==='rules')return showRules();
      if(action==='arena-picker')return showArenaPicker();
      if(action==='match-stats')return showMatchStats(game);
      if(action==='stats-sort'){statsSort=id;statsPage=0;return showMatchStats();}
      if(action==='stats-side'){statsSide=id;statsPage=0;return showMatchStats();}
      if(action==='stats-tab'){statsTab=id;statsPage=0;return showMatchStats();}
      if(action==='stats-page'){statsPage=Math.max(0,Number(id)||0);return showMatchStats();}
      if(action==='stats-group'){statsGroup=id;statsSort=id==='extras'?'debuff':'kills';statsPage=0;return showMatchStats();}
      if(action==='stats-award'){statsAward=Math.max(0,Number(id)||0);return showMatchStats();}
      if(action==='stats-spotlight'){statsSpotlight=id;return showMatchStats();}
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
      if(action==='load-preset')return loadPreset($('#deck-preset').value);
      if(action==='default-deck')return loadPreset('player');
      if(action==='deck-play'){newGameDialog();return;}
      if(action==='new-game')return newGameDialog();
      if(action==='export-deck')return download('Kalistar-V4-deck.json',{schema:1,edition:'V4',name:deckName,cards:deck});
      if(action==='import-deck')return $('#deck-file').click();
      if(action==='save-game')return download('Kalistar-partie-'+game.seed.replace(/[^a-zA-Z0-9_-]/g,'')+'.json',game);
      if(action==='load-game')return $('#game-file').click();
      if(action==='export-log')return download('Kalistar-journal.json',{seed:game.seed,rules:data.demo,log:game.log});
      if(action==='grave'||action==='reserves'){$('#detail-dialog').classList.remove('card-detail');return showArchive(Number(b.dataset.side),action==='grave'?'dead':'reserve');}
      if(action==='slot'&&['clover','potion','physical','heart','guard'].includes(game.phase)){
        const side=Number(b.dataset.side),u=game.players[side].board[Number(b.dataset.slot)];
        if(rolling||game.mode==='ai'&&game.turn===1)return;
        if(side!==game.turn||!u)return toast('Choisissez une carte de votre plateau.');
        return animatedTrait(u.uid);
      }
      if(action==='slot'&&!['setup','replace','choose'].includes(game.phase)){
        const side=Number(b.dataset.side),unit=game.players[side].board[Number(b.dataset.slot)];
        if(unit)inspectUnit(side,unit.uid);return;
      }
      if(action==='kalistel'||action==='accept-attack'){
        if(rolling||game.phase!=='kalistel'||game.mode==='ai'&&game.turn===1||action==='kalistel'&&Number(b.dataset.side)!==game.turn)return;
        return action==='kalistel'?animatedRoll(true):act(()=>E.acceptAttack(game));
      }
      if(action==='roll'){
        const actor=game.phase==='attack'?game.turn:1-game.turn;
        if(game.mode==='ai'&&actor===1)return;
        return animatedRoll();
      }
      if(action==='lock'){
        if(game.mode==='ai'&&game.turn===1)return;
        return engageDuel();
      }
      if(game?.mode==='ai'&&action==='auto-replace'&&game.replacing===1)return;
      act(()=>{
        if(action==='slot')slotClick(Number(b.dataset.side),Number(b.dataset.slot));
        else if(action==='reserve'){if(game.phase==='setup'||game.phase==='replace')ui.reserve=ui.reserve===b.dataset.uid?null:b.dataset.uid;else showDetail(game.players[Number(b.dataset.side)].reserve.find(u=>u.uid===b.dataset.uid).cardId);}
        else if(action==='auto-formation'){E.autoDeploy(game,0);E.autoDeploy(game,1);ui.reserve=null;}
        else if(action==='setup-side'){ui.setupSide=1-(ui.setupSide||0);ui.reserve=null;}
        else if(action==='start'){E.start(game);ui.reserve=null;}
        else if(action==='next'){E.next(game);ui.attacker=ui.target=ui.reserve=ui.replacementSlot=null;}
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
    if(e.target.id==='deck-name'){deckName=e.target.value;persist();}
  });
  document.addEventListener('change',async e=>{
    if(e.target.id==='deck-preset'||e.target.id==='enemy-deck-preset'){
      const enemy=e.target.id==='enemy-deck-preset';
      try{const preset=validatedPreset(e.target.value);if(enemy)enemyPresetId=preset.id;else deckPresetId=preset.id;save(enemy?'enemyDeckPreset':'deckPreset',preset.id);}
      catch(error){e.target.value=enemy?enemyPresetId:deckPresetId;toast(error.message);}return;
    }
    if(e.target.id==='game-mode')$('#enemy-deck-label').textContent=e.target.value==='ai'?'Deck IA':'Deck du joueur 2';
    if(e.target.id==='career-instance'){ui.careerInstance=e.target.value;$('#detail-dialog .career-panel').outerHTML=Catalogue.career(ui.detail,ui.detailContext?.profile?db:collectionDB(),ui.careerInstance);icons();}
    if(e.target.id==='library-file'){
      const file=e.target.files[0];if(!file||!db)return;
      try{
        if(accountId!==KalistarOwnership.PARIS)throw new Error('Restauration reservee au profil administrateur local.');
        if(file.size>50000000)throw new Error('Fichier trop volumineux (50 Mo maximum).');
        const value=JSON.parse(await file.text());
        if(value.schema>=3&&!confirm('Restaurer cette sauvegarde ? Les donnees sauvegardees peuvent revenir a leur ancien etat. Les nouveaux exemplaires et leurs historiques lies seront conserves. Fermez les autres onglets Kalistar et conservez d’abord une sauvegarde actuelle.'))return;
        await db.importBackup(value,{replaceRegistry:value.schema>=3});await db.registry.refresh();
        if(value.schema>=3){try{for(const prefix of ['kalistar.v4.','kalistar.v4.user-tokyo.'])localStorage.removeItem(prefix+'game');}catch{storageAvailable=false;}suspendGame();}
        await ownershipChanged();showDatabase();toast('Collection et historique importés.');
      }catch(error){toast('Import refusé : '+error.message);}return;
    }
    if(e.target.id==='deck-file'||e.target.id==='game-file'){
      const file=e.target.files[0];if(!file)return;
      try{if(file.size>3000000)throw new Error('Fichier trop volumineux.');const value=JSON.parse(await file.text());
        if(e.target.id==='deck-file'){if(!Array.isArray(value.cards))throw new Error('Deck invalide.');if(value.edition!=='V4'||value.cards.some(id=>!/^[34]\d{7}$/.test(id)))throw new Error('Import V2 refusé : deck incompatible avec V4. Vos données V2 restent intactes.');const errors=deckErrors(value.cards);if(errors.length)throw new Error(errors.join(' '));deck=value.cards;deckName=String(value.name||'Deck importé').slice(0,50);persist();showDeck();if(ui.view==='collection')render();}
        else{const imported=E.restoreGame(KalistarLocalDB.validateGame(value));db.registry.validateGame(imported,accountId);await db.saveGame(imported);const retained=game?.collection&&game.phase!=='over'&&game.matchId!==imported.matchId;clearTimeout(aiTimer);epoch++;game=imported;ui.endShown=false;ui.attacker=ui.target=ui.reserve=null;await setView('arena');if(retained){toast('Partie importee. L’ancienne reste archivee ; ses cartes restent engagees jusqu’a abandon dans le registre.');return;}}
        toast('Import terminé.');
      }catch(err){toast('Import refusé : '+err.message);}
    }
  });
  document.addEventListener('submit',async e=>{
    if(e.target.id==='arena-form'){
      e.preventDefault();if(rolling)return;const id=new FormData(e.target).get('arena');
      if(!arenas.some(a=>a.id===id))return;
      try{if(game){checkGame();E.setArena(game,id);}save('arena',id);$('#arena-dialog').close();render();}catch(error){toast(error.message);}return;
    }
    if(e.target.id!=='new-game-form')return;
    e.preventDefault();if(rolling)return;
    if(game?.collection&&game.phase!=='over'&&!confirm('Remplacer cette partie ? La partie actuelle sera abandonnee et ne pourra plus etre reprise. Ses archives seront conservees.'))return;
    const submit=e.target.querySelector('[type="submit"]');submit.disabled=true;
    try{await createGame($('#game-mode').value,$('#game-seed').value.trim()||'KALISTAR',new FormData(e.target).get('arena'),$('#enemy-deck-preset').value);$('#new-game-dialog').close();await setView('arena');}catch(err){toast(err.message);submit.disabled=false;}
  });
  document.addEventListener('error',event=>{
    const img=event.target;
    if(img instanceof HTMLImageElement&&img.getAttribute('src')===asset('effets','guard'))img.src=asset('effets','shield_physical');
  },true);
  window.addEventListener('hashchange',()=>setView(hashView()));
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==$('#atelier-frame')?.contentWindow||event.data?.type!=='kalistar:card-published')return;
    markCatalogueOutdated();
    toast('Carte publiee. Le catalogue peut etre actualise sans effacer la partie.');
  });
  function markCatalogueOutdated(ids=[]){
    if(!ids.length&&db?.catalogueChanges().length)ids=db.catalogueChanges();
    $('#catalogue-refresh').hidden=false;
    $('#catalogue-refresh span').textContent='Nouvelles cartes'+(ids.length?' ('+ids.length+')':'');icons();
  }
  async function refreshCatalogue(){
    if(rolling)return toast('Le duel se termine…');
    try{persist();if(!storageAvailable)throw Error('Sauvegarde locale indisponible : rechargement annule.');await db?.idle();location.hash='collection';location.reload();}
    catch(error){toast(error.message);}
  }
  $('#catalogue-refresh').addEventListener('click',refreshCatalogue);
  document.addEventListener('kalistar:media-error',event=>toast(event.detail));
  new ResizeObserver(entries=>{
    document.documentElement.style.setProperty('--masthead-height',entries[0].target.getBoundingClientRect().height+'px');
  }).observe($('.masthead'));
  window.addEventListener('kalistar-overlay',scheduleAI);
  let reportResize=0;
  window.addEventListener('resize',()=>{clearTimeout(reportResize);reportResize=setTimeout(()=>{if($('#match-dialog').open&&!$('#detail-dialog').open)showMatchStats();},100);});
  $('#match-dialog').addEventListener('keydown',event=>{
    const current=event.target.closest('[role=tab],[data-action=stats-spotlight]');if(!current||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const selector=current.matches('[role=tab]')?'[role=tab]':'[data-action=stats-spotlight]';
    const tabs=[...current.parentElement.querySelectorAll(selector)],index=tabs.indexOf(current);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    event.preventDefault();tabs[next].focus();tabs[next].click();
  });
  document.addEventListener('visibilitychange',scheduleAI);
  document.addEventListener('close',scheduleAI,true);
  document.addEventListener('fullscreenchange',()=>{const b=$('[data-action="fullscreen"]');if(b){const label=document.fullscreenElement?'Quitter le plein écran':'Plein écran';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=icon(document.fullscreenElement?'minimize':'maximize');icons();}});
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  if(ui.view==='arena'&&!game){try{await createGame('ai','KALI-2026');}catch{ui.view='collection';}}
  if(db?.registry)accountsUI=KalistarAccountsUI.create({db,getUserId:()=>accountId,onChanged:ownershipChanged,modal,toast,download,onSwitch:async id=>{if(!db.registry.user(id))throw new Error('Profil inconnu.');persist();await db.idle();localStorage.setItem('kalistar.v4.activeUser',id);location.reload();}});
  else toast('Registre local indisponible : '+dbError);
  db?.onCatalogueChange(ids=>{
    if(!ids.length)return;
    markCatalogueOutdated(ids);
    if(ui.view==='collection')collectionBinder?.refresh();
    accountsUI?.refresh();
  });
  render();if(restoreError)toast(restoreError);window.KALISTAR_READY=true;
})();
