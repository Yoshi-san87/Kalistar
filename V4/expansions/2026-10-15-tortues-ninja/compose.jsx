#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../2026-10-04-city-guards/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
if(app.version!=='26.11.8')throw Error('Photoshop 26.11.8 required.');
var request=K.read(root+'work/tmnt-native/render-request.json'),set=K.read(home+'set.json');
var oldSmartQuotes=app.preferences.smartQuotes;
try{
 app.preferences.smartQuotes=false;
 for(var i=0;i<request.keys.length;i++){
  var key=request.keys[i],found=false;
  for(var j=0;j<set.cards.length;j++)if(set.cards[j].key===key)found=true;
  if(!found||!/^[a-z0-9-]+$/.test(key))throw Error('Unknown card key');
  if(File(home+'cards/'+key+'/card.psd').exists)throw Error('Native output already exists: '+key);
  composeMines(home+'cards/'+key+'/',root);
 }
}finally{app.preferences.smartQuotes=oldSmartQuotes;}
'Tortues Ninja batch composed';
