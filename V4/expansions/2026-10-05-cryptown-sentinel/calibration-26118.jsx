#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
var refs = K.read(home + 'runtime-26118.inputs.json').references;
if (app.version !== '26.11.8') throw Error('Unexpected Photoshop runtime');
for (var i = 0; i < refs.length; i++) {
    (function(ref) {
        K.lifecycle(function(ctx) {
            var source = ctx.open(root + ref.psd);
            if (!source.saved) throw Error('Unsaved reference: ' + ref.key);
            var doc = ctx.duplicate(source, 'Kalistar 26.11.8 calibration ' + ref.key);
            doc.saveAs(new File(home + 'runtime-proof/' + ref.key + '.png'), new PNGSaveOptions(), true);
        });
    })(refs[i]);
}
'Calibration exports completed';
