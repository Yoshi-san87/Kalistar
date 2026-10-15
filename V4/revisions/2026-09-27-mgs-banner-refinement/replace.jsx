#target photoshop
#include "../../scripts/stable/common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json');
if (request.goNative !== true || request.revision !== '2026-09-27-mgs-banner-refinement') throw Error('GO natif absent.');
if (!/^(solid-snake-mgs[124]|revolver-ocelot|sniper-wolf|vulcan-raven|ninja|meryl|liquid-snake|psycho-mantis|kaylis)$/.test(request.key)) throw Error('Carte hors revision.');
if (request.work.replace(/\\/g, '/') !== home + 'work/' + request.key) throw Error('Sortie hors revision.');
var replaced = [];
for (var r = 0; r < request.replacements.length; r++) {
    var replacement = request.replacements[r];
    if (!/^(ILLUSTRATION - cadrage|FACTION - MGS[124])$/.test(replacement.name)) throw Error('Objet hors revision.');
    if (replacement.file.replace(/\\/g, '/').indexOf(home + 'work/' + request.key + '/render/') !== 0) throw Error('Composant hors revision.');
    replaced.push(replacement.name);
}
if (!replaced.length || replaced.length > 2) throw Error('Nombre de remplacements invalide.');
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
function smartGeometry(doc, names) {
    var result = [];
    for (var i = 0; i < names.length; i++) {
        var layer = K.need(doc, names[i]), d = descriptor(layer).getObjectValue(K.s('smartObjectMore'));
        var size = d.getObjectValue(K.s('size')), list = d.getList(K.s('transform')), transform = [];
        for (var j = 0; j < list.count; j++) transform.push(list.getDouble(j));
        result.push({ name: names[i], bounds: K.bounds(layer), resolution: d.getDouble(K.s('resolution')),
            size: [size.getDouble(K.s('width')), size.getDouble(K.s('height'))], transform: transform });
    }
    return result;
}
function sameGeometry(before, after) {
    for (var i = 0; i < before.length; i++) {
        for (var j = 0; j < 4; j++) if (before[i].bounds[j] !== after[i].bounds[j]) throw Error('Bounds changed: ' + before[i].name);
        for (var j = 0; j < 8; j++) if (Math.abs(before[i].transform[j] - after[i].transform[j]) > 0.000001) throw Error('Transform changed: ' + before[i].name);
        for (var j = 0; j < 2; j++) if (before[i].size[j] !== after[i].size[j]) throw Error('Canvas changed: ' + before[i].name);
    }
}
function nativeTexts(doc) {
    var states = K.state(doc, [], ''), out = [];
    for (var i = 0; i < states.length; i++) if (states[i].kind === 'LayerKind.TEXT') {
        var layer = K.need(doc, states[i].name), text = descriptor(layer).getObjectValue(K.s('textKey'));
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
    var doc = life.duplicate(source, request.key + ' - banner and crop');
    var before = K.state(doc, [], ''), textsBefore = nativeTexts(doc), geometryBefore = smartGeometry(doc, replaced); embedded(doc, replaced);
    for (var i = 0; i < geometryBefore.length; i++) {
        var expectedResolution = geometryBefore[i].name === 'ILLUSTRATION - cadrage' ? 72 : 300;
        if (Math.abs(geometryBefore[i].resolution - expectedResolution) > 0.001) throw Error('Unexpected embedded resolution.');
    }
    doc.saveAs(new File(out + 'before-card.png'), new PNGSaveOptions(), true);
    exportWithout(doc, replaced, out + 'before-without-replaced.png');
    for (var r = 0; r < request.replacements.length; r++) {
        var replacement = request.replacements[r];
        app.activeDocument = doc; var layer = K.need(doc, replacement.name), locked = layer.allLocked;
        layer.allLocked = false; doc.activeLayer = layer;
        try {
            var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(replacement.file));
            executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
            // Photoshop renames objects whose label still matches the old embedded filename.
            doc.activeLayer.name = replacement.name;
        } finally { K.need(doc, replacement.name).allLocked = locked; }
    }
    var geometryAfter = smartGeometry(doc, replaced); sameGeometry(geometryBefore, geometryAfter);
    exportWithout(doc, replaced, out + 'after-without-replaced.png');
    var after = K.state(doc, [], ''), textsAfter = nativeTexts(doc);
    K.save(doc, out + 'card.psd', out + 'card.png'); doc.close(SaveOptions.DONOTSAVECHANGES);
    var reopened = life.open(out + 'card.psd');
    reopened.saveAs(new File(render + 'reopened.png'), new PNGSaveOptions(), true);
    var layers = K.state(reopened, [], ''), nativeProof = K.read(request['native']);
    var plan = K.read(render + 'composition.json'), names = [], texts = [];
    for (var i = 0; i < plan.layers.length; i++) names.push(plan.layers[i].name);
    nativeProof.photoshop = app.version;
    nativeProof.width = reopened.width.as('px'); nativeProof.height = reopened.height.as('px'); nativeProof.resolution = reopened.resolution;
    nativeProof.layers = layers; nativeProof.components = plan.layers; nativeProof.typography = KT.snapshot(reopened);
    K.write(render + 'native.json', nativeProof);
    var geometryReopened = smartGeometry(reopened, replaced); sameGeometry(geometryBefore, geometryReopened);
    K.write(out + 'audit.json', { before: before, after: after, reopened: layers, embedded: embedded(reopened, names), replaced: replaced,
        geometryBefore: geometryBefore, geometryAfter: geometryAfter, geometryReopened: geometryReopened,
        textsBefore: textsBefore, textsAfter: textsAfter, textsReopened: nativeTexts(reopened) });
    for (var j = 0; j < layers.length; j++) if (layers[j].kind === 'LayerKind.TEXT') texts.push(layers[j].name);
    exportWithout(reopened, texts, render + 'without-text.png');
    return request.key + ' smart objects replaced; editable PSD saved and reopened.';
});
'Native targeted revision complete';
