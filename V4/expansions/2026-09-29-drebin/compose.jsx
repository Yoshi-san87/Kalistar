#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../2026-09-27-metal-gear-mines/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json');
for(var i=0;i<request.keys.length;i++){
    var key=request.keys[i];if(key!=='drebin')throw Error('Card outside batch.');
    composeMines(home+'cards/'+key+'/',root);
}
'Drebin composed';
