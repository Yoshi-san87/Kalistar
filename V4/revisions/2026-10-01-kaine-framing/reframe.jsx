#target photoshop
#include "../../scripts/stable/common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json'), artName = 'ILLUSTRATION - cadrage';
if (request.goNative !== true || request.revision !== '2026-10-01-kaine-framing' || request.id !== '45951088') throw Error('Invalid native request.');
if (request.work.replace(/\\/g, '/') !== home + 'work/kaine') throw Error('Output outside revision.');
function descriptor(layer) {
    var ref = new ActionReference(); ref.putIdentifier(K.s('layer'), layer.id); return executeActionGet(ref);
}
function isEmbedded(layer) {
    if (layer.kind !== LayerKind.SMARTOBJECT) throw Error('Smart object required.');
    var data = descriptor(layer).getObjectValue(K.s('smartObject'));
    return !(data.hasKey(K.s('linked')) && data.getBoolean(K.s('linked')));
}
function nativeTexts(doc) {
    var states = K.state(doc, [], ''), out = [];
    for (var i = 0; i < states.length; i++) if (states[i].kind === 'LayerKind.TEXT') {
        var text = descriptor(K.need(doc, states[i].name)).getObjectValue(K.s('textKey'));
        var styles = new ActionDescriptor(); styles.putList(K.s('textStyleRange'), text.getList(K.s('textStyleRange')));
        if (text.hasKey(K.s('paragraphStyleRange'))) styles.putList(K.s('paragraphStyleRange'), text.getList(K.s('paragraphStyleRange')));
        var stream = styles.toStream(), hex = '';
        for (var j = 0; j < stream.length; j++) hex += ('0000' + stream.charCodeAt(j).toString(16)).slice(-4);
        out.push({ path: states[i].path, nativeStyleRuns: hex });
    }
    return out;
}
function withoutArt(doc, file) {
    app.activeDocument = doc; var layer = K.need(doc, artName), visible = layer.visible;
    try { layer.visible = false; doc.saveAs(new File(file), new PNGSaveOptions(), true); }
    finally { layer.visible = visible; }
}
K.lifecycle(function (life) {
    var out = request.work.replace(/\\/g, '/') + '/', f = request.framing;
    var source = life.open(request.original); if (!source.saved) throw Error('Unsaved source document.');
    var doc = life.duplicate(source, 'Kaine +12 percent reversible framing');
    var before = K.state(doc, [], ''), textsBefore = nativeTexts(doc), typographyBefore = KT.snapshot(doc);
    if (!isEmbedded(K.need(doc, artName))) throw Error('Linked source art.');
    doc.activeLayer = K.need(doc, artName);
    var exportCurrent = new ActionDescriptor(); exportCurrent.putPath(K.c('null'), new File(out + 'current-embedded-window.png'));
    executeAction(K.s('placedLayerExportContents'), exportCurrent, DialogModes.NO);
    doc.saveAs(new File(out + 'before-card.png'), new PNGSaveOptions(), true);
    withoutArt(doc, out + 'before-without-art.png');
    // The outer canvas clips exactly; the full-resolution original stays embedded inside.
    var window = life.track(app.documents.add(737, 921, 300, 'Kaine - reversible art window', NewDocumentMode.RGB, DocumentFill.TRANSPARENT));
    var place = new ActionDescriptor(); place.putPath(K.c('null'), new File(request.artwork));
    executeAction(K.c('Plc '), place, DialogModes.NO);
    var full = window.activeLayer; full.name = 'KAINE - full original artwork';
    var targetScale = Math.max(737 / f.sourceSize[0], 921 / f.sourceSize[1]) * f.effectiveZoom;
    var bounds = K.bounds(full);
    full.resize(100 * f.sourceSize[0] * targetScale / (bounds[2] - bounds[0]),
        100 * f.sourceSize[1] * targetScale / (bounds[3] - bounds[1]), AnchorPosition.MIDDLECENTER);
    K.center(full, 737 / 2, 921 / 2);
    if (!isEmbedded(full)) throw Error('Full artwork is not embedded.');
    var fullBounds = K.bounds(full);
    K.save(window, out + 'art-window.psd', out + 'art-window.png');
    window.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc; var art = K.need(doc, artName), locked = art.allLocked;
    art.allLocked = false; doc.activeLayer = art;
    try {
        var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(out + 'art-window.psd'));
        executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
        art = K.need(doc, artName); var outerBounds = K.bounds(art);
        // Replacing a 72 ppi PNG by a 300 ppi native document retains physical scale.
        art.resize(100 * 737 / (outerBounds[2] - outerBounds[0]), 100 * 921 / (outerBounds[3] - outerBounds[1]), AnchorPosition.MIDDLECENTER);
        K.center(art, 80 + 737 / 2, 156 + 921 / 2);
    } finally { K.need(doc, artName).allLocked = locked; }
    withoutArt(doc, out + 'after-without-art.png');
    var after = K.state(doc, [], ''), textsAfter = nativeTexts(doc);
    K.save(doc, out + 'card.psd', out + 'card.png'); doc.close(SaveOptions.DONOTSAVECHANGES);
    var reopened = life.open(out + 'card.psd');
    reopened.saveAs(new File(out + 'reopened.png'), new PNGSaveOptions(), true);
    var layers = K.state(reopened, [], ''), textsReopened = nativeTexts(reopened), typography = KT.snapshot(reopened);
    var outerEmbedded = isEmbedded(K.need(reopened, artName));
    reopened.activeLayer = K.need(reopened, artName);
    executeAction(K.s('placedLayerEditContents'), new ActionDescriptor(), DialogModes.NO);
    var inner = life.track(app.activeDocument), artWindow = [inner.width.as('px'), inner.height.as('px')];
    inner.activeLayer = K.need(inner, 'KAINE - full original artwork');
    var innerEmbedded = isEmbedded(inner.activeLayer), exportFull = new ActionDescriptor();
    exportFull.putPath(K.c('null'), new File(out + 'embedded-artwork.png'));
    executeAction(K.s('placedLayerExportContents'), exportFull, DialogModes.NO);
    var originalArtwork = life.open(out + 'embedded-artwork.png');
    var fullArtworkSize = [originalArtwork.width.as('px'), originalArtwork.height.as('px')];
    K.write(out + 'native.json', { photoshop: app.version, width: reopened.width.as('px'), height: reopened.height.as('px'), resolution: reopened.resolution,
        before: before, after: after, reopened: layers, textsBefore: textsBefore, textsAfter: textsAfter, textsReopened: textsReopened,
        typographyBefore: typographyBefore, typography: typography, artWindow: artWindow, fullArtworkSize: fullArtworkSize,
        innerEmbedded: innerEmbedded, outerEmbedded: outerEmbedded, fullBounds: fullBounds });
    return 'Kaine rendered and reopened; full original embedded; exact artwork canvas.';
});
'Native Kaine framing complete';
