#target photoshop
#include "../../scripts/stable/common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json');
var artName = 'ILLUSTRATION - cadrage';
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
    var result = {}; app.activeDocument = doc;
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
K.lifecycle(function (life) {
    var out = request.work.replace(/\\/g, '/') + '/', render = out + 'render/';
    var source = life.open(request.original);
    if (!source.saved) throw Error('PSD original ouvert avec modifications non enregistrees.');
    var doc = life.duplicate(source, 'Pascal - book binding revision');
    var before = K.state(doc, [], ''); embedded(doc, [artName]);
    doc.saveAs(new File(out + 'before-card.png'), new PNGSaveOptions(), true);
    exportWithout(doc, [artName], out + 'before-without-art.png');
    app.activeDocument = doc; doc.activeLayer = K.need(doc, artName);
    var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(render + 'component-00.png'));
    executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
    exportWithout(doc, [artName], out + 'after-without-art.png');
    var after = K.state(doc, [], '');
    K.save(doc, out + 'card.psd', out + 'card.png'); doc.close(SaveOptions.DONOTSAVECHANGES);
    var reopened = life.open(out + 'card.psd');
    reopened.saveAs(new File(render + 'reopened.png'), new PNGSaveOptions(), true);
    var layers = K.state(reopened, [], ''), nativeProof = K.read(request['native']);
    var plan = K.read(render + 'composition.json'), names = [], texts = [];
    for (var i = 0; i < plan.layers.length; i++) names.push(plan.layers[i].name);
    var embeddedLayers = embedded(reopened, names);
    nativeProof.layers = layers; nativeProof.components = plan.layers; nativeProof.typography = KT.snapshot(reopened);
    K.write(render + 'native.json', nativeProof);
    K.write(out + 'audit.json', { before: before, after: after, reopened: layers, embedded: embeddedLayers });
    for (var j = 0; j < layers.length; j++) if (layers[j].kind === 'LayerKind.TEXT') texts.push(layers[j].name);
    exportWithout(reopened, texts, render + 'without-text.png');
    return 'Pascal illustration replaced, PSD saved and reopened.';
});
'Pascal native book revision complete';
