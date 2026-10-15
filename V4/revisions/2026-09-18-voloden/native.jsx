#include "../../scripts/stable/elements-common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var plan=K.read(work+'plan.json'),request=K.read(work+'native-request.json'),card=K.read(root+plan.profile),manifest=K.read(root+'V4/template-stable/elements-02/manifest.json');
var registeredOriginal=renderRegistered;
renderRegistered=function(doc,profile,registry){
    var fullState=K.state,find=K.find,need=K.need,names=[],index={};
    function collect(p){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];names.push({id:l.id,name:l.name});if(!index[l.name])index[l.name]=l;if(l.typename==='LayerSet')collect(l);}}
    collect(doc);
    // Keep complete outer audit states; avoid redundant geometry snapshots during the idempotent field pass.
    K.state=function(p,list,prefix){return p===doc?names:fullState(p,list,prefix);};
    K.find=function(p,name){return p===doc?(index[name]||null):find(p,name);};
    K.need=function(p,name){var l=K.find(p,name);if(!l)throw Error('Calque absent : '+name);return l;};
    try{return registeredOriginal(doc,profile,registry);}finally{K.state=fullState;K.find=find;K.need=need;}
};
function png(doc,path){app.activeDocument=doc;doc.saveAs(new File(path),new PNGSaveOptions(),true);}
function sprite(ctx,source,names,path){
    var target=ctx.track(app.documents.add(897,1497,300,'Native component',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
    for(var j=names.length-1;j>=0;j--){app.activeDocument=source;var layer=K.need(source,names[j]).duplicate(target,ElementPlacement.PLACEATBEGINNING);app.activeDocument=target;K.unclip(target,layer);layer.visible=true;}
    png(target,path);app.activeDocument=source;
}
try{
    K.lifecycle(function(ctx){
        var donor=ctx.open(root+card.sourcePSD);if(!donor.saved)throw Error('Donneur non enregistre');
        if(request.mode==='inspect'){
            var icons=ctx.track(app.documents.add(897,1497,300,'Calibrage Voloden',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
            var base=icons.artLayers.add(),weapon=K.transplant(donor,K.need(donor,'ARME - Faucille'),icons,base,'ARME - CONTENU');
            weapon=K.smart(icons,weapon);weapon.visible=true;K.center(weapon,137,1163.5);
            var race=K.transplant(donor,K.need(donor,'PICTOGRAMME RACE - CARDEMORTIS'),icons,base,'RACE - CONTENU');
            race=K.smart(icons,race);race.visible=true;E.fit(race,87,87,759,1163.5,false);
            sprite(ctx,icons,['ARME - CONTENU'],work+'inspection/weapon.png');sprite(ctx,icons,['RACE - CONTENU'],work+'inspection/race.png');
            K.write(work+'inspection/native.json',{layers:K.state(icons,[],''),source:card.sourcePSD});
            return;
        }
        var source=ctx.open(root+manifest.template);if(!source.saved)throw Error('Maitre non enregistre');
        var registry=K.read(root+manifest.baseRegistry),master=ctx.duplicate(source,'Cadre fixe source');E.fixed(master);png(master,work+'staged/fixed-master.png');
        var doc=ctx.duplicate(source,'Voloden V4'),readOriginal=K.read,used=null;
        K.read=function(path){if(path===root+'V4/template-stable/icon-layouts.json'){used=readOriginal(work+'staged/icon-layouts.json');return used;}return readOriginal(path);};
        var report;try{report=E.bind(doc,donor,card,manifest,registry,root);}finally{K.read=readOriginal;}
        report.width=doc.width.as('px');report.height=doc.height.as('px');report.resolution=doc.resolution;report.photoshop=app.version;report.iconLayouts=used;
        K.save(doc,work+'staged/card.psd',work+'staged/card.png');
        sprite(ctx,donor,['ILLUSTRATION - remplacer le contenu'],work+'staged/art-before.png');
        sprite(ctx,doc,['ART - CONTENU'],work+'staged/art-after.png');
        sprite(ctx,doc,['ARME - CONTENU'],work+'staged/weapon.png');sprite(ctx,doc,['RACE - CONTENU'],work+'staged/race.png');
        sprite(ctx,doc,['ATK D6 - effet death'],work+'staged/death.png');
        sprite(ctx,doc,['ARME - CONTENU','ARME - EMAIL'],work+'staged/weapon-bank.png');sprite(ctx,doc,['RACE - CONTENU','RACE - EMAIL'],work+'staged/race-bank.png');
        var reopened=ctx.open(work+'staged/card.psd');png(reopened,work+'staged/reopened.png');report.reopened=K.state(reopened,[],'');
        K.write(work+'staged/native.json',report);
        renderRegistered(reopened,card,report.registry);K.optical(K.need(reopened,'ARME - CONTENU'),used.weapon.Faucille);K.optical(K.need(reopened,'RACE - CONTENU'),used.race.CARDEMORTIS);
        png(reopened,work+'staged/repeat.png');
        var fixed=ctx.duplicate(reopened,'Cadre fixe Voloden');E.fixed(fixed);png(fixed,work+'staged/fixed-card.png');
    });
}catch(e){K.write(work+'error.json',{message:e.message,line:e.line,mode:request.mode});throw e;}
'Voloden: '+request.mode+' termine';
