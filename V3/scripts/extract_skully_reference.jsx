#target photoshop
(function(){
 var root='C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/V3/';
 var source=app.open(new File(root+'sources/template-source.psd')),layer=null;
 function find(p){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.id==873)layer=l;if(l.typename=='LayerSet')find(l);}}
 find(source);if(!layer)throw new Error('Original pirate layer not found');
 var duplicate=source.duplicate('Skully reference extraction'),copy=null;
 function keep(p){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];l.visible=l.id==873||l.typename=='LayerSet';if(l.id==873)copy=l;if(l.typename=='LayerSet')keep(l);}}
 keep(duplicate);if(!copy)throw new Error('Duplicated pirate layer absent');
 try{
  copy.grouped=false;copy.move(duplicate.layers[0],ElementPlacement.PLACEBEFORE);
  var bounds=copy.bounds,w=bounds[2].as('px')-bounds[0].as('px'),h=bounds[3].as('px')-bounds[1].as('px');
  duplicate.resizeCanvas(UnitValue(w,'px'),UnitValue(h,'px'),AnchorPosition.TOPLEFT);
  bounds=copy.bounds;copy.translate(-bounds[0].as('px'),-bounds[1].as('px'));
  duplicate.changeMode(ChangeMode.RGB);duplicate.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,true);
  duplicate.saveAs(new File(root+'sources/skully-original-psd.png'),new PNGSaveOptions(),true);
 }finally{duplicate.close(SaveOptions.DONOTSAVECHANGES);}
 return 'Extracted original PSD illustration without editing source';
})();
