#include "../../scripts/stable/common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(ctx){
    var source=ctx.open(root+'V4/templates/TAULIO_V4_02_POSITIONS.psd');if(!source.saved)throw Error('Source non enregistree');
    var doc=ctx.track(app.documents.add(897,1497,300,'Email natif',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
    K.transplant(source,K.need(source,'ARME Poing - email interieur'),doc,doc.layers[0],'EMAIL');
    doc.saveAs(new File(home+'weapon-email-native.png'),new PNGSaveOptions(),true);
});
'Email exported';
