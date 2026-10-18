(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarGuide=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const symbol=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
  const faces={guard:'Garde',retry:'Trèfle / Relance',mana:'Potion',buff_atk:'Puissance physique',revive:'Reraise',death:'Mort',dodge:'Esquive'};
  const quizzes={
    formation:['Une défense fait-elle avancer la timeline ?',['Non','Oui']],
    block:['En cas d’égalité ATK / DEF…',['La défense tient','La cible est éliminée']],
    kill:['Qui peut prendre la place libérée ?',['Un réserviste compatible avec ce poste','N’importe quel réserviste']],
    kalistel:['Le second jet est moins bon. Peut-on revenir au premier ?',['Non, il est imposé','Oui']],
    magic:['La barrière réduit-elle une attaque physique ?',['Non','Oui']],
    equipment:['L’arme équipée remplace-t-elle la famille imprimée ?',['Non','Oui']],
    guard:['Une garde déjà active peut-elle être doublée ?',['Non, une charge par catégorie','Oui, +120 DEF']],
    clover:['Le trèfle a déjà servi. Peut-il relancer encore ?',['Non, sa charge est consommée','Oui, jusqu’à réussir']],
    mana:['Une attaque physique consomme-t-elle la potion ?',['Non, elle attend une attaque magique','Oui']],
    physical:['Un jet abandonné consomme-t-il la puissance ?',['Non, seul le jet conservé compte','Oui']],
    heart:['Le Reraise de Lok rapporte-t-il un kill à Zviri ?',['Non','Oui']],
    dodge:['Esquive peut-elle annuler Mort ?',['Oui','Non']],
    momo:['La Boîte donne-t-elle aussi un trèfle à Momo ?',['Non, aux autres alliés actifs éligibles','Oui, à tout le deck']],
    captain:['Les réservistes comptent-ils dans la synergie ?',['Non','Oui']],
    arena:['Peut-on changer d’arène en cours de match ?',['Non','Oui']],
    materia:['La Materia ressuscite-t-elle Aeris ?',['Non, elle protège un autre allié','Oui']],
    pod:['Le remplaçant de la cible hérite-t-il du marquage ?',['Non','Oui']],
    finale:['Peut-on gagner avec moins de dix kills ?',['Oui, si aucun combattant ne peut rester actif','Non, jamais']]
  };
  function create({data,image,onNavigate=()=>{}}){
    const Q=globalThis.KalistarGuideScenario.create(data),E=Q.E,chapters=globalThis.KalistarGuideScenario.chapters;
    let root=null,controller=null,lesson=null,index=0,step=0,chosen=false,passed=false,feedback='',completed=new Set();
    const state=()=>lesson.state,op=()=>lesson.ops[step];
    function load(next){index=Math.max(0,Math.min(chapters.length-1,next));lesson=Q.lesson(chapters[index].id);step=0;chosen=passed=false;feedback='';draw();}
    function snapshot(at){const fresh=Q.lesson(chapters[index].id);for(let i=0;i<at;i++)Q.perform(fresh.state,fresh.ops[i]);lesson=fresh;step=at;chosen=passed=false;feedback='';draw();}
    function cardButton(u,side,slot){
      const c=u&&E.card(u),o=op(),expected=o?.method==='lock'?(chosen?1-state().turn:state().turn):o?.select?o.side:null;
      const eligible=side===expected,selected=state().duel?.attacker===u?.uid||state().duel?.target===u?.uid;
      return `<div class="guide-unit ${selected?'is-dueling':''}">${globalThis.KalistarPositions.markup(slot+1)}<button class="guide-card ${eligible?'is-eligible':''}" data-guide-card="${side}:${slot}" aria-label="${esc(c?.name||'Poste libre')}" ${!eligible||!c?'disabled':''}><img src="${esc(c?image(c):'assets/back-obsidian-v1.webp')}" alt="${esc(c?.name||'Poste libre')}" width="797" height="1388" draggable="false">${c?`<span>${esc(c.name)}</span>`:''}</button>${c?traits(u):''}</div>`;
    }
    function traits(u){
      const labels={ward:'Garde +60',luck:'Trèfle',reraise:'Cœur',mana:'Potion +60',physical:'Puissance +60'};
      return `<div class="guide-traits">${E.traits(u).map(k=>`<span title="${labels[k]}">${symbol({ward:'shield',luck:'clover',reraise:'heart',mana:'flask-conical',physical:'sword'}[k])}<span class="sr-only">${labels[k]}</span></span>`).join('')}</div>`;
    }
    function preview(){
      const s=state(),d=s.duel||s.lastDuel;
      const ids=d?[d.attacker,d.target]:[E.captainUnit(s,0)?.uid,E.captainUnit(s,1)?.uid];
      const units=s.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead]);
      return `<div class="guide-faceoff">${ids.map((id,i)=>{
        const u=units.find(u=>u.uid===id),c=u&&E.card(u);if(!c)return '';
        const roll=d?.[i?'defenseDie':'attackDie'],value=d?.[i?'defenseValue':'attackValue'],label=value==='retry'?(i?'Relance':'Trèfle'):faces[value]||value;
        return `<figure><div class="guide-large-card"><img src="${esc(image(c))}" alt="${esc(c.name)}" width="797" height="1388">${u&&E.equipmentViews(s,u).filter(e=>e.weapon).map(e=>`<span class="guide-equipped ${e.active?'is-active':''}" title="${esc(e.weapon.name+(e.active?' · Actif':' · Inactif'))}"><img src="${esc(globalThis.KalistarEquipmentFX.art(e.weapon))}" alt="${esc(e.weapon.name)}"></span>`).join('')}</div><figcaption>${esc(c.name)} ${d?`<b>${i?'DEF':'ATK'}${roll?' · D'+roll+' : '+esc(label):''}</b>`:'<b>Capitaine</b>'}</figcaption></figure>`;
      }).join('<span class="guide-versus" aria-hidden="true">'+symbol('swords')+'</span>')}</div>`;
    }
    function formula(){
      const duel=state().duel||state().lastDuel,original=duel?.formula;if(!original)return '';
      const f={...original,relicAttack:(original.equipmentAttack||0)-(original.equipmentWeapon||0),relicDefense:(original.equipmentDefense||0)-(original.equipmentProtection||0)},equipment=duel.equipment||{};
      const rows=[['Face ATK','baseAttack'],['Arme imprimée','weapon'],['Cristal','element'],['Faction','faction'],['Capitaine faction','captainAttack'],['Jeton ATK','buff'],['Arène ATK','arenaAttack'],['Barrière','barrier'],[equipment.weapon?.name||'Arme équipée','equipmentWeapon'],[equipment.attack?.name||'Relique ATK','relicAttack'],['Face DEF','baseDefense'],['Race','race'],['Capitaine race','captainDefense'],['Arène DEF','arenaDefense'],['Garde','ward'],[equipment.protection?.name||'Protection','equipmentProtection'],[equipment.defense?.name||'Relique DEF','relicDefense']];
      return `<details class="guide-calculation" open><summary>Forces engagées <b>${f.attack} / ${f.defense}</b></summary><dl>${rows.filter(([,key])=>f[key]||key.startsWith('base')).map(([label,key])=>`<div><dt>${label}</dt><dd>${f[key]>0&&!key.startsWith('base')?'+':''}${f[key]||0}</dd></div>`).join('')}</dl></details>`;
    }
    function actionLabel(o){
      return {rollInitiative:'Lancer les capitaines',rollAttack:'Lancer ATK · D'+o?.args?.[0],acceptAttack:'Garder le jet',useKalistel:'Utiliser un éclat',rollDefense:'Lancer DEF · D'+o?.args?.[0],next:chapters[index].id==='finale'?'Duel terminé':'Tour suivant',autoDeploy:'Faire entrer Darnako',continueMagic:'Rejoindre Malinia',continuePhysical:'Rejoindre Lok'}[o?.method]||'Continuer';
    }
    function draw(){
      if(!root)return;const s=state(),o=op(),done=!o,q=quizzes[lesson.meta.id],stats=s.phase==='over'?E.matchStats(s):null;
      root.innerHTML=`<section class="guide-view" aria-label="Guide de Kalistar"><header class="guide-heading"><div><span class="eyebrow">Terrain d’entraînement</span><h1>Guide</h1></div><label><span class="sr-only">Chapitre du guide</span><select data-guide-chapter>${chapters.map((c,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${esc(c.title)}${completed.has(c.id)?' · ✓':''}</option>`).join('')}</select></label><button class="icon-button" data-guide-action="restart" title="Rejouer ce chapitre" aria-label="Rejouer ce chapitre">${symbol('rotate-ccw')}</button></header>
      <div class="guide-layout"><div class="guide-ground" data-phase="${s.phase}"><div class="guide-timeline" aria-label="Prochaines actions">${E.turnPreview(s,7).map(t=>`<span class="${t.side?'opponent':'player'} ${t.current?'current':''}" aria-label="Tour ${t.round}, ${t.side?'Sentinelles':'Compagnons'}">${t.current?symbol('check'):t.round}</span>`).join('')}</div>
      ${[1,0].map(side=>`<section class="guide-team ${side?'opponent':'player'}"><h3>${s.composition.teams[side].name}<small>${s.players[side].reserve.length} en réserve</small></h3><div class="guide-lineup">${s.players[side].board.map((u,slot)=>cardButton(u,side,slot)).join('')}</div></section>${side?preview():''}`).join('')}
      <details class="guide-journal"><summary>Journal de l’exercice</summary><ol>${s.log.slice(-14).map(l=>`<li>${esc(l.text)}</li>`).join('')}</ol></details></div>
      <aside class="guide-lesson"><span class="eyebrow">${index+1} / ${chapters.length} · ${esc(lesson.meta.subtitle)}</span><h2 tabindex="-1">${esc(lesson.meta.title)}</h2><details class="guide-context" ${matchMedia('(min-width:700px) and (min-height:501px), (min-width:700px) and (pointer:fine)').matches?'open':''}><summary>La situation</summary><p>${esc(lesson.intro)}</p></details><div class="guide-progress" aria-label="${step} sur ${lesson.ops.length} étapes"><progress value="${step}" max="${lesson.ops.length}"></progress></div>
      <div class="guide-coach" aria-live="polite">${done?`<p>${esc(lesson.conclusion)}</p>`:`<span class="guide-step">${step+1} / ${lesson.ops.length}</span><p>${esc(o.text)}</p>${o.method==='lock'?`<b>${chosen?'Sélectionne la cible dans l’autre équipe.':'Sélectionne l’attaquant dans son équipe.'}</b>`:o.select?'<b>Sélectionne le bénéficiaire dans son équipe.</b>':`<button class="guide-command" data-guide-action="perform">${symbol(o.method.includes('roll')?'dices':o.method==='useKalistel'?'gem':'chevron-right')}${esc(actionLabel(o))}</button>`}`}</div>
      <p class="guide-feedback" role="status">${esc(feedback)}</p>${formula()}
      ${done?`<fieldset class="guide-check"><legend>${esc(q[0])}</legend>${(index%2?[1,0]:[0,1]).map(i=>`<button data-guide-answer="${i}" ${passed?'disabled':''}>${esc(q[1][i])}</button>`).join('')}</fieldset>${passed?`<div class="guide-complete">${symbol('check')} Chapitre compris</div><button class="guide-command" data-guide-action="next">${symbol(index===chapters.length-1?'swords':'arrow-right')}${index===chapters.length-1?'Ouvrir l’Arène':'Chapitre suivant'}</button>`:''}`:''}
      ${stats?`<div class="guide-bilan"><h3>Bilan de l’entraînement</h3><p>${s.winner==='draw'?'Match nul':s.composition.teams[s.winner].name+' remportent la rencontre.'}</p><p>${stats.units.filter(u=>u.kills>0).map(u=>esc(E.byId[u.cardId]?.name)+': '+u.kills+' kill'+(u.kills>1?'s':'')).join(' · ')}</p><a href="#library">Indice et trophées dans la Library</a></div>`:''}
      <footer><button class="icon-button" data-guide-action="previous" ${step===0?'disabled':''} aria-label="Étape précédente" title="Étape précédente">${symbol('arrow-left')}</button><span>Exercice isolé · jets préparés</span><button class="icon-button" data-guide-action="library" title="Lire les règles complètes" aria-label="Lire les règles complètes">${symbol('scroll-text')}</button></footer></aside></div></section>`;
      globalThis.KalistarUI?.icons(root);
    }
    function focusCurrent(){root?.querySelector('[data-guide-action="perform"],.guide-card.is-eligible,[data-guide-answer]:not(:disabled),[data-guide-action="next"]')?.focus({preventScroll:true});}
    function perform(){try{Q.perform(state(),op());step++;chosen=false;feedback='';draw();focusCurrent();}catch(error){feedback=error.message;draw();focusCurrent();}}
    function mount(node){
      destroy();root=node;controller=new AbortController();load(index);const signal=controller.signal;
      root.addEventListener('change',event=>{if(event.target.matches('[data-guide-chapter]')){load(Number(event.target.value));root.querySelector('h2').focus();}},{signal});
      root.addEventListener('click',event=>{
        const card=event.target.closest('[data-guide-card]');if(card){const [side,slot]=card.dataset.guideCard.split(':').map(Number),o=op();if(!o)return;
          const expectedSide=o.method==='lock'?(chosen?1-state().turn:state().turn):o.side,expectedSlot=o.method==='lock'?o.args[chosen?1:0]:o.slot;
          if(side!==expectedSide||slot!==expectedSlot){feedback='Pas cette carte pour cet exercice. '+o.text;draw();focusCurrent();return;}
          if(o.method==='lock'&&!chosen){chosen=true;feedback='';draw();focusCurrent();}else perform();return;
        }
        const answer=event.target.closest('[data-guide-answer]');if(answer){passed=answer.dataset.guideAnswer==='0';feedback=passed?'Exact.':lesson.conclusion;if(passed)completed.add(lesson.meta.id);draw();focusCurrent();return;}
        const action=event.target.closest('[data-guide-action]')?.dataset.guideAction;
        if(action==='perform')perform();if(action==='restart')load(index);if(action==='previous'&&step>0)snapshot(step-1);
        if(action==='next'&&passed){if(index<chapters.length-1){load(index+1);root.querySelector('h2').focus();}else onNavigate('arena');}
        if(action==='library')onNavigate('library');
      },{signal});
    }
    function destroy(){controller?.abort();controller=null;root=null;}
    return {mount,destroy};
  }
  return {create,quizzes};
});
