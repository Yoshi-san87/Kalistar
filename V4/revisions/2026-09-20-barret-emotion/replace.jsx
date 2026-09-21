#target photoshop
#include "../../scripts/stable/common.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
K.lifecycle(function (life) {
    var source = life.open(home + 'originals/card.psd');
    var doc = life.duplicate(source, 'BARRET - illustration revisee');
    var art = K.need(doc, 'ILLUSTRATION - cadrage');
    var before = K.state(doc, [], '');
    art.visible = false;
    doc.saveAs(new File(home + 'before-without-art.png'), new PNGSaveOptions(), true);
    art.visible = true; app.activeDocument = doc; doc.activeLayer = art;
    var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(home + 'component-00.png'));
    executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
    art = K.need(doc, 'ILLUSTRATION - cadrage');
    var after = K.state(doc, [], '');
    art.visible = false;
    doc.saveAs(new File(home + 'after-without-art.png'), new PNGSaveOptions(), true);
    art.visible = true;
    K.save(doc, home + 'card.psd', home + 'card.png');
    var reopened = life.open(home + 'card.psd');
    reopened.saveAs(new File(home + 'reopened.png'), new PNGSaveOptions(), true);
    var layers = K.state(reopened, [], '');
    for (var i = 0; i < layers.length; i++) if (layers[i].kind === 'LayerKind.TEXT') K.byId(reopened, layers[i].id).visible = false;
    reopened.saveAs(new File(home + 'without-text.png'), new PNGSaveOptions(), true);
    K.write(home + 'native.json', {width:doc.width.as('px'),height:doc.height.as('px'),before:before,after:after,layers:layers});
    return 'Barret: illustration remplacee dans son objet dynamique existant.';
});
