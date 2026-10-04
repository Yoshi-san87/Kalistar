(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarBaseWeapons=api;
})(typeof globalThis==='undefined'?this:globalThis,()=>{
  'use strict';
  const families=Object.freeze(['Hache','Marteau','Masse','Poing','Fléau','Arc','Fouet','Gun','Lance','Projectile','Bâton','Instrument','Sceptre','Tome','Orbe','Dague','Epée courte','Epée longue','Katana','Faucille']);
  const native=Object.freeze({left:89,top:1116,width:96,height:95,cx:137,cy:1163.5});
  const pending=new Map();
  let enamelPromise;
  const code=family=>{const index=families.indexOf(family);return index<0?null:String(index).padStart(2,'0');};
  const asset=id=>/^\d{2}$/.test(String(id))&&+id<families.length?'assets/base-weapons/'+id+'.svg':null;
  const url=file=>globalThis.KalistarSite?.url(file)||file;
  function enamel(){
    if(!enamelPromise)enamelPromise=new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Email des armes indisponible.'));
      image.src=url('assets/base-weapons/enamel.png');
    }).catch(error=>{enamelPromise=null;throw error;});
    return enamelPromise;
  }
  function load(family){
    const id=code(family);if(id===null)return Promise.resolve(null);
    if(!pending.has(id))pending.set(id,(async()=>{
      const response=await fetch(url(asset(id)));if(!response.ok)throw Error('Pictogramme indisponible : '+family);
      const doc=new DOMParser().parseFromString(await response.text(),'image/svg+xml'),glyph=doc.documentElement;
      if(glyph.localName!=='svg'||doc.querySelector('parsererror,script,image,foreignObject'))throw Error('Pictogramme invalide.');
      return {glyph,email:await enamel()};
    })().catch(error=>{pending.delete(id);throw error;}));
    return pending.get(id);
  }
  function compose(canvas,rect,{glyph,email}){
    const {left,top,width,height,cx,cy}=native,ctx=canvas.getContext('2d');
    // Replace only the printed inner enamel. The original copper rim stays intact.
    // The old Instrument glyph reaches the enamel's antialiased edge (48.7px).
    // Clear that fringe too; the copper frame starts outside this 49px circle.
    ctx.save();ctx.beginPath();ctx.arc(cx-rect.left,cy-rect.top,49,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#0c2030';ctx.fillRect(left-rect.left-2,top-rect.top-2,width+4,height+4);
    ctx.drawImage(email,left-rect.left,top-rect.top,width,height);ctx.restore();
    const drawing=glyph.cloneNode(true);
    drawing.setAttribute('x',left-rect.left);drawing.setAttribute('y',top-rect.top);
    // Embed the raster card, keep the small glyph as genuine vector at any zoom.
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+rect.width+'" height="'+rect.height+'" viewBox="0 0 '+rect.width+' '+rect.height+'"><image width="'+rect.width+'" height="'+rect.height+'" href="'+canvas.toDataURL('image/webp',.95)+'"/>'+new XMLSerializer().serializeToString(drawing)+'</svg>';
    return new Blob([svg],{type:'image/svg+xml'});
  }
  return {families,native,code,asset,load,compose};
});
