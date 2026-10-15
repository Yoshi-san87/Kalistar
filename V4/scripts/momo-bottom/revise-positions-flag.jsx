#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var output = root + 'V4/momo-bottom/positions-flag/';
    var previous = app.documents.length ? app.activeDocument : null;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var source = null, doc = null, reopened = null, opened = false;
    var name = 'MOMO_V4_02_POSITIONS_DRAPEAU';
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function find(parent, name) {
        for (var i = 0; i < parent.layers.length; i++) {
            var l = parent.layers[i];
            if (l.name === name) return l;
            if (l.typename === 'LayerSet') { var match = find(l, name); if (match) return match; }
        }
        return null;
    }
    function bounds(layer) { var b = layer.bounds; return [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')]; }
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k;
        if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k])); return '{' + a.join(',') + '}';
    }
    function write(file, data) { var f = new File(output + file); f.encoding = 'UTF8'; f.open('w'); f.write(json(data)); f.close(); }
    function placeInGroup(file, group) {
        doc.activeLayer = group;
        var d = new ActionDescriptor(); d.putPath(charIDToTypeID('null'), new File(file));
        executeAction(charIDToTypeID('Plc '), d, DialogModes.NO);
        var layer = doc.activeLayer; layer.move(group, ElementPlacement.INSIDE);
        return layer;
    }
    function supportMask(group) {
        doc.activeLayer = group;
        doc.selection.select([[0, 829], [897, 829], [897, 1068], [0, 1068]], SelectionType.REPLACE, 0, false);
        var d = new ActionDescriptor(), ref = new ActionReference();
        d.putClass(charIDToTypeID('Nw  '), charIDToTypeID('Chnl'));
        ref.putEnumerated(charIDToTypeID('Chnl'), charIDToTypeID('Chnl'), charIDToTypeID('Msk '));
        d.putReference(charIDToTypeID('At  '), ref);
        d.putEnumerated(charIDToTypeID('Usng'), charIDToTypeID('UsrM'), charIDToTypeID('RvlS'));
        executeAction(charIDToTypeID('Mk  '), d, DialogModes.NO);
        doc.selection.deselect();
    }
    try {
        var input = new File(root + 'V4/templates/MOMO_V4_BASE_V3_BAS_V4.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === input.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(input); opened = true; }
        doc = source.duplicate('MOMO - positions et drapeau');
        if (Math.round(doc.width.as('px')) !== 897 || Math.round(doc.height.as('px')) !== 1497) throw Error('Canevas inattendu.');
        doc.saveAs(new File(output + 'before-photoshop.png'), new PNGSaveOptions(), true);
        var positions = find(doc, '03 POSITIONS AUTORISEES - P1 a P5');
        var flag = find(doc, 'FACTION - Chroma'), oldShadow = find(doc, 'FACTION - Chroma - ombre portee');
        if (!positions || !flag || !oldShadow) throw Error('Calques V3 attendus absents.');
        var report = { width: 897, height: 1497, positionsBefore: bounds(positions), flagBefore: bounds(flag) };
        positions.translate(-478, -10);
        report.positionsAfter = bounds(positions);
        report.positionTexts = [find(positions, 'P3').textItem.contents, find(positions, 'P4').textItem.contents];

        // The original DEF rail remains the support; only the cloth is enlarged.
        // Keep the new fabric outside the original frame's clipping stack.
        var upper = find(doc, '10 V3 ORIGINALE - haut conserve, bas masque');
        doc.activeLayer = find(doc, '00 MARGE IMPRESSION - noir');
        var faction = doc.layerSets.add(); faction.name = '15 FACTION - drapeau sous la barre DEF';
        faction.move(upper, ElementPlacement.PLACEBEFORE);
        var fabric = placeInGroup(output + 'chroma-fabric-source.png', faction);
        fabric.name = 'FACTION - Chroma - tissu source agrandi';
        var b = bounds(fabric), factor = 228 / (b[3] - b[1]);
        fabric.resize(factor * 100, factor * 100, AnchorPosition.MIDDLECENTER);
        b = bounds(fabric);
        fabric.translate(734 - (b[0] + b[2]) / 2, 824 - b[1]);
        flag.visible = false; oldShadow.visible = false;
        report.fabricAfter = bounds(fabric);
        var shadow = fabric.duplicate(); shadow.name = 'OMBRE - detachement du tissu';
        doc.activeLayer = shadow; shadow.rasterize(RasterizeType.ENTIRELAYER);
        shadow.transparentPixelsLocked = false; shadow.adjustLevels(0, 255, 1, 0, 0);
        shadow.applyGaussianBlur(2); shadow.opacity = 55; shadow.translate(2, 3);
        shadow.move(fabric, ElementPlacement.PLACEAFTER);
        report.shadowAfter = bounds(shadow);
        supportMask(faction);
        report.originalFlagHidden = !flag.visible;
        report.originalShadowHidden = !oldShadow.visible;
        report.supportMaskTop = 829;
        report.fabricSourcePixels = [112, 265]; report.fabricDisplayScale = 228 / 265;
        doc.info.caption = 'Kalistar V4 | Momo | positions 3 et 4 a gauche, sous la scene | drapeau Chroma : tissu agrandi depuis la source, sous le support DEF original | fond inferieur V4 et autres contenus inchanges | 897 x 1497 px, 300 ppp, sRGB.';
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        var finalPsd = new File(root + 'V4/templates/' + name + '.psd');
        doc.saveAs(finalPsd, options, true);
        doc.saveAs(new File(output + 'after-photoshop.png'), new PNGSaveOptions(), true);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(finalPsd);
        reopened.saveAs(new File(output + 'reopened-photoshop.png'), new PNGSaveOptions(), true);
        report.reopenedPositions = bounds(find(reopened, '03 POSITIONS AUTORISEES - P1 a P5'));
        report.reopenedFabricKind = String(find(reopened, 'FACTION - Chroma - tissu source agrandi').kind);
        write('assembly.json', report);
        return 'Momo enregistre : ' + name + '.psd. Positions deplacees et tissu agrandi sans sur-echantillonnage.';
    } finally {
        if (reopened) reopened.close(SaveOptions.DONOTSAVECHANGES);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
