#target photoshop
(function(){
var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/',out=root+'master/verification/';
var previous=app.documents.length?app.activeDocument:null,units=app.preferences.rulerUnits,dialogs=app.displayDialogs,source=null,doc=null;
app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;
function find(p,name){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.name===name)return l;if(l.typename==='LayerSet'){var f=find(l,name);if(f)return f;}}return null;}
function clone(){doc=source.duplicate('KALISTAR - controle temporaire');return doc;}
function exportPng(name){doc.saveAs(new File(out+name+'.png'),new PNGSaveOptions(),true);doc.close(SaveOptions.DONOTSAVECHANGES);doc=null;}
try{
source=app.open(new File(root+'templates/KALISTAR_MASTER_V4.psd'));
clone();exportPng('test-identique');
clone();var l=find(find(doc,'ATK D6'),'VALEUR');l.textItem.contents='203';var b=l.bounds;l.translate(106-(b[0].as('px')+b[2].as('px'))/2,117-(b[1].as('px')+b[3].as('px'))/2);exportPng('test-valeur-203');
clone();l=find(doc,'ILLUSTRATION - canevas 950 x 1655');doc.activeLayer=l;var a=new ActionDescriptor();a.putPath(charIDToTypeID('null'),new File(out+'art-registration.png'));executeAction(stringIDToTypeID('placedLayerReplaceContents'),a,DialogModes.NO);exportPng('test-illustration');
clone();var g=find(doc,'50 POSITIONS - cinq emplacements fixes');for(var i=0;i<5;i++){var s=find(g,'SLOT '+(i+1));s.visible=true;var t=find(s,'POSITION');t.textItem.contents=String(i+1);var b=t.bounds;t.translate(189+i*73-(b[0].as('px')+b[2].as('px'))/2,1159-(b[1].as('px')+b[3].as('px'))/2);}exportPng('test-cinq-positions');
clone();var stats=find(doc,'30 ATK ET DEF - un seul etat visible par capsule');for(var i=0;i<stats.layers.length;i++){var s=stats.layers[i];for(var j=0;j<s.layers.length;j++){var l=s.layers[j];if(l.name.indexOf('ETAT ')===0)l.visible=l.name==='ETAT physical';if(l.name==='VALEUR'){l.visible=true;l.textItem.contents='100';}}}exportPng('test-tout-physique');
source.close(SaveOptions.DONOTSAVECHANGES);source=null;return 'Cinq tests du PSD exportes.';
}finally{if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);if(source)source.close(SaveOptions.DONOTSAVECHANGES);app.preferences.rulerUnits=units;app.displayDialogs=dialogs;if(previous)try{app.activeDocument=previous;}catch(e){}}
})();
