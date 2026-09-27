#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var plan=K.read(home+'before.json'),request=K.read(home+'native-request.json');
if(request.revision!=='2026-09-27-weapon-optics')throw Error('Invalid native request');
function sprite(life,source,names,target){
    var doc=life.track(app.documents.add(897,1497,300,'Weapon optical proof',NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1'));
    for(var i=names.length-1;i>=0;i--){
        app.activeDocument=source;var layer=K.need(source,names[i]).duplicate(doc,ElementPlacement.PLACEATBEGINNING);
        app.activeDocument=doc;K.unclip(doc,layer);layer.visible=true;
    }
    doc.saveAs(new File(target),new PNGSaveOptions(),true);app.activeDocument=source;
}
var done=[];
for(var i=0;i<plan.items.length;i++){
    var item=plan.items[i],inspect=item.key==='voloden'||item.key==='iliane';
    var selected=false;for(var ki=0;ki<request.keys.length;ki++)if(request.keys[ki]===item.key)selected=true;
    if(!selected)continue;
    if(request.mode==='inspect'&&!inspect)continue;
    if(request.mode==='pilot'&&!inspect)continue;
    if(request.mode==='render-references'&&item.kind!=='approved')continue;
    if(request.mode==='render-creations'&&item.kind!=='created')continue;
    K.write(home+'progress.json',{mode:request.mode,current:item.key,completed:done});
    K.lifecycle(function(life){
        var source=life.open(root+item.psd);if(!source.saved)throw Error('Unsaved source: '+item.psd);
        if(request.mode==='inspect'){
            K.write(home+'inspection/'+item.key+'-layers.json',K.state(source,[],''));
            sprite(life,source,[item.layer],home+'inspection/'+item.weapon+'-motif.png');
            sprite(life,source,['ARME - EMAIL'],home+'inspection/'+item.weapon+'-email.png');
            sprite(life,source,[item.layer,'ARME - EMAIL'],home+'inspection/'+item.weapon+'-bank.png');
            var profile=K.read(root+item.profile),donor=life.open(root+profile.sourcePSD);
            if(!donor.saved)throw Error('Unsaved donor');
            sprite(life,donor,['ARME - '+item.weapon],home+'inspection/'+item.weapon+'-donor.png');
            K.write(home+'inspection/'+item.weapon+'-donor-layers.json',K.state(donor,[],''));
            return;
        }
        if(request.mode==='bind'){
            var profile=K.read(root+item.profile),manifest=K.read(root+'V4/template-stable/elements-01/manifest.json');
            if(!manifest.palette[profile.element])manifest=K.read(root+'V4/template-stable/elements-02/manifest.json');
            var registry=K.read(root+manifest.baseRegistry),master=life.open(root+manifest.template),donor=life.open(root+profile.sourcePSD);
            if(!master.saved||!donor.saved)throw Error('Unsaved production donor');
            var future=life.duplicate(master,'Actual E.bind '+item.weapon),originalRead=K.read,used=false;
            K.read=function(p){if(p===root+'V4/template-stable/icon-layouts.json'){used=true;return originalRead(home+'calibration.json');}return originalRead(p);};
            try{E.bind(future,donor,profile,manifest,registry,root);}finally{K.read=originalRead;}
            if(!used)throw Error('Production helper did not read layout');
            sprite(life,future,['ARME - CONTENU'],home+'staged/'+item.key+'/bind-motif.png');
            sprite(life,future,['ARME - CONTENU','ARME - EMAIL'],home+'staged/'+item.key+'/bind-bank.png');
            K.write(home+'staged/'+item.key+'/bind-native.json',{actualProductionBind:true,photoshop:app.version,layoutRead:used,calibration:K.read(home+'calibration.json'),layers:K.state(future,[],''),master:manifest.template,donor:profile.sourcePSD});
            return;
        }
        var calibration=K.read(home+'calibration.json'),profile=K.read(root+item.profile);
        var doc=life.duplicate(source,'Weapon optics '+item.key),dir=home+'staged/'+item.key+'/';
        var report={key:item.key,weapon:item.weapon,photoshop:app.version,before:K.state(doc,[],''),width:897,height:1497,resolution:doc.resolution};
        var old=K.need(doc,item.layer),grouped=old.grouped,visible=old.visible;
        var changed;
        if(item.kind==='approved'){
            var donor=life.open(root+profile.sourcePSD);if(!donor.saved)throw Error('Unsaved donor');
            changed=K.transplant(donor,K.need(donor,'ARME - '+item.weapon),doc,old,'Weapon optical replacement');
            changed=K.smart(doc,changed);K.center(changed,137,1163.5);K.optical(changed,calibration.weapon[item.weapon]);
        }else{
            changed=E.place(doc,home+'staged/banks/weapon-'+item.weapon+'-packed.png',old,'Weapon optical replacement');
            var b=K.bounds(changed);changed.resize(96/(b[2]-b[0])*100,95/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);
            b=K.bounds(changed);changed.translate(89-b[0],1116-b[1]);
        }
        old.remove();changed.name=item.layer;changed.visible=visible;
        app.activeDocument=doc;
        if(grouped)changed.grouped=true;else K.unclip(doc,changed);
        K.save(doc,dir+'card.psd',dir+'card.png');
        if(item.kind==='approved'){
            sprite(life,doc,[item.layer],dir+'motif.png');
            sprite(life,doc,[item.layer,'ARME - EMAIL'],dir+'bank.png');
        }
        var reopened=life.open(dir+'card.psd');reopened.saveAs(new File(dir+'reopened.png'),new PNGSaveOptions(),true);
        report.reopened=K.state(reopened,[],'');
        if(item.kind==='approved'){
            K.optical(K.need(reopened,item.layer),calibration.weapon[item.weapon]);
            reopened.saveAs(new File(dir+'repeat.png'),new PNGSaveOptions(),true);
        }
        K.write(dir+'native.json',report);
    });
    done.push(item.key);
}
K.write(home+'native-'+request.mode+'-complete.json',{revision:request.revision,photoshop:app.version,completed:done,sourceWrites:false});
'Weapon optics '+request.mode+' complete';
