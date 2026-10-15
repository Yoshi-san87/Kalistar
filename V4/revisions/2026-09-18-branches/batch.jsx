#include "../../scripts/stable/common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var plan=K.read(work+'plan.json'),completed=[];
try{
    for(var i=0;i<plan.items.length;i++){
        var item=plan.items[i];
        K.write(work+'progress.json',{current:item.key,completed:completed,status:'rendering'});
        K.lifecycle(function(ctx){
            var source=ctx.open(root+item.psd);if(!source.saved)throw Error('Source non enregistree: '+item.psd);
            var doc=ctx.duplicate(source,'Raccord - '+item.key),dir=root+item.destination+'/';
            var report={key:item.key,before:K.state(doc,[],''),width:doc.width.as('px'),height:doc.height.as('px'),resolution:doc.resolution};
            var branch=K.need(doc,'BRANCHES '+item.element+' - couleur du cristal');
            doc.activeLayer=branch;
            var d=new ActionDescriptor();d.putPath(charIDToTypeID('null'),new File(work+'branches-complete.png'));
            executeAction(stringIDToTypeID('placedLayerReplaceContents'),d,DialogModes.NO);
            K.save(doc,dir+'card.psd',dir+'card.png');
            var reopened=ctx.open(dir+'card.psd');
            reopened.saveAs(new File(dir+'reopened.png'),new PNGSaveOptions(),true);
            report.reopened=K.state(reopened,[],'');report.photoshop=app.version;
            K.write(dir+'native.json',report);
        });
        completed.push(item.key);K.write(work+'progress.json',{completed:completed,status:'ready'});
    }
}catch(e){K.write(work+'error.json',{message:e.message,line:e.line,current:item.key,completed:completed});throw e;}
'Raccords prepares : '+completed.length;
