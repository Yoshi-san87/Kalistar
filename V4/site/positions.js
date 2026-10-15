(function(global){
  'use strict';
  const roles=Object.freeze(['Tank','DPS physique','Middle','DPS magique / distance','Support']);
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const valid=p=>(typeof p==='number'||typeof p==='string'&&/^[1-5]$/.test(p))&&Number.isInteger(Number(p))&&Number(p)>=1&&Number(p)<=5;
  const label=p=>valid(p)?roles[Number(p)-1]+' (P'+Number(p)+')':'';
  const asset=p=>global.KalistarSite?.url('assets/positions/p'+Number(p)+'-v1.webp')||'assets/positions/p'+Number(p)+'-v1.webp';
  function markup(p,{className=''}={}){
    if(!valid(p))return '';
    const text=escape(label(p));
    return `<span class="position-emblem ${escape(className)}" data-position-icon="${Number(p)}" role="img" aria-label="${text}" title="${text}"><img class="position-art" src="${asset(p)}" width="128" height="128" alt="" aria-hidden="true" decoding="async" draggable="false"></span>`;
  }
  function list(positions,{className=''}={}){
    const values=[...new Set((Array.isArray(positions)?positions:[]).filter(valid).map(Number))];
    return values.length?`<span class="position-emblems ${escape(className)}" aria-label="Postes compatibles">${values.map(p=>markup(p)).join('')}</span>`:'';
  }
  function picker({name='position',value='',attributes=''}={}){
    const selected=valid(value)?String(Number(value)):'';
    return `<fieldset class="position-picker"><legend class="position-sr-only">Poste</legend>${['',1,2,3,4,5].map(p=>{
      const text=escape(p?label(p):'Tous les postes');
      return `<label class="position-choice" title="${text}"><input type="radio" name="${escape(name)}" value="${p}" aria-label="${text}" ${String(p)===selected?'checked':''} ${attributes}><span class="position-choice-art" aria-hidden="true">${p?markup(p):'<i data-lucide="layout-grid"></i>'}</span></label>`;
    }).join('')}</fieldset>`;
  }
  const api=Object.freeze({roles,label,markup,list,picker});
  global.KalistarPositions=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
