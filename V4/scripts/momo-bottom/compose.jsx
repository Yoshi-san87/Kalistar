#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var previous = app.documents.length ? app.activeDocument : null;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var base = null, master = null, doc = null, lowerDoc = null, baseOpened = false, masterOpened = false;
    var width = 897, height = 1497, seam = 1068;
    // Match the visible card bodies, not the unequal black canvas margins.
    var scale = 765 / 913, offsetX = (width - 950 * scale) / 2, offsetY = seam - 1203 * scale;
    var outputName = 'MOMO_V4_BASE_V3_BAS_V4', stage = 'source';
    app.preferences.rulerUnits = Units.PIXELS;
    app.displayDialogs = DialogModes.NO;
    function openExisting(path) {
        var file = new File(path);
        for (var i = 0; i < app.documents.length; i++) {
            try { if (app.documents[i].fullName.fsName === file.fsName) return { doc: app.documents[i], opened: false }; } catch (e) {}
        }
        return { doc: app.open(file), opened: true };
    }
    function find(parent, name) {
        for (var i = 0; i < parent.layers.length; i++) {
            var layer = parent.layers[i];
            if (layer.name === name) return layer;
            if (layer.typename === 'LayerSet') { var result = find(layer, name); if (result) return result; }
        }
        return null;
    }
    function unlock(parent) {
        for (var i = 0; i < parent.layers.length; i++) {
            var layer = parent.layers[i];
            try { layer.allLocked = false; } catch (e) {}
            try { layer.positionLocked = false; } catch (e) {}
            if (layer.typename === 'LayerSet') unlock(layer);
        }
    }
    function wrap(parent, name) {
        var ids = [], i;
        for (i = 0; i < parent.layers.length; i++) ids.push(parent.layers[i].id);
        for (i = 0; i < ids.length; i++) {
            var selection = new ActionDescriptor(), ref = new ActionReference();
            ref.putIdentifier(charIDToTypeID('Lyr '), ids[i]);
            selection.putReference(charIDToTypeID('null'), ref);
            if (i) selection.putEnumerated(stringIDToTypeID('selectionModifier'), stringIDToTypeID('selectionModifierType'), stringIDToTypeID('addToSelection'));
            selection.putBoolean(charIDToTypeID('MkVs'), false);
            executeAction(charIDToTypeID('slct'), selection, DialogModes.NO);
        }
        var make = new ActionDescriptor(), target = new ActionReference(), from = new ActionReference();
        target.putClass(stringIDToTypeID('layerSection')); make.putReference(charIDToTypeID('null'), target);
        from.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
        make.putReference(charIDToTypeID('From'), from);
        executeAction(charIDToTypeID('Mk  '), make, DialogModes.NO);
        var group = app.activeDocument.activeLayer; group.name = name;
        return group;
    }
    function maskRect(layer, top, bottom) {
        doc.activeLayer = layer;
        doc.selection.select([[0, top], [width, top], [width, bottom], [0, bottom]], SelectionType.REPLACE, 0, false);
        var descriptor = new ActionDescriptor(), channel = new ActionReference();
        descriptor.putClass(charIDToTypeID('Nw  '), charIDToTypeID('Chnl'));
        channel.putEnumerated(charIDToTypeID('Chnl'), charIDToTypeID('Chnl'), charIDToTypeID('Msk '));
        descriptor.putReference(charIDToTypeID('At  '), channel);
        descriptor.putEnumerated(charIDToTypeID('Usng'), charIDToTypeID('UsrM'), charIDToTypeID('RvlS'));
        executeAction(charIDToTypeID('Mk  '), descriptor, DialogModes.NO);
        doc.selection.deselect();
    }
    function transform(layer) {
        var ref = new ActionReference(); ref.putIdentifier(stringIDToTypeID('layer'), layer.id);
        var list = executeActionGet(ref).getObjectValue(stringIDToTypeID('smartObjectMore')).getList(stringIDToTypeID('transform'));
        var result = []; for (var i = 0; i < list.count; i++) result.push(list.getDouble(i)); return result;
    }
    function write(path, text) { var file = new File(path); file.encoding = 'UTF8'; file.open('w'); file.write(text); file.close(); }
    try {
        var opened = openExisting(root + 'V4/momo-bottom/source-v3-rgb.psd'); base = opened.doc; baseOpened = opened.opened;
        doc = base.duplicate('MOMO - V3 avec bloc inferieur V4');
        if (Math.round(doc.width.as('px')) !== width || Math.round(doc.height.as('px')) !== height) throw Error('Le canevas V3 a change : ' + doc.width.as('px') + ' x ' + doc.height.as('px'));
        stage = 'groupe V3';
        unlock(doc);
        var original = wrap(doc, '10 V3 ORIGINALE - haut conserve, bas masque');
        stage = 'masque V3';
        maskRect(original, 0, seam);
        stage = 'fond';
        var background = doc.artLayers.add(); background.name = '00 MARGE IMPRESSION - noir';
        var black = new SolidColor(); black.rgb.hexValue = '000000';
        doc.selection.selectAll(); doc.selection.fill(black); doc.selection.deselect();
        background.move(original, ElementPlacement.PLACEAFTER);

        stage = 'source V4';
        opened = openExisting(root + 'V4/templates/KALISTAR_MASTER_V4.psd'); master = opened.doc; masterOpened = opened.opened;
        lowerDoc = master.duplicate('Bloc inferieur V4 - preparation');
        unlock(lowerDoc);
        var keep = ['20 CADRE FIXE - verrouille', '40 IDENTITE - objets dynamiques', '60 TEXTES - editables'];
        for (var i = lowerDoc.layers.length - 1; i >= 0; i--) {
            var retain = false; for (var j = 0; j < keep.length; j++) if (lowerDoc.layers[i].name === keep[j]) retain = true;
            if (!retain) lowerDoc.layers[i].remove();
        }
        var identity = find(lowerDoc, keep[1]);
        if (!identity) throw Error('Groupe identite absent du fond V4.');
        for (i = identity.layers.length - 1; i >= 0; i--) {
            var name = identity.layers[i].name;
            if (name.indexOf('DRAPEAU ') === 0 || name.indexOf('CODE128 ') === 0) identity.layers[i].remove();
        }
        find(lowerDoc, 'NAME').remove();
        stage = 'groupe V4';
        var bottom = wrap(lowerDoc, '20 BLOC INFERIEUR V4 - identite et textes editables');
        stage = 'copie V4';
        bottom = bottom.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
        app.activeDocument = doc;
        var frame = find(bottom, 'CADRE MAITRE - ne pas redimensionner');
        if (!frame) throw Error('Fond structurel V4 absent.');
        stage = 'transformation';
        bottom.resize(scale * 100, scale * 100, AnchorPosition.TOPLEFT);
        var quad = transform(frame);
        bottom.translate(offsetX - quad[0], offsetY - quad[1]);
        stage = 'masque V4';
        maskRect(bottom, seam, height);
        find(bottom, keep[0]).name = '21 STRUCTURE V4 - objet dynamique, raccord fixe';
        find(bottom, keep[1]).name = '22 ARME RACE CRISTAL - objets dynamiques';
        find(bottom, keep[2]).name = '23 TITRE METIER RACE RECIT - textes natifs';
        frame.name = 'FOND INFERIEUR V4 - echelle uniforme ' + (scale * 100).toFixed(4) + '%';
        frame.allLocked = true;
        doc.info.title = 'MOMO - L\u2019ARTISTE MAGIQUE';
        doc.info.caption = 'Kalistar V4 : PSD Momo V3 conserve au-dessus de y=1068. Seul le bloc inferieur provient du fond V4. 897 x 1497 px, 300 ppp. Epreuve RGB sRGB, non BAT imprimeur.';
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        stage = 'sauvegarde';
        doc.saveAs(new File(root + 'V4/templates/' + outputName + '.psd'), options, true);
        doc.saveAs(new File(root + 'V4/momo-bottom/render-photoshop.png'), new PNGSaveOptions(), true);
        quad = transform(frame);
        write(root + 'V4/momo-bottom/assembly.json', '{"width":897,"height":1497,"ppi":300,"seam":1068,"sourceLowerY":1203,"uniformScale":' + scale + ',"offsetX":' + offsetX + ',"offsetY":' + offsetY + ',"frameTransform":[' + quad.join(',') + '],"source":"V3/templates/01_ELECTRO_MOMO.psd","lowerSource":"V4/templates/KALISTAR_MASTER_V4.psd","output":"V4/templates/' + outputName + '.psd"}');
        return 'Momo assemble dans le canevas V3. Seul le bas change : ' + outputName + '.psd';
    } catch (error) {
        write(root + 'V4/momo-bottom/last-error.txt', stage + '\n' + error.message + '\nLigne ' + error.line);
        throw Error(stage + ': ' + error.message + ' (ligne ' + error.line + ')');
    } finally {
        if (lowerDoc) lowerDoc.close(SaveOptions.DONOTSAVECHANGES);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (master && masterOpened) master.close(SaveOptions.DONOTSAVECHANGES);
        if (base && baseOpened) base.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
