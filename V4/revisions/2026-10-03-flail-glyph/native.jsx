#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var plan=K.read(home+'before.json'),layout=K.read(home+'calibration.json').weapon['Fléau'];
if(plan.revision!=='2026-10-03-flail-glyph')throw Error('Invalid revision');
function sprite(life,source,names,target,crop){
    var doc=life.track(app.documents.add(897,1497,300,'Flail glyph proof',NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1'));
    for(var i=names.length-1;i>=0;i--){app.activeDocument=source;var layer=K.need(source,names[i]).duplicate(doc,ElementPlacement.PLACEATBEGINNING);app.activeDocument=doc;K.unclip(doc,layer);layer.visible=true;}
    if(crop)doc.crop([89,1116,185,1211]);
    doc.saveAs(new File(target),new PNGSaveOptions(),true);app.activeDocument=source;
}
var ordered=[],done=[];
for(var i=0;i<plan.items.length;i++)if(plan.items[i].kind==='approved')ordered.push(plan.items[i]);
for(i=0;i<plan.items.length;i++)if(plan.items[i].kind==='created')ordered.push(plan.items[i]);
for(i=0;i<ordered.length;i++){
    var item=ordered[i];
    K.write(home+'progress.json',{current:item.key,completed:done});
    K.lifecycle(function(life){
        var source=life.open(root+item.psd);if(!source.saved)throw Error('Unsaved source: '+item.psd);
        var doc=life.duplicate(source,'Flail glyph '+item.key),dir=home+'staged/'+item.key+'/';
        var report={key:item.key,photoshop:app.version,before:K.state(doc,[],''),width:897,height:1497,resolution:doc.resolution};
        var old=K.need(doc,item.layer),grouped=old.grouped,visible=old.visible;
        var changed=E.place(doc,home+'staged/flail-bank.png',old,'White flail replacement');
        var b=K.bounds(changed);changed.resize(96/(b[2]-b[0])*100,95/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(changed);changed.translate(89-b[0],1116-b[1]);
        old.remove();changed.name=item.layer;changed.visible=visible;app.activeDocument=doc;
        if(grouped)changed.grouped=true;else K.unclip(doc,changed);
        K.save(doc,dir+'card.psd',dir+'card.png');
        var reopened=life.open(dir+'card.psd');reopened.saveAs(new File(dir+'reopened.png'),new PNGSaveOptions(),true);
        report.reopened=K.state(reopened,[],'');K.write(dir+'native.json',report);
    });
    done.push(item.key);
}
K.write(home+'native-complete.json',{revision:plan.revision,photoshop:app.version,completed:done,sourceWrites:false});
'Flail glyph native staging complete';
