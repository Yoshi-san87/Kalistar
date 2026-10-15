#include "../../scripts/stable/elements-common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var plan=K.read(work+'plan.json'),request=K.read(work+'native-request.json'),completed=[];
if(request.mode==='bind'){
    var helper=new File(work+'staged/elements-common.jsx');helper.encoding='UTF8';if(!helper.open('r'))throw Error('Helper absent');
    var helperSource=helper.read();helper.close();eval(helperSource.replace(/^#include[^\r\n]*$/gm,''));
}
function sprite(ctx,source,names,path){
    var target=ctx.track(app.documents.add(897,1497,300,'Icon inspection',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
    for(var j=names.length-1;j>=0;j--){
        app.activeDocument=source;
        var copy=K.need(source,names[j]).duplicate(target,ElementPlacement.PLACEATBEGINNING);
        app.activeDocument=target;K.unclip(target,copy);copy.visible=true;
    }
    target.saveAs(new File(path),new PNGSaveOptions(),true);
    app.activeDocument=source;
}
function hideAllowed(doc,key){
    if(key==='balmhyr'){K.need(doc,'ART - CONTENU').visible=false;K.need(doc,'ARME - CONTENU').visible=false;}
    K.need(doc,'RACE - CONTENU').visible=false;
}
function restoreGroups(doc,states){
    for(var j=0;j<states.length;j++){
        var s=states[j],l=K.byId(doc,s.id);
        if(l&&l.typename==='ArtLayer'&&typeof s.grouped==='boolean'&&l.grouped!==s.grouped)l.grouped=s.grouped;
    }
}
try{
    for(var i=0;i<plan.items.length;i++){
        var item=plan.items[i];K.write(work+'progress.json',{mode:request.mode,current:item.key,completed:completed});
        K.lifecycle(function(ctx){
            var source=ctx.open(root+item.psd);if(!source.saved)throw Error('Source non enregistree: '+item.psd);
            var dir=root+item.destination+'/',states=K.state(source,[],''),report;
            if(request.mode==='bind'){
                var profile=K.read(root+item.profile),manifest=K.read(root+'V4/template-stable/elements-01/manifest.json');
                var registry=K.read(root+manifest.baseRegistry),master=ctx.open(root+manifest.template),donor=ctx.open(root+profile.sourcePSD);
                if(!master.saved||!donor.saved)throw Error('Source non enregistree');
                var future=ctx.duplicate(master,'Proof real E.bind'),readOriginal=K.read,calibrationRead=null;
                if(item.key==='balmhyr')profile.artworkSource=plan.artwork;
                // Redirect only the not-yet-published layout file; execute the staged production helper unchanged.
                K.read=function(path){if(path===root+'V4/template-stable/icon-layouts.json'){calibrationRead=readOriginal(work+'calibration.json');return calibrationRead;}return readOriginal(path);};
                try{var result=E.bind(future,donor,profile,manifest,registry,root);}finally{K.read=readOriginal;}
                if(!calibrationRead)throw Error('Production helper did not read its optical layout');
                sprite(ctx,future,['RACE - CONTENU'],dir+'bind-race.png');
                if(item.key==='balmhyr')sprite(ctx,future,['ARME - CONTENU'],dir+'bind-weapon.png');
                K.write(dir+'bind-native.json',{calibration:calibrationRead,helperSource:helperSource,layers:K.state(future,[],''),donor:profile.sourcePSD});
            }else if(request.mode==='future'){
                var calibration=K.read(work+'calibration.json'),profile=K.read(root+item.profile);
                var donor=ctx.open(root+profile.sourcePSD);if(!donor.saved)throw Error('Donneur non enregistre');
                var future=ctx.track(app.documents.add(897,1497,300,'Future native icons',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
                var placeholder=future.artLayers.add();placeholder.name='Placeholder';
                var race=K.transplant(donor,K.need(donor,'PICTOGRAMME RACE - NAIN'),future,placeholder,'RACE - CONTENU');
                race=K.smart(future,race);race.visible=true;E.fit(race,87,87,759,1163.5,false);
                K.optical(race,calibration.race.NAIN);
                sprite(ctx,future,['RACE - CONTENU'],dir+'future-race.png');
                if(item.key==='balmhyr'){
                    var weapon=K.transplant(donor,K.need(donor,'ARME - Hache'),future,placeholder,'ARME - CONTENU');
                    weapon=K.smart(future,weapon);weapon.visible=true;K.center(weapon,137,1163.5);
                    K.optical(weapon,calibration.weapon.Hache);
                    sprite(ctx,future,['ARME - CONTENU'],dir+'future-weapon.png');
                }
                K.write(dir+'future-native.json',{layers:K.state(future,[],''),donor:profile.sourcePSD,calibration:calibration});
            }else if(request.mode==='inspect'){
                K.write(work+'inspection/'+item.key+'-state.json',states);
                sprite(ctx,source,['RACE - CONTENU'],work+'inspection/'+item.key+'-race.png');
                if(item.key==='balmhyr')sprite(ctx,source,['ARME - CONTENU'],work+'inspection/hache.png');
                var fixed=ctx.duplicate(source,'Unchanged layers before');hideAllowed(fixed,item.key);
                fixed.saveAs(new File(dir+'fixed-before.png'),new PNGSaveOptions(),true);
            }else{
                var calibration=K.read(work+'calibration.json');
                var doc=ctx.duplicate(source,'Revision '+item.key);app.activeDocument=doc;
                report={key:item.key,before:K.state(doc,[],''),width:doc.width.as('px'),height:doc.height.as('px'),resolution:doc.resolution};
                if(item.key==='balmhyr'){
                    var old=K.need(doc,'ART - CONTENU'),grouped=old.grouped;
                    var art=E.place(doc,root+plan.artwork,old,'ART - CANYONERO');
                    E.fit(art,737,921,448.5,616.5,true);old.remove();art.name='ART - CONTENU';art.grouped=grouped;
                    restoreGroups(doc,report.before);
                    K.optical(K.need(doc,'ARME - CONTENU'),calibration.weapon.Hache);
                }
                K.optical(K.need(doc,'RACE - CONTENU'),calibration.race.NAIN);
                var fixed=ctx.duplicate(doc,'Unchanged layers after');hideAllowed(fixed,item.key);
                fixed.saveAs(new File(dir+'fixed-after.png'),new PNGSaveOptions(),true);
                app.activeDocument=doc;
                K.save(doc,dir+'card.psd',dir+'card.png');
                sprite(ctx,doc,['RACE - CONTENU'],dir+'race.png');
                if(item.key==='balmhyr')sprite(ctx,doc,['ARME - CONTENU'],dir+'weapon.png');
                sprite(ctx,doc,['RACE - CONTENU','RACE - EMAIL'],dir+'race-bank.png');
                if(item.key==='balmhyr')sprite(ctx,doc,['ARME - CONTENU','ARME - EMAIL'],dir+'weapon-bank.png');
                var reopened=ctx.open(dir+'card.psd');reopened.saveAs(new File(dir+'reopened.png'),new PNGSaveOptions(),true);
                report.reopened=K.state(reopened,[],'');report.photoshop=app.version;
                K.write(dir+'native.json',report);
                K.optical(K.need(reopened,'RACE - CONTENU'),calibration.race.NAIN);
                if(item.key==='balmhyr')K.optical(K.need(reopened,'ARME - CONTENU'),calibration.weapon.Hache);
                reopened.saveAs(new File(dir+'repeat.png'),new PNGSaveOptions(),true);
            }
        });
        completed.push(item.key);
    }
    K.write(work+'progress.json',{mode:request.mode,status:'ready',completed:completed});
}catch(e){K.write(work+'error.json',{message:e.message,line:e.line,key:item.key});throw e;}
'Native stage complete: '+request.mode;
