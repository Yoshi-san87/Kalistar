#target photoshop
#include "../../scripts/stable/common.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json');
for (var cardIndex = 0; cardIndex < request.cards.length; cardIndex++) {
    var card = request.cards[cardIndex];
    K.lifecycle(function (life) {
        var output = card.work.replace(/\\/g, '/') + '/';
        var source = life.open(card.original);
        var doc = life.duplicate(source, 'FF8 DETAILS - ' + card.key);
        var art = K.need(doc, 'ILLUSTRATION - cadrage');
        if (!art.visible || art.kind !== LayerKind.SMARTOBJECT) throw Error('Illustration non editable : ' + card.key);
        var before = K.state(doc, [], '');
        doc.saveAs(new File(output + 'before-card.png'), new PNGSaveOptions(), true);
        art.visible = false;
        doc.saveAs(new File(output + 'before-without-art.png'), new PNGSaveOptions(), true);
        art.visible = true; app.activeDocument = doc; doc.activeLayer = art;
        var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(output + 'component-00.png'));
        executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
        art = K.need(doc, 'ILLUSTRATION - cadrage');
        var after = K.state(doc, [], '');
        art.visible = false;
        doc.saveAs(new File(output + 'after-without-art.png'), new PNGSaveOptions(), true);
        art.visible = true;
        K.save(doc, output + 'card.psd', output + 'card.png');
        var reopened = life.open(output + 'card.psd');
        reopened.saveAs(new File(output + 'reopened.png'), new PNGSaveOptions(), true);
        var layers = K.state(reopened, [], '');
        for (var i = 0; i < layers.length; i++) if (layers[i].kind === 'LayerKind.TEXT') K.byId(reopened, layers[i].id).visible = false;
        reopened.saveAs(new File(output + 'without-text.png'), new PNGSaveOptions(), true);
        K.write(output + 'native.json', { width: doc.width.as('px'), height: doc.height.as('px'), resolution: doc.resolution,
            before: before, after: after, layers: layers });
        return card.key + ': illustration remplacee, PSD rouvert.';
    });
}
