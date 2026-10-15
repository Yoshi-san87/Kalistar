#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var output = new Folder(root + 'V4/momo-bottom');
    if (!output.exists) output.create();
    var previous = app.documents.length ? app.activeDocument : null;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var source = null, copy = null, opened = false;
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k;
        if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k]));
        return '{' + a.join(',') + '}';
    }
    app.preferences.rulerUnits = Units.PIXELS;
    app.displayDialogs = DialogModes.NO;
    try {
        var file = new File(root + 'V3/templates/01_ELECTRO_MOMO.psd');
        for (var i = 0; i < app.documents.length; i++) {
            try { if (app.documents[i].fullName.fsName === file.fsName) { source = app.documents[i]; break; } } catch (e) {}
        }
        if (!source) { source = app.open(file); opened = true; }
        var report = { width: source.width.as('px'), height: source.height.as('px'), ppi: source.resolution, profile: source.colorProfileName, layers: [] };
        function walk(parent, prefix) {
            for (var i = 0; i < parent.layers.length; i++) {
                var l = parent.layers[i], b = l.bounds;
                var item = { id: l.id, name: l.name, path: prefix + l.name, visible: l.visible, type: l.typename, bounds: [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')] };
                if (l.typename === 'ArtLayer') { item.kind = String(l.kind); if (l.kind === LayerKind.TEXT) item.text = l.textItem.contents; }
                report.layers.push(item);
                if (l.typename === 'LayerSet') walk(l, prefix + l.name + '/');
            }
        }
        walk(source, '');
        copy = source.duplicate('MOMO V3 - source de travail RGB');
        copy.changeMode(ChangeMode.RGB);
        copy.convertProfile('sRGB IEC61966-2.1', Intent.RELATIVECOLORIMETRIC, true, true);
        var psd = new PhotoshopSaveOptions(); psd.layers = true; psd.embedColorProfile = true;
        copy.saveAs(new File(output.fsName + '/source-v3-rgb.psd'), psd, true);
        copy.saveAs(new File(output.fsName + '/source-v3.png'), new PNGSaveOptions(), true);
        var f = new File(output.fsName + '/source-audit.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Source V3 conservee : ' + report.width + ' x ' + report.height + ' px. Copie RGB et audit disponibles.';
    } finally {
        if (copy) copy.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
