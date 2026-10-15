#target photoshop
#include "../../scripts/stable/common.jsx"
var home = File($.fileName).parent.fsName.replace(/\\/g, '/') + '/';
function numberList(list) {
    var values = [];
    for (var i = 0; i < list.count; i++) values.push(list.getDouble(i));
    return values;
}
K.lifecycle(function (life) {
    var doc = life.open(home + 'originals/V4/creations/41396996/card.psd'), result = [];
    var names = ['FACTION - MGS1', 'ILLUSTRATION - cadrage'];
    for (var i = 0; i < names.length; i++) {
        var layer = K.need(doc, names[i]), ref = new ActionReference();
        ref.putIdentifier(K.s('layer'), layer.id);
        var d = executeActionGet(ref).getObjectValue(K.s('smartObjectMore'));
        var size = d.getObjectValue(K.s('size'));
        result.push({ name: names[i], bounds: K.bounds(layer), resolution: d.getDouble(K.s('resolution')),
            size: [size.getDouble(K.s('width')), size.getDouble(K.s('height'))],
            transform: numberList(d.getList(K.s('transform'))) });
    }
    K.write(home + 'smart-object-source.json', result);
});
'Read-only embedded object inspection complete';
