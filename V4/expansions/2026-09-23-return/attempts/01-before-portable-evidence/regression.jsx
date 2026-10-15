#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'canonical-regression-request.json');
for(var i=0;i<request.items.length;i++)(function(item){
    if(!/^[a-z][a-z0-9-]+$/.test(item.key))throw Error('Invalid canonical key');
    var out=home+'canonical-regression/'+item.key+'/';new Folder(out).create();
    K.lifecycle(function(life){
        var source=life.open(home+'cards/'+item.key+'/card.psd');if(!source.saved)throw Error('Unsaved source');
        var doc=life.duplicate(source,'Return canonical regression '+item.key);
        renderRegistered(doc,item.card,item.registry);
        if(item.card.element==='MINERO')for(var die=1;die<=6;die++){
            var magic=false;for(var mi=0;mi<item.card.magic.length;mi++)if(item.card.magic[mi]===die)magic=true;
            K.need(doc,'ATK D'+die+' - OR GENERE - objet dynamique partage').visible=!(magic&&typeof item.card.atk[6-die]==='number');
        }
        K.save(doc,home+'canonical-regression/roundtrip.psd',out+'card.png');
        doc.close(SaveOptions.DONOTSAVECHANGES);
        var reopened=life.open(home+'canonical-regression/roundtrip.psd');
        reopened.saveAs(new File(out+'reopened.png'),new PNGSaveOptions(),true);
        K.write(out+'native.json',{width:reopened.width.as('px'),height:reopened.height.as('px'),resolution:reopened.resolution,layers:K.state(reopened,[],''),photoshop:app.version});
    });
})(request.items[i]);
'Canonical regression complete';
