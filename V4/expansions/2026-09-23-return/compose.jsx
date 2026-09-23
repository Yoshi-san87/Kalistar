#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'render-request.json'),set=K.read(home+'set.json');
function composeReturn(key){
    if(!/^[a-z][a-z0-9-]+$/.test(key))throw Error('Invalid key');
    var known=false;for(var si=0;si<set.cards.length;si++)if(set.cards[si].key===key)known=true;
    if(!known)throw Error('Card not in set');
    var folder=home+'cards/'+key+'/',render=folder+'render/',plan=K.read(render+'composition.json'),card=K.read(folder+'profile.json');
    return K.lifecycle(function(life){
        var source=life.open(root+plan.textSource);if(!source.saved)throw Error('Reference has unsaved changes');
        var doc=life.track(app.documents.add(897,1497,300,'Kalistar V4 - '+card.name,NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1'));
        doc.activeLayer.name='FOND - noir';var black=new SolidColor();black.rgb.hexValue='000000';
        doc.selection.selectAll();doc.selection.fill(black);doc.selection.deselect();
        function place(spec,visible){
            if(!/^[a-z0-9-]+\.png$/.test(spec.file))throw Error('Invalid component');
            var layer,b;
            if(spec.empty){layer=doc.artLayers.add();layer.name=spec.name;layer.visible=false;return;}
            if(spec.name.indexOf('FACTION - ')===0){
                var image=life.open(render+spec.file);layer=K.transplant(image,image.activeLayer,doc,doc.layers[0],spec.name);layer=K.smart(doc,layer);b=K.bounds(layer);
                if(b[2]-b[0]!==spec.width||b[3]-b[1]!==spec.height)throw Error('Packed flag pixel bounds changed');
            }else{
                layer=E.place(doc,render+spec.file,doc.layers[0],spec.name);b=K.bounds(layer);
                layer.resize(spec.width/(b[2]-b[0])*100,spec.height/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(layer);
            }
            layer.translate(spec.left-b[0],spec.top-b[1]);layer.visible=visible;
        }
        for(var i=0;i<plan.layers.length;i++)place(plan.layers[i],true);
        for(i=0;i<plan.hiddenLayers.length;i++)place(plan.hiddenLayers[i],false);
        doc.saveAs(new File(render+'without-text.png'),new PNGSaveOptions(),true);
        var expected=[];
        function text(name,value,x,y,max,visible,hex){
            var layer=K.transplant(source,K.need(source,name),doc,doc.layers[0],name);layer.visible=true;
            layer.textItem.contents=String(value);KT.apply(layer,name);var ink=K.ink(layer),span=ink[2]-ink[0];
            if(span>max)layer.resize(max/span*100,max/span*100,AnchorPosition.MIDDLECENTER);
            K.text(layer,value,x,y,max+1);
            if(hex){var color=new SolidColor();color.rgb.hexValue=hex;layer.textItem.color=color;}
            layer.visible=visible;
            if(visible)expected.push({name:name,value:String(value),center:[x,y],maxWidth:max});
        }
        text('NOM',card.name,449.5,129.5,470,true);text('TITLE',card.title,448.5,1100,590,true);
        text('JOB',card.job,292,1172.5,170,true,card.color);text('RACE',card.race,599,1172.5,170,true,card.color);
        var desc=K.transplant(source,K.need(source,'DESCRIPTION'),doc,doc.layers[0],'DESCRIPTION');desc.visible=!!card.description;
        if(card.description)E.setDescription(doc,card.description);
        var ys={6:150,5:371.5,4:475.5,3:576.5,2:676.5,1:773.5};
        for(var side=0;side<2;side++)for(var die=6;die>=1;die--){
            var value=(side?card.defense:card.atk)[6-die],numeric=typeof value==='number';
            if(numeric||card.edition==='canonical')text((side?'DEF':'ATK')+' D'+die+' - valeur',numeric?String(value):'0',side?(die===6?756:734):(die===6?142:155.5),ys[die],die===6?104:66,numeric);
        }
        for(i=0;i<(card.edition==='canonical'?5:card.positions.length);i++)text('POSITION SLOT '+(i+1),String(card.positions[i]||1),224+i*58,1020.5,34,i<card.positions.length);
        doc.info.title=card.name+' - '+card.title;doc.info.caption='Kalistar V4 | 2026-09-23-return | '+card.id+' | Native text and embedded objects';
        K.save(doc,folder+'card.psd',folder+'card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
        var reopened=life.open(folder+'card.psd');reopened.saveAs(new File(render+'reopened.png'),new PNGSaveOptions(),true);
        K.write(render+'native.json',{photoshop:app.version,width:reopened.width.as('px'),height:reopened.height.as('px'),resolution:reopened.resolution,expected:expected,layers:K.state(reopened,[],''),components:plan.layers,typography:KT.snapshot(reopened)});
    });
}
for(var i=0;i<request.keys.length;i++){K.write(home+'progress.json',{index:i,total:request.keys.length,key:request.keys[i]});composeReturn(request.keys[i]);}
'Expansion composed';
