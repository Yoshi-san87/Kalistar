#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../2026-10-04-city-guards/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
if(app.version!=='26.11.8')throw Error('Unexpected Photoshop version');
var originalSmartQuotes=app.preferences.smartQuotes;
try{
    app.preferences.smartQuotes=false;
    var set=K.read(home+'set.json'),cards=set.cards.concat(set.revisions);
    for(var i=0;i<cards.length;i++){
        if(!File(home+'cards/'+cards[i].key+'/card.psd').exists)composeMines(home+'cards/'+cards[i].key+'/',root);
    }
}finally{app.preferences.smartQuotes=originalSmartQuotes;}
'Crossover native cards composed';
