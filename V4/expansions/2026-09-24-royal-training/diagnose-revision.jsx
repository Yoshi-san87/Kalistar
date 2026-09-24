#target photoshop
#include "../../scripts/stable/common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(life){
    var doc=life.open(home+'revisions/darnako/originals/card.psd'),layers=K.state(doc,[],''),rows=[];
    for(var i=0;i<layers.length;i++)if(layers[i].kind==='LayerKind.TEXT'){
        var layer=K.need(doc,layers[i].name),text=layer.textItem,out={name:layer.name};
        var props=['font','size','tracking','capitalization','fauxBold','fauxItalic'];
        for(var j=0;j<props.length;j++)try{out[props[j]]=String(text[props[j]]);}catch(e){out[props[j]]='ERROR: '+e;}
        rows.push(out);
    }
    K.write(home+'audit/native-text-diagnostic.json',{photoshop:app.version,texts:rows});
});
'Read only diagnostic complete';
