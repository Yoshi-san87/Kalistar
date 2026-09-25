#target photoshop
#include "../../scripts/stable/common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json'), artName = 'ILLUSTRATION - cadrage';
if (request.goNative !== true || request.revision !== '2026-09-25-kaylis-training') throw Error('GO natif absent.');
if (request.work.replace(/\\/g, '/') !== home + 'work/kaylis') throw Error('Sortie hors revision.');
function exportWithout(doc, names, file) {
    var layers = [];
    try {
        for (var i = 0; i < names.length; i++) {
            var layer = K.need(doc, names[i]); layers.push({ layer: layer, visible: layer.visible }); layer.visible = false;
        }
        doc.saveAs(new File(file), new PNGSaveOptions(), true);
    } finally { for (var j = 0; j < layers.length; j++) layers[j].layer.visible = layers[j].visible; }
}
function descriptor(layer) {
    var ref = new ActionReference(); ref.putIdentifier(K.s('layer'), layer.id); return executeActionGet(ref);
}
function nativeTexts(doc) {
    var states = K.state(doc, [], ''), out = [];
    for (var i = 0; i < states.length; i++) if (states[i].kind === 'LayerKind.TEXT') {
        var layer = K.need(doc, states[i].name), text = descriptor(layer).getObjectValue(K.s('textKey'));
        // Preserve mixed-style legacy legends as native style runs, not a single font.
        var styles = new ActionDescriptor(); styles.putList(K.s('textStyleRange'), text.getList(K.s('textStyleRange')));
        if (text.hasKey(K.s('paragraphStyleRange'))) styles.putList(K.s('paragraphStyleRange'), text.getList(K.s('paragraphStyleRange')));
        var stream = styles.toStream(), hex = '';
        for (var j = 0; j < stream.length; j++) hex += ('0000' + stream.charCodeAt(j).toString(16)).slice(-4);
        out.push({ path: states[i].path, nativeStyleRuns: hex });
    }
    return out;
}
function embedded(doc, names) {
    var result = {}; app.activeDocument = doc;
    for (var i = 0; i < names.length; i++) {
        var layer = K.need(doc, names[i]);
        if (layer.kind !== LayerKind.SMARTOBJECT || !layer.visible) throw Error('Objet dynamique visible requis : ' + layer.name);
        var data = descriptor(layer).getObjectValue(K.s('smartObject'));
        if (data.hasKey(K.s('linked')) && data.getBoolean(K.s('linked'))) throw Error('Objet lie interdit.');
        result[layer.name] = true;
    }
    return result;
}
K.lifecycle(function (life) {
    var out = request.work.replace(/\\/g, '/') + '/', render = out + 'render/';
    var source = life.open(request.original);
    if (!source.saved) throw Error('PSD original ouvert avec modifications non enregistrees.');
    var doc = life.duplicate(source, 'Kaylis training - illustration only');
    var before = K.state(doc, [], ''), textsBefore = nativeTexts(doc); embedded(doc, [artName]);
    doc.saveAs(new File(out + 'before-card.png'), new PNGSaveOptions(), true);
    exportWithout(doc, [artName], out + 'before-without-art.png');
    app.activeDocument = doc; var art = K.need(doc, artName), locked = art.allLocked; art.allLocked = false; doc.activeLayer = art;
    try {
        var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(render + 'component-00.png'));
        executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
    } finally { K.need(doc, artName).allLocked = locked; }
    exportWithout(doc, [artName], out + 'after-without-art.png');
    var after = K.state(doc, [], ''), textsAfter = nativeTexts(doc);
    K.save(doc, out + 'card.psd', out + 'card.png'); doc.close(SaveOptions.DONOTSAVECHANGES);
    var reopened = life.open(out + 'card.psd');
    reopened.saveAs(new File(render + 'reopened.png'), new PNGSaveOptions(), true);
    var layers = K.state(reopened, [], ''), nativeProof = K.read(request['native']);
    var plan = K.read(render + 'composition.json'), names = [], texts = [];
    for (var i = 0; i < plan.layers.length; i++) names.push(plan.layers[i].name);
    nativeProof.width = reopened.width.as('px'); nativeProof.height = reopened.height.as('px'); nativeProof.resolution = reopened.resolution;
    nativeProof.layers = layers; nativeProof.components = plan.layers; nativeProof.typography = KT.snapshot(reopened);
    K.write(render + 'native.json', nativeProof);
    K.write(out + 'audit.json', { before: before, after: after, reopened: layers, embedded: embedded(reopened, names),
        textsBefore: textsBefore, textsAfter: textsAfter, textsReopened: nativeTexts(reopened) });
    for (var j = 0; j < layers.length; j++) if (layers[j].kind === 'LayerKind.TEXT') texts.push(layers[j].name);
    exportWithout(reopened, texts, render + 'without-text.png');
    return 'Kaylis illustration replaced; editable PSD saved and reopened.';
});
'Kaylis native illustration revision complete';
