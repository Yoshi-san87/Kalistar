#target photoshop
#include "../../scripts/stable/common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json');
function exportWithout(doc, names, file) {
    var layers = [];
    try {
        for (var i = 0; i < names.length; i++) {
            var layer = K.need(doc, names[i]);
            layers.push({ layer: layer, visible: layer.visible }); layer.visible = false;
        }
        doc.saveAs(new File(file), new PNGSaveOptions(), true);
    } finally { for (var j = 0; j < layers.length; j++) layers[j].layer.visible = layers[j].visible; }
}
function embedded(doc, names) {
    var result = {};
    app.activeDocument = doc;
    for (var i = 0; i < names.length; i++) {
        var layer = K.need(doc, names[i]);
        if (layer.kind !== LayerKind.SMARTOBJECT || !layer.visible) throw Error('Objet dynamique visible requis : ' + layer.name);
        var ref = new ActionReference(); ref.putIdentifier(K.s('layer'), layer.id);
        var d = executeActionGet(ref).getObjectValue(K.s('smartObject'));
        if (d.hasKey(K.s('linked')) && d.getBoolean(K.s('linked'))) throw Error('Objet lie interdit : ' + layer.name);
        result[layer.name] = true;
    }
    return result;
}
for (var cardIndex = 0; cardIndex < request.cards.length; cardIndex++) (function (card) {
    K.lifecycle(function (life) {
        var out = card.work.replace(/\\/g, '/') + '/', render = out + 'render/';
        var source = life.open(card.original);
        if (!source.saved) throw Error('PSD original ouvert avec modifications non enregistrees.');
        var doc = life.duplicate(source, 'NieR art refinement - ' + card.key);
        var before = K.state(doc, [], ''), oldNames = [], newNames = [], i;
        for (i = 0; i < card.replacements.length; i++) {
            oldNames.push(card.replacements[i].oldName); newNames.push(card.replacements[i].name);
        }
        embedded(doc, oldNames);
        doc.saveAs(new File(out + 'before-card.png'), new PNGSaveOptions(), true);
        exportWithout(doc, oldNames, out + 'before-without-changes.png');
        for (i = 0; i < card.replacements.length; i++) {
            var r = card.replacements[i], layer = K.need(doc, r.oldName);
            app.activeDocument = doc; doc.activeLayer = layer;
            var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(render + r.file));
            executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
            K.need(doc, r.oldName).name = r.name;
        }
        exportWithout(doc, newNames, out + 'after-without-changes.png');
        var after = K.state(doc, [], '');
        K.save(doc, out + 'card.psd', out + 'card.png'); doc.close(SaveOptions.DONOTSAVECHANGES);
        var reopened = life.open(out + 'card.psd');
        reopened.saveAs(new File(render + 'reopened.png'), new PNGSaveOptions(), true);
        var layers = K.state(reopened, [], ''), nativeProof = K.read(card['native']);
        var plan = K.read(render + 'composition.json'), allNames = [];
        for (i = 0; i < plan.layers.length; i++) allNames.push(plan.layers[i].name);
        var embeddedLayers = embedded(reopened, allNames);
        nativeProof.layers = layers; nativeProof.components = plan.layers; nativeProof.typography = KT.snapshot(reopened);
        K.write(render + 'native.json', nativeProof);
        K.write(out + 'audit.json', { before: before, after: after, reopened: layers, embedded: embeddedLayers });
        var texts = [];
        for (i = 0; i < layers.length; i++) if (layers[i].kind === 'LayerKind.TEXT') texts.push(layers[i].name);
        exportWithout(reopened, texts, render + 'without-text.png');
        return card.key + ': objets incorpores remplaces, PSD sauvegarde et rouvert.';
    });
})(request.cards[cardIndex]);
'NieR native illustration revision complete';
