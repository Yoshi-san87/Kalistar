#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../nier-pilot-01/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json');
if(request.keys.length!==1||request.keys[0]!=='simone')throw Error('Simone-only production batch.');
composeNieR(home+'cards/simone/',root);
'Simone composed';
