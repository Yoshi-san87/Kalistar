#include "common.jsx"
#include "registered.jsx"
var E = (function () {
    function place(doc, file, before, name) {
        app.activeDocument = doc; doc.activeLayer = before;
        var d = new ActionDescriptor(); d.putPath(K.c('null'), new File(file));
        executeAction(K.c('Plc '), d, DialogModes.NO);
        var l = doc.activeLayer; l.move(before, ElementPlacement.PLACEBEFORE); l.name = name;
        return l;
    }
    function fit(l, w, h, x, y, cover) {
        var b = K.bounds(l), sx = w / (b[2] - b[0]), sy = h / (b[3] - b[1]);
        var scale = (cover ? Math.max(sx, sy) : Math.min(sx, sy)) * 100;
        l.resize(scale, scale, AnchorPosition.MIDDLECENTER); K.center(l, x, y); return l;
    }
    function hue(doc, layer, palette) {
        app.activeDocument = doc; doc.activeLayer = layer;
        if(palette.spectrum){
            var map=new ActionDescriptor(),grad=new ActionDescriptor(),colors=new ActionList(),transparency=new ActionList();
            grad.putString(K.c('Nm  '),'Kalistar - reflets prismatiques');
            grad.putEnumerated(K.c('GrdF'),K.c('GrdF'),K.c('CstS'));grad.putDouble(K.c('Intr'),4096);
            for(var i=0;i<palette.spectrum.length;i++){
                var item=palette.spectrum[i],rgb=new SolidColor();rgb.rgb.hexValue=item[1];
                var color=new ActionDescriptor(),stop=new ActionDescriptor();
                color.putDouble(K.c('Rd  '),rgb.rgb.red);color.putDouble(K.c('Grn '),rgb.rgb.green);color.putDouble(K.c('Bl  '),rgb.rgb.blue);
                stop.putObject(K.c('Clr '),K.c('RGBC'),color);stop.putEnumerated(K.c('Type'),K.c('Clry'),K.c('UsrS'));
                stop.putInteger(K.c('Lctn'),item[0]);stop.putInteger(K.c('Mdpn'),50);colors.putObject(K.c('Clrt'),stop);
            }
            for(i=0;i<2;i++){var alpha=new ActionDescriptor();alpha.putUnitDouble(K.c('Opct'),K.c('#Prc'),100);alpha.putInteger(K.c('Lctn'),i*4096);alpha.putInteger(K.c('Mdpn'),50);transparency.putObject(K.c('TrnS'),alpha);}
            grad.putList(K.c('Clrs'),colors);grad.putList(K.c('Trns'),transparency);map.putObject(K.c('Grad'),K.c('Grdn'),grad);
            // Photoshop re-seeds dither when reopening; keep the native map deterministic.
            map.putBoolean(K.c('Dthr'),false);map.putBoolean(K.c('Rvrs'),false);
            var make=new ActionDescriptor(),reference=new ActionReference(),using=new ActionDescriptor();
            reference.putClass(K.s('adjustmentLayer'));make.putReference(K.c('null'),reference);
            using.putObject(K.c('Type'),K.s('gradientMapClass'),map);make.putObject(K.c('Usng'),K.s('adjustmentLayer'),using);
            executeAction(K.c('Mk  '),make,DialogModes.NO);
            var adjustment=doc.activeLayer;adjustment.name=layer.name+' - reflets prismatiques';adjustment.grouped=true;return;
        }
        var d = new ActionDescriptor(), a = new ActionDescriptor(), list = new ActionList();
        d.putBoolean(K.c('Clrz'), true); a.putInteger(K.c('H   '), palette.hue);
        a.putInteger(K.c('Strt'), palette.saturation); a.putInteger(K.c('Lght'), palette.lightness);
        list.putObject(K.c('Hst2'), a); d.putList(K.c('Adjs'), list);
        executeAction(K.c('HStr'), d, DialogModes.NO);
    }
    function restoreClipping(doc) {
        app.activeDocument = doc;
        var frame = K.need(doc, '06 CADRE FIXE ET ILLUSTRATION'), visibility = [], i;
        for (i = 0; i < frame.layers.length; i++) visibility.push(frame.layers[i].visible);
        for (i = frame.layers.length - 1; i >= 0; i--) {
            var l = frame.layers[i];
            if (l.typename === 'ArtLayer' && l.id !== 17 && l.id !== 11 && !l.grouped) l.grouped = true;
        }
        for (i = 0; i < frame.layers.length; i++) frame.layers[i].visible = visibility[i];
    }
    function removeBanks(doc, registry, keep) {
        for (var i = 0; i < registry.banks.length; i++) {
            var bank = registry.banks[i];
            for (var value in bank.variants) for (var j = 0; j < bank.variants[value].length; j++) {
                var name = bank.variants[value][j], l = K.find(doc, name);
                if (l && !keep[name]) l.remove();
            }
        }
    }
    function prepareMaster(doc, registry) {
        var keep = {'ART - MOMO':true, 'ID CODE128 - 30000001':true, 'ARME Instrument':true, 'ARME Poing - email interieur':true, 'RACE ROBOT':true, 'FACTION - Chroma - tissu source agrandi':true, 'OMBRE - detachement du tissu':true};
        removeBanks(doc, registry, keep);
        K.need(doc,'ART - MOMO').name = 'ART - CONTENU';
        K.need(doc,'ID CODE128 - 30000001').name = 'ID CODE128 - CONTENU';
        K.need(doc,'ARME Instrument').name = 'ARME - CONTENU';
        K.need(doc,'RACE ROBOT').name = 'RACE - CONTENU';
        K.need(doc,'FACTION - Chroma - tissu source agrandi').name = 'FACTION - CONTENU';
        K.need(doc,'OMBRE - detachement du tissu').name = 'OMBRE - CONTENU';
        K.need(doc,'ARME Poing - email interieur').name = 'ARME - EMAIL';
        K.need(doc,'ARME - EMAIL').visible = false;
        restoreClipping(doc);
        doc.info.title = 'KALISTAR V4 - TEMPLATE 04 MULTI-ELEMENTS';
        doc.info.caption = 'Geometrie Electro 03F preservee. Contenus lies par registry-elements-04.json; textes natifs, objets dynamiques et effets separes. 897 x 1497 px, 300 ppp, sRGB.';
    }
    function fixed(doc) {
        app.activeDocument=doc;
        var states=K.state(doc,[],'');
        for(var i=0;i<states.length;i++){
            var name=states[i].name;
            if(/^(ART - CONTENU|ID CODE128 - CONTENU|ARME - CONTENU|RACE - CONTENU|ARME - EMAIL|RACE - EMAIL|FACTION - CONTENU|OMBRE - CONTENU|NOM|TITLE|JOB|RACE|DESCRIPTION)$/.test(name) ||
               /^CRISTAL [A-Z]+$/.test(name) || /^BRANCHES /.test(name) ||
               /^(ATK|DEF) D[1-6] - (valeur|effet |HALO MAGIQUE|BARRIERE|OR GENERE|fond effet|fond physique)/.test(name) ||
               /^(POSITION SLOT|SUPPORT SLOT) /.test(name)) K.byId(doc,states[i].id).visible=false;
        }
    }
    function balanceDescription(doc) {
        var l=K.need(doc,'DESCRIPTION'),original=l.textItem.contents,lines=original.split('\r');
        function width(text){l.textItem.contents=text;var b=K.ink(l);return b[2]-b[0];}
        if(lines.length>1){
            var last=lines.length-1,previous=lines[last-1].split(' ');
            while(previous.length>2&&width(lines[last])<230){
                var candidate=previous[previous.length-1]+' '+lines[last];
                if(width(candidate)>574)break;
                previous.pop();lines[last-1]=previous.join(' ');lines[last]=candidate;
            }
        }
        K.text(l,lines.join('\r'),448.5,1318.5,574);
        var bounds=K.ink(l);if(bounds[1]<1251||bounds[3]>1387)throw Error('Recit hors cadre apres equilibrage.');
        return original!==l.textItem.contents;
    }
    function setDescription(doc,value) {
        var l=K.need(doc,'DESCRIPTION'),words=value.split(/\s+/),lines=[],line='';
        for(var i=0;i<words.length;i++){
            var next=line?line+' '+words[i]:words[i];l.textItem.contents=next;var b=K.ink(l);
            // Four pixels absorb Photoshop's multiline ink-bound rounding.
            if(b[2]-b[0]>570&&line){lines.push(line);line=words[i];}else line=next;
        }
        if(line)lines.push(line);if(lines.length>5)throw Error('Recit trop long.');
        K.text(l,lines.join('\r'),448.5,1318.5,574);
        balanceDescription(doc);
    }
    function bind(doc, donor, card, manifest, baseRegistry, root) {
        app.activeDocument = doc;
        var iconLayouts=K.read(root+'V4/template-stable/icon-layouts.json');
        if(card.element==='NONE'&&(card.magic.length||card.barriers.length))throw Error('Sans cristal : magie et barrieres interdites.');
        var before = K.state(doc, [], ''), report = {before:before, replacements:[], card:card, rendererRevision:'elements-01b-native-label-transform',textLayoutRevision:2};
        var registry = {schemaVersion:4, elements:[card.element], banks:[], positionLayout:baseRegistry.positionLayout, effectSupports:baseRegistry.effectSupports, effectLayouts:baseRegistry.effectLayouts.slice()};
        function swap(name, layer, field, value) {
            var old = K.need(doc, name); layer.visible = true; old.remove(); layer.name = name;
            if (field) {var variants={}; variants[value]=[name]; registry.banks.push({field:field, variants:variants});}
            report.replacements.push(name); return layer;
        }
        var old = K.need(doc,'ART - CONTENU'), art;
        if (card.artworkUnchanged) {
            art = K.transplant(donor, K.need(donor,'ILLUSTRATION - remplacer le contenu'), doc, old, 'ART - NOUVELLE');
            art = K.smart(doc, art);
        } else {
            art = place(doc,root+card.artworkSource,old,'ART - NOUVELLE');
            fit(art,737,921,448.5,616.5,true);
        }
        swap('ART - CONTENU',art,'artwork',card.artwork);
        var barcode = K.transplant(donor,K.need(donor,'ID CODE128 - '+card.id),doc,K.need(doc,'ID CODE128 - CONTENU'),'ID - NOUVEAU');
        swap('ID CODE128 - CONTENU',K.smart(doc,barcode),'id',card.id);
        var weapon = K.transplant(donor,K.need(donor,'ARME - '+card.weapon),doc,K.need(doc,'ARME - CONTENU'),'ARME - NOUVELLE');
        weapon=K.smart(doc,weapon); K.center(weapon,137,1163.5);
        if(iconLayouts.weapon[card.weapon])K.optical(weapon,iconLayouts.weapon[card.weapon]);
        swap('ARME - CONTENU',weapon,'weapon',card.weapon);
        var weaponBase=K.need(doc,'ARME - EMAIL');weaponBase.move(weapon,ElementPlacement.PLACEAFTER);weaponBase.visible=true;
        var race = K.transplant(donor,K.need(donor,'PICTOGRAMME RACE - '+card.race),doc,K.need(doc,'RACE - CONTENU'),'RACE - NOUVELLE');
        race=K.smart(doc,race);fit(race,87,87,759,1163.5,false);
        if(iconLayouts.race[card.race])K.optical(race,iconLayouts.race[card.race]);
        swap('RACE - CONTENU',race,'race',card.race);
        var raceBase=K.need(doc,'ARME - EMAIL').duplicate(race,ElementPlacement.PLACEAFTER);
        raceBase.name='RACE - EMAIL';K.center(raceBase,759,1163.5);raceBase.visible=true;
        var cloth=place(doc,root+manifest.flags[card.faction].output,K.need(doc,'FACTION - CONTENU'),'TISSU - NOUVEAU');
        fit(cloth,98,228,720,938,false); var cb=K.bounds(cloth);cloth.translate(0,824-cb[1]);
        swap('FACTION - CONTENU',cloth,'faction',card.faction);
        var shadow=cloth.duplicate(cloth,ElementPlacement.PLACEAFTER);shadow.name='OMBRE - NOUVELLE';
        doc.activeLayer=shadow;shadow.rasterize(RasterizeType.ENTIRELAYER);shadow.transparentPixelsLocked=false;
        shadow.adjustLevels(0,255,1,0,0);shadow.applyGaussianBlur(2);shadow.opacity=55;shadow.translate(2,3);
        swap('OMBRE - CONTENU',shadow);
        K.need(doc,'OMBRE CONTACT - barre DEF sur le tissu').visible=true;

        var crystal=place(doc,root+'V3/assets/cristaux/'+card.element+'.png',K.need(doc,'CRISTAL ELECTRO'),'CRISTAL - NOUVEAU');
        var crystalBox=manifest.crystalBoxes&&manifest.crystalBoxes[card.element];
        if(crystalBox){
            // A just-placed object's first bounds can include transparent canvas margins.
            // Re-measure its rendered ink before accepting the shared hexagon envelope.
            for(var ci=0;ci<3;ci++){
                var crystalBounds=K.bounds(crystal),cw=crystalBounds[2]-crystalBounds[0],ch=crystalBounds[3]-crystalBounds[1];
                if(Math.abs(cw-crystalBox.width)<=1&&Math.abs(ch-crystalBox.height)<=1)break;
                crystal.resize(crystalBox.width/cw*100,crystalBox.height/ch*100,AnchorPosition.MIDDLECENTER);
            }
            crystalBounds=K.bounds(crystal);
            if(Math.abs(crystalBounds[2]-crystalBounds[0]-crystalBox.width)>1||Math.abs(crystalBounds[3]-crystalBounds[1]-crystalBox.height)>1)throw Error('Enveloppe du cristal non calibree.');
            K.center(crystal,447.5,1195);
        }
        else fit(crystal,129,144,447.5,1195,false);
        swap('CRISTAL ELECTRO',crystal);crystal.name='CRISTAL '+card.element;
        var palette=manifest.palette[card.element],branch=K.need(doc,'BRANCHES ELECTRO - couleur du cristal');
        hue(doc,branch,(manifest.branchPalette&&manifest.branchPalette[card.element])||palette);branch.name='BRANCHES '+card.element+' - couleur du cristal';
        var color = new SolidColor();color.rgb.hexValue=card.color;
        K.need(doc,'JOB').textItem.color=color;K.need(doc,'RACE').textItem.color=color;
        var ys={6:147,5:372.5,4:476.5,3:577.5,2:677.5,1:774.5};
        for(var die=6;die>=1;die--){
            var gold=K.need(doc,'ATK D'+die+' - OR GENERE - objet dynamique partage');
            hue(doc,gold,palette);
            var halo=K.need(doc,'ATK D'+die+' - HALO MAGIQUE');
            var cx=die===6?142:156,cy=ys[die],b;
            if(card.element==='NONE'){
                var blank=doc.artLayers.add();blank.move(halo,ElementPlacement.PLACEBEFORE);halo.remove();blank.name='ATK D'+die+' - HALO MAGIQUE';blank.visible=false;
            }else{
            var replacement=place(doc,root+'V3/assets/effets/'+card.element+'.png',halo,'HALO - NOUVEAU');
            var metric=manifest.geometry.halos[card.element];
            var diameter=die===6?129:93,radius=diameter/2-4;
            var size=card.element==='MINERO'?diameter+12:radius/metric.r;
            b=K.bounds(replacement);replacement.resize(size/(b[2]-b[0])*100,size*metric.aspect/(b[3]-b[1])*100,AnchorPosition.MIDDLECENTER);
            b=K.bounds(replacement);replacement.translate(cx-metric.cx*size-b[0],cy-metric.cy*size*metric.aspect-b[1]);
            halo.remove();replacement.name='ATK D'+die+' - HALO MAGIQUE';replacement.visible=false;
            }
            var value=card.atk[6-die];
            if(typeof value!=='number' && !K.find(doc,'ATK D'+die+' - effet '+value)){
                var icon=K.transplant(donor,K.need(donor,'ATK D'+die+' - effet '+value),doc,K.need(doc,'ATK D'+die+' - valeur'),'ATK D'+die+' - effet '+value);
                icon=K.smart(doc,icon);fit(icon,die===6?88:58,die===6?88:55,die===6?142:157,cy,false);icon.visible=false;
            }
        }
        // Text stays editable; only long labels shrink to fit the existing fixed space.
        var layouts=manifest.effectLayouts||[];
        for(var li=0;li<layouts.length;li++)if(K.find(doc,layouts[li].layer))registry.effectLayouts.push(layouts[li]);
        var labels=[['NOM',card.name,449.5,129.5,470],['TITLE',card.title,448.5,1100,590],['JOB',card.job,292,1172.5,170],['RACE',card.race,599,1172.5,170]];
        for(var i=0;i<labels.length;i++){
            var a=labels[i],l=K.need(doc,a[0]);l.textItem.contents=a[1];
            b=K.ink(l);
            if(b[2]-b[0]>a[4]){
                var textScale=(a[4]-1)/(b[2]-b[0])*100;
                l.resize(textScale,textScale,AnchorPosition.MIDDLECENTER);
            }
            b=K.ink(l);if(b[2]-b[0]>a[4]+1)throw Error('Libelle hors cadre : '+a[0]);
            K.center(l,a[2],a[3]);
        }
        restoreClipping(doc);
        setDescription(doc,card.description);
        var render=renderRegistered(doc,card,registry);
        // MINERO magic is a solid mineral face, not a coloured ring over a copper circle.
        if(card.element==='MINERO')for(die=6;die>=1;die--){
            var magical=false;for(var mi=0;mi<card.magic.length;mi++)if(card.magic[mi]===die)magical=true;
            if(!magical)continue;
            if(typeof card.atk[6-die]!=='number')continue;
            K.need(doc,'ATK D'+die+' - OR GENERE - objet dynamique partage').visible=false;
        }
        doc.info.caption='Kalistar V4 | Template 04 multi-elements | '+card.id+' | Statistiques V3 preservees | 897 x 1497 px, 300 ppp, sRGB.';
        report.registry=registry;report.render=render;report.after=K.state(doc,[], '');return report;
    }
    return {prepareMaster:prepareMaster,bind:bind,fit:fit,place:place,fixed:fixed,balanceDescription:balanceDescription,setDescription:setDescription,colorize:hue};
})();
