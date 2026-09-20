#target photoshop
#include "common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    return K.lifecycle(function (ctx) {
        var source = ctx.open(root + 'V4/templates/TAULIO_V4_01_TEMPLATE_STABLE.psd');
        app.activeDocument = source;
        source.saveAs(new File(root + 'V4/template-stable/jelly-joe/taulio-approved-current-engine.png'), new PNGSaveOptions(), true);
        K.write(root + 'V4/template-stable/jelly-joe/engine.json', { version: app.version, sourceSaved: source.saved });
        return 'Reference Taulio exportee avec Photoshop ' + app.version;
    });
})();
