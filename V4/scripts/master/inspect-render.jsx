#target photoshop
(function(){
  var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
  var previous=app.documents.length?app.activeDocument:null,units=app.preferences.rulerUnits,dialogs=app.displayDialogs;
  var doc=null,opened=false;
  function read(p){var f=new File(p);f.encoding='UTF8';f.open('r');var s=f.read();f.close();return eval('('+s+')');}
  function json(v){if(v===null)return 'null';if(typeof v==='string')return '"'+v.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n')+'"';if(typeof v!=='object')return String(v);var a=[];if(v instanceof Array){for(var i=0;i<v.length;i++)a.push(json(v[i]));return '['+a.join(',')+']';}for(var k in v)a.push(json(k)+':'+json(v[k]));return '{'+a.join(',')+'}';}
  function find(p,name){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.name===name)return l;if(l.typename==='LayerSet'){var f=find(l,name);if(f)return f;}}return null;}
  function bounds(l){var b=l.bounds;return[b[0].as('px'),b[1].as('px'),b[2].as('px'),b[3].as('px')];}
  function transform(l){var r=new ActionReference();r.putIdentifier(stringIDToTypeID('layer'),l.id);var t=executeActionGet(r).getObjectValue(stringIDToTypeID('smartObjectMore')).getList(stringIDToTypeID('transform'));var a=[];for(var i=0;i<t.count;i++)a.push(t.getDouble(i));return a;}
  var job=read(root+'master/staging/job.json'),report={cardId:job.card.id,master:job.layout.masterPsd,slots:[],texts:[],objects:[],positions:[]};
  app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;
  try{
    var file=new File(root+job.outputPsd);
    for(var i=0;i<app.documents.length;i++)try{if(app.documents[i].fullName.fsName===file.fsName){doc=app.documents[i];break;}}catch(e){}
    if(!doc){doc=app.open(file);opened=true;}
    report.width=doc.width.as('px');report.height=doc.height.as('px');report.ppi=doc.resolution;report.rootGroups=doc.layerSets.length;
    report.title=doc.info.title;report.caption=doc.info.caption;
    report.fixedFrameLocked=find(doc,'20 CADRE FIXE - verrouille').allLocked;
    report.referenceHidden=!find(doc,'00 REFERENCE VALIDEE - masquee').visible;
    for(var i=0;i<job.slots.length;i++){
      var s=job.slots[i],g=find(doc,(s.side==='atk'?'ATK':'DEF')+' D'+s.die),visible=[];
      for(var j=0;j<g.layers.length;j++)if(g.layers[j].name.indexOf('ETAT ')===0&&g.layers[j].visible)visible.push(g.layers[j].name.slice(5));
      var t=find(g,'VALEUR');
      report.slots.push({side:s.side,die:s.die,states:visible,value:t.textItem.contents,valueVisible:t.visible,bounds:bounds(t),center:[s.cx,s.cy]});
    }
    for(var key in job.layout.texts){var spec=job.layout.texts[key],l=find(doc,key==='text'?'DESCRIPTION':key.toUpperCase());report.texts.push({key:key,value:l.textItem.contents,font:l.textItem.font,bounds:bounds(l),center:spec.center,width:spec.width});}
    for(var i=0;i<5;i++){var g=find(doc,'SLOT '+(i+1));report.positions.push({slot:i+1,visible:g.visible,value:find(g,'POSITION').textItem.contents});}
    function walk(p){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.typename==='LayerSet')walk(l);else if(l.kind===LayerKind.SMARTOBJECT)report.objects.push({name:l.name,transform:transform(l)});}}
    walk(doc);
    var out=new File(root+'master/verification/'+job.label+'-psd.json');out.encoding='UTF8';out.open('w');out.write(json(report));out.close();
    doc.saveAs(new File(root+'master/verification/'+job.label+'-reexport.png'),new PNGSaveOptions(),true);
    return 'PSD controle: '+report.objects.length+' objets dynamiques, '+report.slots.length+' capsules.';
  }finally{if(doc&&opened)doc.close(SaveOptions.DONOTSAVECHANGES);app.preferences.rulerUnits=units;app.displayDialogs=dialogs;if(previous)try{app.activeDocument=previous;}catch(e){}}
})();
