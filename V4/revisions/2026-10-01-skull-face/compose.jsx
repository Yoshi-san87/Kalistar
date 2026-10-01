#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json');
if (request.revision !== '2026-10-01-skull-face' || request.key !== 'skull-face') throw Error('Wrong revision.');
if (app.version !== '26.11.7') throw Error('Wrong Photoshop version.');
function exportWithout(doc, names, file) {
    var found = [];
    try {
        for (var i = 0; i < names.length; i++) { var l = K.need(doc, names[i]); found.push({ layer: l, visible: l.visible }); l.visible = false; }
        doc.saveAs(new File(file), new PNGSaveOptions(), true);
    } finally { for (var j = 0; j < found.length; j++) found[j].layer.visible = found[j].visible; }
}
function descriptor(layer) { var ref = new ActionReference(); ref.putIdentifier(K.s('layer'), layer.id); return executeActionGet(ref); }
function streamHex(desc) {
    var stream = desc.toStream(), hex = '';
    for (var i = 0; i < stream.length; i++) hex += ('0000' + stream.charCodeAt(i).toString(16)).slice(-4);
    return hex;
}
function nativeTexts(doc) {
    var states = K.state(doc, [], ''), out = [];
    for (var i = 0; i < states.length; i++) if (states[i].kind === 'LayerKind.TEXT') {
        var text = descriptor(K.need(doc, states[i].name)).getObjectValue(K.s('textKey')), styles = new ActionDescriptor();
        styles.putList(K.s('textStyleRange'), text.getList(K.s('textStyleRange')));
        if (text.hasKey(K.s('paragraphStyleRange'))) styles.putList(K.s('paragraphStyleRange'), text.getList(K.s('paragraphStyleRange')));
        out.push({ path: states[i].path, nativeStyleRuns: streamHex(styles) });
    }
    return out;
}
function nativeEffects(doc) {
    var states = K.state(doc, [], ''), out = [];
    for (var i = 0; i < states.length; i++) {
        var d = descriptor(K.byId(doc, states[i].id)), key = K.s('layerEffects');
        out.push({ path: states[i].path.replace('RACE - HUMAIN', 'RACE - ICON').replace('RACE - SKULLZ', 'RACE - ICON'),
            effects: d.hasKey(key) ? streamHex(d.getObjectValue(key)) : null });
    }
    return out;
}
function embedded(doc) {
    var names = ['ILLUSTRATION - cadrage', 'RACE - SKULLZ'], out = [];
    for (var i = 0; i < names.length; i++) {
        var layer = K.need(doc, names[i]);
        if (layer.kind !== LayerKind.SMARTOBJECT) throw Error('Embedded smart object required: ' + names[i]);
        var so = descriptor(layer).getObjectValue(K.s('smartObject'));
        out.push({ name: names[i], linked: so.hasKey(K.s('linked')) ? so.getBoolean(K.s('linked')) : false });
    }
    return out;
}
function replace(doc, name, path) {
    app.activeDocument = doc; doc.activeLayer = K.need(doc, name);
    if (doc.activeLayer.kind !== LayerKind.SMARTOBJECT) throw Error('Native smart object required.');
    var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(path));
    executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
}
K.lifecycle(function (life) {
    var out = home + 'work/skull-face/', folder = out + 'render/', source = life.open(root + request.original);
    if (!source.saved) throw Error('Unsaved original.');
    var doc = life.duplicate(source, 'SKULL FACE - native art and SKULLZ revision');
    var old = K.read(root + request.native), plan = K.read(folder + 'composition.json'), p = K.read(out + 'profile.json');
    var before = K.state(doc, [], ''), textsBefore = nativeTexts(doc), effectsBefore = nativeEffects(doc), i;
    if (K.need(doc, 'RACE').textItem.contents !== 'HUMAIN' || p.race !== 'SKULLZ') throw Error('Wrong race transition.');
    doc.saveAs(new File(out + 'before-card.png'), new PNGSaveOptions(), true);
    exportWithout(doc, ['ILLUSTRATION - cadrage', 'RACE', 'RACE - HUMAIN'], out + 'before-without-changes.png');
    for (i = 0; i < plan.layers.length; i++) {
        var spec = plan.layers[i];
        if (spec.name === 'ILLUSTRATION - cadrage') replace(doc, spec.name, folder + spec.file);
        if (spec.name === 'RACE - SKULLZ') { replace(doc, 'RACE - HUMAIN', folder + spec.file); K.need(doc, 'RACE - HUMAIN').name = 'RACE - SKULLZ'; }
    }
    K.text(K.need(doc, 'RACE'), 'SKULLZ', 599, 1172.5, 170);
    var after = K.state(doc, [], ''), textsAfter = nativeTexts(doc), effectsAfter = nativeEffects(doc), embeddedAfter = embedded(doc), names = [];
    exportWithout(doc, ['ILLUSTRATION - cadrage', 'RACE', 'RACE - SKULLZ'], out + 'after-without-changes.png');
    for (i = 0; i < after.length; i++) if (after[i].kind === 'LayerKind.TEXT') names.push(after[i].name);
    exportWithout(doc, names, folder + 'without-text.png');
    K.save(doc, out + 'card.psd', out + 'card.png'); doc.close(SaveOptions.DONOTSAVECHANGES);
    var reopened = life.open(out + 'card.psd'); reopened.saveAs(new File(folder + 'reopened.png'), new PNGSaveOptions(), true);
    exportWithout(reopened, ['ILLUSTRATION - cadrage', 'RACE', 'RACE - SKULLZ'], out + 'reopened-without-changes.png');
    for (i = 0; i < old.expected.length; i++) if (old.expected[i].name === 'RACE') old.expected[i].value = 'SKULLZ';
    var state = K.state(reopened, [], '');
    K.write(folder + 'native.json', { photoshop: app.version, width: reopened.width.as('px'), height: reopened.height.as('px'), resolution: reopened.resolution,
        expected: old.expected, layers: state, components: plan.layers, typography: KT.snapshot(reopened) });
    K.write(out + 'audit.json', { before: before, after: after, reopened: state, textsBefore: textsBefore, textsAfter: textsAfter,
        textsReopened: nativeTexts(reopened), effectsBefore: effectsBefore, effectsAfter: effectsAfter, effectsReopened: nativeEffects(reopened),
        embeddedAfter: embeddedAfter, embeddedReopened: embedded(reopened) });
});
'Skull Face native art and race revision complete';
