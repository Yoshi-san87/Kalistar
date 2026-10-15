#target photoshop
(function(){
 var R='C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/V2/';
 app.displayDialogs=DialogModes.NO;app.preferences.rulerUnits=Units.PIXELS;
 var f=new File(R+'donnees/cartes.json');f.encoding='UTF8';f.open('r');var cards=eval('('+f.read()+')');f.close();
 for(var i=0;i<cards.length;i++){
  var c=cards[i],doc=app.open(new File(R+'templates/'+c.slug+'.psd')),list=[];
  function walk(p){for(var j=0;j<p.layers.length;j++){list.push(p.layers[j]);if(p.layers[j].typename=='LayerSet')walk(p.layers[j]);}}
  walk(doc);
  function find(name){for(var j=0;j<list.length;j++)if(list[j].name==name)return list[j];return null;}
  if(c.reference){
   var art=find('ILLUSTRATION - remplacer le contenu');doc.activeLayer=art;
   doc.selection.select([[80,160],[817,160],[817,1073],[80,1073]]);
   var d=new ActionDescriptor(),r=new ActionReference();
   d.putClass(charIDToTypeID('Nw  '),charIDToTypeID('Chnl'));r.putEnumerated(charIDToTypeID('Chnl'),charIDToTypeID('Chnl'),charIDToTypeID('Msk '));
   d.putReference(charIDToTypeID('At  '),r);d.putEnumerated(charIDToTypeID('Usng'),charIDToTypeID('UsrM'),charIDToTypeID('RvlS'));executeAction(charIDToTypeID('Mk  '),d,DialogModes.NO);doc.selection.deselect();
   art.name='ILLUSTRATION - JPG source masque; remplacer le contenu';
  }
  var ys=[167,384,488,589,689,786];
  for(var side=0;side<2;side++)for(var j=0;j<6;j++){
   var name=(side?'DEF':'ATK')+' D'+(6-j)+' - valeur';
   if(find(name))continue;
   var layer=doc.artLayers.add();layer.kind=LayerKind.TEXT;layer.name=name;
   var t=layer.textItem;t.font='Crystal';t.size=UnitValue(j==0?14:10,'pt');t.contents='100';t.justification=Justification.CENTER;
   t.position=[UnitValue(side?(j==0?756:734):(j==0?142:156),'px'),UnitValue(ys[j],'px')];
   var white=new SolidColor();white.rgb.hexValue='FFFFFF';t.color=white;layer.visible=false;
  }
  doc.layerComps.add('AVEC CRISTAL','Etat elementaire de la carte',true,true,true);
  var hidden=[];
  for(var j=0;j<list.length;j++){
   var l=list[j];
   if(l.visible&&(l.name=='02 ELEMENT - cristal et accents'||l.name=='AVANTAGE ELEMENTAIRE'||l.name=='FAIBLESSE ELEMENTAIRE'||l.name.indexOf('HALO MAGIQUE')>=0)){hidden.push(l);l.visible=false;}
  }
  var state=find('ETAT SANS CRISTAL - voir guide');state.visible=true;
  doc.layerComps.add('SANS CRISTAL','Neutralite elementaire; halos elementaires masques',true,true,true);
  if(c.name=='MOMO'){var flat=doc.duplicate('SANS_CRISTAL_APERCU',true);flat.changeMode(ChangeMode.RGB);flat.saveAs(new File(R+'verification/MASTER_SANS_CRISTAL.png'),new PNGSaveOptions(),true);flat.close(SaveOptions.DONOTSAVECHANGES);}
  state.visible=false;for(var j=0;j<hidden.length;j++)hidden[j].visible=true;
  doc.save();doc.close(SaveOptions.DONOTSAVECHANGES);
 }
 new File(R+'templates/01_ELECTRO_MOMO.psd').copy(R+'templates/KALISTAR_MASTER_V2.psd');
 return '12 templates: numeric alternatives and no-crystal layer comps ready';
})();

