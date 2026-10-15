#target photoshop
#include "elements-common.jsx"
(function(){
    return K.lifecycle(function(ctx){
        var doc=ctx.track(app.documents.add(64,64,300,'Kalistar - test filtre',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
        var color=new SolidColor();color.rgb.hexValue='888888';doc.selection.selectAll();doc.selection.fill(color);doc.selection.deselect();
        var layer=K.smart(doc,doc.activeLayer);
        E.colorize(doc,layer,{spectrum:[[0,'171726'],[2048,'398294'],[4096,'EFE2EA']]});
        if(layer.kind!==LayerKind.SMARTOBJECT)throw Error('Objet dynamique perdu.');
        return 'Courbe de transfert native ecretee sur un objet dynamique.';
    });
})();
