#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var set=K.read(home+'set.json'),completed=[];
for(var i=0;i<set.cards.length;i++){
    var key=set.cards[i].key;
    K.write(home+'render-progress.json',{current:key,completed:completed});
    composeFF7(home+'cards/'+key+'/',root);completed.push(key);
}
K.write(home+'render-progress.json',{completed:completed,status:'rendered'});
'FF7 composed: '+completed.length;
