'use strict';
const base=['49902606','49902612','49902607','49902614','49902601','49902613','49902610','49902611','49902604','49902605'];
const replacement={1:0,2:2,3:8,4:4,5:6};
function deckFor(c){const result=base.slice();result[replacement[c.role]]=c.id;return result;}
const decks=s=>s.cards.map(deckFor);
const {formation,deploy}=require('../2026-10-09-skaern-luxo/fixtures.cjs');
module.exports={base,deckFor,decks,formation,deploy};
