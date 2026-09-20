#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var previous = app.documents.length ? app.activeDocument : null, doc = null, opened = false, units = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_04_OMBRE_ATTACHE.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) doc = app.documents[i]; } catch (e) {}
        if (!doc) { doc = app.open(file); opened = true; }
        var result = [];
        function walk(parent) {
            for (var i = 0; i < parent.layers.length; i++) {
                var l = parent.layers[i];
                if (l.typename === 'LayerSet') walk(l);
                else if (/^(ATK|DEF) D[1-6] - valeur$/.test(l.name)) {
                    var t = l.textItem, ref = new ActionReference(); ref.putIdentifier(stringIDToTypeID('layer'), l.id);
                    var d = executeActionGet(ref), b = d.getObjectValue(stringIDToTypeID('boundsNoEffects'));
                    var z = [b.getUnitDoubleValue(stringIDToTypeID('left')), b.getUnitDoubleValue(stringIDToTypeID('top')), b.getUnitDoubleValue(stringIDToTypeID('right')), b.getUnitDoubleValue(stringIDToTypeID('bottom'))];
                    result.push(l.name + ' | ' + t.contents + ' | ' + t.font + ' | ' + t.size.as('pt') + 'pt | ' + t.kind + ' | h/v ' + t.horizontalScale + '/' + t.verticalScale + ' | tracking ' + t.tracking + ' | effects ' + d.hasKey(stringIDToTypeID('layerEffects')) + ' | ink ' + z.join(','));
                }
            }
        }
        walk(doc); return result.join('\n');
    } finally { if (doc && opened) doc.close(SaveOptions.DONOTSAVECHANGES); app.preferences.rulerUnits = units; if (previous) try { app.activeDocument = previous; } catch (e) {} }
})();
