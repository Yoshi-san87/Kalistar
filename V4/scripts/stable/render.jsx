#target photoshop
#include "common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/';
    var card = K.read(folder + 'taulio.json');
    function includes(a, n) { for (var i = 0; i < a.length; i++) if (a[i] === n) return true; return false; }
    if (!/^[A-Z0-9_]+$/.test(card.output) || !/^\d{8}$/.test(card.id)) throw Error('Identifiant invalide.');
    if (card.element !== 'ELECTRO' || card.faction !== 'Chroma' || card.race !== 'ROBOT') throw Error('Cette combinaison doit etre calibree avant rendu.');
    if (card.atk.length !== 6 || card.defense.length !== 6 || card.positions.length < 1 || card.positions.length > 5) throw Error('Structure de carte invalide.');
    return K.lifecycle(function (ctx) {
        var source = ctx.open(folder + 'KALISTAR_V4_TEMPLATE_01.psd');
        var doc = ctx.duplicate(source, card.name + ' - template stable 01');
        var report = { card: card, before: K.state(doc, [], ''), slots: [], texts: [], version: 1 };
        var allowed = [];
        function change(l) { if (!includes(allowed, l.id)) allowed.push(l.id); return l; }
        function set(name, visible) { var l = K.need(doc, name); if (l.visible !== visible) change(l).visible = visible; return l; }
        set('ART - MOMO', card.artwork === 'MOMO'); set('ART - TAULIO', card.artwork === 'TAULIO');
        set('ID CODE128 - 30000001', card.id === '30000001'); set('ID CODE128 - 30000013', card.id === '30000013');
        set('ARME Instrument', card.weapon === 'Instrument');
        set('ARME Poing - pictogramme', card.weapon === 'Poing'); set('ARME Poing - email interieur', card.weapon === 'Poing');
        var centers = { 6: 150, 5: 371.5, 4: 475.5, 3: 576.5, 2: 676.5, 1: 773.5 };
        var effects = { ATK: { 4: ['retry'], 2: ['mana', 'guard'], 1: ['buff_atk'] }, DEF: { 4: ['retry'] } };
        for (var si = 0; si < 2; si++) {
            var side = si ? 'DEF' : 'ATK', values = si ? card.defense : card.atk;
            for (var die = 6; die >= 1; die--) {
                var value = values[6 - die], numeric = typeof value === 'number';
                if (numeric && (value < 0 || value > 999 || Math.floor(value) !== value)) throw Error('Valeur invalide.');
                var l = K.need(doc, side + ' D' + die + ' - valeur');
                if (numeric) {
                    var x = si ? (die === 6 ? 756 : 734) : (die === 6 ? 142 : 155.5);
                    if (l.textItem.contents !== String(value)) { change(l); K.text(l, value, x, centers[die], die === 6 ? 104 : 66); }
                }
                set(l.name, numeric);
                var available = effects[side][die] || [], matched = numeric;
                for (var e = 0; e < available.length; e++) { set(side + ' D' + die + ' - effet ' + available[e], value === available[e]); if (value === available[e]) matched = true; }
                if (!matched) throw Error('Effet non calibre : ' + value + ' dans ' + side + die);
                set(side + ' D' + die + (si ? ' - BARRIERE' : ' - HALO MAGIQUE'), numeric && includes(si ? card.barriers : card.magic, die));
                report.slots.push({ side: side, die: die, value: value, numberLayer: l.id });
            }
        }
        set('DEF D4 - fond effet', typeof card.defense[2] !== 'number');
        set('DEF D4 - fond physique', typeof card.defense[2] === 'number');
        var positions = card.positions.slice().sort(function (a, b) { return a - b; });
        for (var p = 1; p <= 5; p++) {
            var visible = p <= positions.length;
            set('SUPPORT SLOT ' + p, visible); var t = set('POSITION SLOT ' + p, visible);
            if (visible) { if (positions[p - 1] < 1 || positions[p - 1] > 5 || (p > 1 && positions[p - 1] === positions[p - 2])) throw Error('Position invalide.'); change(t); K.text(t, positions[p - 1], 221 + (p - 1) * 50, 1024, 30); }
        }
        var labels = [['NOM', card.name, 449.5, 129.5, 470], ['TITLE', card.title, 448.5, 1100, 590], ['JOB', card.job, 292, 1172.5, 170], ['RACE', card.race, 599, 1172.5, 170]];
        for (var i = 0; i < labels.length; i++) { var a = labels[i], label = K.need(doc, a[0]); if (label.textItem.contents !== a[1]) { change(label); K.text(label, a[1], a[2], a[3], a[4]); } }
        var description = change(K.need(doc, 'DESCRIPTION'));
        var words = card.description.split(/\s+/), lines = [], line = '';
        for (i = 0; i < words.length; i++) {
            var next = line ? line + ' ' + words[i] : words[i]; description.textItem.contents = next;
            var b = K.ink(description);
            if (b[2] - b[0] > 574 && line) { lines.push(line); line = words[i]; } else line = next;
        }
        if (line) lines.push(line);
        if (lines.length > 5) throw Error('Recit trop long pour le cadre.');
        K.text(description, lines.join('\r'), 448.5, 1318.5, 574);
        var db = K.ink(description); if (db[1] < 1251 || db[3] > 1387) throw Error('Recit hors cadre.');
        doc.info.title = card.name + ' - ' + card.title;
        doc.info.caption = 'Kalistar V4 | Template stable 01 derive du Momo V4-10 valide | ' + card.id + ' | Cadre et geometrie fixes, donnees et illustration separees | 897 x 1497 px, 300 ppp, sRGB.';
        report.allowedLayerIds = allowed; report.after = K.state(doc, [], '');
        K.save(doc, root + 'V4/templates/' + card.output + '.psd', folder + 'taulio-photoshop.png');
        var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd');
        reopened.saveAs(new File(folder + 'taulio-reopened.png'), new PNGSaveOptions(), true); report.reopened = K.state(reopened, [], '');
        K.write(folder + 'render.json', report);
        return 'Taulio rendu depuis le template stable, PSD reouvert et verifie.';
    });
})();
