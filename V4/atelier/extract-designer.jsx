#target photoshop
#include "../scripts/stable/elements-common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var out = root + 'V4/atelier/designer-assets/';
    function folder(path) { var f = new Folder(out + path); if (!f.exists && !f.create()) throw Error('Cannot create ' + f); }
    folder(''); folder('state'); folder('frame'); folder('elements'); folder('stats'); folder('effects'); folder('position'); folder('banks'); folder('proof');
    var refs = K.read(root + 'V4/atelier/data/references.json');
    var m = {schemaVersion:1,status:'extracting',width:897,height:1497,resolution:300,colorSpace:'sRGB',referenceId:refs.id,
        frame:{},elements:{},stats:{atk:{},def:{}},effects:{atk:{},def:{}},position:{supports:{},numerals:{}},
        weapons:{},races:{},factions:{},textStyles:{},sources:[],warnings:[],
        zOrder:['artwork','frame','stats.atk selected physical or magic','stats.def barrier or effectBackground','effects','position.supports','position.numerals','factions','weapons','races','elements.branch','elements.crystal','native text','barcode']};
    var initialDocs=[];
    for(var di=0;di<app.documents.length;di++){
        var dd=app.documents[di], dp=null;try{dp=dd.fullName.fsName;}catch(ignore){}
        initialDocs.push({name:dd.name,path:dp,saved:dd.saved});
    }
    K.write(out+'state/session-before.json',{documents:initialDocs,photoshop:app.version});
    function progress(stage,key){K.write(out+'progress.json',{stage:stage,key:key,time:new Date().toString()});K.write(out+'manifest.partial.json',m);}
    function png(doc,path){app.activeDocument=doc;doc.saveAs(new File(out+path),new PNGSaveOptions(),true);}
    function hideText(doc){var st=K.state(doc,[],'');for(var i=0;i<st.length;i++)if(st[i].kind==='LayerKind.TEXT'&&st[i].name!=='A T K'&&st[i].name!=='DEF')K.byId(doc,st[i].id).visible=false;}
    function sprite(ctx,doc,layers,path,transform){
        app.activeDocument=doc;
        var target=ctx.track(app.documents.add(897,1497,300,'designer sprite',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
        var copies=[], names=[];
        try{
            for(var i=layers.length-1;i>=0;i--){
                var source=layers[i];if(!source)continue;
                app.activeDocument=doc;var copy=source.duplicate(target,ElementPlacement.PLACEATBEGINNING);
                app.activeDocument=target;K.unclip(target,copy);copy.visible=true;copies.unshift(copy);names.unshift(source.name);
            }
            if(!copies.length)throw Error('Empty sprite '+path);
            // Reconnect native clipped gradient maps to their duplicated base.
            for(i=0;i<copies.length;i++)if(copies[i].kind===LayerKind.GRADIENTMAP)copies[i].grouped=true;
            if(transform)transform(target,copies);
            var b=[897,1497,0,0];
            for(i=0;i<copies.length;i++){var cb=K.bounds(copies[i]);b=[Math.min(b[0],cb[0]),Math.min(b[1],cb[1]),Math.max(b[2],cb[2]),Math.max(b[3],cb[3])];}
            var left=Math.max(0,Math.floor(b[0])-4),top=Math.max(0,Math.floor(b[1])-4),right=Math.min(897,Math.ceil(b[2])+4),bottom=Math.min(1497,Math.ceil(b[3])+4);
            if(right<=left||bottom<=top)throw Error('Empty bounds '+path);
            target.crop([UnitValue(left,'px'),UnitValue(top,'px'),UnitValue(right,'px'),UnitValue(bottom,'px')]);
            png(target,path);
            return {file:path,left:left,top:top,width:right-left,height:bottom-top,sourceLayers:names};
        }finally{target.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=doc;}
    }
    function withAdjustment(doc,name){var l=K.need(doc,name),a=K.find(doc,name+' - reflets prismatiques');if(!a&&name==='BRANCHES RAINBOW - couleur du cristal')a=K.find(doc,'BRANCHES ELECTRO - couleur du cristal - reflets prismatiques');return a?[a,l]:[l];}
    function fixed(doc,entry){
        E.fixed(doc);
        for(var b=0;b<entry.registry.banks.length;b++){
            var bank=entry.registry.banks[b];for(var value in bank.variants)for(var j=0;j<bank.variants[value].length;j++){var l=K.find(doc,bank.variants[value][j]);if(l)l.visible=false;}
        }
        var names=['DEGRADE - cyan violet rose dore','OMBRE CONTACT - barre DEF sur le tissu','ATK D6 - teinte elementaire'];
        for(var n=0;n<names.length;n++){var ll=K.find(doc,names[n]);if(ll)ll.visible=false;}
        var st=K.state(doc,[],'');
        for(var i=0;i<st.length;i++)if(/reflets prismatiques/.test(st[i].name))K.byId(doc,st[i].id).visible=false;
        var plain=K.find(doc,'DEF D4 - fond physique');if(plain)plain.visible=true;
        hideText(doc);
    }
    function artFill(doc,entry,hex){
        app.activeDocument=doc;var art=K.need(doc,entry.artworkLayer),l=doc.artLayers.add();
        l.move(art,ElementPlacement.PLACEBEFORE);l.name='DESIGNER ART MATTE '+hex;
        var b=[80,156,817,1077],c=new SolidColor();c.rgb.hexValue=hex;
        doc.selection.select([[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]]);doc.selection.fill(c);doc.selection.deselect();
        l.grouped=art.grouped;return l;
    }
    function textMetadata(doc,entry){
        var list=[],st=K.state(doc,[],'');
        for(var i=0;i<st.length;i++)if(st[i].kind==='LayerKind.TEXT'){
            var l=K.byId(doc,st[i].id),a=st[i];a.sourcePSD=entry.psd;
            try{a.color=l.textItem.color.rgb.hexValue;a.justification=String(l.textItem.justification);a.position=[l.textItem.position[0].as('px'),l.textItem.position[1].as('px')];a.tracking=l.textItem.tracking;a.leadingPt=l.textItem.leading.as('pt');a.antiAlias=String(l.textItem.antiAliasMethod);}catch(ignore){}
            list.push(a);
        }m.textStyles[entry.key]=list;
    }
    return K.lifecycle(function(ctx){
        try{
            var order=['ruby','rikka'];for(var ri=0;ri<refs.cards.length;ri++)if(refs.cards[ri].key!=='ruby'&&refs.cards[ri].key!=='rikka')order.push(refs.cards[ri].key);
            var donors={};
            for(var oi=0;oi<order.length;oi++){
                var entry=null;for(ri=0;ri<refs.cards.length;ri++)if(refs.cards[ri].key===order[oi])entry=refs.cards[ri];
                progress('open',entry.key);
                var source=ctx.open(root+entry.psd);if(!source.saved)throw Error('Unsaved approved source: '+entry.psd);
                var sourceState=K.state(source,[],'');K.write(out+'state/'+entry.key+'.json',{source:entry.psd,layers:sourceState,resolution:source.resolution});
                if(DESIGNER_MODE==='inspect'){if(oi===0)return 'Ruby complete native state inspected; no source modified.';continue;}
                var doc=ctx.duplicate(source,'Designer extraction '+entry.key);app.activeDocument=doc;
                m.sources.push({key:entry.key,psd:entry.psd,png:entry.png,profile:entry.profile});textMetadata(doc,entry);
                var el=entry.card.element;
                if(!m.elements[el]){
                    progress('element',el);
                    m.elements[el]={sourceCard:entry.key,branch:sprite(ctx,doc,withAdjustment(doc,'BRANCHES '+el+' - couleur du cristal'),'elements/'+el+'-branch.png'),crystal:sprite(ctx,doc,[K.need(doc,'CRISTAL '+el)],'elements/'+el+'-crystal.png')};
                    m.stats.atk[el]={};
                    for(var die=1;die<=6;die++){
                        var pre='ATK D'+die+' - ',gold=withAdjustment(doc,pre+'OR GENERE - objet dynamique partage'),halo=K.need(doc,pre+'HALO MAGIQUE');
                        var physical=sprite(ctx,doc,gold,'stats/'+el+'-atk-'+die+'-physical.png');
                        var hs=el==='NONE'?null:sprite(ctx,doc,[halo],'stats/'+el+'-atk-'+die+'-halo.png');
                        var magic=el==='NONE'?null:sprite(ctx,doc,[halo].concat(el==='MINERO'?[]:gold),'stats/'+el+'-atk-'+die+'-magic.png');
                        m.stats.atk[el][die]={physical:physical,halo:hs,magic:magic};
                    }
                }
                var fields={weapon:'weapons',race:'races',faction:'factions'};
                for(var field in fields){
                    var collection=m[fields[field]],value=entry.card[field];if(collection[value])continue;
                    var bank=null;for(var bi=0;bi<entry.registry.banks.length;bi++)if(entry.registry.banks[bi].field===field)bank=entry.registry.banks[bi];
                    if(!bank||!bank.variants[value])continue;
                    var wanted={},ns=bank.variants[value];for(var ni=0;ni<ns.length;ni++)wanted[ns[ni]]=true;
                    if(field==='weapon'&&K.find(doc,'ARME - EMAIL'))wanted['ARME - EMAIL']=true;
                    if(field==='race'&&K.find(doc,'RACE - EMAIL'))wanted['RACE - EMAIL']=true;
                    if(field==='faction'){
                        if(K.find(doc,'OMBRE - CONTENU'))wanted['OMBRE - CONTENU']=true;
                        wanted['OMBRE CONTACT - barre DEF sur le tissu']=true;
                    }
                    var layers=[];for(var si=0;si<sourceState.length;si++)if(wanted[sourceState[si].name])layers.push(K.byId(doc,sourceState[si].id));
                    var slug=value.replace(/[^a-zA-Z0-9_-]/g,'_');collection[value]=sprite(ctx,doc,layers,'banks/'+field+'-'+slug+'.png');collection[value].sourceCard=entry.key;
                }
                for(si=0;si<sourceState.length;si++){
                    var match=/^(ATK|DEF) D([1-6]) - effet (.+)$/.exec(sourceState[si].name);
                    if(match){var id=match[3],side=match[1].toLowerCase();
                        if(!donors[side+'-'+id]||entry.key==='rikka'||id==='death')donors[side+'-'+id]={entry:entry.key,psd:entry.psd,layer:sourceState[si].name,die:Number(match[2]),bounds:sourceState[si].bounds};
                    }
                }
                if(entry.key==='ruby'||entry.key==='rikka'){
                    var family=entry.key==='ruby'?'default':'electro';
                    if(entry.key==='ruby'){
                        for(die=1;die<=6;die++){
                            var barrier=K.need(doc,'DEF D'+die+' - BARRIERE'),plainLayer;
                            if(die===6)plainLayer=K.need(doc,'Ellipse 1 copie');
                            else if(die===4)plainLayer=K.need(doc,'DEF D4 - fond physique');
                            else{var parent=K.need(doc,'DEF D'+die+' - valeur').parent;plainLayer=null;for(var pi=0;pi<parent.layers.length;pi++)if(/^FEU/.test(parent.layers[pi].name)){plainLayer=parent.layers[pi];break;}}
                            m.stats.def[die]={plain:plainLayer?sprite(ctx,doc,[plainLayer],'stats/def-'+die+'-plain.png'):null,plainAlreadyInFrame:true,barrier:sprite(ctx,doc,[barrier],'stats/def-'+die+'-barrier.png')};
                            var ef=K.find(doc,'DEF D'+die+' - fond effet');if(ef)m.stats.def[die].effectBackground=sprite(ctx,doc,[ef],'stats/def-'+die+'-effect-background.png');
                        }
                        var pl=entry.registry.positionLayout;m.position.layout=pl;
                        for(var slot=1;slot<=5;slot++){
                            m.position.supports[slot]=sprite(ctx,doc,[K.need(doc,'SUPPORT SLOT '+slot)],'position/support-'+slot+'.png');m.position.numerals[slot]={};
                            for(var numeral=1;numeral<=5;numeral++){
                                var textLayer=K.need(doc,'POSITION SLOT '+slot);K.text(textLayer,numeral,pl.textX+(slot-1)*pl.step,pl.textY,pl.maxTextWidth);
                                m.position.numerals[slot][numeral]=sprite(ctx,doc,[textLayer],'position/numeral-'+slot+'-'+numeral+'.png');
                            }
                        }
                    }
                    var proof=ctx.duplicate(source,'Native proof '+entry.key);hideText(proof);png(proof,'proof/'+entry.key+'-no-text.png');proof.close(SaveOptions.DONOTSAVECHANGES);
                    app.activeDocument=doc;
                    m.elements[el].proofArt=sprite(ctx,doc,[K.need(doc,entry.artworkLayer)],'proof/'+entry.key+'-art.png');
                    fixed(doc,entry);var fill=artFill(doc,entry,'000000');png(doc,'frame/'+family+'-black.png');fill.remove();
                    fill=artFill(doc,entry,'FFFFFF');png(doc,'frame/'+family+'-white.png');fill.remove();
                    var frame={file:'frame/'+family+'.png',left:0,top:0,width:897,height:1497,black:'frame/'+family+'-black.png',white:'frame/'+family+'-white.png',sourceCard:entry.key,artRectangle:[80,156,817,1077],circlesInFrame:true};
                    if(family==='default')m.frame=frame;else m.frame.electro=frame;
                }
                doc.close(SaveOptions.DONOTSAVECHANGES);
                var wasOpen=false;for(var ii=0;ii<initialDocs.length;ii++)if(initialDocs[ii].path===source.fullName.fsName)wasOpen=true;
                if(!wasOpen)source.close(SaveOptions.DONOTSAVECHANGES);
                progress('card-complete',entry.key);
            }
            K.write(out+'effect-donors.json',donors);
            m.status='components-extracted';K.write(out+'manifest.raw.json',m);progress('components-complete','all');
            return 'Native components extracted; source documents preserved.';
        }catch(e){K.write(out+'error.json',{message:String(e),line:e.line,stack:$.stack});throw e;}
    });
})();
