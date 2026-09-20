#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'jelly-joe-encre/';
    return K.lifecycle(function (ctx) {
        var registry = K.read(folder + 'registry-electro-03b.json'), card = K.read(work + 'card.json');
        var asset = registry.artworkAssets['JELLY-JOE'], placement = asset.placement;
        var source = ctx.open(folder + 'KALISTAR_V4_TEMPLATE_03_ELECTRO.psd');
        var doc = ctx.duplicate(source, 'KALISTAR V4 - Electro 03B Encre');
        function png(d, name) { app.activeDocument = d; d.saveAs(new File(work + name), new PNGSaveOptions(), true); }
        png(source, 'template-previous.png');
        app.activeDocument = doc;
        var old = K.need(doc, 'ART - JELLY-JOE'), visible = old.visible; doc.activeLayer = old;
        var d = new ActionDescriptor(); d.putPath(K.c('null'), new File(root + asset.source));
        executeAction(K.c('Plc '), d, DialogModes.NO);
        var art = doc.activeLayer; art.move(old, ElementPlacement.PLACEBEFORE); old.remove(); art.name = 'ART - JELLY-JOE';
        var b = K.bounds(art), ratio = Math.min(placement.width / (b[2] - b[0]), placement.height / (b[3] - b[1]));
        art.resize(ratio * 100, ratio * 100, AnchorPosition.MIDDLECENTER); b = K.bounds(art);
        art.translate(placement.centerX - (b[0] + b[2]) / 2, placement.top - b[1]); art.visible = visible;
        var frame = K.need(doc, '06 CADRE FIXE ET ILLUSTRATION'), vis = [], i;
        for (i = 0; i < frame.layers.length; i++) vis.push(frame.layers[i].visible);
        for (i = frame.layers.length - 1; i >= 0; i--) { var l = frame.layers[i]; if (l.typename === 'ArtLayer' && l.id !== 17 && l.id !== 11 && !l.grouped) l.grouped = true; }
        for (i = 0; i < frame.layers.length; i++) frame.layers[i].visible = vis[i];
        doc.info.title = 'KALISTAR V4 - TEMPLATE ELECTRO 03B ENCRE';
        doc.info.caption = 'Geometrie Electro 03 conservee. Illustration Jelly-Joe Encre 08B validee. Illustration incorporee, textes et effets natifs.';
        K.save(doc, root + registry.template, work + 'template-new.png');
        var reopenedTemplate = ctx.open(root + registry.template); png(reopenedTemplate, 'template-reopened.png');
        var previousCard = ctx.open(root + 'V4/templates/JELLY_JOE_V4_02_VISAGE_POSITIONS.psd');
        png(previousCard, 'previous.png');
        var rendered = ctx.duplicate(doc, 'JELLY-JOE V4 - Encre');
        var report = renderRegistered(rendered, card, registry);
        report.photoshop = app.version; report.resolution = rendered.resolution; report.registry = registry;
        report.sourceUnsaved = !source.saved; report.previousCardUnsaved = !previousCard.saved;
        rendered.info.caption += ' Illustration Encre 08B validee, revision artwork 03B.';
        K.save(rendered, root + 'V4/templates/' + card.output + '.psd', work + 'render.png');
        var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd'); png(reopened, 'reopened.png');
        report.reopened = K.state(reopened, [], '');
        report.previous = K.state(previousCard, [], ''); K.write(work + 'render.json', report);
        var fixed = ctx.duplicate(previousCard, 'Controle ancien cadre');
        K.need(fixed, 'ART - JELLY-JOE').visible = false; K.need(fixed, '03 POSITIONS AUTORISEES - P1 a P5').visible = false;
        png(fixed, 'fixed-previous.png'); fixed.close(SaveOptions.DONOTSAVECHANGES);
        fixed = ctx.duplicate(reopened, 'Controle nouveau cadre');
        K.need(fixed, 'ART - JELLY-JOE').visible = false; K.need(fixed, '03 POSITIONS AUTORISEES - P1 a P5').visible = false;
        png(fixed, 'fixed-new.png'); fixed.close(SaveOptions.DONOTSAVECHANGES);
        return 'Jelly-Joe Encre et template 03B enregistres et reouverts pour verification.';
    });
})();
