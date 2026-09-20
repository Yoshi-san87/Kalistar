#target photoshop
#include "common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var work = root + 'V4/template-stable/rikka-revision-02/';
    return K.lifecycle(function (ctx) {
        var source = ctx.open(root + 'V4/templates/RIKKA_V4_01_TEMPLATE_ELECTRO.psd');
        if (!source.saved) throw Error('Source Rikka non enregistree.');
        var layers = ['DEF D6 - effet dodge', 'DEF D1 - effet retry'];
        var report = [];
        for (var i = 0; i < layers.length; i++) {
            var doc = ctx.duplicate(source, 'Mesure ' + layers[i]);
            function isolate(parent, name) {
                var contains = false;
                for (var j = 0; j < parent.layers.length; j++) {
                    var l = parent.layers[j];
                    var keep = l.typename === 'LayerSet' ? isolate(l, name) : l.name === name;
                    l.visible = keep; if (keep) contains = true;
                }
                return contains;
            }
            isolate(doc, layers[i]);
            var icon = K.need(doc, layers[i]); K.unclip(doc, icon);
            report.push({ name: layers[i], bounds: K.bounds(icon), state: K.state(doc, [], '') });
            doc.saveAs(new File(work + (i ? 'clover-before.png' : 'dodge-before.png')), new PNGSaveOptions(), true);
        }
        K.write(work + 'icon-inspection.json', report);
        return 'Deux silhouettes exportees pour mesure optique, source inchangee.';
    });
})();
