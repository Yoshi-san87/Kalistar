'use strict';
const {weapons}=require('./weapons-v4.5.28.json');

// Restore the definitions captured by a pre-restriction match, not today's loadout rules.
function legacyGame(E,left,right,options={}){
  if(!options.equipment)return E.newGame(left,right,options);
  const s=E.newGame(left,right,{...options,equipment:[{},{}]});
  s.equipment={version:1,definitions:structuredClone(weapons),loadouts:structuredClone(options.equipment),pending:{}};
  E.assertState(s);return E.restoreGame(s);
}
module.exports={weapons,legacyGame};
