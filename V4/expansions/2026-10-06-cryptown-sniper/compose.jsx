#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../2026-10-04-city-guards/compose-one.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
var set = K.read(home + 'set.json');
if (app.version !== '26.11.8') throw Error('Unexpected Photoshop runtime');
for (var i = 0; i < set.cards.length; i++) composeMines(home + 'cards/' + set.cards[i].key + '/', root);
'Cryptown sniper composed';
