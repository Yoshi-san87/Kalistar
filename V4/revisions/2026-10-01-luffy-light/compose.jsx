#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/';
if(app.version!=='26.11.7')throw Error('Wrong Photoshop version');
K.lifecycle(function(life){
 var plan=K.read(home+'work/render/composition.json'),p=K.read(home+'work/profile.json'),old=K.read(home+'originals/render/native.json');
 var source=life.open(home+'originals/card.psd');if(!source.saved)throw Error('Unsaved source');
 var doc=life.track(app.documents.add(897,1497,300,'Luffy - crystal light',NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1'));
 doc.activeLayer.name='FOND - noir';var black=new SolidColor();black.rgb.hexValue='000000';doc.selection.selectAll();doc.selection.fill(black);doc.selection.deselect();
 for(var i=0;i<plan.layers.length;i++){
  var spec=plan.layers[i],layer,b;
  if(spec.name==='FACTION - ONEPIECE'){var flag=life.open(home+'work/render/'+spec.file);layer=K.transplant(flag,flag.activeLayer,doc,doc.layers[0],spec.name);layer=K.smart(doc,layer);b=K.bounds(layer);}
  else{layer=E.place(doc,home+'work/render/'+spec.file,doc.layers[0],spec.name);b=K.bounds(layer);layer.resize(spec.width/(b[2]-b[0])*100,spec.height/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(layer);}
  layer.translate(spec.left-b[0],spec.top-b[1]);
 }
 doc.saveAs(new File(home+'work/render/without-text.png'),new PNGSaveOptions(),true);
 for(i=old.layers.length-1;i>=0;i--){var s=old.layers[i];if(s.kind!=='LayerKind.TEXT'||s.name==='DEF D1 - valeur')continue;
  layer=K.transplant(source,K.need(source,s.name),doc,doc.layers[0],s.name);
  if(s.name==='JOB'||s.name==='RACE'){var color=new SolidColor();color.rgb.hexValue=p.color;layer.textItem.color=color;}
 }
 var expected=[];for(i=0;i<old.expected.length;i++)if(old.expected[i].name!=='DEF D1 - valeur')expected.push(old.expected[i]);
 K.save(doc,home+'work/card.psd',home+'work/card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
 var reopened=life.open(home+'work/card.psd');reopened.saveAs(new File(home+'work/render/reopened.png'),new PNGSaveOptions(),true);
 K.write(home+'work/render/native.json',{photoshop:app.version,width:897,height:1497,resolution:300,expected:expected,layers:K.state(reopened,[],''),components:plan.layers,typography:KT.snapshot(reopened)});
});
'Luffy light composed';
