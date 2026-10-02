(() => {
  'use strict';
  const Q=KalistarEquipment,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}"></i>`;
  function create({data,db,userId,toast=()=>{},onCard=()=>{}}){
    let root=null,controller=null,unsubscribe=null,selected=null,confirmation=null,busy=false;
    const dialog=document.getElementById('weapons-dialog');
    const definitions=Q.catalogue.weapons,profile=()=>db?.equipment?.profile(userId)||Q.profile(userId);
    const carrier=w=>Object.entries(profile().slots.weapon).find(([,id])=>id===w.id)?.[0]||null;
    const versions=w=>data.cards.filter(c=>Q.compatible(w,c));
    const name=id=>data.cards.find(c=>c.characterId===id)?.name||id;
    const bearers=w=>Object.entries(w.restrictions).map(([key,values])=>({characterIds:'Personnages',jobs:'Jobs',families:'Armes de base'}[key])+ ' : '+values.map(v=>key==='characterIds'?name(v):v).join(', ')).join(' \u00b7 ');
    const equippedText=w=>carrier(w)?'\u00c9quip\u00e9e par '+name(carrier(w)):'Non \u00e9quip\u00e9e';
    function list(){
      return `<section class="weapons-page"><header class="weapons-heading"><div><span class="eyebrow">KALISTAR \u00b7 ${esc(db?.registry?.user(userId)?.name||'Arsenal')}</span><h1>Armes</h1></div><span>${Object.keys(profile().slots.weapon).length} / ${definitions.length} \u00e9quip\u00e9es</span></header><div class="weapons-list">${definitions.map(w=>`<button class="weapon-card ${carrier(w)?'is-equipped':''}" data-weapon="${w.id}" aria-label="${esc(w.name+', '+equippedText(w))}"><span class="weapon-object">${KalistarEquipmentFX.markup(w)}</span><span class="weapon-summary"><small class="weapon-family">${esc(w.family)}</small><strong class="weapon-name">${esc(w.name)}</strong><span class="weapon-bonus">+${w.effect.value} ${w.effect.stat}</span><span class="weapon-condition">${esc(w.condition)}</span><span class="weapon-bearers">${esc(bearers(w))}</span><span class="weapon-state">${icon(carrier(w)?'check':'sword')}${esc(equippedText(w))}</span></span>${icon('chevron-right')}</button>`).join('')}</div></section>`;
    }
    function detail(){
      const w=definitions.find(w=>w.id===selected);if(!w)return;
      const current=carrier(w),roster=[...new Map(versions(w).map(c=>[c.characterId,c])).values()];
      dialog.innerHTML=`<header class="dialog-head"><h2>${esc(w.name)}</h2><button class="icon-button" data-weapon-action="close" aria-label="Fermer" title="Fermer">${icon('x')}</button></header><div class="weapon-detail"><div class="weapon-detail-top"><div class="weapon-object">${KalistarEquipmentFX.markup(w)}</div><div><span class="eyebrow">${esc(w.family)}</span><h3>+${w.effect.value} ${w.effect.stat}</h3><p>${esc(w.condition)}</p><b class="weapon-state">${esc(equippedText(w))}</b></div></div><p class="weapon-lore">${esc(w.lore)}</p><section class="weapon-carriers"><h3>Porteurs compatibles</h3><div>${roster.map(c=>`<article><button class="weapon-carrier-art" data-weapon-action="card" data-id="${c.id}" aria-label="Voir ${esc(c.name)}"><img src="${KalistarCardMedia.image(c,'art')}" alt="${esc(c.name)}"></button><div><b>${esc(c.name)}</b><small>${esc(c.job)}</small>${profile().slots.weapon[c.characterId]?`<small>${esc(db.equipment.weapon(userId,c.characterId).name)}</small>`:''}<button data-weapon-action="${current===c.characterId?'unequip':'equip'}" data-character="${c.characterId}" ${busy||!db?'disabled':''}>${icon(current===c.characterId?'unlink':'sword')}${current===c.characterId?'D\u00e9s\u00e9quiper':'\u00c9quiper'}</button></div></article>`).join('')}</div></section>${confirmation?`<div class="weapon-confirm" role="group" aria-label="Confirmer l\u2019\u00e9quipement"><p>${esc(confirmation.text)}</p><button data-weapon-action="cancel" ${busy?'disabled':''}>Annuler</button><button class="primary" data-weapon-action="confirm" ${busy?'disabled':''}>${icon('check')}Confirmer</button></div>`:''}<p class="weapon-match-note">L\u2019arme imprim\u00e9e garde ses avantages. L\u2019\u00e9quipement est verrouill\u00e9 au d\u00e9but de chaque match.</p></div>`;
      lucide.createIcons();
    }
    function refresh(){if(root){root.innerHTML=list();lucide.createIcons();}if(dialog.open)detail();}
    function bind(){
      if(controller)return;controller=new AbortController();
      dialog.addEventListener('click',click,{signal:controller.signal});
      root?.addEventListener('click',click,{signal:controller.signal});
      unsubscribe=db?.equipment.subscribe(refresh);
    }
    async function click(event){
      const tile=event.target.closest('[data-weapon]');if(tile){open(tile.dataset.weapon);return;}
      const button=event.target.closest('[data-weapon-action]');if(!button||busy)return;
      const action=button.dataset.weaponAction,w=definitions.find(w=>w.id===selected),character=button.dataset.character;
      if(action==='close'){dialog.close();confirmation=null;return;}
      if(action==='card'){onCard(button.dataset.id);return;}
      if(action==='cancel'){confirmation=null;detail();return;}
      if(action==='equip'){
        const row=profile(),old=row.slots.weapon[character]||null,other=carrier(w);
        confirmation={character,expected:old,expectedProfile:row,text:old?'Remplacer '+definitions.find(x=>x.id===old).name+' sur '+name(character)+' ?':'D\u00e9placer '+w.name+' de '+name(other)+' vers '+name(character)+' ?'};
        if(old||other){detail();return;}
      }
      try{
        busy=true;
        if(action==='unequip')await db.equipment.unequip(userId,character,w.id);
        else if(action==='equip'||action==='confirm')await db.equipment.equip(userId,confirmation.character,w.id,confirmation);
        confirmation=null;toast(action==='unequip'?'Arme d\u00e9s\u00e9quip\u00e9e.':'Arme \u00e9quip\u00e9e.');
      }catch(e){confirmation=null;toast(e.message);}finally{busy=false;refresh();}
    }
    function open(id){selected=id;confirmation=null;bind();detail();if(!dialog.open)dialog.showModal();}
    function destroy(){root=null;controller?.abort();controller=null;unsubscribe?.();unsubscribe=null;if(dialog.open)dialog.close();confirmation=null;}
    function mount(node){destroy();root=node;bind();refresh();}
    return {mount,destroy,open,refresh};
  }
  window.KalistarWeaponsUI={create};
})();
