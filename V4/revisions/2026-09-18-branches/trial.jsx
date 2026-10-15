#include "../../scripts/stable/common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(ctx){
    var source=ctx.open(root+'V4/templates/RUBY_V4_01_HYDRO.psd');if(!source.saved)throw Error('Source non enregistree.');
    var doc=ctx.duplicate(source,'Ruby - raccord corrige'),branch=K.need(doc,'BRANCHES HYDRO - couleur du cristal');
    app.activeDocument=doc;doc.activeLayer=branch;
    var d=new ActionDescriptor();d.putPath(charIDToTypeID('null'),new File(work+'branches-complete.png'));
    executeAction(stringIDToTypeID('placedLayerReplaceContents'),d,DialogModes.NO);
    K.save(doc,work+'ruby-trial.psd',work+'ruby-trial.png');
    var reopened=ctx.open(work+'ruby-trial.psd');reopened.saveAs(new File(work+'ruby-reopened.png'),new PNGSaveOptions(),true);
    K.write(work+'trial.json',{bounds:K.bounds(K.need(reopened,'BRANCHES HYDRO - couleur du cristal'))});
});
'Essai Ruby termine';
