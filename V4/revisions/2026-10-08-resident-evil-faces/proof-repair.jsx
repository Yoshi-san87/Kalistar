#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',plan=K.read(home+'plan.json');
function maskExport(sourcePath,output,logFile){
 K.lifecycle(function(life){
  var source=life.open(sourcePath),doc=life.duplicate(source,'Combat face isolation proof'),state=K.state(doc,[],''),hidden=[];
  for(var i=0;i<state.length;i++){
   var n=state[i].name;
   if(n.indexOf('ATK D')===0||n.indexOf('DEF D')===0){var l=K.need(doc,n);l.visible=false;hidden.push(n);}
  }
  K.write(logFile,{hidden:hidden,state:K.state(doc,[],'')});
  doc.flatten();
  doc.saveAs(new File(output),new PNGSaveOptions(),true);
 });
}
if(app.version!=='26.11.8')throw Error('Wrong runtime');
for(var i=0;i<plan.cards.length;i++){
 var id=plan.cards[i].id,out=home+'work/'+id+'/';
 maskExport(home+'originals/'+id+'/card.psd',out+'proof-original-no-faces.png',out+'proof-original-hidden.json');
 maskExport(out+'card.psd',out+'proof-revised-no-faces.png',out+'proof-revised-hidden.json');
 K.write(home+'proof-progress.json',{completed:id});
}
'Isolated combat-face proofs exported';
