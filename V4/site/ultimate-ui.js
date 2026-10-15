(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarUltimateUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const traits=Object.freeze({ward:{label:'Garde',icon:'shield-check',symbol:'\u25c7'},luck:{label:'Tr\u00e8fle',icon:'clover',symbol:'\u2618'},reraise:{label:'Reraise',icon:'heart',symbol:'\u2665'},mana:{label:'Potion',icon:'flask-conical',symbol:'\u2727'},physical:{label:'Puissance',icon:'swords',symbol:'\u2694'}});
  const icon=name=>`<i data-lucide="${esc(name)}" aria-hidden="true"></i>`;
  const is=w=>w?.effect?.trigger==='ULTIMATE';
  function presentation(w){
    const e=w.effect,a=e.action||{},q=e.when||{},names=list=>(list||[]).map(t=>traits[t]?.label||t).join(' / '),n=e.count||1;
    const support=e.traits?names(e.traits):'soutien';
    const events={
      BLOCK:`Apr\u00e8s ${n===1?'un Block':n+' Blocks'} r\u00e9ussi${n>1?'s':''}.`,
      SUPPORT:e.distinct?`${support} donn\u00e9 \u00e0 ${n} autres alli\u00e9s distincts.`:`Apr\u00e8s ${n} nouveau${n>1?'x':''} ${support}${!e.traits&&n>1?'s':''} \u00e0 un autre alli\u00e9.`,
      ALLIED_DEATH:`${n===1?'Un autre alli\u00e9 \u00e9limin\u00e9':n+' autres alli\u00e9s \u00e9limin\u00e9s'} pendant sa pr\u00e9sence.`,
      WARD_SAVED:'Un alli\u00e9 survit gr\u00e2ce \u00e0 une Garde du porteur.',
      RERAISE_USED:'Un alli\u00e9 consomme un Reraise du porteur.',
      POWER_USED:'Un alli\u00e9 utilise une Puissance du porteur.',
      CLOVER_SAVED:'Survit gr\u00e2ce \u00e0 une relance de Tr\u00e8fle.',
      UNINVOLVED:`${n} \u00e9changes cons\u00e9cutifs sur le plateau sans attaquer ni \u00eatre cibl\u00e9.`,
      SURVIVED:`Survit \u00e0 une attaque ${q.magic?'magique ':q.magic===false?'physique ':''}ennemie.`,
      ATTACK:`ATK ${q.magic?'magique ':''}chiffr\u00e9e conserv\u00e9e.`,
      TARGETED:`Cibl\u00e9 par une ATK ${q.magic?'magique ':q.magic===false?'physique ':''}chiffr\u00e9e.`,
      ALLY_TARGETED:`Un autre alli\u00e9 subit une ATK ${q.magic?'magique ':q.magic===false?'physique ':''}chiffr\u00e9e.`,
      INSUFFICIENT_DEFENSE:'DEF chiffr\u00e9e insuffisante, sans Tr\u00e8fle ni relance d\u00e9j\u00e0 utilis\u00e9e.',
      DEPLOYED:'Un autre alli\u00e9 entre de r\u00e9serve.'
    };
    let condition=[q.outnumbered?(e.event==='DEPLOYED'?'En inf\u00e9riorit\u00e9 num\u00e9rique apr\u00e8s l\u2019arriv\u00e9e.':'En inf\u00e9riorit\u00e9 num\u00e9rique.'):'',q.activeAtMost?`${q.activeAtMost} actifs maximum.`:'',events[e.event]||w.condition,q.elementPositive?'Cristal adverse avantag\u00e9.':'',q.elementNegative?'Malus de cristal.':''].filter(Boolean).join(' ');
    let label='Ultime',effect='',duration='Une fois par partie.',symbol='sparkles';
    if(a.kind==='GRANT'){
      label=(a.traits||[]).map(t=>traits[t]?.label||t).join(a.chooseTrait?' / ':' + ');symbol=traits[a.traits?.[0]]?.icon||symbol;
      const target={self:'au porteur',selfAndAlly:'au porteur et \u00e0 son compagnon',recipient:'au b\u00e9n\u00e9ficiaire',nextAlly:'au prochain autre renfort',chooseAllies:a.max>1?'\u00e0 '+a.max+' autres alli\u00e9s maximum, au choix':'\u00e0 un autre alli\u00e9 au choix'}[a.target]||'';
      effect=label+' '+target+', sans doublon.';
      if(e.event==='POWER_USED')effect='Puissance \u00e0 un troisi\u00e8me alli\u00e9 au choix, sans doublon.';
      if(e.event==='INSUFFICIENT_DEFENSE')effect='Une relance DEF imm\u00e9diate. Le nouveau jet peut \u00e9chouer.';
    }else if(a.kind==='BONUS'||a.kind==='ARM'){
      label='+'+a.value+' '+(a.stat==='DUEL'?'ATK/DEF':a.stat);symbol=a.stat==='DEF'?'shield-plus':'sword';
      const recipient=a.target==='nextAlly'?' au prochain autre renfort':e.event==='ALLY_TARGETED'?' \u00e0 cet alli\u00e9':'';
      effect=label+recipient+(a.against==='killer'?' contre le responsable':a.against==='attacker'?' face au m\u00eame attaquant':'')+'.';
      duration=a.kind==='ARM'?(a.stat==='DUEL'?'Premier score chiffr\u00e9.':a.magic?'Prochaine ATK magique chiffr\u00e9e.':'Prochain jet chiffr\u00e9.')+' Une fois.':'Ce duel. Une fois.';
    }else if(a.kind==='MITIGATE'){
      label=(a.direction==='penalty'?'+':'-')+a.value+' max';symbol='shield-half';
      effect=a.direction==='penalty'?`Annule jusqu\u2019\u00e0 ${a.value} points du seul malus de cristal.`:`Retire jusqu\u2019\u00e0 ${a.value} ATK aux avantages arme, cristal, faction, ar\u00e8ne.`;
      duration=a.direction==='penalty'?'Ce duel. Une fois.':'Prochaine DEF chiffr\u00e9e. Une fois.';
    }else if(a.kind==='DEBUFF'){
      label='-'+a.value+' ATK';symbol='trending-down';effect=label+' sur la prochaine ATK chiffr\u00e9e de l\u2019ennemi choisi.';
      duration='Une fois. Marque perdue si la cible meurt.';
    }else if(a.kind==='COIN'){
      label='+'+a.value+' / Garde';symbol='coins';effect='Pile : +'+a.value+' ATK. Face : Garde personnelle sans doublon.';
      duration='Une fois. Tirage d\u00e9finitif.';
    }else if(a.kind==='PREDICT'){
      label='+'+a.value+' DEF';symbol='dices';effect='Pair/impair avant l\u2019ATK subie : +'+a.value+' DEF si le jet chiffr\u00e9 conserv\u00e9 correspond.';
      duration='Une tentative, m\u00eame si erron\u00e9e.';
    }
    return {condition,effect,duration,label,icon:symbol,...w.presentation};
  }
  const automatic=(s,choice)=>!!choice&&s.mode==='ai'&&String(choice.sourceUid).startsWith('1-');
  const targetChoice=choice=>!!choice&&(choice.type!=='ultimate'||choice.mode==='target');
  const canTarget=(s,choice,uid)=>targetChoice(choice)&&!automatic(s,choice)&&(choice.targets||[]).includes(uid);
  function options(choice){
    return Array.isArray(choice.options)?choice.options:(choice.targets||[]).map(uid=>({value:uid,uid,label:uid}));
  }
  function choiceMarkup(s,choice,{art=()=>'',name=uid=>uid,busy=false}={}){
    const auto=automatic(s,choice),weapon=choice.weapon,mode=choice.mode||'target';
    const enemy=weapon.effect.action?.kind==='DEBUFF',title=mode==='parity'?'Pair ou impair ?':mode==='trait'?'Le bon cap':enemy?'Cible ennemie':'Destinataire';
    const hint=auto?'D\u00e9cision adverse\u2026':mode==='parity'?'Pr\u00e9diction avant le jet ennemi':mode==='trait'?'Soutien au renfort':enemy?'Adversaire \u00e0 marquer':choice.remaining>1?choice.remaining+' dons restants':'Don de la relique';
    const rows=options(choice).map(option=>{
      const label=mode==='target'&&option.uid?name(option.uid):option.label||traits[option.value]?.label||option.value;
      const symbol=mode==='parity'?'dice-6':mode==='trait'?traits[option.value]?.icon||'sparkles':'user-round';
      return `<button type="button" data-action="equipment-option" data-value="${esc(option.value)}" ${auto||busy?'disabled':''} aria-label="${esc(weapon.name+' : '+label)}">${icon(symbol)}<span>${esc(label)}</span>${mode==='parity'?`<small>${option.value==='even'?'2 \u00b7 4 \u00b7 6':'1 \u00b7 3 \u00b7 5'}</small>`:''}</button>`;
    }).join('');
    const recipient=mode==='trait'&&options(choice)[0]?.uid?' \u00b7 '+name(options(choice)[0].uid):'';
    return `<section class="ultimate-choice" data-mode="${esc(mode)}" data-source-uid="${esc(choice.sourceUid)}" data-weapon-id="${esc(weapon.id)}" aria-label="${esc(weapon.name+' : '+title)}" aria-busy="${busy}"><header><img src="${esc(art(weapon))}" alt="" draggable="false"><div><strong>${esc(weapon.name)}</strong><span role="status" aria-live="polite">${esc(hint+recipient)}</span></div></header><div class="ultimate-options" role="group" aria-label="${esc(title)}">${rows}</div></section>`;
  }
  function events(s){
    const unique=new Map();
    for(const event of [...s?.equipment?.rituals?.events||[],...s?.duel?.ultimateEvents||[]])if(event.id&&!unique.has(event.id))unique.set(event.id,event);
    return [...unique.values()];
  }
  function newEvents(before,after){
    if(!before||!after||before.matchId!==after.matchId)return [];
    const seen=new Set(events(before).map(e=>e.id));
    return events(after).filter(e=>!seen.has(e.id)&&['ready','grant','bonus','mark','spent'].includes(e.kind)).map(e=>e.kind==='spent'&&after.equipment?.rituals?.records?.[e.sourceUid]?.status==='lost'?{...e,lost:true}:e);
  }
  function eventLabel(e){
    if(e.lost)return 'Marque perdue';
    if(e.kind==='grant')return (traits[e.trait]?.label||'Soutien')+' re\u00e7u'+(['ward','mana','physical'].includes(e.trait)?'e':'');
    if(e.kind==='bonus'&&Number.isFinite(e.value))return (e.value>0?'+':'')+e.value+' '+(e.stat||'');
    return {ready:'Relique \u00e9veill\u00e9e',mark:'Cible marqu\u00e9e',spent:'Ultime consomm\u00e9'}[e.kind]||'Effet de relique';
  }
  function modifiers(s,stat){
    const d=s.duel,recipient=stat==='ATK'?d?.attacker:d?.target;
    const rows=(d?.ultimateModifiers||[]).filter(row=>row.stat===stat&&row.recipient===recipient&&Number.isFinite(row.value)&&row.value!==0),base=d?.equipment?.[stat==='ATK'?'attack':'defense']?.value||0;
    // The ledger retains raw offers; only the strongest of each sign reaches the score.
    const positive=rows.reduce((best,row)=>row.value>(best?.value??base)?row:best,null);
    const negative=rows.reduce((best,row)=>row.value<(best?.value??0)?row:best,null);
    return [positive&&{...positive,value:positive.value-base},negative].filter(Boolean);
  }
  const total=(s,stat)=>modifiers(s,stat).reduce((sum,row)=>sum+row.value,0);
  return Object.freeze({is,traits,presentation,automatic,targetChoice,canTarget,options,choiceMarkup,events,newEvents,eventLabel,modifiers,total});
});
