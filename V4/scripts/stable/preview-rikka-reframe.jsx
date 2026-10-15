#target photoshop
#include "common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var work = new Folder(root + 'V4/template-stable/rikka-revision-03'); if (!work.exists) work.create();
    return K.lifecycle(function (ctx) {
        var source = ctx.open(root + 'V4/templates/RIKKA_V4_02_VITRINE_ICONES.psd');
        if (!source.saved) throw Error('La source contient des changements non enregistres.');
        var doc = ctx.duplicate(source, 'Rikka - essai cadrage');
        app.activeDocument = doc; var art = K.need(doc, 'ART - RIKKA'); doc.activeLayer = art;
        var before = K.bounds(art); art.translate(UnitValue(55, 'px'), UnitValue(0, 'px'));
        doc.saveAs(new File(work.fsName + '/preview.png'), new PNGSaveOptions(), true);
        K.write(work.fsName + '/framing.json', { delta: [55, 0], before: before, after: K.bounds(art), rescaled: false });
        return 'Essai de cadrage exporte, source intacte.';
    });
})();
