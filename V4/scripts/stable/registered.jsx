function renderRegistered(doc, card, registry) {
    app.activeDocument = doc;
    function includes(a, n) { for (var i = 0; i < a.length; i++) if (a[i] === n) return true; return false; }
    if (!includes(registry.elements, card.element)) throw Error('Element non calibre.');
    if (!/^[A-Z0-9_]+$/.test(card.output) || !/^\d{8}$/.test(card.id)) throw Error('Identifiant invalide.');
    if (card.atk.length !== 6 || card.defense.length !== 6 || card.positions.length < 1 || card.positions.length > 5) throw Error('Structure invalide.');
    var report = { card: card, version: registry.schemaVersion, before: K.state(doc, [], ''), slots: [], allowedLayerIds: [] };
    function change(l) { if (!includes(report.allowedLayerIds, l.id)) report.allowedLayerIds.push(l.id); return l; }
    function set(name, v) { var l = K.need(doc, name); if (l.visible !== v) change(l).visible = v; return l; }
    for (var bi = 0; bi < registry.banks.length; bi++) {
        var bank = registry.banks[bi], chosen = card[bank.field];
        if (!bank.variants[chosen]) throw Error('Variante non calibree : ' + bank.field + '=' + chosen);
        for (var value in bank.variants) for (var vi = 0; vi < bank.variants[value].length; vi++) set(bank.variants[value][vi], value === chosen);
    }
    var ys = { 6: 150, 5: 371.5, 4: 475.5, 3: 576.5, 2: 676.5, 1: 773.5 };
    var layers = K.state(doc, [], '');
    for (var si = 0; si < 2; si++) {
        var side = si ? 'DEF' : 'ATK', values = si ? card.defense : card.atk;
        for (var die = 6; die >= 1; die--) {
            value = values[6 - die]; var numeric = typeof value === 'number';
            if (numeric && (value < 0 || value > 999 || Math.floor(value) !== value)) throw Error('Valeur invalide.');
            var l = K.need(doc, side + ' D' + die + ' - valeur');
            if (numeric && l.textItem.contents !== String(value)) {
                change(l); K.text(l, value, si ? (die === 6 ? 756 : 734) : (die === 6 ? 142 : 155.5), ys[die], die === 6 ? 104 : 66);
            }
            set(l.name, numeric);
            var prefix = side + ' D' + die + ' - effet ', found = numeric;
            for (var ei = 0; ei < layers.length; ei++) if (layers[ei].name.indexOf(prefix) === 0) {
                var active = !numeric && layers[ei].name.substring(prefix.length) === value;
                set(layers[ei].name, active); if (active) found = true;
            }
            if (!found) throw Error('Effet non calibre : ' + prefix + value);
            set(side + ' D' + die + (si ? ' - BARRIERE' : ' - HALO MAGIQUE'), numeric && includes(si ? card.barriers : card.magic, die));
            report.slots.push({ side: side, die: die, value: value, numberLayer: l.id });
        }
    }
    set('DEF D4 - fond effet', typeof card.defense[2] !== 'number');
    set('DEF D4 - fond physique', typeof card.defense[2] === 'number');
    var effectSupports = registry.effectSupports || [];
    for (var es = 0; es < effectSupports.length; es++) {
        var support = effectSupports[es], panel = support.side === 'DEF' ? card.defense : card.atk;
        for (var sl = 0; sl < support.layers.length; sl++) set(support.layers[sl], typeof panel[6 - support.die] !== 'number');
    }
    var positions = card.positions.slice().sort(function (a, b) { return a - b; });
    var opticalLayouts = registry.effectLayouts || [];
    for (var oi = 0; oi < opticalLayouts.length; oi++) {
        var layout = opticalLayouts[oi], icon = K.need(doc, layout.layer);
        if (icon.visible) { change(icon); K.optical(icon, layout); }
    }
    var positionLayout = registry.positionLayout || { textX: 221, textY: 1024, step: 50, maxTextWidth: 30 };
    for (var p = 1; p <= 5; p++) {
        var show = p <= positions.length; set('SUPPORT SLOT ' + p, show); var t = set('POSITION SLOT ' + p, show);
        if (show) {
            if (positions[p - 1] < 1 || positions[p - 1] > 5 || positions[p - 1] !== Math.floor(positions[p - 1]) || (p > 1 && positions[p - 1] === positions[p - 2])) throw Error('Position invalide.');
            if (t.textItem.contents !== String(positions[p - 1])) { change(t); K.text(t, positions[p - 1], positionLayout.textX + (p - 1) * positionLayout.step, positionLayout.textY, positionLayout.maxTextWidth); }
        }
    }
    var labels = [['NOM', card.name, 449.5, 129.5, 470], ['TITLE', card.title, 448.5, 1100, 590], ['JOB', card.job, 292, 1172.5, 170], ['RACE', card.race, 599, 1172.5, 170]];
    for (var i = 0; i < labels.length; i++) {
        var a = labels[i], label = K.need(doc, a[0]);
        if (label.textItem.contents !== a[1]) { change(label); K.text(label, a[1], a[2], a[3], a[4]); }
    }
    var description = K.need(doc, 'DESCRIPTION');
    if (description.textItem.contents.replace(/\r/g, ' ') !== card.description) {
        change(description);
        var words = card.description.split(/\s+/), lines = [], line = '';
        for (i = 0; i < words.length; i++) {
            var next = line ? line + ' ' + words[i] : words[i]; description.textItem.contents = next; var b = K.ink(description);
            if (b[2] - b[0] > 574 && line) { lines.push(line); line = words[i]; } else line = next;
        }
        if (line) lines.push(line); if (lines.length > 5) throw Error('Recit trop long.');
        K.text(description, lines.join('\r'), 448.5, 1318.5, 574);
        var db = K.ink(description); if (db[1] < 1251 || db[3] > 1387) throw Error('Recit hors cadre.');
    }
    doc.info.title = card.name + ' - ' + card.title;
    doc.info.caption = 'Kalistar V4 | Template Electro ' + registry.schemaVersion + ' | ' + card.id + ' | Structure fixe et contenus editables | 897 x 1497 px, 300 ppp, sRGB.';
    report.after = K.state(doc, [], ''); return report;
}
