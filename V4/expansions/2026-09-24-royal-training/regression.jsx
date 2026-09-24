#target photoshop
#include "../../scripts/stable/elements-common.jsx"
(function(){
    var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
    var request=K.read(home+'evidence/native-regression/request.json');
    if(request.items.length!==38)throw Error('38 references requises');
    for(var i=0;i<request.items.length;i++)(function(item){
        if(!/^[a-z][a-z0-9-]+$/.test(item.key))throw Error('Cle invalide');
        var original=/^V4\/templates\/[A-Z0-9_]+\.psd$/.test(item.psd);
        var revised=item.psd==='V4/expansions/2026-09-24-royal-training/revisions/'+item.key+'/card.psd';
        if(!original&&!revised)throw Error('Source hors perimetre');
        var out=home+'evidence/native-regression/'+item.key+'/';new Folder(out).create();
        K.write(home+'evidence/native-regression/progress.json',{index:i,total:38,key:item.key});
        K.lifecycle(function(life){
            var source=life.open(root+item.psd);if(!source.saved)throw Error('Source ouverte modifiee');
            var doc=life.duplicate(source,'Royal regression '+item.key);
            renderRegistered(doc,item.card,item.registry);
            if(item.card.element==='MINERO')for(var die=1;die<=6;die++){
                var magic=false;for(var mi=0;mi<item.card.magic.length;mi++)if(item.card.magic[mi]===die)magic=true;
                K.need(doc,'ATK D'+die+' - OR GENERE - objet dynamique partage').visible=!(magic&&typeof item.card.atk[6-die]==='number');
            }
            K.save(doc,home+'evidence/native-regression/roundtrip.psd',out+'card.png');
            doc.close(SaveOptions.DONOTSAVECHANGES);
            var reopened=life.open(home+'evidence/native-regression/roundtrip.psd');
            reopened.saveAs(new File(out+'reopened.png'),new PNGSaveOptions(),true);
            K.write(out+'native.json',{key:item.key,width:reopened.width.as('px'),height:reopened.height.as('px'),resolution:reopened.resolution,layers:K.state(reopened,[],''),photoshop:app.version});
        });
    })(request.items[i]);
    return 'Royal: 38 references rendered';
})();
