#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var request = K.read(home + 'render-request.json');
function textColors(doc) {
    var states = K.state(doc, [], ''), colors = {};
    for (var i = 0; i < states.length; i++) if (states[i].kind === 'LayerKind.TEXT') colors[states[i].name] = K.byId(doc, states[i].id).textItem.color.rgb.hexValue.toUpperCase();
    return colors;
}
function isolated(doc, file, artOnly, names) {
    var states = K.state(doc, [], '');
    try {
        for (var i = 0; i < states.length; i++) if (states[i].kind) {
            var hide = artOnly ? states[i].name !== 'ILLUSTRATION - cadrage' : !!names[states[i].name];
            if (hide) K.byId(doc, states[i].id).visible = false;
        }
        doc.saveAs(new File(file), new PNGSaveOptions(), true);
    } finally { for (var j = 0; j < states.length; j++) K.byId(doc, states[j].id).visible = states[j].visible; }
}
for (var cardIndex = 0; cardIndex < request.cards.length; cardIndex++) {
    var card = request.cards[cardIndex];
    K.lifecycle(function (life) {
        var output = card.work.replace(/\\/g, '/') + '/';
        var source = life.open(card.original);
        if (!source.saved) throw Error('Sauvegarde ouverte avec modifications non enregistrees.');
        var doc = life.duplicate(source, 'FF8 REFINEMENTS - ' + card.key);
        var art = K.need(doc, 'ILLUSTRATION - cadrage');
        if (!art.visible || art.kind !== LayerKind.SMARTOBJECT) throw Error('Illustration non editable : ' + card.key);
        var before = K.state(doc, [], ''), colorsBefore = textColors(doc), colorsAfter;
        doc.saveAs(new File(output + 'before-card.png'), new PNGSaveOptions(), true);
        if (card.key === 'zell') {
            var element = K.read(output + 'element.json'), hiddenBefore = { JOB: true, RACE: true }, hiddenAfter = { JOB: true, RACE: true };
            for (var i = 0; i < element.replacements.length; i++) {
                hiddenBefore[element.replacements[i].old.name] = true;
                hiddenAfter[element.replacements[i].next.name] = true;
            }
            isolated(doc, output + 'before-without-changes.png', false, hiddenBefore);
            isolated(doc, output + 'before-art-only.png', true, {});
            for (i = 0; i < element.replacements.length; i++) {
                var replacement = element.replacements[i], spec = replacement.next;
                var old = K.need(doc, replacement.old.name);
                if (old.kind !== LayerKind.SMARTOBJECT || !old.visible) throw Error('Composant original non editable.');
                // Same embedded placement and calibrated sizing as composeFF8.
                app.activeDocument = doc; doc.activeLayer = old;
                var descriptor = new ActionDescriptor(); descriptor.putPath(K.c('null'), new File(output + spec.file));
                executeAction(K.c('Plc '), descriptor, DialogModes.NO);
                var layer = doc.activeLayer; layer.move(old, ElementPlacement.PLACEBEFORE); layer.name = spec.name;
                var b = K.bounds(layer);
                layer.resize(spec.width / (b[2] - b[0]) * 100, spec.height / (b[3] - b[1]) * 100, AnchorPosition.TOPLEFT);
                b = K.bounds(layer); layer.translate(spec.left - b[0], spec.top - b[1]);
                layer.opacity = old.opacity; layer.blendMode = old.blendMode; layer.grouped = old.grouped;
                old.remove();
            }
            var color = new SolidColor(); color.rgb.hexValue = element.profile.color;
            K.need(doc, 'JOB').textItem.color = color; K.need(doc, 'RACE').textItem.color = color;
            isolated(doc, output + 'after-without-changes.png', false, hiddenAfter);
            isolated(doc, output + 'after-art-only.png', true, {});
        } else {
            var narrative = card.key === 'seifer' ? K.read(output + 'narrative.json') : null;
            if (narrative) isolated(doc, output + 'before-without-art-description.png', false, { 'ILLUSTRATION - cadrage': true, DESCRIPTION: true });
            art.visible = false;
            doc.saveAs(new File(output + 'before-without-art.png'), new PNGSaveOptions(), true);
            art.visible = true; app.activeDocument = doc; doc.activeLayer = art;
            var change = new ActionDescriptor(); change.putPath(K.c('null'), new File(output + 'component-00.png'));
            executeAction(K.s('placedLayerReplaceContents'), change, DialogModes.NO);
            art = K.need(doc, 'ILLUSTRATION - cadrage'); art.visible = false;
            doc.saveAs(new File(output + 'after-without-art.png'), new PNGSaveOptions(), true); art.visible = true;
            if (narrative) {
                E.setDescription(doc, narrative.description);
                if (K.need(doc, 'DESCRIPTION').textItem.contents.split('\r').length > 4) throw Error('Recit Seifer au-dela de quatre lignes.');
                isolated(doc, output + 'after-without-art-description.png', false, { 'ILLUSTRATION - cadrage': true, DESCRIPTION: true });
            }
        }
        var after = K.state(doc, [], ''); colorsAfter = textColors(doc);
        K.save(doc, output + 'card.psd', output + 'card.png');
        var reopened = life.open(output + 'card.psd');
        reopened.saveAs(new File(output + 'reopened.png'), new PNGSaveOptions(), true);
        var layers = K.state(reopened, [], ''), colorsReopened = textColors(reopened);
        for (i = 0; i < layers.length; i++) if (layers[i].kind === 'LayerKind.TEXT') K.byId(reopened, layers[i].id).visible = false;
        reopened.saveAs(new File(output + 'without-text.png'), new PNGSaveOptions(), true);
        K.write(output + 'native.json', { width: doc.width.as('px'), height: doc.height.as('px'), resolution: doc.resolution,
            before: before, after: after, layers: layers, colorsBefore: colorsBefore, colorsAfter: colorsAfter, colorsReopened: colorsReopened });
        return card.key + ': PSD revise et rouvert.';
    });
}
