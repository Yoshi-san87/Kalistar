#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json');
if(request.revision!=='2026-09-30-metal-gear-saga')throw Error('Wrong revision.');
function exportWithout(doc,names,file){var found=[];try{for(var i=0;i<names.length;i++){var l=K.need(doc,names[i]);found.push({layer:l,visible:l.visible});l.visible=false;}doc.saveAs(new File(file),new PNGSaveOptions(),true);}finally{for(var j=0;j<found.length;j++)found[j].layer.visible=found[j].visible;}}
function nativeTexts(doc){
 var states=K.state(doc,[],''),out=[];
 for(var i=0;i<states.length;i++)if(states[i].kind==='LayerKind.TEXT'){
  var ref=new ActionReference();ref.putIdentifier(K.s('layer'),K.need(doc,states[i].name).id);
  var text=executeActionGet(ref).getObjectValue(K.s('textKey')),styles=new ActionDescriptor();styles.putList(K.s('textStyleRange'),text.getList(K.s('textStyleRange')));
  if(text.hasKey(K.s('paragraphStyleRange')))styles.putList(K.s('paragraphStyleRange'),text.getList(K.s('paragraphStyleRange')));
  var stream=styles.toStream(),hex='';for(var j=0;j<stream.length;j++)hex+=('0000'+stream.charCodeAt(j).toString(16)).slice(-4);
  out.push({path:states[i].path,nativeStyleRuns:hex});
 }return out;
}
function revise(c){return K.lifecycle(function(life){
 var out=home+'work/'+c.key+'/',folder=out+'render/',source=life.open(root+c.original);
 if(!source.saved)throw Error('Unsaved original.');
 var doc=life.duplicate(source,c.key+' native revision'),old=K.read(root+c.native),plan=K.read(folder+'composition.json'),p=K.read(out+'profile.json');
 var before=K.state(doc,[],''),textsBefore=nativeTexts(doc),i,expected=[];
 if(c.kind==='name')K.text(K.need(doc,'NOM'),p.name,449.5,129.5,470);
 if(c.kind==='death'){
  K.need(doc,'ATK D3 - valeur').remove();
  var spec=plan.layers[plan.layers.length-1],layer=E.place(doc,folder+spec.file,doc.layers[0],spec.name),b=K.bounds(layer);
  layer.resize(spec.width/(b[2]-b[0])*100,spec.height/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(layer);layer.translate(spec.left-b[0],spec.top-b[1]);
 }
 if(c.kind==='art'){
  exportWithout(doc,['ILLUSTRATION - cadrage'],out+'before-without-art.png');
  app.activeDocument=doc;doc.activeLayer=K.need(doc,'ILLUSTRATION - cadrage');
  var change=new ActionDescriptor();change.putPath(K.c('null'),new File(folder+plan.layers[0].file));executeAction(K.s('placedLayerReplaceContents'),change,DialogModes.NO);
  exportWithout(doc,['ILLUSTRATION - cadrage'],out+'after-without-art.png');
 }
 var after=K.state(doc,[],''),textsAfter=nativeTexts(doc),names=[];
 for(i=0;i<after.length;i++)if(after[i].kind==='LayerKind.TEXT')names.push(after[i].name);
 exportWithout(doc,names,folder+'without-text.png');
 K.save(doc,out+'card.psd',out+'card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
 var reopened=life.open(out+'card.psd');reopened.saveAs(new File(folder+'reopened.png'),new PNGSaveOptions(),true);
 for(i=0;i<old.expected.length;i++){var entry=old.expected[i];if(c.kind==='death'&&entry.name==='ATK D3 - valeur')continue;if(c.kind==='name'&&entry.name==='NOM')entry.value=p.name;expected.push(entry);}
 var state=K.state(reopened,[],'');
 K.write(folder+'native.json',{photoshop:app.version,width:897,height:1497,resolution:300,expected:expected,layers:state,components:plan.layers,typography:KT.snapshot(reopened)});
 K.write(out+'audit.json',{before:before,after:after,reopened:state,textsBefore:textsBefore,textsAfter:textsAfter,textsReopened:nativeTexts(reopened)});
});}
for(var ci=0;ci<request.cards.length;ci++)revise(request.cards[ci]);
'Three native revisions complete';
