#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json');
for(var i=0;i<request.keys.length;i++){
    var key=request.keys[i];
    if(key!=='2b'&&key!=='9s')throw Error('Unknown NieR pilot card.');
    var dir=home+'cards/'+key+'/';
    composeNieR(dir,root);
}
'NieR composed: '+request.keys.length;
