#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../nier-pilot-01/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json');
for(var i=0;i<request.keys.length;i++){
    var key=request.keys[i];
    if(!/^(emil|a2|pascal|adam|eve|anemone)$/.test(key))throw Error('Unknown NieR set 02 card.');
    composeNieR(home+'cards/'+key+'/',root);
}
'NieR set 02 composed: '+request.keys.length;
