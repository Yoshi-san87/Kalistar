(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KalistarEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const dieValue = (card, side, die) => card[side === 'atk' ? 'atk' : 'defense'][6 - die];
  const mean = values => { const numbers = values.filter(Number.isFinite); return numbers.length?numbers.reduce((a,b)=>a+b,0)/numbers.length:0; };
  function createEngine(data) {
    const validCardId=id=>typeof id==='string'&&/^[34]\d{7}$/.test(id);
    const canGuard=c=>c?.canGuard===true&&[1,5].includes(c.role);
    const canHeal=c=>c?.canHeal===true&&c.role===5;
    const numericFace=v=>Number.isInteger(v)&&v>=0&&v<=1000;
    if(!data||data.version!==4||data.edition!=='V4'||!Array.isArray(data.cards)||!data.cards.length||!data.elements||!data.weapons)throw new Error('Données moteur V4 invalides.');
    for(const c of data.cards){
      if(!c||c.edition!=='V4'||!validCardId(c.id))throw new Error('Carte incompatible : profil du catalogue V4 requis.');
      if(typeof c.characterId!=='string'||!c.characterId.trim()||![1,2,3,4,5].includes(c.role)||
        ['sentry','canGuard','canHeal'].some(k=>typeof c[k]!=='boolean')||
        !Array.isArray(c.positions)||!c.positions.length||c.positions.some(p=>![1,2,3,4,5].includes(p)))throw new Error('Profil V4 invalide : '+c.id);
      if(c.canGuard&&!canGuard(c)||c.canHeal&&!canHeal(c))throw new Error('Garde réservée aux P1/P5 ; Reraise réservé aux soigneurs P5.');
      if(!Array.isArray(c.atk)||c.atk.length!==6||c.atk.some(v=>!numericFace(v)&&!['retry','mana','buff_atk','revive','death','guard'].includes(v))||
        !Array.isArray(c.defense)||c.defense.length!==6||c.defense.some(v=>!numericFace(v)&&!['retry','dodge'].includes(v)))throw new Error('Faces V4 invalides : aucun bouclier spécial en DEF.');
      if(c.atk.includes('guard')&&!canGuard(c)||c.atk.includes('revive')&&!canHeal(c))throw new Error('Face guard/Reraise incompatible avec le profil.');
      if(typeof c.element!=='string'||c.element!=='NONE'&&!Object.hasOwn(data.elements,c.element)||
        [c.magic,c.barriers].some(v=>!Array.isArray(v)||v.some(d=>!Number.isInteger(d)||d<1||d>6))||
        c.element==='NONE'&&c.barriers.length)throw new Error('Cristal ou barrière V4 invalide. NONE ne porte pas de barrière.');
    }
    if(new Set(data.cards.map(c=>String(c.id))).size!==data.cards.length)throw new Error('Identifiants de cartes dupliqués.');
    const byId = Object.assign(Object.create(null),Object.fromEntries(data.cards.map(c => [c.id,c])));
    const rules = { ...data.rules, ...data.demo };
    const arenas=data.arenas===undefined?[{id:'ruins',element:'NONE',elementBonus:0,homeCharacters:[],homeAttack:0,homeDefense:0}]:data.arenas;
    if(!Array.isArray(arenas)||!arenas.length)throw new Error('Catalogue des arènes invalide.');
    const arenaById=new Map();
    for(const arena of arenas){
      if(!arena||typeof arena.id!=='string'||!/^[-a-z0-9]+$/.test(arena.id)||arenaById.has(arena.id)||
        ![null,'NONE',...Object.keys(data.elements)].includes(arena.element)||
        !Number.isInteger(arena.elementBonus)||arena.elementBonus<0||arena.elementBonus>15||
        !Number.isInteger(arena.homeAttack)||arena.homeAttack<0||arena.homeAttack>10||
        !Number.isInteger(arena.homeDefense)||arena.homeDefense<0||arena.homeDefense>10||
        !Array.isArray(arena.homeCharacters)||arena.homeCharacters.some(id=>typeof id!=='string'||!id.trim()))throw new Error('Arène V4 invalide. Bonus maximum : +25 ATK / +10 DEF.');
      arenaById.set(arena.id,clone(arena));
    }
    const defaultArena=arenaById.has('ruins')?'ruins':arenas[0].id;
    const card = unit => byId[unit?.cardId];
    const traitKeys=['reraise','luck','mana','physical','ward'];
    const trait = unit => traitKeys.find(key=>unit?.[key]>0)||null;
    const traits = unit => ['ward','luck','reraise','mana','physical'].filter(key=>unit?.[key]>0);
    const instanceId=(cardId,copy)=>`K4-${cardId}-${String(copy).padStart(3,'0')}`;
    function identifyUnits(s){
      const copies={};
      for(const p of s.players)for(const u of [...p.board.filter(Boolean),...p.reserve,...p.dead].sort((a,b)=>a.uid.localeCompare(b.uid))){
        copies[u.cardId]=(copies[u.cardId]||0)+1;
        u.instanceId=instanceId(u.cardId,copies[u.cardId]);
        u.entered=s.phase!=='setup'&&(p.board.includes(u)||p.dead.includes(u));
      }
    }
    function setTrait(s,u,key){
      const already=u[key]>0;
      u[key]=key==='ward'?60:key==='mana'||key==='physical'?rules.token_bonus:1;
      return already;
    }
    function lineup(ids) {
      const used = new Set(), result = Array(5).fill(null);
      function search(slot) {
        if(slot === 5) return true;
        for(let i=0;i<ids.length;i++)if(!used.has(i) && byId[ids[i]]?.positions.includes(slot+1)) {
          used.add(i); result[slot]=i;
          if(search(slot+1))return true;
          used.delete(i);
        }
        result[slot]=null;return false;
      }
      return search(0) ? result : null;
    }
    function deckCoverage(ids) {
      const counts={1:0,2:0,3:0,4:0,5:0};
      if(Array.isArray(ids))for(const id of ids)if(validCardId(id)&&byId[id]){
        for(const position of new Set(byId[id].positions))counts[position]++;
      }
      return counts;
    }
    function validateDeck(ids,{coverage=1}={}) {
      const errors=[];
      if(![1,2].includes(coverage))errors.push('Couverture de deck invalide : 1 ou 2 requis.');
      if(!Array.isArray(ids)||ids.length>10)return ['Le deck doit contenir exactement 10 cartes.'];
      ids=Array.from(ids);
      if(ids.length!==rules.deck_size)errors.push('Le deck doit contenir exactement 10 cartes.');
      if(ids.some(id=>!validCardId(id)))errors.push('Identifiants V4 requis : les decks V2 sont refusés.');
      if(ids.some(id=>!byId[id]))errors.push('Carte inconnue dans le deck.');
      const counts={};for(const id of ids)counts[id]=(counts[id]||0)+1;
      if(Object.values(counts).some(n=>n>rules.copy_limit))errors.push('Deux exemplaires maximum par version.');
      if(ids.filter(id=>byId[id]?.element==='RAINBOW').length>rules.rainbow_limit)errors.push('Une seule carte Rainbow par deck.');
      if(!lineup(ids))errors.push('Une formation complète P1 à P5 est nécessaire.');
      if(coverage===2)for(const [position,count] of Object.entries(deckCoverage(ids))){
        if(count<2)errors.push(`P${position} : au moins 2 cartes compatibles sont nécessaires (${count}/2).`);
      }
      return errors;
    }
    function validatePlayableDeck(ids) { return validateDeck(ids,{coverage:2}); }
    function addLog(s,type,text,details) {
      s.log.push({n:s.log.length+1,turn:s.round,type,text,...(details?{details}: {})});
    }
    function newGame(deckA,deckB,options={}) {
      const coverage=options.deckCoverage===undefined?1:options.deckCoverage;
      for(const deck of [deckA,deckB]){const e=validateDeck(deck,{coverage});if(e.length)throw new Error(e.join(' '));}
      const seed=String(options.seed || 'KALISTAR');let random=2166136261;
      for(const char of seed)random=Math.imul(random^char.charCodeAt(0),16777619)>>>0;
      const s={schema:6,edition:'V4',phase:'setup',turn:0,round:1,rng:random||1,seed,mode:options.mode||'ai',players:[],log:[],duel:null,lastDuel:null,winner:null,replacing:null};
      // Unmarked schema-6 archives retain their original deck validation.
      if(coverage===2)s.deckCoverage=2;
      s.matchId='match-'+globalThis.crypto.randomUUID();
      setArena(s,options.arenaId??defaultArena);
      s.match={version:1,fromRound:1,partial:false,events:[]};
      [deckA,deckB].forEach((deck,side)=>s.players.push({board:Array(5).fill(null),reserve:deck.map((id,i)=>({uid:side+'-'+i,cardId:id,revived:false,reraise:0,luck:0,mana:0,physical:0,ward:0})),dead:[]}));
      identifyUnits(s);
      addLog(s,'start','Deux decks de 10 cartes. Formation en cours.');
      assertState(s);return s;
    }
    function setArena(s,id){
      if(s.phase!=='setup')throw new Error('Arène verrouillée après le début du match.');
      if(!arenaById.has(id))throw new Error('Arène inconnue.');
      s.arenaId=id;return s;
    }
    function arenaBonuses(s,u){
      const arena=arenaById.get(s.arenaId),c=card(u);
      if(!arena)throw new Error('Arène inconnue.');
      if(!c)throw new Error('Carte inconnue.');
      const element=c.element!=='NONE'&&c.element===arena.element?arena.elementBonus:0;
      const home=arena.homeCharacters.includes(c.characterId),homeAttack=home?arena.homeAttack:0,homeDefense=home?arena.homeDefense:0;
      return {attack:element+homeAttack,defense:homeDefense,element,homeAttack,homeDefense};
    }
    function deploy(s,side,uid,slot) {
      if(s.phase!=='setup' && !(s.phase==='replace'&&s.replacing===side))throw new Error('Déploiement indisponible.');
      if(!Number.isInteger(slot)||slot<0||slot>4)throw new Error('Position invalide.');
      const p=s.players[side],index=p.reserve.findIndex(u=>u.uid===uid);
      if(index<0||p.board[slot])throw new Error('Emplacement ou carte indisponible.');
      const u=p.reserve[index];if(!card(u).positions.includes(slot+1))throw new Error('Position incompatible.');
      p.reserve.splice(index,1);p.board[slot]=u;
      if(s.phase==='replace')u.entered=true;
      addLog(s,'deploy',`${side===0?'Joueur':'Adversaire'} : ${card(u).name} entre en P${slot+1}.`);
      if(s.phase==='replace')findReplacement(s);
      return s;
    }
    function recall(s,side,slot) {
      if(s.phase!=='setup')throw new Error('Formation verrouillée.');
      const p=s.players[side],u=p.board[slot];if(u){p.reserve.push(u);p.board[slot]=null;}
      return s;
    }
    function autoDeploy(s,side) {
      const p=s.players[side];
      if(s.phase==='setup'){
        p.reserve.push(...p.board.filter(Boolean));p.board=Array(5).fill(null);
        const picked=lineup(p.reserve.map(u=>u.cardId));if(!picked)throw new Error('Formation impossible.');
        const units=picked.map(i=>p.reserve[i]);for(let slot=0;slot<5;slot++)deploy(s,side,units[slot].uid,slot);
      }else if(s.phase==='replace'&&s.replacing===side){
        // Maximum matching keeps a versatile reserve from blocking a later position.
        let best=[];
        function match(slot,used,chosen){
          if(slot===5){if(chosen.length>best.length)best=chosen.slice();return;}
          match(slot+1,used,chosen);
          if(p.board[slot])return;
          p.reserve.forEach((u,i)=>{if(!used.has(i)&&card(u).positions.includes(slot+1)){
            used.add(i);chosen.push([slot,u.uid]);match(slot+1,used,chosen);chosen.pop();used.delete(i);
          }});
        }
        match(0,new Set(),[]);
        for(const [slot,uid] of best)if(s.phase==='replace'&&s.replacing===side)deploy(s,side,uid,slot);
        findReplacement(s);
      }
      return s;
    }
    function start(s) {
      if(s.phase!=='setup'||s.players.some(p=>p.board.some(u=>!u)))throw new Error('Les dix positions doivent être occupées.');
      if(Object.hasOwn(s,'deckCoverage'))assertState(s);
      for(const p of s.players)for(const u of p.board)u.entered=true;
      s.phase='choose';addLog(s,'start','Le joueur ouvre le combat.');return s;
    }
    function synergy(p,u,field) {
      const n=p.board.filter(other=>other&&card(other)[field]===card(u)[field]).length;
      return rules.synergy[Math.min(n,5)]||0;
    }
    function elementModifier(a,b) {
      if(!a.element||!b.element||a.element==='NONE'||a.element===b.element)return 0;
      if(b.element==='NONE')return a.element==='RAINBOW'?30:20;
      if(a.element==='RAINBOW')return 40;
      if(b.element==='RAINBOW')return -40;
      const e=data.elements[a.element];
      if(e?.strong_against===b.element)return a.advantage??30;
      if(e?.weak_against===b.element)return -(a.disadvantage??30);
      return 0;
    }
    function lock(s,attackerSlot,targetSlot) {
      if(s.phase!=='choose')throw new Error('Un duel est déjà engagé.');
      const a=s.players[s.turn].board[attackerSlot],b=s.players[1-s.turn].board[targetSlot];
      if(!a||!b)throw new Error('Attaquant et cible requis.');
      s.duel={side:s.turn,attackerSlot,targetSlot,attacker:a.uid,target:b.uid,attackerName:card(a).name,targetName:card(b).name,attackRolls:[],defenseRolls:[],buff:0,ward:0};
      s.phase='attack';addLog(s,'target',`${card(a).name} vise ${card(b).name}.`);return s;
    }
    function roll(s,forced) {
      if(forced!==undefined){if(!Number.isInteger(forced)||forced<1||forced>6)throw new Error('Dé invalide.');return forced;}
      let x=s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;
      return Math.floor(s.rng/4294967296*6)+1;
    }
    function finish(s,outcome,formula) {
      s.duel.autoDefense=false;
      s.duel.outcome=outcome;if(formula)s.duel.formula=formula;
      recordPerformance(s);
      s.lastDuel=clone(s.duel);s.phase='result';addLog(s,'result',outcome,formula);return s;
    }
    function recordPerformance(s){
      // One final event per exchange: failed clover rolls never double the totals.
      if(!s.match)s.match={version:1,fromRound:s.round,partial:s.round>1||s.log.some(l=>l.type==='result'),events:[]};
      if(s.match.events.some(e=>e.round===s.round))return;
      const d=s.duel,f=d.formula,support={revive:'reraise',retry:'luck',mana:'mana',buff_atk:'physical',guard:'ward'}[d.attackValue]||null;
      const killed=s.players[1-d.side].dead.some(u=>u.uid===d.target);
      s.match.events.push({round:s.round,attacker:d.attacker,target:d.target,magic:!!d.magic,
        attack:f?.attack||0,defense:f?.defense||0,breakthrough:f?Math.max(0,f.attack-f.defense):0,
        kill:killed,hold:!support&&!killed&&!d.reraised,dodge:d.defenseValue==='dodge',
        shield:['shield_physical','shield_magic'].includes(d.defenseValue),
        reraise:!!d.reraised,luck:!!d.luckUsed,barrier:Math.abs(f?.barrier||0),buff:d.buff||0,
        ward:f?.ward||0,arenaAttack:f?.arenaAttack||0,arenaDefense:f?.arenaDefense||0,
        debuff:f?Math.max(0,-f.weapon)+Math.max(0,-f.element)+Math.max(0,-f.barrier):0,
        support,recipient:support?(d.cloverGranted||d.manaGranted||d.physicalGranted||d.reraiseGranted||d.guardGranted||d.attacker):null,refresh:!!d.traitRefreshed,
        attackRolls:d.attackRolls.length,defenseRolls:d.defenseRolls.length});
    }
    function matchStats(s){
      assertV4(s);
      const metrics=['attack','defense','breakthrough','kills','deaths','holds','support','alliedSupport','refreshes','hearts','clovers','potions','physical','guards','ward','arenaAttack','arenaDefense','reraises','luckUsed','dodges','shields','barrier','debuff','buff','duels','defended','attackRolls','defenseRolls','peakAttack','peakDefense','rating'];
      const empty=()=>Object.fromEntries(metrics.map(k=>[k,0]));
      const units=s.players.flatMap((p,side)=>[...p.board.filter(Boolean),...p.reserve,...p.dead].map(u=>({uid:u.uid,cardId:u.cardId,instanceId:u.instanceId,participated:!!u.entered,side,...empty()})));
      const byUnit=Object.fromEntries(units.map(u=>[u.uid,u]));
      for(const e of s.match?.events||[]){
        const a=byUnit[e.attacker],b=byUnit[e.target];
        a.duels++;a.attackRolls+=e.attackRolls;a.attack+=e.attack;a.breakthrough+=e.breakthrough;a.buff+=e.buff;
        a.arenaAttack+=e.arenaAttack||0;
        a.peakAttack=Math.max(a.peakAttack,e.attack);a.kills+=Number(e.kill);b.deaths+=Number(e.kill);
        if(!e.support){b.defended++;b.defenseRolls+=e.defenseRolls;b.defense+=e.defense;b.peakDefense=Math.max(b.peakDefense,e.defense);b.holds+=Number(e.hold);b.dodges+=Number(e.dodge);b.shields+=Number(e.shield);b.reraises+=Number(e.reraise);b.luckUsed+=Number(e.luck);b.barrier+=e.barrier;b.debuff+=e.debuff??e.barrier;b.ward+=e.ward||0;b.arenaDefense+=e.arenaDefense||0;}
        if(e.support){
          if(e.refresh)a.refreshes++;
          else{a.support++;a.alliedSupport+=Number(e.recipient!==e.attacker);a[{reraise:'hearts',luck:'clovers',mana:'potions',physical:'physical',ward:'guards'}[e.support]]++;}
        }
      }
      for(const u of units)u.rating=u.kills*5+u.holds*3+u.support*2+u.reraises+Math.floor(u.debuff/30);
      const teams=[0,1].map(side=>units.filter(u=>u.side===side).reduce((total,u)=>{for(const key of metrics)total[key]=key.startsWith('peak')?Math.max(total[key],u[key]):total[key]+u[key];return total;},{side,...empty()}));
      return {version:4,matchId:s.matchId,seed:s.seed,arenaId:s.arenaId,winner:s.winner,complete:s.phase==='over',
        partial:s.match?.partial??(s.round>1||s.log.some(l=>l.type==='result')),fromRound:s.match?.fromRound??s.round,exchanges:s.match?.events.length||0,units,teams};
    }
    function validatePerformance(s){
      if(!arenaById.has(s.arenaId))throw new Error('Arène invalide.');
      const m=s.match;if(m===undefined)return;
      if(!m||m.version!==1||typeof m.partial!=='boolean'||!Number.isInteger(m.fromRound)||m.fromRound<1||m.fromRound>201||!Array.isArray(m.events)||m.events.length>200)throw new Error('Bilan invalide.');
      let previous=m.fromRound-1;
      for(const e of m.events){
        if(!e||!Number.isInteger(e.round)||e.round<=previous||e.round>200||e.round>s.round||!/^[01]-[0-9]$/.test(e.attacker)||!/^[01]-[0-9]$/.test(e.target)||e.attacker[0]===e.target[0])throw new Error('Échange du bilan invalide.');
        previous=e.round;
        for(const key of ['attack','defense','breakthrough','barrier','buff','attackRolls','defenseRolls'])if(!Number.isInteger(e[key])||e[key]<0||e[key]>4000)throw new Error('Score du bilan invalide.');
        if(e.debuff!==undefined&&(!Number.isInteger(e.debuff)||e.debuff<0||e.debuff>4000))throw new Error('Debuff invalide.');
        if(![0,60].includes(e.ward)||!Number.isInteger(e.arenaAttack)||e.arenaAttack<0||e.arenaAttack>25||!Number.isInteger(e.arenaDefense)||e.arenaDefense<0||e.arenaDefense>10||e.magic&&e.ward)throw new Error('Bonus V4 du bilan invalide.');
        for(const key of ['magic','kill','hold','dodge','shield','reraise','luck','refresh'])if(typeof e[key]!=='boolean')throw new Error('Événement du bilan invalide.');
        if(![null,...traitKeys].includes(e.support)||e.support&&(!/^[01]-[0-9]$/.test(e.recipient)||e.recipient[0]!==e.attacker[0])||!e.support&&e.recipient!==null)throw new Error('Soutien du bilan invalide.');
        if(e.support&&(e.attack||e.defense||e.arenaAttack||e.arenaDefense||e.ward||e.defenseRolls||e.kill||e.hold))throw new Error('Un soutien ne produit pas de combat numérique.');
      }
    }
    function eliminate(s) {
      const d=s.duel,p=s.players[1-d.side],u=p.board[d.targetSlot];
      if(u.reraise){
        u.reraise=0;d.reraised=u.uid;
        addLog(s,'effect',`${card(u).name} consomme son cœur : Reraise, la carte reste en P${d.targetSlot+1}.`);
        return false;
      }
      p.board[d.targetSlot]=null;p.dead.push(u);addLog(s,'death',`${card(u).name} est éliminé.`);
      return true;
    }
    function grantReraise(s,uid) {
      if(s.phase!=='heart')throw new Error('Attribution du Reraise indisponible.');
      if(!canHeal(card(s.players[s.duel.side].board[s.duel.attackerSlot])))throw new Error('Reraise réservé aux soigneurs P5 canHeal.');
      const d=s.duel,u=s.players[d.side].board.find(u=>u?.uid===uid);
      if(!u)throw new Error('Choisissez une carte de votre plateau.');
      const already=setTrait(s,u,'reraise');
      d.traitRefreshed=already;
      d.reraiseGranted=u.uid;
      return finish(s,already?`${card(u).name} conserve son cœur actif. Aucun cœur supplémentaire.`:`${card(u).name} gagne un cœur. Reraise actif.`);
    }
    function grantGuard(s,uid){
      if(s.phase!=='guard')throw new Error('Attribution de la garde indisponible.');
      const d=s.duel;
      if(!canGuard(card(s.players[d.side].board[d.attackerSlot])))throw new Error('Garde réservée aux tanks/supports canGuard.');
      const u=s.players[d.side].board.find(u=>u?.uid===uid);
      if(!u)throw new Error('Choisissez une carte de votre plateau.');
      d.traitRefreshed=setTrait(s,u,'ward');d.guardGranted=u.uid;
      return finish(s,`${card(u).name} reçoit une garde : +60 DEF sur sa prochaine défense numérique physique. Un seul bouclier actif.`);
    }
    function grantClover(s,uid) {
      if(s.phase!=='clover')throw new Error('Attribution du trèfle indisponible.');
      const u=s.players[s.duel.side].board.find(u=>u?.uid===uid);
      if(!u)throw new Error('Choisissez une carte de votre plateau.');
      const already=setTrait(s,u,'luck');s.duel.cloverGranted=uid;
      s.duel.traitRefreshed=already;
      return finish(s,already?`${card(u).name} conserve son trèfle actif. Aucun trèfle supplémentaire.`:`${card(u).name} reçoit un trèfle : seconde chance en défense.`);
    }
    function grantPotion(s,uid) {
      if(s.phase!=='potion')throw new Error('Attribution de la potion indisponible.');
      const u=s.players[s.duel.side].board.find(u=>u?.uid===uid);
      if(!u)throw new Error('Choisissez une carte de votre plateau.');
      s.duel.traitRefreshed=setTrait(s,u,'mana');s.duel.manaGranted=uid;
      return finish(s,`${card(u).name} reçoit la potion : +${rules.token_bonus} à sa prochaine attaque numérique magique.`);
    }
    function aiCloverChoice(s) {
      // Different categories coexist; only an existing token of the same kind is redundant.
      return s.players[s.turn].board.filter(Boolean).sort((a,b)=>
        (Number(!!a.luck)-Number(!!b.luck))*10000+mean(card(a).defense)-mean(card(b).defense))[0]?.uid;
    }
    function grantPhysical(s,uid) {
      if(s.phase!=='physical')throw new Error('Attribution de la puissance physique indisponible.');
      const u=s.players[s.duel.side].board.find(u=>u?.uid===uid);
      if(!u)throw new Error('Choisissez une carte de votre plateau.');
      s.duel.traitRefreshed=setTrait(s,u,'physical');s.duel.physicalGranted=uid;
      return finish(s,`${card(u).name} reçoit la puissance physique : +${rules.token_bonus} à sa prochaine attaque numérique physique.`);
    }
    function aiAttackBuffChoice(s,magic) {
      const key=magic?'mana':'physical';
      const score=u=>{
        const c=card(u),faces=c.atk.filter((v,i)=>typeof v==='number'&&c.magic.includes(6-i)===magic);
        return (faces.length?10000:0)-(u[key]?1000:0)+faces.reduce((a,b)=>a+b,0)/6;
      };
      return s.players[s.turn].board.filter(Boolean).sort((a,b)=>score(b)-score(a))[0]?.uid;
    }
    const aiPotionChoice=s=>aiAttackBuffChoice(s,true);
    const aiPhysicalChoice=s=>aiAttackBuffChoice(s,false);
    function aiReraiseChoice(s){
      const score=u=>(u.reraise?-10000:0)+mean(card(u).atk)+mean(card(u).defense);
      return s.players[s.turn].board.filter(Boolean).sort((a,b)=>score(b)-score(a))[0]?.uid;
    }
    function aiGuardChoice(s){
      return s.players[s.turn].board.filter(Boolean).sort((a,b)=>
        (Number(!!a.ward)-Number(!!b.ward))*10000+mean(card(a).defense)-mean(card(b).defense))[0]?.uid;
    }
    function rollAttack(s,forced) {
      if(s.phase!=='attack')throw new Error('Jet ATK indisponible.');
      const d=s.duel,u=s.players[d.side].board[d.attackerSlot],c=card(u);
      if(c.atk.includes('guard')&&!canGuard(c)||c.atk.includes('revive')&&!canHeal(c))throw new Error('Face guard/Reraise incompatible avec le profil V4.');
      const die=roll(s,forced),value=dieValue(c,'atk',die);
      d.attackRolls.push(die);d.attackDie=die;d.attackValue=value;d.magic=c.magic.includes(die);
      addLog(s,'roll',`${c.name} : ATK D${die} = ${value}.`);
      if(value==='guard'){
        s.phase='guard';addLog(s,'effect',`${c.name} obtient une garde. Choix d'une carte alliée bénéficiaire.`);return s;
      }
      if(value==='retry'){
        s.phase='clover';addLog(s,'effect',`${c.name} obtient un trèfle. Choix d'une carte alliée bénéficiaire.`);return s;
      }
      if(value==='mana'){
        s.phase='potion';addLog(s,'effect',`${c.name} obtient une potion magique. Choix d'une carte alliée bénéficiaire.`);return s;
      }
      if(value==='buff_atk'){
        s.phase='physical';addLog(s,'effect',`${c.name} obtient une puissance physique. Choix d'une carte alliée bénéficiaire.`);return s;
      }
      if(value==='revive'){
        s.phase='heart';addLog(s,'effect',`${c.name} obtient un cœur. Choix d'une carte alliée bénéficiaire.`);return s;
      }
      if(typeof value!=='number'&&value!=='death')throw new Error('Effet ATK inconnu : '+value);
      if(typeof value==='number'){
        const key=d.magic?'mana':'physical';d.buff=u[key]||0;u[key]=0;
      }
      s.phase='defense';return s;
    }
    function rollDefense(s,forced) {
      if(s.phase!=='defense')throw new Error('Jet DEF indisponible.');
      const d=s.duel,a=s.players[d.side].board[d.attackerSlot],b=s.players[1-d.side].board[d.targetSlot],ac=card(a),bc=card(b);
      const die=roll(s,forced),value=dieValue(bc,'def',die);
      // A saved failed attempt remains visible until the automatic die actually rolls.
      delete d.formula;
      d.defenseRolls.push(die);d.defenseDie=die;d.defenseValue=value;
      addLog(s,'roll',`${bc.name} : DEF D${die} = ${value}.`);
      if(value==='retry')return s;
      if(value==='dodge')return finish(s,`${bc.name} esquive. L'attaque est annulée.`);
      if(value==='shield_physical'||value==='shield_magic'){
        if((value==='shield_magic')===d.magic)return finish(s,`${bc.name} annule l'attaque avec son bouclier.`);
        addLog(s,'effect','Bouclier inadapté : nouveau jet DEF.');return s;
      }
      if(typeof value!=='number')throw new Error('Effet DEF inconnu : '+value);
      if(d.attackValue==='death'){
        const killed=eliminate(s);
        return finish(s,killed?`${ac.name} déclenche Mort : ${bc.name} est éliminé.`:`${bc.name} consomme son cœur et survit à Mort grâce au Reraise.`);
      }
      // Keep a consumed ward on the duel, including across a saved defense reroll.
      if(!d.magic&&!d.ward&&b.ward){d.ward=b.ward;b.ward=0;}
      const f={baseAttack:d.attackValue,weapon:data.weapons[ac.weapon]?.[bc.weapon]||0,element:elementModifier(ac,bc),faction:synergy(s.players[d.side],a,'faction'),buff:d.buff,barrier:d.magic&&bc.element!=='NONE'&&bc.barriers.includes(die)?-rules.barrier:0,baseDefense:value,race:synergy(s.players[1-d.side],b,'race'),magic:d.magic,
        arenaAttack:arenaBonuses(s,a).attack,arenaDefense:arenaBonuses(s,b).defense,ward:d.magic?0:d.ward};
      f.attack=Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack);f.defense=Math.max(0,f.baseDefense+f.race+f.arenaDefense+f.ward);
      const lethal=f.attack>f.defense;
      if(lethal&&b.luck){
        b.luck=0;d.luckUsed=b.uid;d.autoDefense=true;d.failedDefense=clone(f);d.formula=clone(f);
        addLog(s,'effect',`${bc.name} : DEF ${f.defense} < ATK ${f.attack}. Trèfle consommé : relance DEF automatique.`,f);
        return s;
      }
      const killed=lethal&&eliminate(s);
      return finish(s,killed?`${bc.name} est éliminé.`:lethal?`${bc.name} consomme son cœur : Reraise, la carte reste en jeu.`:f.attack===f.defense?'Égalité : la défense tient.':`${bc.name} résiste.`,f);
    }
    function findReplacement(s) {
      for(let offset=0;offset<2;offset++){
        const side=(s.turn+offset)%2,p=s.players[side];
        if(p.board.some((u,slot)=>!u&&p.reserve.some(r=>card(r).positions.includes(slot+1)))){
          s.phase='replace';s.replacing=side;return;
        }
      }
      s.replacing=null;
      const alive=s.players.map(p=>p.board.some(Boolean));
      if(!alive[0]||!alive[1]){s.phase='over';s.winner=alive[0]?0:alive[1]?1:'draw';addLog(s,'end',s.winner==='draw'?'Match nul.':`${s.winner===0?'Joueur':'Adversaire'} remporte la partie.`);return;}
      if(s.round>rules.max_turns){s.phase='over';s.winner='draw';addLog(s,'end','Limite de 200 échanges : match nul de démo.');return;}
      s.phase='choose';s.duel=null;
    }
    function next(s) {
      if(s.phase!=='result')throw new Error('Le duel doit être résolu.');
      s.turn=1-s.turn;s.round++;findReplacement(s);return s;
    }
    function legalTargets(s){
      return s.players[s.turn].board.flatMap((a,i)=>a?s.players[1-s.turn].board.flatMap((b,j)=>b?[[i,j]]:[]):[]);
    }
    function aiChoice(s) {
      let best=null,score=-Infinity;
      for(const [i,j] of legalTargets(s)){
        const a=s.players[s.turn].board[i],b=s.players[1-s.turn].board[j],ac=card(a),bc=card(b);
        const v=mean(ac.atk)-mean(bc.defense)+(data.weapons[ac.weapon]?.[bc.weapon]||0)+elementModifier(ac,bc)+synergy(s.players[s.turn],a,'faction')-synergy(s.players[1-s.turn],b,'race')-rules.barrier*ac.magic.length/6*(bc.element==='NONE'?0:bc.barriers.length)/6+(ac.atk.includes('death')?35:0)+(ac.atk.includes('revive')&&!a.reraise?20:0)-(b.reraise?25:0)+arenaBonuses(s,a).attack-arenaBonuses(s,b).defense-(b.ward||0)*ac.atk.filter((v,i)=>typeof v==='number'&&!ac.magic.includes(6-i)).length/6;
        if(v>score){score=v;best=[i,j];}
      }
      return best;
    }
    function assertState(s) {
      assertV4(s);
      if(Object.hasOwn(s,'deckCoverage')&&![1,2].includes(s.deckCoverage))throw new Error('Couverture de deck invalide : 1 ou 2 requis.');
      if(!Array.isArray(s.players)||s.players.length!==2)throw new Error('Sauvegarde incompatible.');
      validatePerformance(s);
      const phases=['setup','choose','attack','defense','clover','potion','physical','heart','guard','result','replace','over'];
      const validText=(v,n=1000)=>typeof v==='string'&&v.length<=n;
      if(!phases.includes(s.phase)||![0,1].includes(s.turn)||!['ai','local'].includes(s.mode)||!Number.isInteger(s.round)||s.round<1||s.round>201||!Number.isInteger(s.rng)||s.rng<1||s.rng>4294967295||!validText(s.seed,60))throw new Error('Phase invalide.');
      if(![null,0,1].includes(s.replacing)||!([null,0,1,'draw'].includes(s.winner)))throw new Error('Etat invalide.');
      if(s.phase==='replace'&&s.replacing===null||s.phase==='over'&&s.winner===null)throw new Error('Etat incomplet.');
      if(typeof s.matchId!=='string'||!/^match-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s.matchId))throw new Error('Identifiant de rencontre invalide.');
      const instanceIds=new Set();
      for(let side=0;side<2;side++){
        const p=s.players[side];if(!p||!Array.isArray(p.board)||p.board.length!==5||p.board.some(u=>u!==null&&(!u||typeof u!=='object'))||!Array.isArray(p.reserve)||!Array.isArray(p.dead))throw new Error('Plateau invalide.');
        const all=[...p.board.filter(Boolean),...p.reserve,...p.dead];
        if(all.some(u=>u&&(!validCardId(u.cardId)||typeof u.instanceId==='string'&&/^K[23]-/.test(u.instanceId))))throw new Error('Partie historique incompatible : identifiants K4 et cartes du catalogue V4 requis.');
        if(all.length!==10||all.some(u=>!u||!byId[u.cardId]||!new RegExp('^'+side+'-[0-9]$').test(u.uid)||typeof u.revived!=='boolean'||![0,60].includes(u.mana)||![0,60].includes(u.physical)||![0,60].includes(u.ward))||new Set(all.map(u=>u.uid)).size!==10||validateDeck(all.map(u=>u.cardId),{coverage:s.deckCoverage??1}).length)throw new Error('Cartes de sauvegarde invalides.');
        for(const u of all){
          if(typeof u.entered!=='boolean'||typeof u.instanceId!=='string'||!new RegExp('^K4-'+u.cardId+'-00[1-4]$').test(u.instanceId)||instanceIds.has(u.instanceId))throw new Error('Identité de carte invalide.');
          instanceIds.add(u.instanceId);
        }
        for(let slot=0;slot<5;slot++)if(p.board[slot]&&!card(p.board[slot]).positions.includes(slot+1))throw new Error('Position invalide.');
        if(all.some(u=>![0,1].includes(u.reraise)))throw new Error('Reraise invalide.');
        if(all.some(u=>![0,1].includes(u.luck)))throw new Error('Trèfle invalide.');
      }
      const logTypes=['start','deploy','target','roll','result','death','effect','end'];
      if(!Array.isArray(s.log)||s.log.length>10000||s.log.some(l=>!l||!logTypes.includes(l.type)||!validText(l.text)||!Number.isInteger(l.n)||!Number.isInteger(l.turn)))throw new Error('Journal invalide.');
      const effects=['retry','mana','buff_atk','revive','guard','death','dodge','shield_physical','shield_magic'];
      const units=s.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead]);
      for(const d of [s.duel,s.lastDuel])if(d!==null){
        if(!d||![0,1].includes(d.side)||![d.attackerSlot,d.targetSlot].every(v=>Number.isInteger(v)&&v>=0&&v<5)||!validText(d.attackerName,80)||!validText(d.targetName,80)||!new RegExp('^'+d.side+'-[0-9]$').test(d.attacker)||!new RegExp('^'+(1-d.side)+'-[0-9]$').test(d.target))throw new Error('Duel invalide.');
        for(const rolls of [d.attackRolls,d.defenseRolls])if(!Array.isArray(rolls)||rolls.length>1000||rolls.some(v=>!Number.isInteger(v)||v<1||v>6))throw new Error('Jets invalides.');
        for(const v of [d.attackValue,d.defenseValue])if(v!==undefined&&!(Number.isFinite(v)&&v>=0&&v<=1000)&&!effects.includes(v))throw new Error('Valeur de de invalide.');
        if(d.outcome!==undefined&&!validText(d.outcome))throw new Error('Resultat invalide.');
        if(![0,60].includes(d.buff)||![0,60].includes(d.ward)||d.ward&&(d.magic||typeof d.attackValue!=='number'||!d.defenseRolls.length))throw new Error('Trait consommé invalide.');
        const author=card(units.find(u=>u.uid===d.attacker));
        if(d.attackValue==='guard'&&!canGuard(author)||d.attackValue==='revive'&&!canHeal(author))throw new Error('Soutien incompatible avec le profil V4.');
        for(const f of [d.formula,d.failedDefense])if(f!==undefined){
          const fields=['baseAttack','weapon','element','faction','buff','barrier','baseDefense','race','attack','defense','arenaAttack','arenaDefense','ward'];
          if(!f||fields.some(k=>!Number.isInteger(f[k])||Math.abs(f[k])>2000)||typeof f.magic!=='boolean'||f.magic!==d.magic||
            f.arenaAttack<0||f.arenaAttack>25||f.arenaDefense<0||f.arenaDefense>10||![0,60].includes(f.ward)||f.ward!==d.ward||f.magic&&f.ward||
            f.baseAttack!==d.attackValue||f.buff!==d.buff||
            f.attack!==Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack)||
            f.defense!==Math.max(0,f.baseDefense+f.race+f.arenaDefense+f.ward))throw new Error('Calcul V4 invalide.');
        }
        if(d.autoDefense!==undefined&&typeof d.autoDefense!=='boolean')throw new Error('Relance automatique invalide.');
        if(d.cloverGranted!==undefined&&(!new RegExp('^'+d.side+'-[0-9]$').test(d.cloverGranted)||d.attackValue!=='retry'))throw new Error('Bénéficiaire invalide.');
        if(d.manaGranted!==undefined&&(!new RegExp('^'+d.side+'-[0-9]$').test(d.manaGranted)||d.attackValue!=='mana'))throw new Error('Bénéficiaire de potion invalide.');
        if(d.physicalGranted!==undefined&&(!new RegExp('^'+d.side+'-[0-9]$').test(d.physicalGranted)||d.attackValue!=='buff_atk'))throw new Error('Bénéficiaire de puissance physique invalide.');
        if(d.reraiseGranted!==undefined&&(!new RegExp('^'+d.side+'-[0-9]$').test(d.reraiseGranted)||d.attackValue!=='revive'))throw new Error('Bénéficiaire de Reraise invalide.');
        if(d.guardGranted!==undefined&&(!new RegExp('^'+d.side+'-[0-9]$').test(d.guardGranted)||d.attackValue!=='guard'))throw new Error('Bénéficiaire de garde invalide.');
        if(d.luckUsed!==undefined&&(d.luckUsed!==d.target||!d.failedDefense||d.failedDefense.attack<=d.failedDefense.defense))throw new Error('Trèfle consommé invalide.');
        if(d.autoDefense&&(!d.luckUsed||typeof d.attackValue!=='number'||!d.defenseRolls.length))throw new Error('Seconde chance invalide.');
      }
      if(['attack','defense','clover','potion','physical','heart','guard','result'].includes(s.phase)&&!s.duel)throw new Error('Duel manquant.');
      if(['attack','defense','clover','potion','physical','heart','guard'].includes(s.phase)){
        const d=s.duel;
        if(d.side!==s.turn||s.players[d.side].board[d.attackerSlot]?.uid!==d.attacker||s.players[1-d.side].board[d.targetSlot]?.uid!==d.target)throw new Error('Participants invalides.');
      }
      if(s.phase==='attack'&&(s.duel.attackRolls.length||s.duel.defenseRolls.length||s.duel.attackValue!==undefined||s.duel.buff||s.duel.ward))throw new Error('Jet ATK déjà effectué.');
      if(s.phase==='clover'&&(s.duel.attackValue!=='retry'||s.duel.cloverGranted||s.duel.defenseRolls.length||!s.duel.attackRolls.length))throw new Error('Attribution de trèfle invalide.');
      if(s.phase==='potion'&&(s.duel.attackValue!=='mana'||s.duel.manaGranted||s.duel.defenseRolls.length||!s.duel.attackRolls.length))throw new Error('Attribution de potion invalide.');
      if(s.phase==='physical'&&(s.duel.attackValue!=='buff_atk'||s.duel.physicalGranted||s.duel.defenseRolls.length||s.duel.attackRolls.length!==1||s.duel.buff||s.duel.ward||typeof s.duel.magic!=='boolean'))throw new Error('Attribution de puissance physique invalide.');
      if(s.phase==='heart'&&(s.duel.attackValue!=='revive'||s.duel.reraiseGranted||s.duel.defenseRolls.length||!s.duel.attackRolls.length))throw new Error('Attribution de Reraise invalide.');
      if(s.phase==='guard'&&(s.duel.attackValue!=='guard'||s.duel.guardGranted||s.duel.defenseRolls.length||s.duel.attackRolls.length!==1||s.duel.ward||s.duel.buff||typeof s.duel.magic!=='boolean'))throw new Error('Attribution de garde invalide.');
      if(s.phase==='result'&&s.duel.attackValue==='guard'){
        const recipient=s.players[s.duel.side].board.find(u=>u?.uid===s.duel.guardGranted);
        if(!recipient||recipient.ward!==60)throw new Error('Bénéficiaire de garde absent du plateau.');
      }
      if(s.phase==='result'&&s.duel.physicalGranted){
        const recipient=s.players[s.duel.side].board.find(u=>u?.uid===s.duel.physicalGranted);
        if(!recipient||recipient.physical!==60)throw new Error('Bénéficiaire de puissance physique absent du plateau.');
      }
      if(s.phase==='defense'&&(!s.duel.attackRolls.length||typeof s.duel.magic!=='boolean'||typeof s.duel.attackValue!=='number'&&s.duel.attackValue!=='death'))throw new Error('Attaque en attente invalide.');
      if(s.duel?.ward&&units.find(u=>u.uid===s.duel.target).ward!==0)throw new Error('Garde déjà consommée.');
      if(s.duel?.autoDefense&&(s.phase!=='defense'||s.players[1-s.duel.side].board[s.duel.targetSlot]?.luck!==0))throw new Error('Seconde chance déjà consommée.');
      return true;
    }
    function assertV4(s){
      if(s&&[1,2,3,4,5].includes(s.schema))throw new Error('Partie V2 incompatible avec la V4 : import refusé. Démarrez une nouvelle partie V4 ; vos sauvegardes et statistiques V2 restent séparées.');
      if(!s||s.schema!==6||s.edition!=='V4')throw new Error('Sauvegarde incompatible : schéma 6 et edition V4 requis.');
    }
    function restoreGame(value) {
      assertState(value);
      return clone(value);
    }
    return {data,rules,byId,card,trait,traits,clone,dieValue,mean,lineup,deckCoverage,validateDeck,validatePlayableDeck,newGame,deploy,recall,autoDeploy,start,synergy,elementModifier,lock,rollAttack,rollDefense,grantClover,grantPotion,grantPhysical,grantReraise,grantGuard,aiCloverChoice,aiPotionChoice,aiPhysicalChoice,aiReraiseChoice,aiGuardChoice,arenaBonuses,setArena,next,aiChoice,assertState,restoreGame,matchStats,instanceId};
  }
  return {createEngine,clone,dieValue,mean};
});
