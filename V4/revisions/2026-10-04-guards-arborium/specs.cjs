'use strict';
const old = require('../../expansions/2026-10-04-city-guards/set.json');
const removed = ['49900309', '49900310'];
const revisedKeys = ['orven','serya','isvel','torvan','eldra','brund','aeren','vessa','neryk','brask','maelka','tilko'];
const descriptions = {
  serya: "Avant la ronde, Serya recoud la chaussure de son fils, son arme tournée vers le sol. Il grandit plus vite que sa solde. Dans chaque point, elle glisse une promesse de rentrer.",
  tilko: "Tilko laisse son cigare se consumer face au large. Sa pince protège la lampe qui guide les retours. Entre deux signaux, il compte les voiles ; une seule manque encore à son bonheur.",
  orven: "Orven connaît les deux faces de son uniforme. Au barrage, il soulève son bouclier pour libérer le passage. Cette nuit, il choisit ceux qu'il laisse entrer avant ceux auxquels il obéit."
};
const revised = old.cards.filter(c=>revisedKeys.includes(c.key)).map(c=>({...c,
  art:c.key==='serya'?c.art:c.art.replace('_01.png','_02.png'),
  description:descriptions[c.key]||c.description
}));
const additions = [
 {key:'eryss',id:'49900401',name:'ERYSS',title:'Ce qui attend de grandir',race:'TOXINAR',element:'HERBO',job:'SOLDAT',weapon:'Sceptre',role:5,positions:[3,5],atk:[167,128,96,'guard','mana','revive'],defense:[193,152,116,84,53,22],magic:[6,4],barriers:[4],description:"Eryss transporte les graines des jardins disparus. Son sceptre les garde au chaud pendant les rondes. Dans sa paume, la dernière coque se fend : cette fois, ce n'est pas une blessure."},
 {key:'velran',id:'49900402',name:'VELRAN',title:'Un abri sans miracle',race:'HUMAIN',element:'NONE',job:'SOLDAT',weapon:'Lance',role:1,positions:[1,3],atk:[202,158,122,86,'guard',23],defense:[287,231,184,136,82,34],magic:[],barriers:[],description:"Velran n'a jamais porté de cristal. Ses sept lames de bois s'ouvrent contre le vent, assez larges pour une pousse ou un enfant. Il ne fait pas de miracles ; il reste quand ils manquent."},
 {key:'saelor',id:'49900403',name:'SAELOR',title:'Le cercle qui demeure',race:'CERELF',element:'HERBO',job:'SOLDAT',weapon:'Arc',role:4,positions:[3,4],atk:[278,226,176,124,76,31],defense:[161,125,96,69,'dodge',19],magic:[5,3],barriers:[],description:"Saelor retend son arc avant chaque départ. La bague de bois qu'il garde ne passe plus à son doigt. Il la regarde un instant, puis reprend la ronde : quelqu'un doit encore revenir."},
 {key:'liorne',id:'49900404',name:'LIORNE',title:'La lettre sous le bois',race:'CERELF',element:'HERBO',job:'SOLDAT',weapon:'Epée courte',role:2,positions:[2,4],atk:[284,228,174,126,'buff_atk',29],defense:[166,128,98,71,44,17],magic:[4],barriers:[],description:"Liorne glisse la lettre sous son armure avant la relève. Sa lame fend les ronces, jamais le sceau. À la porte, elle sourit encore : le courage tient parfois dans quelques mots non lus."}
].map(c=>({...c,characterId:c.key+'-kalistar',faction:'Arborium',art:'Arborium_Guards_'+c.name[0]+c.name.slice(1).toLowerCase()+'_01.png',crop:{zoom:1,x:0,y:0}}));
module.exports={removed,revised,additions,cards:[...revised,...additions]};
