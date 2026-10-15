#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var previous = app.documents.length ? app.activeDocument : null, opened = [];
    function read(file) {
        var doc = app.open(new File(root + file)); opened.push(doc); var layers = {};
        function walk(p) { for (var i = 0; i < p.layers.length; i++) { var l = p.layers[i]; layers[l.id] = { name: l.name, visible: l.visible, parent: l.parent.name, blend: String(l.blendMode), grouped: l.typename === 'ArtLayer' ? l.grouped : null }; if (l.typename === 'LayerSet') walk(l); } }
        walk(doc); return layers;
    }
    try {
        var a = read('V4/templates/MOMO_V4_BASE_V3_BAS_V4.psd'), b = read('V4/templates/MOMO_V4_02_POSITIONS_DRAPEAU.psd'), result = [];
        for (var id in a) { if (!b[id]) result.push(id + ' missing'); else for (var key in a[id]) if (a[id][key] !== b[id][key]) result.push(id + ' ' + a[id].name + ' ' + key + ': ' + a[id][key] + ' -> ' + b[id][key]); }
        return result.join('\n');
    } finally { for (var i = opened.length - 1; i >= 0; i--) opened[i].close(SaveOptions.DONOTSAVECHANGES); if (previous) try { app.activeDocument = previous; } catch (e) {} }
})();
