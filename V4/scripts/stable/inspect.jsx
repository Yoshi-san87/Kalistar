#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var out = new Folder(root + 'V4/template-stable'); out.create();
    var previous = app.documents.length ? app.activeDocument : null;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs, opened = [], work = null;
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function open(path) {
        var f = new File(root + path);
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === f.fsName) return app.documents[i]; } catch (e) {}
        var d = app.open(f); opened.push(d); return d;
    }
    function find(p, name) { for (var i = 0; i < p.layers.length; i++) { var l = p.layers[i]; if (l.name === name) return l; if (l.typename === 'LayerSet') { var f = find(l, name); if (f) return f; } } }
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k; if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k])); return '{' + a.join(',') + '}';
    }
    function state(p, list, prefix) {
        for (var i = 0; i < p.layers.length; i++) {
            var l = p.layers[i], b = l.bounds, o = { id: l.id, name: l.name, path: prefix + l.name, visible: l.visible, bounds: [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')] };
            if (l.typename === 'ArtLayer') {
                o.kind = String(l.kind); o.grouped = l.grouped;
                if (l.kind === LayerKind.TEXT) { o.text = l.textItem.contents; try { o.font = l.textItem.font; o.sizePt = l.textItem.size.as('pt'); o.leadingPt = l.textItem.leading.as('pt'); o.autoLeading = l.textItem.useAutoLeading; } catch (e) {} }
            }
            list.push(o); if (l.typename === 'LayerSet') state(l, list, prefix + l.name + '/');
        }
        return list;
    }
    try {
        var source = open('V4/templates/MOMO_V4_10_FONDS_RECENTRES.psd');
        var report = { momo: state(source, [], ''), momoUnsaved: !source.saved };
        work = source.duplicate('Audit template stable');
        find(work, 'ARME Instrument').visible = false;
        work.saveAs(new File(out.fsName + '/weapon-hidden.png'), new PNGSaveOptions(), true);
        work.close(SaveOptions.DONOTSAVECHANGES); work = null;
        var taulio = open('V3/templates/13_ELECTRO_TAULIO.psd');
        report.taulio = state(taulio, [], ''); report.taulioUnsaved = !taulio.saved;
        var f = new File(out.fsName + '/inspection.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Audit Momo et Taulio termine.';
    } finally {
        if (work) work.close(SaveOptions.DONOTSAVECHANGES);
        for (var i = opened.length - 1; i >= 0; i--) opened[i].close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
