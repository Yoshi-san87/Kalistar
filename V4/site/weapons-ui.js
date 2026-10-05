(() => {
  'use strict';
  const Q=KalistarEquipment,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}"></i>`;
  function create({data,db,userId,toast=()=>{},onCard=()=>{}}){
    let root=null,controller=null,unsubscribe=null,selected=null,confirmation=null,busy=false,filter='all';
    const dialog=document.getElementById('weapons-dialog');
    const definitions=Q.catalogue.weapons,profile=()=>db?.equipment?.profile(userId)||Q.profile(userId);
    const carrier=w=>Object.entries(profile().slots.weapon).find(([,id])=>id===w.id)?.[0]||null;
    const versions=w=>data.cards.filter(c=>Q.compatible(w,c));
    const name=id=>data.cards.find(c=>c.characterId===id)?.name||id;
    const bearers=w=>Object.entries(w.restrictions).map(([key,values])=>({characterIds:'Personnages',jobs:'Jobs',families:'Armes de base',factions:'Factions'}[key])+ ' : '+values.map(v=>key==='characterIds'?name(v):v).join(', ')).join(' \u00b7 ');
    const equippedText=w=>carrier(w)?'\u00c9quip\u00e9e par '+name(carrier(w)):'Non \u00e9quip\u00e9e';
    const card=w=>KalistarWeaponCards.markup(w,{cards:data.cards,medallion:KalistarEquipmentFX.markup,url:p=>window.KalistarSite?.url(p)||p,
      carrier:versions(w).find(c=>c.characterId===carrier(w)),cardImage:KalistarCardMedia.image});
    const holder=w=>`<button class="weapon-holder-action" data-weapon-holder="${esc(w.id)}" style="${KalistarWeaponCards.zone('holder')}" title="${esc(carrier(w)?equippedText(w)+' : changer le porteur':'Attribuer '+w.name)}" aria-label="${esc(carrier(w)?equippedText(w)+' : changer le porteur':'Attribuer '+w.name)}"></button>`;
    const matches=w=>filter==='all'||filter==='equipped'&&carrier(w)||filter==='free'&&!carrier(w)||filter==='stat:'+w.effect.stat||filter==='family:'+w.family;
    function filters(){
      const options=items=>items.map(([value,label])=>`<option value="${esc(value)}" ${filter===value?'selected':''}>${esc(label)}</option>`).join('');
      return `<select class="weapon-filter" aria-label="Filtrer les armes">${options([['all','Toutes les armes']])}<optgroup label="\u00c9quipement">${options([['equipped','\u00c9quip\u00e9es'],['free','Libres']])}</optgroup><optgroup label="Bonus">${options([['stat:ATK','ATK'],['stat:DEF','DEF']])}</optgroup><optgroup label="Famille">${options([...new Set(definitions.map(w=>w.family))].map(f=>['family:'+f,f]))}</optgroup></select>`;
    }
    function list(){
      const visible=definitions.filter(matches);
      return `<section class="weapons-page"><header class="weapons-heading"><div class="weapons-title"><span class="eyebrow">KALISTAR \u00b7 ${esc(db?.registry?.user(userId)?.name||'Arsenal')}</span><h1>Armes</h1></div>${filters()}<span class="weapons-count" role="status">${visible.length} / ${definitions.length}</span></header><div class="weapons-list">${visible.map(w=>`<article class="weapon-entry"><div class="weapon-card ${carrier(w)?'is-equipped':''}"><button class="weapon-open" data-weapon="${w.id}" aria-label="${esc(w.name+', +'+w.effect.value+' '+w.effect.stat+', '+equippedText(w)+'. Voir la fiche.')}">${card(w)}</button>${holder(w)}</div><div class="weapon-card-caption"><small>${esc(KalistarWeaponCards.faces[w.id]?.number||w.id)} \u00b7 ${esc(w.family)}</small></div></article>`).join('')}</div>${visible.length?'':`<div class="weapons-empty" role="status"><p>Aucune arme</p><button class="icon-button" data-weapon-action="reset-filter" aria-label="R\u00e9initialiser le filtre" title="R\u00e9initialiser le filtre">${icon('rotate-ccw')}</button></div>`}</section>`;
    }
    function detail(){
      const w=definitions.find(w=>w.id===selected);if(!w)return;
      const current=carrier(w),roster=[...new Map(versions(w).map(c=>[c.characterId,c])).values()];
      dialog.innerHTML=`<header class="dialog-head"><h2>${esc(w.name)}</h2><button class="icon-button" data-weapon-action="close" aria-label="Fermer" title="Fermer">${icon('x')}</button></header><div class="weapon-detail"><div class="weapon-detail-top"><div class="weapon-card wc-static">${card(w)}${holder(w)}</div><div class="weapon-card-caption"><small>${esc(w.family)} \u00b7 ${esc(bearers(w))}</small></div></div><div class="weapon-detail-info"><div class="weapon-reading"><h3>+${w.effect.value} ${w.effect.stat}</h3><p class="weapon-lore">${esc(w.lore)}</p><h4>Activation</h4><p class="weapon-condition">${esc(w.condition)}</p></div><section class="weapon-carriers"><h3>Porteurs compatibles</h3><div>${roster.map(c=>`<article><button class="weapon-carrier-art" data-weapon-action="card" data-id="${c.id}" aria-label="Voir ${esc(c.name)}"><img src="${KalistarCardMedia.image(c,'art')}" alt="${esc(c.name)}"></button><div><b>${esc(c.name)}</b><small>${esc(c.job)}</small>${profile().slots.weapon[c.characterId]?`<small>${esc(db.equipment.weapon(userId,c.characterId).name)}</small>`:''}<button data-weapon-action="${current===c.characterId?'unequip':'equip'}" data-character="${c.characterId}" ${busy||!db?'disabled':''}>${icon(current===c.characterId?'unlink':'sword')}${current===c.characterId?'D\u00e9s\u00e9quiper':'\u00c9quiper'}</button></div></article>`).join('')}</div></section>${confirmation?`<div class="weapon-confirm" role="group" aria-label="Confirmer l\u2019\u00e9quipement"><p>${esc(confirmation.text)}</p><button data-weapon-action="cancel" ${busy?'disabled':''}>Annuler</button><button class="primary" data-weapon-action="confirm" ${busy?'disabled':''}>${icon('check')}Confirmer</button></div>`:''}</div></div>`;
      lucide.createIcons();
    }
    function refresh(){if(root){root.innerHTML=list();lucide.createIcons();}if(dialog.open)detail();}
    function bind(){
      if(controller)return;controller=new AbortController();
      dialog.addEventListener('click',click,{signal:controller.signal});
      root?.addEventListener('click',click,{signal:controller.signal});
      root?.addEventListener('change',event=>{
        if(!event.target.matches('.weapon-filter'))return;
        filter=event.target.value;refresh();root?.querySelector('.weapon-filter')?.focus({preventScroll:true});
      },{signal:controller.signal});
      unsubscribe=db?.equipment.subscribe(refresh);
    }
    async function click(event){
      const slot=event.target.closest('[data-weapon-holder]');
      if(slot){if(busy)return;open(slot.dataset.weaponHolder);const target=dialog.querySelector('[data-weapon-action=equip],[data-weapon-action=unequip]');target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});return;}
      const tile=event.target.closest('[data-weapon]');if(tile){open(tile.dataset.weapon);return;}
      const button=event.target.closest('[data-weapon-action]');if(!button||busy)return;
      const action=button.dataset.weaponAction,w=definitions.find(w=>w.id===selected),character=button.dataset.character;
      if(action==='reset-filter'){filter='all';refresh();root?.querySelector('.weapon-filter')?.focus();return;}
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
