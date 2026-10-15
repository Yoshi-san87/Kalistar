#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../2026-10-04-city-guards/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
if(app.version!=='26.11.8')throw Error('Unexpected Photoshop version');
var keys=['hrold','sevrane','taevrik','ulvren','nivra'];
for(var i=0;i<keys.length;i++)composeMines(home+'cards/'+keys[i]+'/',root);
'Grivka white guard composed';
