(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarWeapons=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const weapons=[
    {id:'fallen-king-axe',slot:'weapon',name:'Hache du Roi D\u00e9chu',family:'Hache',visual:'axe',art:'fallen-king-axe-v2',
      restrictions:{characterIds:['balmhyr']},effect:{trigger:'LAST_STANDING',stat:'ATK',value:30,duration:'WHILE_TRUE'},
      condition:'Dernier combattant actif de son \u00e9quipe.',
      lore:'Quand il ne reste plus personne derri\u00e8re lui, Balmhyr retrouve le poids du roi qu\u2019il fut.'},
    {id:'little-joys-flute',slot:'weapon',name:'La Fl\u00fbte des Petits Bonheurs',family:'Instrument',visual:'flute',art:'little-joys-flute-v2',
      restrictions:{characterIds:['momo']},effect:{trigger:'AFTER_SUPPORT',supports:['luck','mana'],stat:'DEF',value:30,duration:'NEXT_DUEL'},
      condition:'Apr\u00e8s un nouveau tr\u00e8fle ou une nouvelle potion, le b\u00e9n\u00e9ficiaire gagne +30 DEF pour son prochain duel. Une seule charge.',
      lore:'Pour Momo, cette fl\u00fbte n\u2019est pas une arme. Quand il joue, les machines grincent moins fort, les visages semblent moins lourds et, pendant quelques instants, m\u00eame les choses cass\u00e9es paraissent heureuses.'}
  ];
  for(const weapon of weapons){Object.freeze(weapon.restrictions.characterIds);Object.freeze(weapon.restrictions);if(weapon.effect.supports)Object.freeze(weapon.effect.supports);Object.freeze(weapon.effect);Object.freeze(weapon);}
  return Object.freeze({version:1,weapons:Object.freeze(weapons)});
});
