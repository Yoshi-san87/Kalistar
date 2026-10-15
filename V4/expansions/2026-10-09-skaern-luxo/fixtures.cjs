'use strict';
const assert=require('node:assert/strict');
const decks=[['49901401','49900902','49900903','49900904','49900906','49900907','49900908','49900909','49900910','49900911'],require('../2026-10-08-final-fantasy-ix/model.cjs').qaDecks()[0]];
function formation(cards,ids,target,slot){
 const slots=Array(5).fill(null),used=new Set([target]),byId=new Map(cards.map(c=>[c.id,c]));slots[slot]=target;
 function visit(i){
  if(i===5)return true;if(slots[i])return visit(i+1);
  for(const id of ids)if(!used.has(id)&&byId.get(id).positions.includes(i+1)){
   slots[i]=id;used.add(id);if(visit(i+1))return true;used.delete(id);slots[i]=null;
  }return false;
 }
 assert(visit(0));return slots;
}
function deploy(E,s,side,slots){for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===slots[slot]).uid,slot);}
module.exports={decks,formation,deploy};
