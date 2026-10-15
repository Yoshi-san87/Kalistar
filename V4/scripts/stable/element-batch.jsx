#include "elements-common.jsx"
function renderElementBatch(batch){
    if(!/^elements-\d{2}$/.test(batch))throw Error('Lot invalide.');
    var root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
    var work=root+'V4/template-stable/'+batch+'/',manifest=K.read(work+'manifest.json');
    var config=K.read(work+'render-config.json'),registry=K.read(root+manifest.baseRegistry),completed=[];
    function png(doc,file){app.activeDocument=doc;doc.saveAs(new File(file),new PNGSaveOptions(),true);}
    function selected(name){for(var i=0;i<config.names.length;i++)if(config.names[i]===name)return true;return false;}
    try{
        for(var i=0;i<manifest.cards.length;i++){
            if(new File(work+'pause.request').exists)throw Error('Production mise en pause entre deux cartes.');
            var entry=manifest.cards[i],card=K.read(root+entry.profile);if(!selected(card.name))continue;
            if(!new File(root+card.artworkSource).exists)throw Error('Illustration absente : '+card.artworkSource);
            K.write(work+'progress.json',{current:card.name,completed:completed,status:'rendering'});
            K.lifecycle(function(ctx){
                var source=ctx.open(root+manifest.template),donor=ctx.open(root+card.sourcePSD);
                if(!source.saved||!donor.saved)throw Error('Source non enregistree.');
                var doc=ctx.duplicate(source,card.output),dir=root+card.profile.replace(/card\.json$/,'');
                var report;
                doc.suspendHistory('Kalistar - composition native','report=E.bind(doc,donor,card,manifest,registry,root)');
                report.photoshop=app.version;report.resolution=doc.resolution;
                K.save(doc,root+'V4/templates/'+card.output+'.psd',root+'V4/cartes/'+card.output+'.png');
                var reopened=ctx.open(root+'V4/templates/'+card.output+'.psd');png(reopened,dir+'reopened.png');
                report.reopened=K.state(reopened,[],'');K.write(dir+'render.json',report);
                var fixed=ctx.duplicate(reopened,'Controle cadre '+card.name);E.fixed(fixed);png(fixed,dir+'fixed.png');
            });
            completed.push(card.name);K.write(work+'progress.json',{completed:completed,status:'ready'});
        }
        return 'Cartes produites : '+completed.join(', ');
    }catch(e){K.write(work+'error.json',{message:e.message,line:e.line,current:card?card.name:null,completed:completed});throw e;}
}
