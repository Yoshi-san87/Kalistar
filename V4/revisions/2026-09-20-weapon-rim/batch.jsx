#include "../../scripts/stable/common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var plan=K.read(work+'plan.json'),done=[];
for(var i=0;i<plan.items.length;i++){
    var item=plan.items[i];
    K.write(work+'progress.json',{current:item.key,completed:done});
    K.lifecycle(function(ctx){
        var source=ctx.open(root+item.psd);if(!source.saved)throw Error('Source non enregistree: '+item.key);
        var doc=ctx.duplicate(source,'Medallion '+item.key),dir=work+'staged/'+item.key+'/';
        var report={key:item.key,width:doc.width.as('px'),height:doc.height.as('px'),resolution:doc.resolution,before:K.state(doc,[],'')};
        if(!item.png)doc.saveAs(new File(dir+'before.png'),new PNGSaveOptions(),true);
        var frame=K.need(doc,item.layer),locked=frame.allLocked;doc.activeLayer=frame;frame.allLocked=false;
        var select=new ActionDescriptor(),ref=new ActionReference();ref.putIdentifier(stringIDToTypeID('layer'),frame.id);select.putReference(charIDToTypeID('null'),ref);select.putBoolean(charIDToTypeID('MkVs'),true);executeAction(charIDToTypeID('slct'),select,DialogModes.NO);
        var replace=new ActionDescriptor();replace.putPath(charIDToTypeID('null'),new File(work+item.component));
        executeAction(stringIDToTypeID('placedLayerReplaceContents'),replace,DialogModes.NO);frame.allLocked=locked;
        report.lockPreserved=frame.allLocked===locked;
        K.save(doc,dir+'card.psd',dir+'card.png');
        var reopened=ctx.open(dir+'card.psd');reopened.saveAs(new File(dir+'reopened.png'),new PNGSaveOptions(),true);
        report.reopened=K.state(reopened,[],'');K.write(dir+'native.json',report);
    });
    done.push(item.key);
}
K.write(work+'progress.json',{completed:done,status:'ready'});
'Medaillons corriges : '+done.length;
