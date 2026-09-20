// Native Photoshop layers; print coordinates remain unchanged.
function kalistarVersionBand(doc, title, parent) {
 function color(hex) {var c=new SolidColor();c.rgb.hexValue=hex;return c;}
 function shape(name, points, hex) {
  var l=doc.artLayers.add();l.name=name;
  doc.selection.select(points,SelectionType.REPLACE,0,true);doc.selection.fill(color(hex));doc.selection.deselect();
  l.move(parent,ElementPlacement.INSIDE);return l;
 }
 function disc(name,x,y,r,hex) {
  var d=new ActionDescriptor(),ref=new ActionReference(),b=new ActionDescriptor();
  ref.putProperty(charIDToTypeID('Chnl'),charIDToTypeID('fsel'));d.putReference(charIDToTypeID('null'),ref);
  b.putUnitDouble(charIDToTypeID('Top '),charIDToTypeID('#Pxl'),y-r);b.putUnitDouble(charIDToTypeID('Left'),charIDToTypeID('#Pxl'),x-r);
  b.putUnitDouble(charIDToTypeID('Btom'),charIDToTypeID('#Pxl'),y+r);b.putUnitDouble(charIDToTypeID('Rght'),charIDToTypeID('#Pxl'),x+r);
  d.putObject(charIDToTypeID('T   '),charIDToTypeID('Elps'),b);executeAction(charIDToTypeID('setd'),d,DialogModes.NO);
  var l=doc.artLayers.add();l.name=name;doc.selection.fill(color(hex));doc.selection.deselect();l.move(parent,ElementPlacement.INSIDE);
 }
 shape('VERSION - raccord aux montants',[[83,1068],[813,1068],[813,1138],[83,1138]],'0A1721');
 shape('VERSION - cuivre ombre',[[86,1069],[810,1069],[810,1107],[789,1128],[107,1128],[86,1107]],'725458');
 shape('VERSION - filet lumiere',[[90,1072],[806,1072],[806,1106],[787,1124],[109,1124],[90,1106]],'D3B9A9');
 shape('VERSION - contre-filet',[[93,1075],[803,1075],[803,1104],[785,1121],[111,1121],[93,1104]],'433E49');
 shape('VERSION - email',[[96,1078],[800,1078],[800,1102],[783,1118],[113,1118],[96,1102]],'0C2332');
 shape('VERSION - reflet superieur',[[104,1080],[792,1080],[792,1082],[104,1082]],'4A6670');
 // Independent round sockets no longer share the title's stepped outline.
 for(var i=0;i<2;i++) {
  var x=i?756:141,prefix=i?'RACE':'ARME';
  disc(prefix+' - joint',x,1155,49,'101722');
  disc(prefix+' - cuivre',x,1155,45,'AF8580');
  disc(prefix+' - filet',x,1155,42,'E4CABC');
  disc(prefix+' - ombre',x,1155,39,'544B59');
  disc(prefix+' - email',x,1155,36,'0A2033');
 }
 var l=doc.artLayers.add();l.kind=LayerKind.TEXT;l.name='TITRE DE VERSION';
 var t=l.textItem;t.font='Augustus';t.size=UnitValue(5.4,'pt');t.contents=title;t.justification=Justification.CENTER;
 t.position=[UnitValue(448.5,'px'),UnitValue(1104,'px')];t.color=color('F3E7D8');
 for(var n=0;n<30&&l.bounds[2].as('px')-l.bounds[0].as('px')>548;n++)t.size=UnitValue(t.size.as('pt')*.96,'pt');
 var b=l.bounds;l.translate(448.5-(b[0].as('px')+b[2].as('px'))/2,1099-(b[1].as('px')+b[3].as('px'))/2);
 l.move(parent,ElementPlacement.INSIDE);return l;
}
