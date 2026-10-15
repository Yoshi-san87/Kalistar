#target photoshop
#include "common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/';
    return K.lifecycle(function (ctx) {
        var card = K.read(folder + 'taulio.json'), report = K.read(folder + 'render.json');
        var template = ctx.open(folder + 'KALISTAR_V4_TEMPLATE_01.psd');
        var taulio = ctx.open(root + 'V4/templates/' + card.output + '.psd');
        var dynamic = {};
        for (var i = 0; i < report.allowedLayerIds.length; i++) dynamic[report.allowedLayerIds[i]] = true;
        function hide(p) {
            for (var n = 0; n < p.layers.length; n++) {
                var l = p.layers[n];
                if (l.typename === 'LayerSet') hide(l);
                else if (dynamic[l.id]) l.visible = false;
            }
        }
        var a = ctx.duplicate(template, 'Controle cadre reference'); hide(a);
        a.saveAs(new File(folder + 'fixed-template.png'), new PNGSaveOptions(), true);
        var b = ctx.duplicate(taulio, 'Controle cadre Taulio'); hide(b);
        b.saveAs(new File(folder + 'fixed-taulio.png'), new PNGSaveOptions(), true);
        var five = ctx.duplicate(taulio, 'Controle cinq positions');
        for (i = 1; i <= 5; i++) {
            K.need(five, 'SUPPORT SLOT ' + i).visible = true;
            var t = K.need(five, 'POSITION SLOT ' + i); t.visible = true;
            K.text(t, i, 221 + (i - 1) * 50, 1024, 30);
        }
        five.saveAs(new File(folder + 'test-five-positions.png'), new PNGSaveOptions(), true);
        var valueTest = ctx.duplicate(taulio, 'Controle valeur native');
        K.text(K.need(valueTest, 'DEF D6 - valeur'), '295', 756, 150, 104);
        valueTest.saveAs(new File(folder + 'test-number-295.png'), new PNGSaveOptions(), true);
        return 'Cadre fixe, cinq positions et valeur native exportes pour controle.';
    });
})();
