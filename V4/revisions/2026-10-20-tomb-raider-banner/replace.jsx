#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
(function(){
 var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',revision=K.read(home+'before.json');
 if(app.version!=='26.11.8')throw Error('Photoshop 26.11.8 required.');
 for(var i=0;i<revision.cards.length;i++)(function(c){
  K.lifecycle(function(life){
   var source=life.open(home+'originals/'+c.key+'/card.psd');
   if(!source.saved)throw Error('Source document has unsaved changes');
   var work=home+'cards/'+c.key+'/',doc=life.duplicate(source,'Kalistar - '+c.key+' - Tomb Raider banner');
   var plan=K.read(work+'render/composition.json'),spec;
   for(var j=0;j<plan.layers.length;j++)if(plan.layers[j].name==='FACTION - TOMBRAIDER')spec=plan.layers[j];
   if(!spec)throw Error('Missing faction banner layer');
   var old=K.need(doc,spec.name),layer=E.place(doc,work+'render/'+spec.file,old,spec.name),b=K.bounds(layer);
   layer.resize(spec.width/(b[2]-b[0])*100,spec.height/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(layer);
   layer.translate(spec.left-b[0],spec.top-b[1]);old.remove();
   var texts=[];
   for(j=0;j<doc.layers.length;j++)if(doc.layers[j].kind===LayerKind.TEXT){texts.push([doc.layers[j],doc.layers[j].visible]);doc.layers[j].visible=false;}
   doc.saveAs(new File(work+'render/without-text.png'),new PNGSaveOptions(),true);
   for(j=0;j<texts.length;j++)texts[j][0].visible=texts[j][1];
   K.save(doc,work+'card.psd',work+'card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
   var reopened=life.open(work+'card.psd');reopened.saveAs(new File(work+'render/reopened.png'),new PNGSaveOptions(),true);
   var n=K.read(home+'originals/'+c.key+'/render/native.json');
   n.layers=K.state(reopened,[],'');n.components=plan.layers;n.typography=KT.snapshot(reopened);
   K.write(work+'render/native.json',n);
  });
 })(revision.cards[i]);
})();
'Five Tomb Raider banners replaced';
