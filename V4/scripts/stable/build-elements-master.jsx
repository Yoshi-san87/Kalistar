#target photoshop
#include "elements-common.jsx"
(function(){
    var root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
    var work=root+'V4/template-stable/elements-01/', manifest=K.read(work+'manifest.json');
    var registry=K.read(root+manifest.baseRegistry);
    return K.lifecycle(function(ctx){
        var source=ctx.open(root+manifest.baseTemplate);if(!source.saved)throw Error('Maitre source non enregistre.');
        var doc=ctx.duplicate(source,'Kalistar V4 - elements 04');
        E.prepareMaster(doc,registry);
        K.save(doc,root+manifest.template,null);
        K.write(work+'master-state.json',K.state(doc,[],''));
        var fixed=ctx.duplicate(doc,'Controle structure du maitre');E.fixed(fixed);
        fixed.saveAs(new File(work+'fixed-master.png'),new PNGSaveOptions(),true);
        var bindings=[];
        for(var i=0;i<manifest.cards.length;i++){
            var card=K.read(root+manifest.cards[i].profile);
            bindings.push({key:card.name.toLowerCase(),element:card.element,profile:card.profile,output:card.output});
        }
        K.write(root+manifest.registry,{schemaVersion:4,template:manifest.template,canvas:[897,1497],resolution:300,baseRegistry:manifest.baseRegistry,elements:manifest.palette,bindings:bindings,renderer:['V4/scripts/stable/common.jsx','V4/scripts/stable/registered.jsx','V4/scripts/stable/elements-common.jsx'],flags:manifest.flags,geometry:manifest.geometry,positionLayout:registry.positionLayout});
        return 'Maitre multi-elements sauvegarde sans modifier Electro 03F.';
    });
})();
