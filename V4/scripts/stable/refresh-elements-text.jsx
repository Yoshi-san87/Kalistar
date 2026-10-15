#target photoshop
#include "elements-common.jsx"
(function(){
    var root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
    var work=root+'V4/template-stable/elements-01/',manifest=K.read(work+'manifest.json'),completed=[];
    function png(doc,file){app.activeDocument=doc;doc.saveAs(new File(file),new PNGSaveOptions(),true);}
    function equal(a,b){
        if(a===b)return true;
        if(!(a instanceof Array)||!(b instanceof Array)||a.length!==b.length)return false;
        for(var k=0;k<a.length;k++)if(!equal(a[k],b[k]))return false;
        return true;
    }
    for(var i=0;i<manifest.cards.length;i++){
        var entry=manifest.cards[i],card=K.read(root+entry.profile),dir=root+entry.profile.replace(/card\.json$/,'');
        var report=K.read(dir+'render.json'),changed=false;
        for(var key in card){
            if(equal(card[key],report.card[key]))continue;
            if(key!=='description'&&key!=='title'&&key!=='job')throw Error('Champ non editorial modifie : '+card.name+' '+key);
            changed=true;
        }
        if(!changed&&report.textRefresh&&report.textRefresh.layoutRevision===2)continue;
        K.write(work+'text-progress.json',{current:card.name,completed:completed,status:'rendering'});
        K.lifecycle(function(ctx){
            var psd=root+'V4/templates/'+card.output+'.psd',output=root+'V4/cartes/'+card.output+'.png';
            for(var di=0;di<app.documents.length;di++)try{
                if(app.documents[di].fullName.fsName===new File(psd).fsName)throw Error('Fermer le PSD cible avant la revision editoriale.');
            }catch(e){if(e.message.indexOf('Fermer le PSD')===0)throw e;}
            if(!new File(output).copy(dir+'before-text.png'))throw Error('Sauvegarde du controle avant texte impossible.');
            var source=ctx.open(psd),doc=ctx.duplicate(source,card.output+' - textes');
            source.close(SaveOptions.DONOTSAVECHANGES);
            var update;
            doc.suspendHistory('Kalistar - revision des textes natifs','E.setDescription(doc,card.description); update=renderRegistered(doc,card,report.registry)');
            update.allowedLayerIds.push(K.need(doc,'DESCRIPTION').id);
            doc.info.caption='Kalistar V4 | Template 04 multi-elements | '+card.id+' | Statistiques V3 preservees | 897 x 1497 px, 300 ppp, sRGB.';
            K.save(doc,psd,output);
            var reopened=ctx.open(psd);png(reopened,dir+'reopened.png');
            report.card=card;report.after=K.state(doc,[],'');report.reopened=K.state(reopened,[],'');
            report.textRefresh={nativeText:true,layoutRevision:2,allowedLayerIds:update.allowedLayerIds,before:entry.profile.replace(/card\.json$/,'before-text.png')};
            K.write(dir+'render.json',report);
            var fixed=ctx.duplicate(reopened,'Controle cadre '+card.name);E.fixed(fixed);png(fixed,dir+'fixed.png');
        });
        completed.push(card.name);
    }
    K.write(work+'text-progress.json',{completed:completed,status:'ready'});
    return 'Textes natifs actualises : '+completed.join(', ');
})();
