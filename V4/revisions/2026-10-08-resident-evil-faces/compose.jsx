#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json');
if(request.revision!=='2026-10-08-resident-evil-faces'||app.version!=='26.11.8')throw Error('Unexpected revision/runtime');
function isStat(name){return /^(ATK|DEF) D[1-6] - /.test(name);}
function exportHidden(doc,stats,texts,file){
 var layers=K.state(doc,[],''),restore=[];
 try{
  for(var i=0;i<layers.length;i++)if(stats&&isStat(layers[i].name)||texts&&layers[i].kind==='LayerKind.TEXT'){
   var l=K.byId(doc,layers[i].id);restore.push({layer:l,visible:l.visible});l.visible=false;
  }
  doc.saveAs(new File(file),new PNGSaveOptions(),true);
 }finally{for(var j=0;j<restore.length;j++)restore[j].layer.visible=restore[j].visible;}
}
function composeOne(card){
 var step='open';
 try{K.lifecycle(function(life){
  var out=root+card.output+'/',folder=out+'render/',p=K.read(out+'profile.json'),old=K.read(root+card.native),plan=K.read(folder+'composition.json');
  var source=life.open(root+card.original);if(!source.saved)throw Error('Unsaved original');
  var doc=life.duplicate(source,p.name+' - distinct combat faces'),before=K.state(doc,[],''),i;
  doc.saveAs(new File(out+'before-card.png'),new PNGSaveOptions(),true);
  exportHidden(doc,true,false,out+'before-without-stats.png');
  step='replace combat smart objects';
  for(i=0;i<before.length;i++)if(isStat(before[i].name)&&before[i].kind!=='LayerKind.TEXT')K.byId(doc,before[i].id).remove();
  var anchor=K.need(doc,'CADRE V4 - structure validee');
  for(i=0;i<plan.layers.length;i++){
   var spec=plan.layers[i];if(!isStat(spec.name))continue;
   var layer=E.place(doc,folder+spec.file,anchor,spec.name),b=K.bounds(layer);
   layer.resize(spec.width/(b[2]-b[0])*100,spec.height/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(layer);
   layer.translate(spec.left-b[0],spec.top-b[1]);anchor=layer;
  }
  step='native numerical faces';
  var expected=[],ys={6:150,5:371.5,4:475.5,3:576.5,2:676.5,1:773.5};
  for(i=0;i<old.expected.length;i++)if(!isStat(old.expected[i].name))expected.push(old.expected[i]);
  for(var side=0;side<2;side++)for(var die=6;die>=1;die--){
   var value=(side?p.defense:p.atk)[6-die],name=(side?'DEF':'ATK')+' D'+die+' - valeur',l=K.find(doc,name);
   if(typeof value!=='number'){if(l)l.remove();continue;}
   var e={name:name,value:String(value),center:[side?(die===6?756:734):(die===6?142:155.5),ys[die]],maxWidth:die===6?104:66};
   if(!l){
    l=K.transplant(source,K.need(source,(side?'DEF':'ATK')+' D'+(die===6?6:5)+' - valeur'),doc,doc.layers[0],name);
    l.visible=true;K.text(l,String(value),e.center[0],e.center[1],e.maxWidth);
   }else if(l.textItem.contents!==String(value))K.text(l,String(value),e.center[0],e.center[1],e.maxWidth);
   expected.push(e);
  }
  var after=K.state(doc,[],'');
  exportHidden(doc,true,false,out+'after-without-stats.png');
  exportHidden(doc,false,true,folder+'without-text.png');
  step='save and reopen';K.save(doc,out+'card.psd',out+'card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
  var reopened=life.open(out+'card.psd');reopened.saveAs(new File(folder+'reopened.png'),new PNGSaveOptions(),true);
  exportHidden(reopened,true,false,out+'reopened-without-stats.png');
  var state=K.state(reopened,[],'');
  K.write(folder+'native.json',{photoshop:app.version,width:reopened.width.as('px'),height:reopened.height.as('px'),resolution:reopened.resolution,expected:expected,layers:state,components:plan.layers,typography:KT.snapshot(reopened)});
  K.write(out+'audit.json',{before:before,after:after,reopened:state});
  K.write(home+'native-progress.json',{revision:request.revision,completed:card.id});
 });}catch(error){throw Error(card.id+' at '+step+': '+error+' (line '+error.line+')');}
}
for(var ci=0;ci<request.cards.length;ci++)composeOne(request.cards[ci]);
'Resident Evil combat faces updated';
