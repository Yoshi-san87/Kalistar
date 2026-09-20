#target photoshop
#include "common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'rikka/';
    var registry = K.read(folder + 'registry-electro-03d.json'), card = K.read(work + 'card.json');
    var targets = [root + registry.template, root + 'V4/templates/' + card.output + '.psd'];
    // Do not overwrite a document already open for user editing.
    for (var n = 0; n < app.documents.length; n++) for (var t = 0; t < targets.length; t++) {
        try { if (app.documents[n].fullName.fsName === new File(targets[t]).fsName) throw Error('Fermer le document cible avant le recadrage : ' + targets[t]); }
        catch (e) { if (String(e).indexOf('Fermer le document') >= 0) throw e; }
    }
    return K.lifecycle(function (ctx) {
        var report = K.read(work + 'render.json'), proof = [], outputs = [];
        function png(doc, name) { app.activeDocument = doc; doc.saveAs(new File(work + name), new PNGSaveOptions(), true); }
        function reframe(doc) {
            app.activeDocument = doc;
            var before = K.state(doc, [], ''), art = K.need(doc, 'ART - RIKKA'), visible = art.visible;
            doc.activeLayer = art;
            var d = new ActionDescriptor(); d.putPath(K.c('null'), new File(root + registry.artworkAssets.RIKKA.renderSource));
            executeAction(K.s('placedLayerReplaceContents'), d, DialogModes.NO);
            art = K.need(doc, 'ART - RIKKA');
            var p = registry.artworkAssets.RIKKA.placement, b = K.bounds(art), scale = Math.min(p.width / (b[2] - b[0]), p.height / (b[3] - b[1]));
            art.resize(scale * 100, scale * 100, AnchorPosition.MIDDLECENTER);
            K.center(art, p.centerX, p.top + p.height / 2); art.visible = visible;
            var after = K.state(doc, [], ''), changes = [];
            for (var i = 0; i < after.length; i++) {
                if (!after[i].kind || after[i].name === 'ART - RIKKA') continue;
                var previous = null;
                for (var j = 0; j < before.length; j++) if (before[j].id === after[i].id) previous = before[j];
                // Record complete states for an external strict equality check.
                changes.push({ before: previous, after: after[i] });
            }
            proof.push({ artworkId: art.id, unchangedLeaves: changes, bounds: K.bounds(art), artworkVisible: visible });
            return after;
        }
        for (var i = 0; i < targets.length; i++) {
            var source = ctx.open(targets[i]), doc = ctx.duplicate(source, i ? 'RIKKA - cadrage final' : 'ELECTRO 03D - cadrage final');
            source.close(SaveOptions.DONOTSAVECHANGES);
            var state = reframe(doc);
            K.save(doc, targets[i], work + (i ? 'render.png' : 'template-new.png'));
            var reopened = ctx.open(targets[i]); png(reopened, i ? 'reopened.png' : 'template-reopened.png'); outputs.push(reopened);
            if (i) { report.after = state; report.reopened = K.state(reopened, [], ''); }
        }
        report.registry = registry; report.framing = registry.artworkAssets.RIKKA;
        report.framingProof = proof;
        report.regressionNote = 'Four complete regressions precede the framing-only change. All non-Rikka-artwork leaf states are then compared strictly; the changed artwork remains hidden for all four previous cards.';
        function hideChanged(p) {
            for (var j = 0; j < p.layers.length; j++) {
                var l = p.layers[j]; if (l.typename === 'LayerSet') hideChanged(l);
                else for (var a = 0; a < report.allowedLayerIds.length; a++) if (l.id === report.allowedLayerIds[a]) l.visible = false;
            }
        }
        for (i = 0; i < outputs.length; i++) {
            var fixed = ctx.duplicate(outputs[i], 'Controle cadre final'); hideChanged(fixed); png(fixed, i ? 'fixed-card.png' : 'fixed-template.png');
        }
        K.write(work + 'render.json', report);
        return 'Cadrage final incorpore au maitre et a Rikka, autres calques inchanges, PSD reouverts.';
    });
})();
