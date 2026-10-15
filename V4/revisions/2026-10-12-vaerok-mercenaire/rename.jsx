#target photoshop
#include "../../scripts/stable/common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',quotes=app.preferences.smartQuotes;
try{
 app.preferences.smartQuotes=false;
 K.lifecycle(function(life){
  var source=life.open(home+'originals/card.psd');
  if(!source.saved)throw Error('Source document has unsaved changes');
  var doc=life.duplicate(source,'Kalistar - Vaerok Mercenaire'),p=K.read(home+'work/profile.json'),n=K.read(home+'originals/render/native.json');
  K.text(K.need(doc,'JOB'),p.job,292,1172.5,170);
  for(var i=0;i<n.expected.length;i++)if(n.expected[i].name==='JOB')n.expected[i].value=p.job;
  K.save(doc,home+'work/card.psd',home+'work/card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
  var reopened=life.open(home+'work/card.psd');reopened.saveAs(new File(home+'work/render/reopened.png'),new PNGSaveOptions(),true);
  n.layers=K.state(reopened,[],'');n.typography=KT.snapshot(reopened);
  K.write(home+'work/render/native.json',n);
 });
}finally{app.preferences.smartQuotes=quotes;}
'Native job updated';
