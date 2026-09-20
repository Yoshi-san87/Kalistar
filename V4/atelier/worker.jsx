#target photoshop
#include "../scripts/stable/elements-common.jsx"
(function(){
    var atelier=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/';
    var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
    var active=K.read(atelier+'data/active.json');
    if(!/^[a-f0-9-]{36}$/.test(active.id))throw Error('Travail invalide.');
    var dir=atelier+'data/jobs/'+active.id+'/',job=K.read(dir+'request.json'),results=[];
    var fullState=K.state,originalFind=K.find,originalNeed=K.need,originalById=K.byId;
    var indices=[];
    function index(root){
        for(var i=0;i<indices.length;i++)if(indices[i].root===root)return indices[i];
        var map={root:root,names:{},ids:{}};
        function visit(p){for(var n=0;n<p.layers.length;n++){var l=p.layers[n],key='n:'+l.name;if(!map.names[key])map.names[key]=l;map.ids['i:'+l.id]=l;if(l.typename==='LayerSet')visit(l);}}
        visit(root);indices.push(map);return map;
    }
    // Native objects stay editable; only repeated tree traversal is cached.
    K.find=function(root,name){return index(root).names['n:'+name]||null;};
    K.need=function(root,name){var layer=K.find(root,name);if(!layer)throw Error('Calque absent : '+name);return layer;};
    K.byId=function(root,id){return index(root).ids['i:'+id]||null;};
    function editableState(doc){
        app.activeDocument=doc;var selected=[];
        function visit(p){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.typename==='LayerSet')visit(l);else if(/^(NOM|TITLE|JOB|RACE|DESCRIPTION|POSITION SLOT [1-5]|(?:ATK|DEF) D[1-6] - (?:valeur|effet .+|HALO MAGIQUE|BARRIERE))$/.test(l.name))selected.push(l);}}
        visit(doc);return fullState({layers:selected},[],'');
    }
    function namesOnly(p,list,prefix){
        // renderRegistered uses these snapshots only for names and its optional audit log.
        // The authoritative native audit is captured separately before/after and on reopen.
        for(var i=0;i<p.layers.length;i++){var l=p.layers[i];list.push({name:l.name,id:l.id,visible:l.visible});if(l.typename==='LayerSet')namesOnly(l,list,prefix+l.name+'/');}
        return list;
    }
    function png(doc,file){app.activeDocument=doc;doc.saveAs(new File(file),new PNGSaveOptions(),true);}
    function allowed(name,art){return name===art||/^(NOM|TITLE|JOB|DESCRIPTION)$/.test(name)||/^(POSITION SLOT|SUPPORT SLOT) [1-5]$/.test(name)||/^(ATK|DEF) D[1-6] - (valeur|effet |HALO MAGIQUE|BARRIERE|OR GENERE|fond effet|fond physique)/.test(name);}
    function fixed(doc,art){var a=K.state(doc,[],'');for(var i=0;i<a.length;i++)if(allowed(a[i].name,art))K.byId(doc,a[i].id).visible=false;}
    function same(a,b){
        if(a===b)return true;if(a===null||b===null||typeof a!==typeof b||typeof a!=='object')return false;
        var key,countA=0,countB=0;
        for(key in a){countA++;if(!same(a[key],b[key]))return false;}
        for(key in b)countB++;return countA===countB;
    }
    function run(item){
        indices=[];
        var out=dir+item.key+'/';new Folder(out).create();
        return K.lifecycle(function(ctx){
            var source=ctx.open(root+item.psd);if(!source.saved)throw Error('La reference ouverte contient des changements non enregistres.');
            var doc=ctx.duplicate(source,'Atelier - '+item.card.name),before=job.kind==='regression'?editableState(doc):fullState(doc,[],''),card=item.card;
            for(var fi=0;fi<before.length;fi++)if(/^(NOM|TITLE|JOB|DESCRIPTION|POSITION SLOT [1-5]|(?:ATK|DEF) D[1-6] - valeur)$/.test(before[fi].name)&&before[fi].font){
                try{app.fonts.getByName(before[fi].font);}catch(e){throw Error('Police absente : '+before[fi].font);}
            }
            if(job.kind!=='regression'){
                var proof=ctx.duplicate(source,'Cadre reference');fixed(proof,item.artworkLayer);png(proof,out+'fixed-before.png');
                app.activeDocument=doc;
            }
            var labels=[['NOM',card.name,449.5,129.5,470],['TITLE',card.title,448.5,1100,590],['JOB',card.job,292,1172.5,170]];
            for(var li=0;li<labels.length;li++){
                var a=labels[li],l=K.need(doc,a[0]);
                if(l.textItem.contents!==a[1])K.text(l,a[1],a[2],a[3],a[4]);
            }
            if(K.need(doc,'DESCRIPTION').textItem.contents.replace(/\r/g,' ')!==card.description)E.setDescription(doc,card.description);
            if(item.upload){
                if(!/^[a-f0-9-]{36}$/.test(item.upload))throw Error('Illustration invalide.');
                var old=K.need(doc,item.artworkLayer),wasGrouped=old.grouped;
                var placed=E.place(doc,atelier+'data/uploads/'+item.upload+'.png',old,'ART - IMPORT');
                E.fit(placed,737,921,448.5,616.5,true);old.remove();placed.name=item.artworkLayer;placed.grouped=wasGrouped;indices=[];
                for(var bi=0;bi<before.length;bi++)if(before[bi].kind&&before[bi].name!==item.artworkLayer){
                    var original=K.byId(doc,before[bi].id);if(original&&original.grouped!==before[bi].grouped)original.grouped=before[bi].grouped;
                }
            }
            var render;K.state=namesOnly;
            try{render=renderRegistered(doc,card,item.registry);}finally{K.state=fullState;}
            if(card.element==='MINERO')for(var die=6;die>=1;die--){
                var magic=false;for(var mi=0;mi<card.magic.length;mi++)if(card.magic[mi]===die)magic=true;
                K.need(doc,'ATK D'+die+' - OR GENERE - objet dynamique partage').visible=!(magic&&typeof card.atk[6-die]==='number');
            }
            var after=job.kind==='regression'?[]:fullState(doc,[],''),rectangles=[];
            for(var i=0;job.kind!=='regression'&&i<before.length;i++){
                var prior=before[i];if(!prior.kind)continue;
                var next=null;for(var ni=0;ni<after.length;ni++)if(after[ni].path===prior.path){next=after[ni];break;}
                if(!allowed(prior.name,item.artworkLayer)&&(!next||!same(prior,next)))throw Error('Calque protege modifie : '+prior.name);
                if(allowed(prior.name,item.artworkLayer)&&(!next||!same(prior,next))){
                    var b=prior.bounds;rectangles.push([b[0]-2,b[1]-2,b[2]+2,b[3]+2]);
                    if(next){b=next.bounds;rectangles.push([b[0]-2,b[1]-2,b[2]+2,b[3]+2]);}
                }
            }
            if(item.upload)rectangles.push([80,156,817,1077]);
            var psd=job.kind==='regression'?dir+'roundtrip.psd':out+'card.psd';
            K.save(doc,psd,out+'card.png');
            var reopened=ctx.open(psd);png(reopened,out+'reopened.png');
            var report={key:item.key,card:card,before:before,after:after,reopened:job.kind==='regression'?editableState(reopened):fullState(reopened,[],''),rectangles:rectangles,
                photoshop:app.version,resolution:reopened.resolution,width:reopened.width.as('px'),height:reopened.height.as('px')};
            if(job.kind!=='regression'){
                var finalProof=ctx.duplicate(reopened,'Cadre brouillon');fixed(finalProof,item.artworkLayer);png(finalProof,out+'fixed-after.png');
            }
            K.write(out+'native.json',report);
            return {key:item.key,rendered:true};
        });
    }
    try{for(var i=0;i<job.items.length;i++){
        if(new File(dir+'cancel.request').exists)throw Error('Travail annule entre deux cartes.');
        var item=job.items[i];if(!/^[a-z0-9-]+$/.test(item.key)||!/^V4\/templates\/[A-Z0-9_]+\.psd$/.test(item.psd))throw Error('Source interdite.');
        K.write(dir+'progress.json',{index:i,total:job.items.length,name:item.card.name,phase:'photoshop'});
        try{results.push(run(item));}catch(e){results.push({key:item.key,rendered:false,error:e.message,line:e.line});K.write(dir+'native-results.json',results);throw e;}
        K.write(dir+'native-results.json',results);
    }}finally{K.state=fullState;K.find=originalFind;K.need=originalNeed;K.byId=originalById;indices=[];}
    return 'Atelier : '+results.length+' composition(s).';
})();
