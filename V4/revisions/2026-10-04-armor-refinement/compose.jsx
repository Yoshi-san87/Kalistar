#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../expansions/2026-10-04-city-guards/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json');
for(var i=0;i<request.keys.length;i++){var key=request.keys[i];if(!/^[a-z]+$/.test(key))throw Error('Invalid key');composeMines(home+'cards/'+key+'/',root);}
'Revised guards and Arborium composed';
