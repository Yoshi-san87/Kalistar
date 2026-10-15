#include "../../scripts/stable/common.jsx"
var work = File($.fileName).parent.fsName.replace(/\\/g,'/')+'/', root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(ctx){
    var source=ctx.open(root+'V4/template-stable/KALISTAR_V4_TEMPLATE_04_ELEMENTS.psd');
    if(!source.saved)throw Error('Source non enregistree.');
    var doc=ctx.duplicate(source,'Inspection raccord'),branch=K.need(doc,'BRANCHES ELECTRO - couleur du cristal');
    var frame=K.need(doc,'FOND INFERIEUR V4 - echelle uniforme 83.7897%');
    function png(d,n){app.activeDocument=d;d.saveAs(new File(work+n+'.png'),new PNGSaveOptions(),true);}
    branch.visible=false;png(doc,'underlay');branch.visible=true;
    var info={branch:K.bounds(branch),frame:K.bounds(frame)};
    for(var i=0;i<2;i++){
        app.activeDocument=doc;doc.activeLayer=K.need(doc,i?'FOND INFERIEUR V4 - echelle uniforme 83.7897%':'BRANCHES ELECTRO - couleur du cristal');
        var select=new ActionDescriptor(),reference=new ActionReference();reference.putIdentifier(stringIDToTypeID('layer'),doc.activeLayer.id);select.putReference(charIDToTypeID('null'),reference);select.putBoolean(charIDToTypeID('MkVs'),true);executeAction(charIDToTypeID('slct'),select,DialogModes.NO);
        var descRef=new ActionReference();descRef.putIdentifier(stringIDToTypeID('layer'),doc.activeLayer.id);K.write(work+'layer-'+i+'.json',{descriptor:executeActionGet(descRef).toStream()});
        executeAction(stringIDToTypeID('placedLayerEditContents'),undefined,DialogModes.NO);
        var content=app.activeDocument;ctx.track(content);
        info[i?'frameSource':'branchSource']={width:content.width.as('px'),height:content.height.as('px'),layers:K.state(content,[],'')};
        png(content,i?'frame-source':'branch-source');
        content.close(SaveOptions.DONOTSAVECHANGES);
    }
    K.write(work+'inspection.json',info);
});
'Inspection terminee';
