#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../2026-10-04-city-guards/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
if(app.version!=='26.11.8')throw Error('Unexpected Photoshop version');
var originalSmartQuotes=app.preferences.smartQuotes;
try{
 app.preferences.smartQuotes=false;
 var request=K.read(home+'resume-request.json');
 for(var i=0;i<request.keys.length;i++)composeMines(home+'cards/'+request.keys[i]+'/',root);
}finally{app.preferences.smartQuotes=originalSmartQuotes;}
'Castlevania partial batch composed';
