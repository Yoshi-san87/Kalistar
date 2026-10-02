#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json'),set=K.read(home+'set.json'),allowed={};
for(var s=0;s<set.cards.length;s++)allowed[set.cards[s].key]=true;
for(var i=0;i<request.keys.length;i++){var key=request.keys[i];if(!allowed[key])throw Error('Card outside batch.');composeMines(home+'cards/'+key+'/',root);}
'Mirelle composed';
