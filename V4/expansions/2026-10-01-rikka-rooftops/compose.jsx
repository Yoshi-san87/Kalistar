#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../2026-10-01-one-piece/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json');
if(request.keys.length!==1||request.keys[0]!=='rikka-rooftops')throw Error('Only the additive Rikka card is allowed.');
composeMines(home+'cards/rikka-rooftops/',root);
'Rikka composed';
