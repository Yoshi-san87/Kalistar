#include "../../scripts/stable/elements-common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(ctx){
    var card=K.read(root+'V4/template-stable/elements-01/ruby/card.json');
    var manifest=K.read(root+'V4/template-stable/elements-01/manifest.json');
    var registry=K.read(root+manifest.baseRegistry);
    var source=ctx.open(work+'staged/master/card.psd'),donor=ctx.open(root+card.sourcePSD);
    if(!source.saved||!donor.saved)throw Error('Source non enregistree.');
    var doc=ctx.duplicate(source,'Preuve du template corrige');
    E.bind(doc,donor,card,manifest,registry,root);
    doc.saveAs(new File(work+'master-proof-ruby.png'),new PNGSaveOptions(),true);
});
'Composition depuis le template corrige terminee';
