#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'jelly-joe/';
    return K.lifecycle(function (ctx) {
        var registry = K.read(folder + 'registry-electro-02.json'), card = K.read(work + 'card.json');
        var source = ctx.open(root + registry.template), doc = ctx.duplicate(source, card.name + ' - Electro 02');
        var report = renderRegistered(doc, card, registry);
        K.save(doc, root + 'V4/templates/' + card.output + '.psd', work + 'render-photoshop.png');
        var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd'); app.activeDocument = reopened;
        reopened.saveAs(new File(work + 'reopened-photoshop.png'), new PNGSaveOptions(), true); report.reopened = K.state(reopened, [], '');
        K.write(work + 'render.json', report);
        function hide(p) {
            for (var i = 0; i < p.layers.length; i++) {
                var l = p.layers[i];
                if (l.typename === 'LayerSet') hide(l);
                else for (var j = 0; j < report.allowedLayerIds.length; j++) if (l.id === report.allowedLayerIds[j]) l.visible = false;
            }
        }
        var fixed = ctx.duplicate(source, 'Controle structure reference'); hide(fixed);
        fixed.saveAs(new File(work + 'fixed-template.png'), new PNGSaveOptions(), true);
        fixed = ctx.duplicate(reopened, 'Controle structure Jelly-Joe'); hide(fixed);
        fixed.saveAs(new File(work + 'fixed-card.png'), new PNGSaveOptions(), true);
        // The new renderer must also reproduce the already approved Taulio.
        var taulio = K.read(folder + 'taulio.json'), regression = ctx.duplicate(source, 'Controle non regression Taulio');
        renderRegistered(regression, taulio, registry);
        regression.saveAs(new File(work + 'taulio-regression.png'), new PNGSaveOptions(), true);
        return 'Jelly-Joe enregistre et controles de structure exportes.';
    });
})();
