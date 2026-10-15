(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KalistarEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const dieValue = (card, side, die) => card[side === 'atk' ? 'atk' : 'defense'][6 - die];
  const mean = values => { const numbers = values.filter(Number.isFinite); return numbers.reduce((a,b)=>a+b,0)/numbers.length; };
  function createEngine(data) {
    const byId = Object.fromEntries(data.cards.map(c => [c.id,c]));
    const rules = { ...data.rules, ...data.demo };
    const card = unit => byId[unit.cardId];
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
    function validateDeck(ids) {
      const errors=[];
      if(!Array.isArray(ids)||ids.length>10)return ['Le deck doit contenir exactement 10 cartes.'];
      if(ids.length!==rules.deck_size)errors.push('Le deck doit contenir exactement 10 cartes.');
      if(ids.some(id=>!byId[id]))errors.push('Carte inconnue dans le deck.');
      const counts={};for(const id of ids)counts[id]=(counts[id]||0)+1;
      if(Object.values(counts).some(n=>n>rules.copy_limit))errors.push('Deux exemplaires maximum par version.');
      if(ids.filter(id=>byId[id]?.element==='RAINBOW').length>rules.rainbow_limit)errors.push('Une seule carte Rainbow par deck.');
      if(!lineup(ids))errors.push('Une formation complète P1 à P5 est nécessaire.');
      return errors;
    }
    function addLog(s,type,text,details) {
      s.log.push({n:s.log.length+1,turn:s.round,type,text,...(details?{details}: {})});
    }
    function newGame(deckA,deckB,options={}) {
      for(const deck of [deckA,deckB]){const e=validateDeck(deck);if(e.length)throw new Error(e.join(' '));}
      const seed=String(options.seed || 'KALISTAR');let random=2166136261;
      for(const char of seed)random=Math.imul(random^char.charCodeAt(0),16777619)>>>0;
      const s={schema:3,phase:'setup',turn:0,round:1,rng:random||1,seed,mode:options.mode||'ai',players:[],log:[],duel:null,lastDuel:null,winner:null,replacing:null};
      [deckA,deckB].forEach((deck,side)=>s.players.push({board:Array(5).fill(null),reserve:deck.map((id,i)=>({uid:side+'-'+i,cardId:id,revived:false,reraise:0,luck:0,mana:0,physical:0})),dead:[]}));
      addLog(s,'start','Deux decks de 10 cartes. Formation en cours.');
      return s;
    }
    function deploy(s,side,uid,slot) {
      if(s.phase!=='setup' && !(s.phase==='replace'&&s.replacing===side))throw new Error('Déploiement indisponible.');
      if(!Number.isInteger(slot)||slot<0||slot>4)throw new Error('Position invalide.');
      const p=s.players[side],index=p.reserve.findIndex(u=>u.uid===uid);
      if(index<0||p.board[slot])throw new Error('Emplacement ou carte indisponible.');
      const u=p.reserve[index];if(!card(u).positions.includes(slot+1))throw new Error('Position incompatible.');
      p.reserve.splice(index,1);p.board[slot]=u;
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
      s.phase='choose';addLog(s,'start','Le joueur ouvre le combat.');return s;
    }
    function synergy(p,u,field) {
      const n=p.board.filter(other=>other&&card(other)[field]===card(u)[field]).length;
      return rules.synergy[Math.min(n,5)]||0;
    }
    function elementModifier(a,b) {
      if(!a.element||!b.element||a.element==='NONE'||b.element==='NONE'||a.element===b.element)return 0;
      if(a.element==='RAINBOW')return 40;
      if(b.element==='RAINBOW')return -40;
      const e=data.elements[a.element];
      if(e.strong_against===b.element)return a.advantage??30;
      if(e.weak_against===b.element)return -(a.disadvantage??30);
      return 0;
    }
    function lock(s,attackerSlot,targetSlot) {
      if(s.phase!=='choose')throw new Error('Un duel est déjà engagé.');
      const a=s.players[s.turn].board[attackerSlot],b=s.players[1-s.turn].board[targetSlot];
      if(!a||!b)throw new Error('Attaquant et cible requis.');
      s.duel={side:s.turn,attackerSlot,targetSlot,attacker:a.uid,target:b.uid,attackerName:card(a).name,targetName:card(b).name,attackRolls:[],defenseRolls:[],buff:0};
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
      s.lastDuel=clone(s.duel);s.phase='result';addLog(s,'result',outcome,formula);return s;
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
    function grantReraise(s) {
      const d=s.duel,u=s.players[d.side].board[d.attackerSlot],already=u.reraise===1;
      u.reraise=1;d.reraiseGranted=u.uid;
      return finish(s,already?`${card(u).name} conserve son cœur actif. Reraise ne se cumule pas.`:`${card(u).name} gagne un cœur. Reraise actif.`);
    }
    function grantClover(s,uid) {
      if(s.phase!=='clover')throw new Error('Attribution du trèfle indisponible.');
      const u=s.players[s.duel.side].board.find(u=>u?.uid===uid);
      if(!u)throw new Error('Choisissez une carte de votre plateau.');
      const already=u.luck===1;u.luck=1;s.duel.cloverGranted=uid;
      return finish(s,already?`${card(u).name} conserve son trèfle actif. Aucun cumul.`:`${card(u).name} reçoit un trèfle : seconde chance en défense.`);
    }
    function aiCloverChoice(s) {
      // Only public board information; keep a scarce token on an unprotected ally.
      return s.players[s.turn].board.filter(Boolean).sort((a,b)=>
        (a.luck-b.luck)*10000+(a.reraise-b.reraise)*1000+mean(card(a).defense)-mean(card(b).defense))[0]?.uid;
    }
    function rollAttack(s,forced) {
      if(s.phase!=='attack')throw new Error('Jet ATK indisponible.');
      const d=s.duel,u=s.players[d.side].board[d.attackerSlot],c=card(u),die=roll(s,forced),value=dieValue(c,'atk',die);
      d.attackRolls.push(die);d.attackDie=die;d.attackValue=value;d.magic=c.magic.includes(die);
      addLog(s,'roll',`${c.name} : ATK D${die} = ${value}.`);
      if(value==='retry'){
        s.phase='clover';addLog(s,'effect',`${c.name} obtient un trèfle. Choix d'une carte alliée bénéficiaire.`);return s;
      }
      if(value==='mana'||value==='buff_atk'){
        const key=value==='mana'?'mana':'physical';u[key]=rules.token_bonus;
        return finish(s,`${c.name} prépare +${rules.token_bonus} ${value==='mana'?'ATK magique':'ATK physique'}. Action de soutien.`);
      }
      if(value==='revive')return grantReraise(s);
      if(typeof value!=='number'&&value!=='death')throw new Error('Effet ATK inconnu : '+value);
      if(typeof value==='number'){
        const key=d.magic?'mana':'physical';d.buff=u[key]||0;u[key]=0;
      }
      s.phase='defense';return s;
    }
    function rollDefense(s,forced) {
      if(s.phase!=='defense')throw new Error('Jet DEF indisponible.');
      const d=s.duel,a=s.players[d.side].board[d.attackerSlot],b=s.players[1-d.side].board[d.targetSlot],ac=card(a),bc=card(b);
      // A saved failed attempt remains visible until the automatic die actually rolls.
      delete d.formula;
      const die=roll(s,forced),value=dieValue(bc,'def',die);d.defenseRolls.push(die);d.defenseDie=die;d.defenseValue=value;
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
      const f={baseAttack:d.attackValue,weapon:data.weapons[ac.weapon]?.[bc.weapon]||0,element:elementModifier(ac,bc),faction:synergy(s.players[d.side],a,'faction'),buff:d.buff,barrier:d.magic&&bc.barriers.includes(die)?-rules.barrier:0,baseDefense:value,race:synergy(s.players[1-d.side],b,'race'),magic:d.magic};
      f.attack=Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier);f.defense=Math.max(0,f.baseDefense+f.race);
      const lethal=f.attack>f.defense;
      if(lethal&&b.luck){
        b.luck=0;d.luckUsed=b.uid;d.autoDefense=true;d.failedDefense=clone(f);d.formula=clone(f);
        addLog(s,'effect',`${bc.name} : DEF ${f.defense} < ATK ${f.attack}. Trèfle consommé : relance DEF automatique, avant le Reraise.`,f);
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
        const v=mean(ac.atk)-mean(bc.defense)+(data.weapons[ac.weapon]?.[bc.weapon]||0)+elementModifier(ac,bc)+synergy(s.players[s.turn],a,'faction')-synergy(s.players[1-s.turn],b,'race')-rules.barrier*ac.magic.length/6*bc.barriers.length/6+(ac.atk.includes('death')?35:0)+(ac.atk.includes('revive')&&!a.reraise?20:0)-(b.reraise?25:0);
        if(v>score){score=v;best=[i,j];}
      }
      return best;
    }
    function assertState(s) {
      if(!s||![1,2,3].includes(s.schema)||!Array.isArray(s.players)||s.players.length!==2)throw new Error('Sauvegarde incompatible.');
      const phases=['setup','choose','attack','defense','clover','revive','result','replace','over'];
      const validText=(v,n=1000)=>typeof v==='string'&&v.length<=n;
      if(!phases.includes(s.phase)||![0,1].includes(s.turn)||!['ai','local'].includes(s.mode)||!Number.isInteger(s.round)||s.round<1||s.round>201||!Number.isInteger(s.rng)||s.rng<1||s.rng>4294967295||!validText(s.seed,60))throw new Error('Phase invalide.');
      if(![null,0,1].includes(s.replacing)||!([null,0,1,'draw'].includes(s.winner)))throw new Error('Etat invalide.');
      if(s.phase==='replace'&&s.replacing===null||s.phase==='over'&&s.winner===null)throw new Error('Etat incomplet.');
      if(s.schema>=2&&s.phase==='revive'||s.schema<3&&s.phase==='clover')throw new Error('Phase incompatible avec la sauvegarde.');
      for(let side=0;side<2;side++){
        const p=s.players[side];if(!p||!Array.isArray(p.board)||p.board.length!==5||!Array.isArray(p.reserve)||!Array.isArray(p.dead))throw new Error('Plateau invalide.');
        const all=[...p.board.filter(Boolean),...p.reserve,...p.dead];
        if(all.length!==10||all.some(u=>!u||!byId[u.cardId]||!new RegExp('^'+side+'-[0-9]$').test(u.uid)||typeof u.revived!=='boolean'||![0,60].includes(u.mana)||![0,60].includes(u.physical))||new Set(all.map(u=>u.uid)).size!==10||validateDeck(all.map(u=>u.cardId)).length)throw new Error('Cartes de sauvegarde invalides.');
        for(let slot=0;slot<5;slot++)if(p.board[slot]&&!card(p.board[slot]).positions.includes(slot+1))throw new Error('Position invalide.');
        if(s.schema>=2&&all.some(u=>![0,1].includes(u.reraise)))throw new Error('Reraise invalide.');
        if(s.schema===3&&all.some(u=>![0,1].includes(u.luck)))throw new Error('Trèfle invalide.');
      }
      const logTypes=['start','deploy','target','roll','result','death','effect','end'];
      if(!Array.isArray(s.log)||s.log.length>10000||s.log.some(l=>!l||!logTypes.includes(l.type)||!validText(l.text)||!Number.isInteger(l.n)||!Number.isInteger(l.turn)))throw new Error('Journal invalide.');
      const effects=['retry','mana','buff_atk','revive','death','dodge','shield_physical','shield_magic'];
      for(const d of [s.duel,s.lastDuel])if(d!==null){
        if(!d||![0,1].includes(d.side)||![d.attackerSlot,d.targetSlot].every(v=>Number.isInteger(v)&&v>=0&&v<5)||!validText(d.attackerName,80)||!validText(d.targetName,80)||!new RegExp('^'+d.side+'-[0-9]$').test(d.attacker)||!new RegExp('^'+(1-d.side)+'-[0-9]$').test(d.target))throw new Error('Duel invalide.');
        for(const rolls of [d.attackRolls,d.defenseRolls])if(!Array.isArray(rolls)||rolls.length>1000||rolls.some(v=>!Number.isInteger(v)||v<1||v>6))throw new Error('Jets invalides.');
        for(const v of [d.attackValue,d.defenseValue])if(v!==undefined&&!(Number.isFinite(v)&&v>=0&&v<=1000)&&!effects.includes(v))throw new Error('Valeur de de invalide.');
        if(d.outcome!==undefined&&!validText(d.outcome))throw new Error('Resultat invalide.');
        for(const f of [d.formula,d.failedDefense])if(f){const fields=['baseAttack','weapon','element','faction','buff','barrier','baseDefense','race','attack','defense'];if(fields.some(k=>!Number.isFinite(f[k])||Math.abs(f[k])>2000)||typeof f.magic!=='boolean')throw new Error('Calcul invalide.');}
        if(d.autoDefense!==undefined&&typeof d.autoDefense!=='boolean')throw new Error('Relance automatique invalide.');
        if(d.cloverGranted!==undefined&&(!new RegExp('^'+d.side+'-[0-9]$').test(d.cloverGranted)||d.attackValue!=='retry'))throw new Error('Bénéficiaire invalide.');
        if(d.luckUsed!==undefined&&(d.luckUsed!==d.target||!d.failedDefense||d.failedDefense.attack<=d.failedDefense.defense))throw new Error('Trèfle consommé invalide.');
        if(d.autoDefense&&(!d.luckUsed||typeof d.attackValue!=='number'||!d.defenseRolls.length))throw new Error('Seconde chance invalide.');
      }
      if(['attack','defense','clover','revive','result'].includes(s.phase)&&!s.duel)throw new Error('Duel manquant.');
      if(['attack','defense','clover','revive'].includes(s.phase)){
        const d=s.duel;
        if(d.side!==s.turn||s.players[d.side].board[d.attackerSlot]?.uid!==d.attacker||s.players[1-d.side].board[d.targetSlot]?.uid!==d.target)throw new Error('Participants invalides.');
      }
      if(s.schema===3){
        if(s.phase==='clover'&&(s.duel.attackValue!=='retry'||s.duel.cloverGranted||s.duel.defenseRolls.length))throw new Error('Attribution de trèfle invalide.');
        if(s.duel?.autoDefense&&(s.phase!=='defense'||s.players[1-s.duel.side].board[s.duel.targetSlot]?.luck!==0))throw new Error('Seconde chance déjà consommée.');
      }
      return true;
    }
    function restoreGame(value) {
      assertState(value);
      const s=clone(value);
      if(s.schema===1){
        for(const p of s.players)for(const u of [...p.board.filter(Boolean),...p.reserve,...p.dead])u.reraise=0;
        s.schema=2;
        // Resolve an old pending heart without changing past casualties or reserves.
        if(s.phase==='revive')grantReraise(s);
        addLog(s,'effect','Sauvegarde conservée. Le cœur accorde désormais un Reraise à sa carte.');
      }
      if(s.schema===2){
        for(const p of s.players)for(const u of [...p.board.filter(Boolean),...p.reserve,...p.dead])u.luck=0;
        s.schema=3;
        if(s.phase==='attack'&&s.duel?.attackValue==='retry')s.phase='clover';
        if(value.schema===2)addLog(s,'effect','Sauvegarde conservée. Le trèfle ATK accorde désormais une seconde chance à une carte alliée.');
      }
      assertState(s);return s;
    }
    return {data,rules,byId,card,clone,dieValue,mean,lineup,validateDeck,newGame,deploy,recall,autoDeploy,start,synergy,elementModifier,lock,rollAttack,rollDefense,grantClover,aiCloverChoice,next,aiChoice,assertState,restoreGame};
  }
  return {createEngine,clone,dieValue,mean};
});
