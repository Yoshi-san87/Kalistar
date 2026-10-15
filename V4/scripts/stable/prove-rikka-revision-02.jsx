#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'rikka-revision-02/';
    return K.lifecycle(function (ctx) {
        var registry = K.read(folder + 'registry-electro-03e.json'), card = K.read(work + 'card.json');
        var savedMaster = ctx.open(root + registry.template);
        if (!savedMaster.saved) throw Error('Maitre ouvert avec modifications non enregistrees.');
        savedMaster.saveAs(new File(work + 'master-reopened.png'), new PNGSaveOptions(), true);
        var fresh = ctx.duplicate(savedMaster, 'Rikka - reconstruction du maitre enregistre');
        var report = renderRegistered(fresh, card, registry);
        fresh.saveAs(new File(work + 'fresh-render.png'), new PNGSaveOptions(), true);
        K.write(work + 'fresh-render.json', report);
        return 'Reconstruction depuis le maitre PSD enregistre exportee, aucun fichier source modifie.';
    });
})();
