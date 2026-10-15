#target photoshop
#include "../../scripts/stable/common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',request=K.read(home+'render-request.json');
K.lifecycle(function(life){
    var source=life.open(request.original),doc=life.duplicate(source,'BARRET - CYBORG'),out=home+'work/';
    var icon=K.need(doc,'RACE - HUMAIN'),label=K.need(doc,'RACE'),before=K.state(doc,[],'');
    if(icon.kind!==LayerKind.SMARTOBJECT||label.kind!==LayerKind.TEXT)throw Error('Native race layers required.');
    doc.saveAs(new File(out+'before-card.png'),new PNGSaveOptions(),true);
    icon.visible=false;label.visible=false;doc.saveAs(new File(out+'before-without-race.png'),new PNGSaveOptions(),true);
    icon.visible=true;label.visible=true;doc.activeLayer=icon;
    var change=new ActionDescriptor();change.putPath(K.c('null'),new File(request.icon));
    executeAction(K.s('placedLayerReplaceContents'),change,DialogModes.NO);
    icon=K.need(doc,'RACE - HUMAIN');icon.name='RACE - CYBORG';
    K.text(label,'CYBORG',599,1172.5,171);
    var after=K.state(doc,[],'');
    icon.visible=false;label.visible=false;doc.saveAs(new File(out+'after-without-race.png'),new PNGSaveOptions(),true);
    icon.visible=true;label.visible=true;K.save(doc,out+'card.psd',out+'card.png');
    doc.close(SaveOptions.DONOTSAVECHANGES);
    var reopened=life.open(out+'card.psd');reopened.saveAs(new File(out+'render/reopened.png'),new PNGSaveOptions(),true);
    var layers=K.state(reopened,[],'');
    for(var i=0;i<layers.length;i++)if(layers[i].kind==='LayerKind.TEXT')K.byId(reopened,layers[i].id).visible=false;
    reopened.saveAs(new File(out+'render/without-text.png'),new PNGSaveOptions(),true);
    var old=K.read(request.native);old.layers=layers;
    for(i=0;i<old.expected.length;i++)if(old.expected[i].name==='RACE')old.expected[i].value='CYBORG';
    old.components=K.read(out+'render/composition.json').layers;
    K.write(out+'render/native.json',old);
    K.write(out+'race-state.json',{before:before,after:after,layers:layers});
});
