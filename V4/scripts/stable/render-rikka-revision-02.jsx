#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'rikka-revision-02/';
    var registry = K.read(folder + 'registry-electro-03e.json'), card = K.read(work + 'card.json'), sources = K.read(work + 'sources.json');
    var changed = ['ART - RIKKA', 'DEF D6 - effet dodge', 'DEF D1 - effet retry'];
    return K.lifecycle(function (ctx) {
        var report = { registry: registry, changedLayers: changed, photoshop: app.version };
        function stage(s) { K.write(work + 'progress.json', { stage: s }); }
        function png(doc, name) { app.activeDocument = doc; doc.saveAs(new File(work + name), new PNGSaveOptions(), true); }
        function fixed(doc, name) {
            app.activeDocument = doc; var vis = [], i;
            for (i = 0; i < changed.length; i++) { var l = K.need(doc, changed[i]); vis.push(l.visible); l.visible = false; }
            png(doc, name);
            for (i = 0; i < changed.length; i++) K.need(doc, changed[i]).visible = vis[i];
        }
        stage('Loading versioned sources');
        var source = ctx.open(root + sources.baseTemplate), oldCard = ctx.open(root + sources.baseCard);
        if (!source.saved || !oldCard.saved) throw Error('Source ouverte avec modifications non enregistrees.');
        report.masterBefore = K.state(source, [], ''); report.cardBefore = K.state(oldCard, [], '');
        png(source, 'master-before.png');
        var proof = ctx.duplicate(oldCard, 'Rikka cadre source'); fixed(proof, 'fixed-before.png'); proof.close(SaveOptions.DONOTSAVECHANGES);
        var master = ctx.duplicate(source, 'KALISTAR V4 - Electro 03E Rikka');
        stage('Replacing embedded artwork and calibrating icons');
        app.activeDocument = master;
        var art = K.need(master, changed[0]), visible = art.visible; master.activeLayer = art;
        art.visible = true;
        var d = new ActionDescriptor(); d.putPath(K.c('null'), new File(root + registry.artworkAssets.RIKKA.renderSource));
        executeAction(K.s('placedLayerReplaceContents'), d, DialogModes.NO);
        art = K.need(master, changed[0]); var p = registry.artworkAssets.RIKKA.placement, b = K.bounds(art);
        var scale = Math.min(p.width / (b[2] - b[0]), p.height / (b[3] - b[1]));
        art.resize(scale * 100, scale * 100, AnchorPosition.MIDDLECENTER); K.center(art, p.centerX, p.top + p.height / 2); art.visible = visible;
        for (var i = 0; i < registry.effectLayouts.length; i++) {
            stage('Calibrating ' + registry.effectLayouts[i].layer);
            var layout = registry.effectLayouts[i]; K.optical(K.need(master, layout.layer), layout);
        }
        master.info.title = 'KALISTAR V4 - TEMPLATE ELECTRO 03E RIKKA';
        report.masterAfter = K.state(master, [], '');
        K.save(master, root + registry.template, work + 'master-after.png');
        stage('Rendering Rikka from the registered master');
        var rendered = ctx.duplicate(master, 'RIKKA - revision 02');
        report.render = renderRegistered(rendered, card, registry);
        report.resolution = rendered.resolution;
        K.save(rendered, root + 'V4/templates/' + card.output + '.psd', root + 'V4/cartes/' + card.output + '.png');
        png(rendered, 'render.png'); fixed(rendered, 'fixed-after.png');
        stage('Reopening saved PSD and checking repeat calibration');
        var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd');
        png(reopened, 'reopened.png'); report.reopened = K.state(reopened, [], '');
        var repeat = ctx.duplicate(reopened, 'Controle calibration repetee');
        report.repeatBefore = [];
        for (i = 0; i < registry.effectLayouts.length; i++) {
            layout = registry.effectLayouts[i]; var icon = K.need(repeat, layout.layer);
            report.repeatBefore.push(K.bounds(icon)); K.optical(icon, layout);
        }
        png(repeat, 'repeat.png'); repeat.close(SaveOptions.DONOTSAVECHANGES);
        function isolate(parent, name) {
            var any = false;
            for (var j = 0; j < parent.layers.length; j++) {
                var l = parent.layers[j], keep = l.typename === 'LayerSet' ? isolate(l, name) : l.name === name;
                l.visible = keep; if (keep) any = true;
            }
            return any;
        }
        for (i = 0; i < registry.effectLayouts.length; i++) {
            var isolated = ctx.duplicate(reopened, 'Controle silhouette ' + i);
            layout = registry.effectLayouts[i]; isolate(isolated, layout.layer); K.unclip(isolated, K.need(isolated, layout.layer));
            png(isolated, i ? 'clover-after.png' : 'dodge-after.png'); isolated.close(SaveOptions.DONOTSAVECHANGES);
        }
        K.write(work + 'render.json', report); stage('Complete');
        return 'RIKKA V4-02 et maitre 03E sauvegardes. Reouverture PSD et silhouettes exportees pour verification.';
    });
})();
