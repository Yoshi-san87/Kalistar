'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),Q=require('../../site/equipment.js'),{createEngine}=require('../../site/engine.js');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const slotNames=['weapon','shield','relic'],variants=['none','weapon','shield','relic','all'];
const empty=()=>Object.fromEntries(slotNames.map(k=>[k,{}]));
function random(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
function fingerprints(){return Object.fromEntries(['engine.js','equipment.js','weapons.js','defensive-equipment.js','turn-order.js','factions.js'].map(file=>[file,hash(fs.readFileSync(path.join(root,'V4/site',file)))]));}
const sourceHashes=fingerprints();
const published=()=>JSON.parse(fs.readFileSync(path.join(root,'V4/donnees/catalogue.json'),'utf8')).cards.filter(c=>c.kind==='created');
function gameplayHash(data){return hash(JSON.stringify({cards:data.cards.map(c=>({id:c.id,characterId:c.characterId,positions:c.positions,role:c.role,sentry:c.sentry,canGuard:c.canGuard,canHeal:c.canHeal,atk:c.atk,defense:c.defense,magic:c.magic,barriers:c.barriers,weapon:c.weapon,race:c.race,faction:c.faction,element:c.element,advantage:c.advantage,disadvantage:c.disadvantage})),elements:data.elements,weapons:data.weapons,arenas:data.arenas,rules:data.rules,demo:data.demo,decks:data.decks}));}
function legalDeck(E,r,preferred=[],required=[]){
  for(let attempt=0;attempt<2500;attempt++){
    const picked=required.slice(),used=new Set(picked.map(c=>c.characterId));
    const pool=shuffle(preferred,r).concat(shuffle(E.data.cards,r));
    for(const c of pool){if(picked.length===10)break;if(used.has(c.characterId)||c.element==='RAINBOW'&&picked.some(v=>v.element==='RAINBOW'))continue;used.add(c.characterId);picked.push(c);}
    const ids=picked.map(c=>c.id);if(!E.validatePlayableDeck(ids).length)return ids;
  }
  throw Error('No valid deck for audit sample.');
}
function outfit(E,ids,variant,r){
  const out=empty(),used=new Set();if(variant==='none')return out;
  for(const id of ids){const c=E.byId[id];for(const slot of slotNames){if(variant!=='all'&&variant!==slot)continue;const choices=Q.catalogue.weapons.filter(w=>w.slot===slot&&!used.has(w.id)&&Q.compatible(w,c));if(!choices.length)continue;const w=choices[Math.floor(r()*choices.length)];out[slot][c.characterId]=w.id;used.add(w.id);}}
  Q.validateLoadout(out,ids.map(id=>E.byId[id]));return out;
}
function team(E,ids,equipment){return {name:'Audit V4.6',cards:ids.slice(),formation:E.lineup(ids).map(i=>ids[i]),captain:ids[E.lineup(ids)[0]],equipment};}
function publicChoice(E,s,policy,r){
  if(policy==='production')return E.aiChoice(s);
  const pairs=[];for(let i=0;i<5;i++)if(s.players[s.turn].board[i])for(let j=0;j<5;j++)if(s.players[1-s.turn].board[j])pairs.push([i,j]);
  return pairs[Math.floor(r()*pairs.length)];
}
const support={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
function run(E,A,B,{seed,arenaId,policy='production',fullChecks=false,restore=false}={}){
  let s=E.newGame(A,B,{seed,mode:'local',turnOrder:'ABBA',arenaId}),steps=0,events=0,checks=0,reloads=0;
  const r=random(parseInt(hash(seed+'-policy').slice(0,8),16)),gear={},totals={numericDuels:0,defenseAttempts:0,attack6:0,defense6:0,weaponUses:0,protectionUses:0,weaponPoints:0,protectionPoints:0,relicUses:0,relicPoints:0,protectionFailed:0,protectionKilled:0,weaponEligible:0,protectionEligible:0,discardedSixes:0,shards:0,close:false,leadChanges:0,score:[0,0],maxDeficit:[0,0],longestNoKill:0};
  let lastLead=null,noKill=0;
  const addGear=(entry,kind,points)=>{if(!entry)return;const x=gear[entry.weaponId]||(gear[entry.weaponId]={kind,uses:0,points:0,grants:0});x.uses++;x.points+=points;};
  while(s.phase!=='over'&&steps++<5000){
    const phase=s.phase;
    if(phase==='initiative')E.rollInitiative(s);
    else if(phase==='choose')E.lock(s,...publicChoice(E,s,policy,r));
    else if(phase==='attack')E.rollAttack(s);
    else if(phase==='kalistel'){
      const use=policy==='production'?E.aiUseKalistel(s):s.duel.attackDie<=2;
      if(use){if(s.duel.attackDie===6)totals.discardedSixes++;E.useKalistel(s);totals.shards++;}else E.acceptAttack(s);
    }
    else if(phase==='defense'){
      E.rollDefense(s);const d=s.duel;if(d.formula){totals.defenseAttempts++;if(d.defenseDie===6)totals.defense6++;}
    }
    else if(phase==='result'){
      if(E.equipmentChoice(s))E.grantEquipment(s,E.aiEquipmentChoice(s));else E.next(s);
    }
    else if(phase==='replace')E.autoDeploy(s,s.replacing);
    else {const pair=support[phase];assert(pair,'Unhandled phase '+phase);E[pair[0]](s,E[pair[1]](s));}
    if(fullChecks||steps%64===0){E.assertState(s);checks++;}
    if(restore&&steps%71===0){const resumed=E.restoreGame(JSON.parse(JSON.stringify(s)));assert.deepEqual(resumed,s);s=resumed;reloads++;}
    if(s.match.events.length>events){
      events=s.match.events.length;const e=s.match.events.at(-1),d=s.duel,f=d.formula;
      if(e.kill){totals.score[d.side]++;noKill=0;}else totals.longestNoKill=Math.max(totals.longestNoKill,++noKill);
      totals.maxDeficit[0]=Math.max(totals.maxDeficit[0],totals.score[1]-totals.score[0]);totals.maxDeficit[1]=Math.max(totals.maxDeficit[1],totals.score[0]-totals.score[1]);
      const leader=totals.score[0]===totals.score[1]?null:totals.score[0]>totals.score[1]?0:1;if(leader!==null){if(lastLead!==null&&leader!==lastLead)totals.leadChanges++;lastLead=leader;}
      if(f){
        totals.numericDuels++;totals.attack6+=Number(d.attackDie===6);
        const a=E.data.cards.find(c=>c.id===s.players.flatMap(p=>p.board.filter(Boolean).concat(p.reserve,p.dead)).find(u=>u.uid===d.attacker).cardId),b=E.data.cards.find(c=>c.id===s.players.flatMap(p=>p.board.filter(Boolean).concat(p.reserve,p.dead)).find(u=>u.uid===d.target).cardId);
        totals.weaponEligible+=Number(!!s.equipment.loadouts[d.side].weapon[a.characterId]);totals.protectionEligible+=Number(!!s.equipment.loadouts[1-d.side].shield[b.characterId]);
        assert.equal(f.equipmentWeapon,d.equipment.weapon?.value||0);assert.equal(f.equipmentProtection,d.equipment.protection?.value||0);
        if(f.equipmentWeapon){assert.equal(d.attackDie,6);totals.weaponUses++;totals.weaponPoints+=f.equipmentWeapon;addGear(d.equipment.weapon,'weapon',f.equipmentWeapon);}
        if(f.equipmentProtection){assert.equal(d.defenseDie,6);totals.protectionUses++;totals.protectionPoints+=f.equipmentProtection;totals.protectionFailed+=Number(f.attack>f.defense);totals.protectionKilled+=Number(e.kill);addGear(d.equipment.protection,'shield',f.equipmentProtection);}
        for(const key of ['attack','defense'])if(d.equipment[key]){totals.relicUses++;totals.relicPoints+=d.equipment[key].value;addGear(d.equipment[key],'relic',d.equipment[key].value);}
      }
      if(d.equipmentTransfer){const e=d.equipmentTransfer,x=gear[e.weaponId]||(gear[e.weaponId]={kind:'relic',uses:0,points:0,grants:0});x.grants++;}
    }
  }
  E.assertState(s);checks++;assert.equal(s.phase,'over');assert(s.match.events.length<=200);assert(s.kalistel.spent.length<=4);assert.equal(new Set(s.match.events.map(e=>e.round)).size,s.match.events.length);
  for(let side=0;side<2;side++){const p=s.players[side],units=p.board.filter(Boolean).concat(p.reserve,p.dead);assert.equal(units.length,10);assert.equal(new Set(units.map(u=>u.uid)).size,10);assert.equal(p.dead.length,s.match.events.filter(e=>e.kill&&Number(e.target[0])===side).length);}
  assert.deepEqual(s.equipment.pending,{});totals.close=Math.abs(totals.score[0]-totals.score[1])<=2;
  return {winner:s.winner,first:s.initiative.first,exchanges:events,steps,checks,reloads,totals,gear,draw:s.winner==='draw',signature:hash(JSON.stringify({winner:s.winner,events:s.match.events,rng:s.rng}))};
}
function estimate(values){const n=values.length,m=values.reduce((a,b)=>a+b,0)/n,variance=n>1?values.reduce((a,b)=>a+(b-m)**2,0)/(n-1):0,se=Math.sqrt(variance/n);return {n,mean:m,se,ci95:[m-1.96*se,m+1.96*se]};}
function aggregate(rows){const sums={},gear={},clusters=new Map();let firstWins=0,decided=0;for(const x of rows){if(!clusters.has(x.cluster))clusters.set(x.cluster,[]);clusters.get(x.cluster).push(x);if(!x.draw){decided++;firstWins+=Number(x.winner===x.first);}for(const [k,v] of Object.entries(x.totals))if(typeof v==='number')sums[k]=(sums[k]||0)+v;for(const [id,g] of Object.entries(x.gear)){const y=gear[id]||(gear[id]={kind:g.kind,uses:0,points:0,grants:0});for(const k of ['uses','points','grants'])y[k]+=g[k];}}
  const grouped=[...clusters.values()],first=estimate(grouped.filter(g=>g.some(x=>!x.draw)).map(g=>{const d=g.filter(x=>!x.draw);return d.reduce((n,x)=>n+Number(x.winner===x.first),0)/d.length;}));
  return {matches:rows.length,winsA:rows.filter(x=>x.winA===1).length,draws:rows.filter(x=>x.draw).length,meanExchanges:estimate(grouped.map(g=>g.reduce((n,x)=>n+x.exchanges,0)/g.length)),firstWinner:decided?{decidedMatches:decided,count:firstWins,rate:firstWins/decided,clusterEstimate:first}:null,closeMatches:rows.filter(x=>x.totals.close).length,totals:sums,gear};}
function exactDirect(E){
  const results=[];
  for(const w of Q.catalogue.weapons.filter(w=>w.slot!=='relic')){
    const carriers=E.data.cards.filter(c=>Q.compatible(w,c));let contexts=0,flips=0,probabilityDelta=0,eligible=0,magic=0,barrier=0,special=0;
    for(const c of carriers)for(const opponent of E.data.cards){
      const a=w.slot==='weapon'?c:opponent,b=w.slot==='shield'?c:opponent,face=w.slot==='weapon'?a.atk[0]:b.defense[0];
      if(typeof face!=='number'){special++;continue;}eligible++;if(w.slot==='weapon'&&a.magic.includes(6))magic++;
      const terminals=b.defense.filter(v=>v!=='retry').length;
      for(let dieA=1;dieA<=6;dieA++)for(let dieB=1;dieB<=6;dieB++){
        const av=a.atk[6-dieA],bv=b.defense[6-dieB];if(typeof av!=='number'||typeof bv!=='number')continue;
        const active=w.slot==='weapon'?dieA===6:dieB===6;if(!active)continue;
        const blocked=a.magic.includes(dieA)&&b.barriers.includes(dieB)&&b.element!=='NONE'?E.rules.barrier:0;
        const attack=Math.max(0,av+(E.data.weapons[a.weapon]?.[b.weapon]||0)+E.elementModifier(a,b)-blocked),defense=bv;
        const afterAttack=w.slot==='weapon'?Math.max(0,av+(E.data.weapons[a.weapon]?.[b.weapon]||0)+E.elementModifier(a,b)-blocked+w.effect.value):attack;
        const afterDefense=defense+(w.slot==='shield'?w.effect.value:0);
        const flip=(attack>defense)!==(afterAttack>afterDefense);contexts++;barrier+=Number(!!blocked);flips+=Number(flip);probabilityDelta+=Number(flip)/(6*terminals);
      }
    }
    results.push({id:w.id,slot:w.slot,value:w.effect.value,carrierEditions:carriers.length,eligibleCarrierOpponentPairs:eligible,specialCarrierOpponentPairs:special,activeNumericContexts:contexts,thresholdFlips:flips,meanUnconditionalKillOrHoldGain:carriers.length?probabilityDelta/(carriers.length*E.data.cards.length):0,nominalPointsPerRawRoll:carriers.some(c=>typeof (w.slot==='weapon'?c.atk[0]:c.defense[0])==='number')?w.effect.value/6:0,magicAttack6Pairs:magic,barrierContexts:barrier});
  }
  return {method:'Exact enumeration of every compatible carrier edition against all catalogue cards and six ATK/DEF faces. No synergy, captain, arena, relic, token or Kalistel. DEF retry excluded as nonterminal and normalized by terminal-face count; dodge is terminal and never numeric. Supports and Death never converted. Delta is unconditional per chosen attack before ATK die, averaged uniformly across opposing cards, not a ranked meta or human win rate.',noNumericSixCarrier:results.filter(x=>x.carrierEditions>0&&x.eligibleCarrierOpponentPairs===0).map(x=>x.id),items:results};
}
async function campaign({pairs=1000,output=true}={}){
  const data=await buildCatalog({published:published()}),E=createEngine(data),r=random(460009),rows=Object.fromEntries(variants.map(v=>[v,[]])),clusters=[],decksUsed=new Set(),cardsUsed=new Set(),factionsUsed=new Set(),arenaUse={},unavailable=Q.catalogue.weapons.filter(w=>!data.cards.some(c=>Q.compatible(w,c))).map(w=>w.id),eligible=Q.catalogue.weapons.filter(w=>!unavailable.includes(w.id));
  const presets=[{id:'player',cards:data.decks.player},{id:'enemy',cards:data.decks.enemy},...data.decks.presets],factions=[...new Set(data.cards.map(c=>c.faction))],bearers=data.cards.filter(c=>eligible.some(w=>Q.compatible(w,c)));
  const started=Date.now();
  for(let i=0;i<pairs;i++){
    const family=i%4,theme=factions[Math.floor(i/4)%factions.length];let A,B;
    if(family===0){A=presets[Math.floor(i/4)%presets.length].cards.slice();B=presets[Math.floor(i/4+3)%presets.length].cards.slice();}
    else if(family===1){A=legalDeck(E,r,data.cards.filter(c=>c.faction===theme));B=legalDeck(E,r);}
    else if(family===2){const c=bearers[Math.floor(i/4)%bearers.length];A=legalDeck(E,r,bearers,[c]);B=legalDeck(E,r,bearers);}
    else {A=legalDeck(E,r);B=i%8===3?A.slice():legalDeck(E,r);}
    if(i%5===0)B=A.slice();
    for(const ids of [A,B]){decksUsed.add(ids.join(','));for(const id of ids){cardsUsed.add(id);factionsUsed.add(E.byId[id].faction);}}
    const arenaId=data.arenas[i%data.arenas.length].id,policy=i%5===4?'random':'production';arenaUse[arenaId]=(arenaUse[arenaId]||0)+10;
    const results={},equippedByVariant=Object.fromEntries(variants.map(v=>[v,outfit(E,A,v,random(460000+i))]));
    for(const variant of variants){results[variant]=[];for(const swap of [0,1]){
      const teams=[team(E,A,equippedByVariant[variant]),team(E,B,empty())];if(swap)teams.reverse();
      const x=run(E,...teams,{seed:'V460-'+i,arenaId,policy,fullChecks:i<4,restore:i<8});x.winA=x.draw?.5:Number(x.winner===swap);x.aSide=swap;x.policy=policy;x.cluster=i;x.arenaId=arenaId;x.variant=variant;rows[variant].push(x);results[variant].push(x);
    }}
    clusters.push({index:i,family:['presets','faction','equipped-bearers','uniform'][family],arenaId,policy,mirror:A.join(',')===B.join(','),A,B,loadout:equippedByVariant.all,results:Object.fromEntries(variants.map(v=>[v,results[v].map(x=>({winA:x.winA,winner:x.winner,first:x.first,exchanges:x.exchanges,signature:x.signature}))]))});
    if((i+1)%25===0)console.log(`Audit ${i+1}/${pairs} pairs (${(i+1)*10} matches), ${Math.round((Date.now()-started)/1000)}s`);
  }
  const summary=Object.fromEntries(variants.map(v=>[v,aggregate(rows[v])])),pairedEffects={},currentData=await buildCatalog({published:published()});
  for(const v of variants.filter(v=>v!=='none')){
    const differences=clusters.map(c=>(c.results[v][0].winA+c.results[v][1].winA-c.results.none[0].winA-c.results.none[1].winA)/2);
    pairedEffects[v]={winProbabilityDifference:estimate(differences),exchangeDifference:estimate(clusters.map(c=>(c.results[v][0].exchanges+c.results[v][1].exchanges-c.results.none[0].exchanges-c.results.none[1].exchanges)/2)),byPolicy:Object.fromEntries(['production','random'].map(p=>[p,estimate(differences.filter((_,i)=>clusters[i].policy===p))]))};
  }
  const catalogueChangedDuringRun=gameplayHash(data)!==gameplayHash(currentData);
  const result={schema:1,release:'4.6.0',generatedAt:new Date().toISOString(),method:{seed:'460009',clusterCount:pairs,matches:pairs*10,orientations:2,variants,policies:{production:'.aiChoice public average-face heuristic; .aiUseKalistel without future RNG',random:'uniform legal pair; retains support AI; shard only on D1/D2'},treatment:'Only team A receives equipment; orientation swaps preserve A identity. Baseline also uses empty modern slots.',pairing:'Two orientations averaged per deck/seed cluster; 95% normal interval of paired cluster differences. Same seed does NOT mean same future duel random streams after gameplay diverges.',independence:'Clusters are generated with deterministic seeds. CIs quantify this sampled synthetic deck/seed campaign, not all human competitive play.',nonNumeric:'Special faces remain special; scores and direct bonuses inspected on actual numeric resolutions.',capture:'Every finish and every 64th transition asserted; first 40 matches every transition; first 80 matches restore every 71 transitions.'},catalogue:{cards:data.cards.length,characters:new Set(data.cards.map(c=>c.characterId)).size,equipment:Q.catalogue.weapons.length,slots:Object.fromEntries(slotNames.map(k=>[k,Q.catalogue.weapons.filter(w=>w.slot===k).length])),unavailable},coverage:{cards:cardsUsed.size,factions:factionsUsed.size,decks:decksUsed.size,arenas:arenaUse},sourceHashes,catalogueGameplayHash:gameplayHash(data),catalogueChangedDuringRun,sourceChangedDuringRun:catalogueChangedDuringRun||JSON.stringify(sourceHashes)!==JSON.stringify(fingerprints()),seconds:(Date.now()-started)/1000,summary,pairedEffects,exactDirect:exactDirect(E),checks:rows.all.concat(rows.none,rows.weapon,rows.shield,rows.relic).reduce((a,x)=>({stateAssertions:a.stateAssertions+x.checks,reloads:a.reloads+x.reloads}),{stateAssertions:0,reloads:0}),clusters};
  if(output){fs.mkdirSync(__dirname,{recursive:true});fs.writeFileSync(path.join(__dirname,'balance-report.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'balance-report.md'),markdown(result));}
  return result;
}
function markdown(x){const pct=v=>(100*v).toFixed(2)+' %',f=(v,n=2)=>v.toFixed(n),ci=v=>`[${pct(v[0])}; ${pct(v[1])}]`;
  const lines=['# Audit statistique equipements 4.6.0','',`Campagne : ${x.method.matches} rencontres, ${x.method.clusterCount} groupes apparies avec inversion des camps, ${x.coverage.arenas?Object.keys(x.coverage.arenas).length:0} arenes, ${x.coverage.cards}/${x.catalogue.cards} cartes et ${x.coverage.factions} factions.`,`Duree : ${f(x.seconds)} s. ${x.checks.stateAssertions} controles d'etat, ${x.checks.reloads} reprises verifiees. Sources changees pendant le calcul : ${x.sourceChangedDuringRun?'OUI, relancer avant publication':'non'}.`,'','## Impact mesure','', 'Equipe A equipee contre equipe B sans equipement. Le resultat suit A apres inversion physique des camps. Un nul vaut 0,5.','', '| Variante | Victoires A (nuls=0,5) | Delta vs sans | IC95 delta | Echanges moyens | Duels numeriques |','| --- | ---: | ---: | --- | ---: | ---: |'];
  for(const v of variants){const s=x.summary[v],e=x.pairedEffects[v]?.winProbabilityDifference,win=(s.winsA+.5*s.draws)/s.matches;lines.push(`| ${v} | ${pct(win)} | ${e?pct(e.mean):'-'} | ${e?ci(e.ci95):'-'} | ${f(s.meanExchanges.mean)} | ${s.totals.numericDuels} |`);}
  lines.push('','## Activations reelles','', '| Variante | Arme : utilisations / duels eligibles | Protection : utilisations / duels eligibles | Points armes | Points protections | Relique : utilisations | Protections utilisees puis defense perdue |','| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for(const v of variants){const s=x.summary[v].totals;lines.push(`| ${v} | ${s.weaponUses}/${s.weaponEligible} | ${s.protectionUses}/${s.protectionEligible} | ${s.weaponPoints} | ${s.protectionPoints} | ${s.relicUses} | ${s.protectionFailed} |`);}
  lines.push('','## Controle exhaustif des seuils D6','', 'Toutes les editions compatibles de chaque arme/protection sont comparees aux cartes du catalogue, avec enumeration des faces. Ce controle isole les seuils de kill/Block sans Kalistel, jetons, synergies, capitaine, arene ou reliques. Les retries DEF sont normalises sur les faces terminales ; Esquive reste une annulation, Mort et soutiens ne deviennent jamais des chiffres.', '', '| Equipement | Editions compatibles | Contextes numeriques actifs | Seuils modifies | Gain moyen kill/Block par attaque choisie |','| --- | ---: | ---: | ---: | ---: |');
  for(const e of x.exactDirect.items)lines.push(`| ${e.id} | ${e.carrierEditions} | ${e.activeNumericContexts} | ${e.thresholdFlips} | ${pct(e.meanUnconditionalKillOrHoldGain)} |`);
  lines.push('',`Equipements compatibles mais sans D6 numerique activateur actuel : ${x.exactDirect.noNumericSixCarrier.join(', ')||'aucun'}. C'est un point de conception du catalogue, pas une autorisation de remplacer une face speciale.`, '', '## Initiative', '', 'Le tirage et le calendrier ABBA ne changent pas. Le taux de victoire du gagnant du tirage est descriptif ; son intervalle est calcule par groupe apparie, pas en traitant les deux orientations comme independantes.', '');
  for(const v of variants){const s=x.summary[v].firstWinner;if(s)lines.push(`- ${v} : ${pct(s.rate)}, IC95 par groupe ${ci(s.clusterEstimate.ci95)}.`);}
  lines.push('','## Interpretation et limites','', '- Un +30 sur D6 vaut +5 par jet brut independant si les six faces sont numeriques. Ce n\'est pas un +30 permanent. Kalistel et relances DEF changent la distribution des resultats conserves.', '- Les taux d\'activation ci-dessus portent sur le duel numerique final, pas les essais abandonnes. La campagne compte separement les tentatives DEF.', '- La meme graine ne garantit pas une suite identique de jets apres divergence : changement de cible, elimination ou relance peut changer le nombre de tirages. Les comparaisons sont appariees par deck/graine, pas par duel.', '- Les deux orientations d\'un groupe ne sont pas traitees comme deux observations independantes pour les intervalles des deltas.', '- Les fonctions de choix utilisent seulement les informations publiques. Une politique aleatoire complementaire limite la dependance a une seule heuristique, sans remplacer des joueurs humains.', '- Une difference non significative n\'est pas une preuve d\'equivalence. Ces resultats ne prouvent ni l\'equilibrage competitif universel ni le fun ressenti.', '- Les indicateurs de duree, rencontres serrees et changements de meneur sont des indices structurels, pas une mesure objective du plaisir.', '- Les armes/protections et la plus forte contribution de relique s\'additionnent. Plusieurs charges de reliques de meme statistique ne s\'additionnent pas.', '- La fin anticipee sur plateau vide avec reserves incompatibles reste une regle historique ; la simulation ne suppose pas dix kills pour toute victoire.', `- Armes sans porteur compatible actuel : ${x.catalogue.unavailable.join(', ')}. Aucune restriction n\'a ete relachee pour cet audit.`, '', '## Reproduction','', '```powershell','node V4/revisions/2026-10-09-equipment-slots/balance.cjs --pairs=1000','node --test --test-isolation=none V4/site/equipment-v2.test.cjs','```','', 'Le JSON conserve les empreintes de sources, la graine, les decks, toutes les comparaisons apparies et les utilisations par equipement.');return lines.join('\n')+'\n';}
if(require.main===module){const pairs=Number(process.argv.find(a=>a.startsWith('--pairs='))?.split('=')[1]||1000);assert(Number.isInteger(pairs)&&pairs>=4&&pairs<=10000);campaign({pairs}).then(x=>console.log(JSON.stringify({matches:x.method.matches,seconds:x.seconds,sourceChangedDuringRun:x.sourceChangedDuringRun,pairedEffects:x.pairedEffects},null,2))).catch(e=>{console.error(e.stack);process.exitCode=1;});}
module.exports={campaign,run,team,outfit,legalDeck,random,estimate,exactDirect};
