#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',out=home+'work/',folder=out+'render/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(life){
 var doc=life.open(home+'originals/card.psd'),old=K.read(root+'V4/expansions/2026-09-29-drebin/cards/drebin/render/native.json'),plan=K.read(folder+'composition.json');
 K.need(doc,'ATK D1 - valeur').remove();
 var spec=plan.layers[plan.layers.length-1],layer=E.place(doc,folder+spec.file,doc.layers[0],spec.name),b=K.bounds(layer);
 layer.resize(spec.width/(b[2]-b[0])*100,spec.height/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(layer);layer.translate(spec.left-b[0],spec.top-b[1]);
 var texts=[];for(var i=0;i<doc.layers.length;i++)if(doc.layers[i].kind===LayerKind.TEXT&&doc.layers[i].visible){texts.push(doc.layers[i]);doc.layers[i].visible=false;}
 doc.saveAs(new File(folder+'without-text.png'),new PNGSaveOptions(),true);for(i=0;i<texts.length;i++)texts[i].visible=true;
 K.save(doc,out+'card.psd',out+'card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
 var reopened=life.open(out+'card.psd');reopened.saveAs(new File(folder+'reopened.png'),new PNGSaveOptions(),true);var expected=[];for(i=0;i<old.expected.length;i++)if(old.expected[i].name!=='ATK D1 - valeur')expected.push(old.expected[i]);
 K.write(folder+'native.json',{photoshop:app.version,width:897,height:1497,resolution:300,expected:expected,layers:K.state(reopened,[],''),components:plan.layers,typography:KT.snapshot(reopened)});
});
'Drebin clover patched';
