#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'revision-03/';
    return K.lifecycle(function (ctx) {
        var registry = K.read(folder + 'registry-electro-02.json'), assets = K.read(work + 'assets.json');
        var source = ctx.open(root + registry.template), doc = ctx.duplicate(source, 'KALISTAR V4 - Electro 03');
        var report = { photoshop: app.version, before: K.state(doc, [], ''), badges: [] };
        registry.schemaVersion = 3;
        registry.template = 'V4/template-stable/KALISTAR_V4_TEMPLATE_03_ELECTRO.psd';
        registry.positionLayout = { textX: 224, textY: 1020.5, step: 58, maxTextWidth: 34, sizePt: 7.84, supportScale: 112, supportCenterX: 226, supportCenterY: 1020.5, shadow: { opacity: 65, distance: 3, blur: 4 } };
        var layout = registry.positionLayout;
        function shadow(layer, opacity, distance, blur) {
            app.activeDocument = doc; doc.activeLayer = layer;
            var lr = new ActionReference(); lr.putIdentifier(K.s('layer'), layer.id);
            var existing = executeActionGet(lr), fx = existing.hasKey(K.s('layerEffects')) ? existing.getObjectValue(K.s('layerEffects')) : new ActionDescriptor();
            var sd = new ActionDescriptor(), color = new ActionDescriptor();
            color.putDouble(K.c('Rd  '), 2); color.putDouble(K.c('Grn '), 6); color.putDouble(K.c('Bl  '), 10);
            sd.putBoolean(K.c('enab'), true); sd.putBoolean(K.s('present'), true); sd.putBoolean(K.s('showInDialog'), true);
            sd.putEnumerated(K.c('Md  '), K.c('BlnM'), K.c('Mltp')); sd.putObject(K.c('Clr '), K.c('RGBC'), color);
            sd.putUnitDouble(K.c('Opct'), K.c('#Prc'), opacity); sd.putBoolean(K.c('uglg'), false);
            sd.putUnitDouble(K.c('lagl'), K.c('#Ang'), 90); sd.putUnitDouble(K.c('Dstn'), K.c('#Pxl'), distance);
            sd.putUnitDouble(K.c('Ckmt'), K.c('#Pxl'), 0); sd.putUnitDouble(K.c('blur'), K.c('#Pxl'), blur);
            sd.putUnitDouble(K.c('Nose'), K.c('#Prc'), 0); sd.putBoolean(K.c('AntA'), false);
            fx.putUnitDouble(K.c('Scl '), K.c('#Prc'), 100); fx.putObject(K.c('DrSh'), K.c('DrSh'), sd);
            var d = new ActionDescriptor(), r = new ActionReference(); r.putProperty(K.c('Prpr'), K.c('Lefx')); r.putIdentifier(K.c('Lyr '), layer.id);
            d.putReference(K.c('null'), r); d.putObject(K.c('T   '), K.c('Lefx'), fx); executeAction(K.c('setd'), d, DialogModes.NO);
        }
        for (var p = 1; p <= 5; p++) {
            var support = K.need(doc, 'SUPPORT SLOT ' + p), text = K.need(doc, 'POSITION SLOT ' + p);
            var supportVisible = support.visible, textVisible = text.visible;
            support = K.smart(doc, support);
            support.resize(layout.supportScale, layout.supportScale, AnchorPosition.MIDDLECENTER);
            var b = K.ink(support);
            support.translate(layout.supportCenterX + (p - 1) * layout.step - (b[0] + b[2]) / 2, layout.supportCenterY - (b[1] + b[3]) / 2);
            shadow(support, layout.shadow.opacity, layout.shadow.distance, layout.shadow.blur);
            text.textItem.size = UnitValue(layout.sizePt, 'pt');
            K.center(text, layout.textX + (p - 1) * layout.step, layout.textY);
            shadow(text, 50, 1, 1);
            support.visible = supportVisible; text.visible = textVisible;
            report.badges.push({ slot: p, supportId: support.id, supportInk: K.ink(support), textInk: K.ink(text), font: text.textItem.font, sizePt: text.textItem.size.as('pt') });
        }
        // Place a fresh embedded artwork, without editing any shared smart-object contents.
        var oldArt = K.need(doc, 'ART - JELLY-JOE'); doc.activeLayer = oldArt;
        var place = new ActionDescriptor(); place.putPath(K.c('null'), new File(root + assets.artwork));
        executeAction(K.c('Plc '), place, DialogModes.NO);
        var art = doc.activeLayer; art.move(oldArt, ElementPlacement.PLACEBEFORE); oldArt.remove(); art.name = 'ART - JELLY-JOE';
        var ab = K.bounds(art), scale = Math.min(737 / (ab[2] - ab[0]), 921 / (ab[3] - ab[1]));
        art.resize(scale * 100, scale * 100, AnchorPosition.MIDDLECENTER); ab = K.bounds(art);
        art.translate(448.5 - (ab[0] + ab[2]) / 2, 156 - ab[1]); art.visible = false;
        var frame = K.need(doc, '06 CADRE FIXE ET ILLUSTRATION'), vis = [];
        for (var i = 0; i < frame.layers.length; i++) vis.push(frame.layers[i].visible);
        for (i = frame.layers.length - 1; i >= 0; i--) { var fl = frame.layers[i]; if (fl.typename === 'ArtLayer' && fl.id !== 17 && fl.id !== 11 && !fl.grouped) fl.grouped = true; }
        for (i = 0; i < frame.layers.length; i++) frame.layers[i].visible = vis[i];
        doc.info.title = 'KALISTAR V4 - TEMPLATE ELECTRO 03';
        doc.info.caption = 'Badges +12%, ombres natives, cinq positions horizontales. Illustration Jelly-Joe 02. Structure 897 x 1497 px conservee.';
        report.after = K.state(doc, [], ''); report.registry = registry;
        K.save(doc, root + registry.template, work + 'template.png');
        K.write(folder + 'registry-electro-03.json', registry); K.write(work + 'extension.json', report);
        function exportPng(d, file) { app.activeDocument = d; d.saveAs(new File(file), new PNGSaveOptions(), true); }
        function hideVariableVisuals(d) {
            app.activeDocument = d;
            K.need(d, '03 POSITIONS AUTORISEES - P1 a P5').visible = false;
            var names = ['ART - MOMO', 'ART - TAULIO', 'ART - JELLY-JOE', 'ILLUSTRATION - remplacer le contenu'];
            for (var k = 0; k < names.length; k++) { var l = K.find(d, names[k]); if (l) l.visible = false; }
        }
        for (i = 0; i < assets.specs.length; i++) {
            var spec = assets.specs[i], dir = work + spec.key + '/', card = K.read(dir + 'card.json');
            var approved = ctx.open(root + 'V4/templates/' + spec.oldOutput + '.psd');
            exportPng(approved, dir + 'previous.png');
            var rendered = ctx.duplicate(doc, card.name + ' - revision 03');
            var rr = renderRegistered(rendered, card, registry);
            K.save(rendered, root + 'V4/templates/' + card.output + '.psd', dir + 'render.png');
            var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd'); exportPng(reopened, dir + 'reopened.png');
            rr.reopened = K.state(reopened, [], ''); K.write(dir + 'render.json', rr);
            var fixed = ctx.duplicate(approved, 'Structure precedente'); hideVariableVisuals(fixed); exportPng(fixed, dir + 'fixed-previous.png'); fixed.close(SaveOptions.DONOTSAVECHANGES);
            fixed = ctx.duplicate(rendered, 'Structure nouvelle'); hideVariableVisuals(fixed); exportPng(fixed, dir + 'fixed-new.png'); fixed.close(SaveOptions.DONOTSAVECHANGES);
            rendered.close(SaveOptions.DONOTSAVECHANGES);
        }
        var test = ctx.duplicate(doc, 'Verification des cinq positions'), testCard = K.read(work + 'momo/card.json');
        testCard.positions = [1, 2, 3, 4, 5]; renderRegistered(test, testCard, registry);
        exportPng(test, work + 'five-positions.png'); K.write(work + 'five-positions.json', K.state(test, [], ''));
        return 'Template Electro 03 et trois PSD enregistres, reouverts et exportes pour verification.';
    });
})();
