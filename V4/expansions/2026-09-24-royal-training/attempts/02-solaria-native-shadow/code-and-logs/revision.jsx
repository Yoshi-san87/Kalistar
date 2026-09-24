#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',request=K.read(home+'revision-request.json');
function exportWithout(doc,names,file){
    var list=[];
    try{for(var i=0;i<names.length;i++){var l=K.need(doc,names[i]);list.push({layer:l,visible:l.visible});l.visible=false;}
        doc.saveAs(new File(file),new PNGSaveOptions(),true);
    }finally{for(var j=0;j<list.length;j++)list[j].layer.visible=list[j].visible;}
}
function descriptor(layer){var r=new ActionReference();r.putIdentifier(K.s('layer'),layer.id);return executeActionGet(r);}
function nativeTexts(doc){
    var states=K.state(doc,[],''),out=[];
    for(var i=0;i<states.length;i++)if(states[i].kind==='LayerKind.TEXT'){
        var l=K.need(doc,states[i].name),t=l.textItem,o={path:states[i].path};
        var props=['font','size','tracking','capitalization','fauxBold','fauxItalic'];
        for(var j=0;j<props.length;j++)try{o[props[j]]=String(t[props[j]]);}catch(e){o[props[j]]=null;}
        // Mixed-style legacy legends have no single TextItem font; preserve all style runs exactly.
        var text=descriptor(l).getObjectValue(K.s('textKey')),styles=new ActionDescriptor();
        styles.putList(K.s('textStyleRange'),text.getList(K.s('textStyleRange')));
        if(text.hasKey(K.s('paragraphStyleRange')))styles.putList(K.s('paragraphStyleRange'),text.getList(K.s('paragraphStyleRange')));
        var stream=styles.toStream(),hex='';for(j=0;j<stream.length;j++)hex+=('0000'+stream.charCodeAt(j).toString(16)).slice(-4);
        o.nativeStyleRuns=hex;out.push(o);
    }return out;
}
function embedded(doc,names){
    app.activeDocument=doc;var out={};
    for(var i=0;i<names.length;i++){
        var layer=K.need(doc,names[i]);
        if(layer.kind!==LayerKind.SMARTOBJECT)throw Error('Expected embedded object '+layer.name);
        var d=descriptor(layer).getObjectValue(K.s('smartObject'));
        if(d.hasKey(K.s('linked'))&&d.getBoolean(K.s('linked')))throw Error('Linked object forbidden');
        out[layer.name]=true;
    }return out;
}
function maskBelow(doc,layer,y){
    app.activeDocument=doc;doc.activeLayer=layer;
    var locked=layer.allLocked;layer.allLocked=false;
    try{
        if(!descriptor(layer).getBoolean(K.s('hasUserMask'))){
            var make=new ActionDescriptor(),channel=new ActionReference();
            channel.putClass(K.c('Chnl'));make.putReference(K.c('null'),channel);
            var at=new ActionReference();at.putEnumerated(K.c('Chnl'),K.c('Chnl'),K.c('Msk '));make.putReference(K.c('At  '),at);
            make.putEnumerated(K.c('Usng'),K.c('UsrM'),K.c('RvlA'));executeAction(K.c('Mk  '),make,DialogModes.NO);
        }
        var select=new ActionDescriptor(),mask=new ActionReference();mask.putEnumerated(K.c('Chnl'),K.c('Chnl'),K.c('Msk '));
        select.putReference(K.c('null'),mask);executeAction(K.c('slct'),select,DialogModes.NO);
        doc.selection.select([[0,y],[897,y],[897,1497],[0,1497]]);
        var black=new SolidColor();black.rgb.hexValue='000000';doc.selection.fill(black);doc.selection.deselect();
        var rgb=new ActionDescriptor(),ref=new ActionReference();ref.putEnumerated(K.c('Chnl'),K.c('Chnl'),K.c('RGB '));rgb.putReference(K.c('null'),ref);executeAction(K.c('slct'),rgb,DialogModes.NO);
    }finally{layer.allLocked=locked;}
}
function revise(item){
    var dir=item.work.replace(/\\/g,'/')+'/';
    return K.lifecycle(function(life){
        var source=life.open(item.original);if(!source.saved)throw Error('Unsaved source');
        var doc=life.duplicate(source,'Kalistar revision '+item.key),before=K.state(doc,[],''),textsBefore=nativeTexts(doc);
        var names=item.layers;embedded(doc,names);
        doc.saveAs(new File(dir+'before-card.png'),new PNGSaveOptions(),true);
        exportWithout(doc,names,dir+'before-without-edits.png');
        if(item.kind==='flag'){
            for(var i=0;i<names.length;i++)maskBelow(doc,K.need(doc,names[i]),997);
        }else{
            app.activeDocument=doc;var art=K.need(doc,names[0]),locked=art.allLocked;art.allLocked=false;doc.activeLayer=art;
            var change=new ActionDescriptor();change.putPath(K.c('null'),new File(dir+'component-art.png'));
            executeAction(K.s('placedLayerReplaceContents'),change,DialogModes.NO);
            art=K.need(doc,names[0]);var b=K.bounds(art);
            art.resize(737/(b[2]-b[0])*100,921/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(art);
            art.translate(80-b[0],156-b[1]);art.allLocked=locked;
        }
        exportWithout(doc,names,dir+'after-without-edits.png');
        var after=K.state(doc,[],''),textsAfter=nativeTexts(doc);embedded(doc,names);
        K.save(doc,dir+'card.psd',dir+'card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
        var reopened=life.open(dir+'card.psd');reopened.saveAs(new File(dir+'reopened.png'),new PNGSaveOptions(),true);
        K.write(dir+'native.json',{width:reopened.width.as('px'),height:reopened.height.as('px'),resolution:reopened.resolution,
            photoshop:app.version,before:before,after:after,reopened:K.state(reopened,[],''),textsBefore:textsBefore,textsAfter:textsAfter,
            textsReopened:nativeTexts(reopened),embedded:embedded(reopened,names),allowedLayers:names});
    });
}
for(var i=0;i<request.items.length;i++){
    K.write(home+'revision-progress.json',{index:i,total:request.items.length,key:request.items[i].key});revise(request.items[i]);
}
'Visual revisions saved and reopened';
