(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarUltimateDefinitions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const definitions={
    'exiled-king-seal':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'BLOCK',when:{outnumbered:true},action:{kind:'GRANT',traits:['ward'],target:'chooseAllies',max:2}},
      condition:'Apr\u00e8s un Block en inf\u00e9riorit\u00e9 num\u00e9rique : choisissez jusqu\u2019\u00e0 deux autres alli\u00e9s actifs sans Garde. Chacun re\u00e7oit une Garde (+60 DEF contre sa prochaine attaque physique chiffr\u00e9e). Une fois par partie.'
    },
    'current-compass':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ATTACK',when:{outnumbered:true,elementNegative:true},action:{kind:'MITIGATE',components:['element'],value:40,direction:'penalty'}},
      condition:'En inf\u00e9riorit\u00e9 num\u00e9rique, prochaine attaque chiffr\u00e9e conserv\u00e9e avec un malus de cristal : annule jusqu\u2019\u00e0 40 points de ce seul malus pour ce duel. Une fois par partie.'
    },
    'last-garden-seed':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SUPPORT',traits:['reraise'],action:{kind:'GRANT',traits:['luck'],target:'recipient'}},
      condition:'Apr\u00e8s un nouveau Reraise donn\u00e9 \u00e0 un autre alli\u00e9 actif sans tr\u00e8fle : ce m\u00eame alli\u00e9 re\u00e7oit aussi un tr\u00e8fle. Une fois par partie.'
    },
    'lost-names-bell':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ALLIED_DEATH',count:2,action:{kind:'GRANT',traits:['mana','luck'],target:'chooseAllies'}},
      condition:'Apr\u00e8s deux \u00e9liminations d\u2019autres alli\u00e9s pendant que la porteuse est sur le plateau : choisissez un autre alli\u00e9 actif. Il re\u00e7oit une Potion (+60 \u00e0 sa prochaine ATK magique chiffr\u00e9e) et un tr\u00e8fle, sans doubler les effets d\u00e9j\u00e0 pr\u00e9sents. Une fois par partie.'
    },
    'kalistar-nerval-lantern':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'WARD_SAVED',action:{kind:'GRANT',traits:['luck'],target:'recipient'}},
      condition:'Quand un autre alli\u00e9 survit gr\u00e2ce \u00e0 une Garde donn\u00e9e par le porteur : ce m\u00eame alli\u00e9 re\u00e7oit un tr\u00e8fle s\u2019il n\u2019en a pas. Une fois par partie.'
    },
    'kalistar-nestown-beacon':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ALLIED_DEATH',count:2,action:{kind:'GRANT',traits:['ward','luck'],target:'nextAlly'}},
      condition:'Apr\u00e8s deux \u00e9liminations d\u2019autres alli\u00e9s pendant que le porteur est sur le plateau : le prochain autre alli\u00e9 entrant de r\u00e9serve re\u00e7oit une Garde et un tr\u00e8fle, sans doublon. Le porteur doit encore \u00eatre actif \u00e0 son arriv\u00e9e. Une fois par partie.'
    },
    'griever-pendant':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ATTACK',when:{outnumbered:true,activeAtMost:2},action:{kind:'BONUS',stat:'ATK',value:60}},
      condition:'Avec au plus deux combattants actifs et moins que l\u2019adversaire : prochaine attaque chiffr\u00e9e conserv\u00e9e, +60 ATK pour ce duel. Une fois par partie.'
    },
    'zanarkand-abes-pendant':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'BLOCK',when:{outnumbered:true},action:{kind:'GRANT',traits:['physical'],target:'chooseAllies'}},
      condition:'Apr\u00e8s un Block en inf\u00e9riorit\u00e9 num\u00e9rique : choisissez un autre alli\u00e9 actif sans Puissance. Il re\u00e7oit +60 \u00e0 sa prochaine ATK physique chiffr\u00e9e. Une fois par partie.'
    },
    'guardian-jug':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'TARGETED',when:{outnumbered:true,activeAtMost:2},action:{kind:'GRANT',traits:['ward'],target:'selfAndAlly',max:2}},
      condition:'Lorsqu\u2019Auron est attaqu\u00e9 par une attaque chiffr\u00e9e avec au plus deux combattants actifs et moins que l\u2019adversaire : lui et son dernier compagnon actif re\u00e7oivent chacun une Garde s\u2019ils n\u2019en ont pas. +60 DEF contre leur prochaine attaque physique chiffr\u00e9e. Une fois par partie.'
    },
    'ff9-garnet-pendant':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SUPPORT',count:2,distinct:true,action:{kind:'GRANT',traits:['ward'],target:'chooseAllies',max:2}},
      condition:'Apr\u00e8s de nouveaux soutiens donn\u00e9s \u00e0 deux autres alli\u00e9s diff\u00e9rents : choisissez jusqu\u2019\u00e0 deux autres alli\u00e9s actifs sans Garde. Chacun re\u00e7oit une Garde. Une fois par partie.'
    },
    'ff9-mog-ribbon':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'RERAISE_USED',action:{kind:'GRANT',traits:['ward'],target:'recipient'}},
      condition:'Quand un autre alli\u00e9 consomme un Reraise donn\u00e9 par Eiko : ce m\u00eame alli\u00e9 re\u00e7oit une Garde s\u2019il n\u2019en a pas, pour sa prochaine d\u00e9fense physique chiffr\u00e9e. Aucun nouveau c\u0153ur. Une fois par partie.'
    },
    'ff9-final-act-feather':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ATTACK',when:{outnumbered:true,activeAtMost:2,magic:true},action:{kind:'BONUS',stat:'ATK',value:60}},
      condition:'Avec au plus deux combattants actifs et moins que l\u2019adversaire : prochaine attaque magique chiffr\u00e9e conserv\u00e9e, +60 ATK pour ce duel. Aucun effet sur Mort. Une fois par partie.'
    },
    'ff9-terra-fragment':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ALLIED_DEATH',count:2,action:{kind:'ARM',stat:'DUEL',value:50,target:'nextAlly'}},
      condition:'Apr\u00e8s deux \u00e9liminations d\u2019autres alli\u00e9s pendant que Garland est sur le plateau : le prochain autre alli\u00e9 entrant de r\u00e9serve pr\u00e9pare +50 sur sa premi\u00e8re ATK ou DEF chiffr\u00e9e, selon ce qui arrive en premier. Garland doit encore \u00eatre actif \u00e0 son arriv\u00e9e. Une fois par partie.'
    },
    'ff9-tantalus-script':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'POWER_USED',action:{kind:'GRANT',traits:['physical'],target:'chooseAllies'}},
      condition:'Quand un autre alli\u00e9 utilise une Puissance donn\u00e9e par Ruby : choisissez un troisi\u00e8me compagnon actif sans Puissance. Il re\u00e7oit +60 \u00e0 sa prochaine ATK physique chiffr\u00e9e. Ni Ruby ni le premier b\u00e9n\u00e9ficiaire ne peuvent recevoir ce don. Une fois par partie.'
    },
    'pod-153':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SUPPORT',count:2,action:{kind:'MITIGATE',components:['weapon','element','faction','arenaAttack'],value:60,direction:'advantage'}},
      condition:'Apr\u00e8s deux nouveaux soutiens donn\u00e9s \u00e0 d\u2019autres alli\u00e9s : lors de la prochaine d\u00e9fense chiffr\u00e9e, neutralise jusqu\u2019\u00e0 60 points d\u2019avantages positifs adverses d\u2019arme, cristal, faction ou ar\u00e8ne. Ne retire ni ATK imprim\u00e9e ni bonus d\u2019\u00e9quipement. Une fois par partie.'
    },
    'lunar-tear':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'CLOVER_SAVED',action:{kind:'ARM',stat:'ATK',value:60,target:'self'}},
      condition:'Apr\u00e8s avoir surv\u00e9cu gr\u00e2ce \u00e0 une relance de Tr\u00e8fle : prochaine attaque chiffr\u00e9e conserv\u00e9e, +60 ATK pour ce duel. Une fois par partie.'
    },
    'infiltration-box':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'UNINVOLVED',count:2,action:{kind:'ARM',stat:'ATK',value:40,target:'self'}},
      condition:'Apr\u00e8s deux \u00e9changes cons\u00e9cutifs sur le plateau sans attaquer ni \u00eatre cibl\u00e9 : prochaine attaque chiffr\u00e9e conserv\u00e9e, +40 ATK pour ce duel. Snake reste ciblable. Une fois par partie.'
    },
    'metal-gear-mkii':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SUPPORT',count:2,distinct:true,action:{kind:'GRANT',traits:['ward','luck'],target:'chooseAllies'}},
      condition:'Apr\u00e8s de nouveaux soutiens donn\u00e9s \u00e0 deux autres alli\u00e9s diff\u00e9rents : choisissez un autre alli\u00e9 actif. Il re\u00e7oit une Garde et un tr\u00e8fle, sans doubler les effets d\u00e9j\u00e0 pr\u00e9sents. Une fois par partie.'
    },
    'jill-lockpicks':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'INSUFFICIENT_DEFENSE',when:{outnumbered:true},action:{kind:'GRANT',traits:['luck'],target:'self'}},
      condition:'En inf\u00e9riorit\u00e9 num\u00e9rique, premi\u00e8re d\u00e9fense chiffr\u00e9e insuffisante sans tr\u00e8fle disponible ou d\u00e9j\u00e0 utilis\u00e9 dans ce duel : gagne un tr\u00e8fle aussit\u00f4t consomm\u00e9 pour relancer la DEF. Le nouveau jet peut \u00e9chouer. Aucun effet sur Mort. Une fois par partie.'
    },
    'wolf-medallion':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'TARGETED',when:{magic:true,elementPositive:true},action:{kind:'BONUS',stat:'DEF',value:60}},
      condition:'Face \u00e0 une attaque magique chiffr\u00e9e b\u00e9n\u00e9ficiant d\u2019un avantage positif de cristal : +60 DEF pour ce duel. Une fois par partie.'
    },
    'obsidian-star':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ALLY_TARGETED',when:{outnumbered:true,magic:true},action:{kind:'BONUS',stat:'DEF',value:60}},
      condition:'En inf\u00e9riorit\u00e9 num\u00e9rique, lorsqu\u2019un autre alli\u00e9 actif subit une attaque magique chiffr\u00e9e : cet alli\u00e9 gagne +60 DEF pour ce duel. Une fois par partie.'
    },
    'straw-hat':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ALLIED_DEATH',action:{kind:'ARM',stat:'ATK',value:60,target:'self',against:'killer'}},
      condition:'Apr\u00e8s l\u2019\u00e9limination d\u2019un autre alli\u00e9 pendant que Luffy est sur le plateau : marque le responsable. Prochaine attaque chiffr\u00e9e conserv\u00e9e contre cet adversaire pr\u00e9cis, +60 ATK pour ce duel. Sa mort d\u00e9finitive fait perdre la marque. Une fois par partie.'
    },
    'log-pose':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'DEPLOYED',when:{outnumbered:true},action:{kind:'GRANT',traits:['mana','physical'],target:'recipient',chooseTrait:true}},
      condition:'Lorsqu\u2019un autre alli\u00e9 entre de r\u00e9serve alors que Nami est active et que son \u00e9quipe reste en inf\u00e9riorit\u00e9 num\u00e9rique apr\u00e8s son arriv\u00e9e : choisissez pour lui une Potion (+60 ATK magique) ou une Puissance (+60 ATK physique), absente de ses effets. Pour sa prochaine attaque chiffr\u00e9e du type choisi. Une fois par partie.'
    },
    'rumble-ball':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SUPPORT',count:2,distinct:true,action:{kind:'ARM',stat:'DUEL',value:50,target:'self'}},
      condition:'Apr\u00e8s de nouveaux soutiens donn\u00e9s \u00e0 deux autres alli\u00e9s diff\u00e9rents : +50 sur la premi\u00e8re ATK ou DEF chiffr\u00e9e de Chopper, selon ce qui arrive en premier. Pour ce duel seulement. Une fois par partie.'
    },
    'cola-reserve':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'BLOCK',count:2,action:{kind:'ARM',stat:'ATK',value:60,target:'self'}},
      condition:'Apr\u00e8s deux Blocks r\u00e9ussis : prochaine attaque chiffr\u00e9e conserv\u00e9e, +60 ATK pour ce duel. Une fois par partie.'
    },
    'gotham-harvey-coin':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ATTACK',when:{outnumbered:true},action:{kind:'COIN',value:60}},
      condition:'En inf\u00e9riorit\u00e9 num\u00e9rique, prochaine attaque chiffr\u00e9e conserv\u00e9e : pile, +60 ATK pour ce duel ; face, une Garde personnelle si elle est absente. Un seul lancer de pi\u00e8ce, conserv\u00e9 apr\u00e8s rechargement. Une fois par partie.'
    },
    'gotham-riddle-box':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SUPPORT',action:{kind:'PREDICT',value:50}},
      condition:'Apr\u00e8s un nouveau soutien donn\u00e9 \u00e0 un autre alli\u00e9 : \u00e0 la prochaine attaque subie, pr\u00e9disez pair ou impair avant le jet adverse. Si le d\u00e9 ATK finalement conserv\u00e9 a la bonne parit\u00e9 et donne une attaque chiffr\u00e9e : +50 DEF pour ce duel. La tentative est d\u00e9pens\u00e9e m\u00eame en cas d\u2019erreur. Une fois par partie.'
    },
    'gotham-ivy-seed':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SUPPORT',count:2,action:{kind:'DEBUFF',value:40}},
      condition:'Apr\u00e8s deux nouveaux soutiens donn\u00e9s \u00e0 d\u2019autres alli\u00e9s : choisissez un adversaire actif. Sa prochaine attaque chiffr\u00e9e conserv\u00e9e subit -40 ATK pour ce duel. Ni tour perdu ni effet sur Mort ; sa mort d\u00e9finitive efface la marque. Une fois par partie.'
    },
    'gotham-utility-belt':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SURVIVED',action:{kind:'ARM',stat:'DEF',value:60,target:'self',against:'attacker'}},
      condition:'Apr\u00e8s avoir surv\u00e9cu \u00e0 une attaque : marque cet attaquant pr\u00e9cis. Sa prochaine attaque chiffr\u00e9e contre Batman donne +60 DEF \u00e0 Batman pour ce duel. La mort d\u00e9finitive de cet adversaire fait perdre la marque. Une fois par partie.'
    },
    'gotham-lazarus-vial':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ALLIED_DEATH',count:2,action:{kind:'GRANT',traits:['reraise'],target:'self'}},
      condition:'Apr\u00e8s deux \u00e9liminations d\u2019autres alli\u00e9s pendant que Ra\u2019s al Ghul est sur le plateau : il re\u00e7oit un Reraise s\u2019il n\u2019a pas de c\u0153ur. Ne rappelle jamais une carte morte. Une fois par partie.'
    },
    'castlevania-hector-ring':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'SUPPORT',count:2,distinct:true,traits:['ward','reraise'],action:{kind:'GRANT',traits:['reraise'],target:'chooseAllies'}},
      condition:'Apr\u00e8s de nouvelles Gardes ou de nouveaux Reraise donn\u00e9s \u00e0 deux autres alli\u00e9s diff\u00e9rents : choisissez un autre alli\u00e9 actif sans c\u0153ur. Il re\u00e7oit un Reraise. Une fois par partie.'
    },
    'castlevania-lisa-memory':{
      effect:{trigger:'ULTIMATE',duration:'ONCE_MATCH',event:'ALLY_TARGETED',when:{outnumbered:true,magic:false},action:{kind:'BONUS',stat:'DEF',value:60}},
      condition:'En inf\u00e9riorit\u00e9 num\u00e9rique, lorsqu\u2019un autre alli\u00e9 actif subit une attaque physique chiffr\u00e9e : cet alli\u00e9 gagne +60 DEF pour ce duel. Une fois par partie.'
    }
  };
  function freeze(value){
    if(value&&typeof value==='object'){
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  return freeze(definitions);
});
