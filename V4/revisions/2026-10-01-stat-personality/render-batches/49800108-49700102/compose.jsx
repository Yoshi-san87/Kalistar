#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json');
if (request.revision !== '2026-10-01-stat-personality') throw Error('Wrong revision.');
if (app.version !== '26.11.7') throw Error('Wrong Photoshop version.');
function descriptor(layer) { var ref = new ActionReference(); ref.putIdentifier(K.s('layer'), layer.id); return executeActionGet(ref); }
function streamHex(desc) {
    var stream = desc.toStream(), out = '';
    for (var i = 0; i < stream.length; i++) out += ('0000' + stream.charCodeAt(i).toString(16)).slice(-4);
    return out;
}
function contains(names, name) { for (var i = 0; i < names.length; i++) if (names[i] === name) return true; return false; }
function nativeTexts(doc, edited) {
    var states = K.state(doc, [], ''), out = [];
    for (var i = 0; i < states.length; i++) if (states[i].kind === 'LayerKind.TEXT') {
        var layer = K.byId(doc, states[i].id), text = descriptor(layer).getObjectValue(K.s('textKey')), styles = new ActionDescriptor();
        for (var j = 0; j < 2; j++) {
            var key = K.s(j ? 'paragraphStyleRange' : 'textStyleRange');
            if (!text.hasKey(key)) continue;
            var list = text.getList(key), normalized = new ActionList();
            for (var k = 0; k < list.count; k++) {
                var run = list.getObjectValue(k);
                // Numeric text is single-style. Only the character coverage changes with digit count.
                if (contains(edited, states[i].name)) {
                    if (list.count !== 1 || run.getInteger(K.s('from')) !== 0) throw Error('Numeric mixed-style run is unsupported.');
                    if (run.getInteger(K.s('to')) < layer.textItem.contents.length) throw Error('Incomplete numeric style coverage.');
                    run.putInteger(K.s('from'), 0); run.putInteger(K.s('to'), 0);
                }
                normalized.putObject(list.getObjectType(k), run);
            }
            styles.putList(key, normalized);
        }
        var transform = text.hasKey(K.s('transform')) ? text.getObjectValue(K.s('transform')) : null, linear = new ActionDescriptor();
        for (var t = 0; t < 4; t++) { var field = ['xx', 'xy', 'yx', 'yy'][t]; linear.putDouble(K.s(field), transform ? transform.getDouble(K.s(field)) : (t === 0 || t === 3 ? 1 : 0)); }
        out.push({ path: states[i].path, nativeStyleRuns: streamHex(styles), linearTransform: streamHex(linear),
            antiAlias: String(layer.textItem.antiAliasMethod), textKind: String(layer.textItem.kind) });
    }
    return out;
}
function nativeEffects(doc) {
    var states = K.state(doc, [], ''), out = [];
    for (var i = 0; i < states.length; i++) {
        var d = descriptor(K.byId(doc, states[i].id)), key = K.s('layerEffects');
        out.push({ path: states[i].path, effects: d.hasKey(key) ? streamHex(d.getObjectValue(key)) : null });
    }
    return out;
}
function embedded(doc) {
    var states = K.state(doc, [], ''), out = [];
    for (var i = 0; i < states.length; i++) if (states[i].kind === 'LayerKind.SMARTOBJECT') {
        var so = descriptor(K.byId(doc, states[i].id)).getObjectValue(K.s('smartObject'));
        out.push({ path: states[i].path, linked: so.hasKey(K.s('linked')) ? so.getBoolean(K.s('linked')) : false, nativeObject: streamHex(so) });
    }
    return out;
}
function exportWithout(doc, names, file) {
    var restore = [];
    try {
        for (var i = 0; i < names.length; i++) { var l = K.need(doc, names[i]); restore.push({ layer: l, visible: l.visible }); l.visible = false; }
        doc.saveAs(new File(file), new PNGSaveOptions(), true);
    } finally { for (var j = 0; j < restore.length; j++) restore[j].layer.visible = restore[j].visible; }
}
function composeOne(card) {
    var step = 'open';
    try { K.lifecycle(function (life) {
        var out = root + card.output + '/', folder = out + 'render/', old = K.read(root + card.native), p = K.read(out + 'profile.json');
        var plan = K.read(folder + 'composition.json'), source = life.open(root + card.original);
        if (!source.saved) throw Error('Unsaved original.');
        var doc = life.duplicate(source, p.name + ' - numeric personality'), names = [], i;
        for (i = 0; i < card.changes.length; i++) names.push(card.changes[i].name);
        step = 'before native layer state'; var before = K.state(doc, [], '');
        step = 'before native text descriptors'; var textsBefore = nativeTexts(doc, names);
        step = 'before native effects'; var effectsBefore = nativeEffects(doc);
        step = 'before embedded objects'; var embeddedBefore = embedded(doc);
        step = 'original exports';
        doc.saveAs(new File(out + 'before-card.png'), new PNGSaveOptions(), true);
        exportWithout(doc, names, out + 'before-without-numbers.png');
        for (i = 0; i < card.changes.length; i++) {
            step = 'numeric text ' + card.changes[i].name;
            var change = card.changes[i], layer = K.need(doc, change.name), expected = null;
            if (layer.kind !== LayerKind.TEXT || layer.textItem.contents !== change.before) throw Error('Wrong original numeric value: ' + change.name);
            for (var j = 0; j < old.expected.length; j++) if (old.expected[j].name === change.name) expected = old.expected[j];
            if (!expected) throw Error('Missing numeric calibration.');
            K.text(layer, change.after, expected.center[0], expected.center[1], expected.maxWidth);
            expected.value = change.after;
        }
        step = 'after native descriptors';
        var after = K.state(doc, [], ''), textsAfter = nativeTexts(doc, names), effectsAfter = nativeEffects(doc), embeddedAfter = embedded(doc), allText = [];
        exportWithout(doc, names, out + 'after-without-numbers.png');
        for (i = 0; i < after.length; i++) if (after[i].kind === 'LayerKind.TEXT') allText.push(after[i].name);
        exportWithout(doc, allText, folder + 'without-text.png');
        step = 'native save'; K.save(doc, out + 'card.psd', out + 'card.png'); doc.close(SaveOptions.DONOTSAVECHANGES);
        step = 'native reopen';
        var reopened = life.open(out + 'card.psd'); reopened.saveAs(new File(folder + 'reopened.png'), new PNGSaveOptions(), true);
        exportWithout(reopened, names, out + 'reopened-without-numbers.png');
        var state = K.state(reopened, [], '');
        K.write(folder + 'native.json', { photoshop: app.version, width: reopened.width.as('px'), height: reopened.height.as('px'), resolution: reopened.resolution,
            expected: old.expected, layers: state, components: plan.layers, typography: KT.snapshot(reopened) });
        K.write(out + 'audit.json', { before: before, after: after, reopened: state, textsBefore: textsBefore, textsAfter: textsAfter, textsReopened: nativeTexts(reopened, names),
            effectsBefore: effectsBefore, effectsAfter: effectsAfter, effectsReopened: nativeEffects(reopened),
            embeddedBefore: embeddedBefore, embeddedAfter: embeddedAfter, embeddedReopened: embedded(reopened) });
        K.write(home + 'native-progress.json', { revision: request.revision, completed: card.id });
    }); } catch (error) { throw Error(card.id + ' at ' + step + ': ' + error + ' (line ' + error.line + ')'); }
}
for (var ci = 0; ci < request.cards.length; ci++) composeOne(request.cards[ci]);
'Numeric-only personality revision complete';
