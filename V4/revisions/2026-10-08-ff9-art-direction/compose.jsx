#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../expansions/2026-10-04-city-guards/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var plan=K.read(home+'plan.json');
if(app.version!=='26.11.8')throw Error('Unexpected Photoshop version');
for(var i=0;i<plan.cards.length;i++)composeMines(home+'work/'+plan.cards[i].id+'/',root);
'FF9 new scenes and living races composed';
