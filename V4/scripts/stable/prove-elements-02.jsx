#target photoshop
#include "common.jsx"
(function(){
    var root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
    var work=root+'V4/template-stable/elements-02/';
    var manifest=K.read(work+'manifest.json'),layout=manifest.effectLayouts[0];
    var card=K.read(work+'valazar/card.json');
    function png(doc,path){app.activeDocument=doc;doc.saveAs(new File(path),new PNGSaveOptions(),true);}
    function isolate(parent,name){
        var found=false;
        for(var i=0;i<parent.layers.length;i++){
            var l=parent.layers[i],keep=l.typename==='LayerSet'?isolate(l,name):l.name===name;
            l.visible=keep;if(keep)found=true;
        }
        return found;
    }
    return K.lifecycle(function(ctx){
        var source=ctx.open(root+'V4/templates/'+card.output+'.psd');
        if(!source.saved)throw Error('PSD non enregistre.');
        var doc=ctx.duplicate(source,'Controle optique Death');
        var layer=K.need(doc,layout.layer),before=K.bounds(layer);
        K.optical(layer,layout);K.optical(layer,layout);
        var after=K.bounds(layer);png(doc,work+'valazar/repeat-optical.png');
        if(!isolate(doc,layout.layer))throw Error('Motif absent.');
        png(doc,work+'valazar/death-isolated.png');
        K.write(work+'valazar/optical-proof.json',{layout:layout,before:before,after:after});
        return 'Controle optique exporte sans modifier le PSD.';
    });
})();
