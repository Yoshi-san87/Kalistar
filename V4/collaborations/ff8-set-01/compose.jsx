#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var set=K.read(home+'set.json'),request=K.read(home+'render-request.json'),completed=[];
for(var i=0;i<request.keys.length;i++){
    var key=request.keys[i],known=false;
    for(var j=0;j<set.cards.length;j++)if(set.cards[j].key===key)known=true;
    if(!known||!/^[a-z0-9-]+$/.test(key))throw Error('Unknown FF8 card.');
    K.write(home+'render-progress.json',{current:key,completed:completed});
    composeFF8(home+'cards/'+key+'/',root);completed.push(key);
}
K.write(home+'render-progress.json',{completed:completed,status:'rendered'});
'FF8 composed: '+completed.length;
