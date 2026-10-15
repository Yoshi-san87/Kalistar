#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var plan=K.read(home+'before.json');
if(plan.revision!=='2026-10-03-kaylis-short-sword')throw Error('Invalid revision');
K.lifecycle(function(life){
    var source=life.open(root+'V4/creations/49055457/card.psd');
    if(!source.saved)throw Error('Unsaved source');
    var doc=life.duplicate(source,'Kaylis short sword'),dir=home+'staged/';
    var report={key:'kaylis',photoshop:app.version,before:K.state(doc,[],''),width:897,height:1497,resolution:doc.resolution};
    var old=K.need(doc,'ARME - Katana'),grouped=old.grouped,visible=old.visible;
    var changed=E.place(doc,root+plan.bank,old,'Short sword replacement');
    var b=K.bounds(changed);changed.resize(96/(b[2]-b[0])*100,95/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(changed);changed.translate(89-b[0],1116-b[1]);
    old.remove();changed.name='ARME - Ep\u00e9e courte';changed.visible=visible;app.activeDocument=doc;
    if(grouped)changed.grouped=true;else K.unclip(doc,changed);
    K.save(doc,dir+'card.psd',dir+'card.png');
    var reopened=life.open(dir+'card.psd');reopened.saveAs(new File(dir+'reopened.png'),new PNGSaveOptions(),true);
    report.reopened=K.state(reopened,[],'');K.write(dir+'native.json',report);
});
'Kaylis native staging complete';
