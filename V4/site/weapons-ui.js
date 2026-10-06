(() => {
  'use strict';
  const Q=KalistarEquipment,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}"></i>`;
  function create({data,db,userId,toast=()=>{},onCard=()=>{}}){
    let root=null,controller=null,unsubscribe=null,selected=null,confirmation=null,busy=false,filter='all',category='all';
    let page=0,pageSize=18,columns=6,rows=3,cardWidthLimit=400,rosterPage=0,query='',observer=null,frame=0,animation=null;
    const phone=matchMedia('(max-width:699px), (max-width:950px) and (max-height:500px)'),motion=matchMedia('(prefers-reduced-motion:reduce)');
    const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const rosterSize=()=>phone.matches?(innerHeight<800?2:4):innerHeight<620?2:innerHeight<800?4:6;
    const dialog=document.getElementById('weapons-dialog');
    const definitions=Q.catalogue.weapons,profile=()=>db?.equipment?.profile(userId)||Q.profile(userId);
    const carrier=w=>Object.entries(profile().slots.weapon).find(([,id])=>id===w.id)?.[0]||null;
    const versions=w=>data.cards.filter(c=>Q.compatible(w,c));
    const name=id=>data.cards.find(c=>c.characterId===id)?.name||id;
    const bearers=w=>Object.entries(w.restrictions).filter(([key])=>key!=='families').map(([key,values])=>({characterIds:'Personnages',jobs:'Jobs',families:'Armes de base',factions:'Factions',races:'Races'}[key])+ ' : '+values.map(v=>key==='characterIds'?name(v):v).join(', ')).join(' \u00b7 ');
    const equippedText=w=>carrier(w)?'Porteur : '+name(carrier(w)):'Non attribu\u00e9';
    const card=w=>KalistarWeaponCards.markup(w,{cards:data.cards,medallion:KalistarEquipmentFX.markup,url:p=>window.KalistarSite?.url(p)||p,
      carrier:versions(w).find(c=>c.characterId===carrier(w)),cardImage:KalistarCardMedia.image});
    const holder=w=>`<button class="weapon-holder-action" data-weapon-holder="${esc(w.id)}" style="${KalistarWeaponCards.zone('holder')}" title="${esc(carrier(w)?equippedText(w)+' : changer le porteur':'Attribuer '+w.name)}" aria-label="${esc(carrier(w)?equippedText(w)+' : changer le porteur':'Attribuer '+w.name)}"></button>`;
    const matches=w=>(category==='all'||Q.catalogue.kind(w)===category)&&(filter==='all'||filter==='equipped'&&carrier(w)||filter==='free'&&!carrier(w)||filter==='stat:'+w.effect.stat||filter==='family:'+w.family);
    function categories(){
      return `<div class="equipment-categories" role="group" aria-label="Cat\u00e9gorie d\u2019\u00e9quipement">${[['all',{label:'Tous',icon:'layers'}],...Object.entries(Q.catalogue.categories)].map(([id,c])=>`<button data-equipment-category="${id}" aria-pressed="${category===id}">${icon(c.icon)}${c.label}</button>`).join('')}</div>`;
    }
    function filters(){
      const options=items=>items.map(([value,label])=>`<option value="${esc(value)}" ${filter===value?'selected':''}>${esc(label)}</option>`).join('');
      return `<select class="weapon-filter" aria-label="Filtrer les équipements">${options([['all','Tous']])}<optgroup label="\u00c9quipement">${options([['equipped','\u00c9quip\u00e9es'],['free','Libres']])}</optgroup><optgroup label="Bonus">${options([['stat:ATK','ATK'],['stat:DEF','DEF']])}</optgroup><optgroup label="Famille">${options([...new Set(definitions.map(w=>w.family))].map(f=>['family:'+f,f]))}</optgroup></select>`;
    }
    function pager(kind,index,count){
      const label=kind==='collection'?'\u00c9quipements':'Porteurs';
      return `<nav class="weapon-pager" aria-label="Pages : ${label}"><button class="icon-button" data-weapon-action="page" data-list="${kind}" data-page="${index-1}" ${index===0?'disabled':''} aria-label="Page pr\u00e9c\u00e9dente : ${label}" title="Page pr\u00e9c\u00e9dente">${icon('chevron-left')}</button><label><span class="sr-only">Page : ${label}</span><select data-weapon-page="${kind}" aria-label="Page : ${label}">${Array.from({length:count},(_,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1} / ${count}</option>`).join('')}</select></label><button class="icon-button" data-weapon-action="page" data-list="${kind}" data-page="${index+1}" ${index>=count-1?'disabled':''} aria-label="Page suivante : ${label}" title="Page suivante">${icon('chevron-right')}</button></nav>`;
    }
    function list(){
      const visible=definitions.filter(matches);
      const pages=Math.max(1,Math.ceil(visible.length/pageSize));page=Math.min(page,pages-1);
      return `<section class="weapons-page" style="--weapon-columns:${columns};--weapon-rows:${rows}"><header class="weapons-heading"><div class="weapons-title"><span class="eyebrow">KALISTAR \u00b7 ${esc(db?.registry?.user(userId)?.name||'Arsenal')}</span><h1>Équipements</h1></div>${filters()}<span class="weapons-count" role="status">${visible.length} / ${definitions.length}</span></header>${categories()}<div class="weapons-stage" tabindex="0" aria-label="Collection d\u2019\u00e9quipements"><div class="weapons-list">${visible.map((w,i)=>`<article class="weapon-entry" data-equipment-index="${i}" ${!phone.matches&&Math.floor(i/pageSize)!==page?'hidden':''}><div class="weapon-card ${carrier(w)?'is-equipped':''}"><button class="weapon-open" data-weapon="${w.id}" aria-label="${esc(w.name+', '+w.family+', +'+w.effect.value+' '+w.effect.stat+', '+equippedText(w)+'. Voir la fiche.')}">${card(w)}</button>${holder(w)}</div><div class="weapon-card-caption"><small>${esc(KalistarWeaponCards.faces[w.id]?.number||w.id)}</small></div></article>`).join('')}</div>${visible.length?'':`<div class="weapons-empty" role="status"><p>Aucun équipement</p><button class="icon-button" data-weapon-action="reset-filter" aria-label="R\u00e9initialiser le filtre" title="R\u00e9initialiser le filtre">${icon('rotate-ccw')}</button></div>`}</div><footer class="weapons-footer"><span class="weapons-range" role="status">${visible.length?page*pageSize+1:0}\u2013${Math.min((page+1)*pageSize,visible.length)} / ${visible.length}</span>${pager('collection',page,pages)}</footer></section>`;
    }
    function detail(){
      const w=definitions.find(w=>w.id===selected);if(!w)return;
      const current=carrier(w),all=[...new Map(versions(w).map(c=>[c.characterId,c])).values()].sort((a,b)=>Number(b.characterId===current)-Number(a.characterId===current)||a.name.localeCompare(b.name,'fr'));
      const roster=all.filter(c=>normalize(c.name+' '+c.job+' '+c.faction).includes(normalize(query))),size=rosterSize(),pages=Math.max(1,Math.ceil(roster.length/size));rosterPage=Math.min(rosterPage,pages-1);
      dialog.innerHTML=`<header class="dialog-head"><h2>${esc(w.name)}</h2><button class="icon-button" data-weapon-action="close" aria-label="Fermer" title="Fermer">${icon('x')}</button></header><div class="weapon-detail"><div class="weapon-detail-top"><div class="weapon-card wc-static">${card(w)}${holder(w)}</div><div class="weapon-card-caption"><small>${esc(bearers(w))}</small></div><details class="weapon-reading"><summary>R\u00e9cit de l\u2019\u00e9quipement</summary><p class="weapon-lore">${esc(w.lore)}</p></details></div><div class="weapon-detail-info"><section class="weapon-carriers"><header class="weapon-roster-heading"><h3>Porteurs compatibles</h3><span role="status">${roster.length}${query?' / '+all.length:''}</span></header>${all.length>4?`<label class="weapon-roster-search">${icon('search')}<input type="search" data-weapon-search value="${esc(query)}" aria-label="Rechercher un porteur" placeholder="Personnage, faction, job" autocomplete="off"></label>`:''}<div class="weapon-carrier-grid">${roster.map((c,i)=>{const equipped=profile().slots.weapon[c.characterId],owned=definitions.find(x=>x.id===equipped);return `<article class="${current===c.characterId?'is-current':''}" ${Math.floor(i/size)!==rosterPage?'hidden':''}><button class="weapon-carrier-art" data-weapon-action="card" data-id="${c.id}" aria-label="Voir ${esc(c.name)}"><img src="${KalistarCardMedia.image(c,'art')}" alt="${esc(c.name)}"></button><div class="weapon-carrier-info"><b>${esc(c.name)}</b><small>${esc(c.job)} \u00b7 ${esc(c.faction)}</small><span class="weapon-carrier-state" title="${esc(owned?.name||'Aucun équipement')}">${current===c.characterId?icon('check')+'\u00c9quip\u00e9':owned?esc(owned.name):'Libre'}</span><button data-weapon-action="${current===c.characterId?'unequip':'equip'}" data-character="${c.characterId}" ${busy||!db?'disabled':''}>${icon(current===c.characterId?'unlink':'plus')}${current===c.characterId?'Retirer':'\u00c9quiper'}</button></div></article>`;}).join('')||`<p class="weapon-roster-empty" role="status">${all.length?'Aucun personnage trouv\u00e9.':'Aucun porteur compatible dans le catalogue actuel.'}</p>`}</div>${pager('carriers',rosterPage,pages)}</section></div>${confirmation?`<div class="weapon-confirm" role="group" aria-label="Confirmer l\u2019\u00e9quipement"><p>${esc(confirmation.text)}</p><div><button data-weapon-action="cancel" ${busy?'disabled':''}>Annuler</button><button class="primary" data-weapon-action="confirm" ${busy?'disabled':''}>${icon('check')}Confirmer</button></div></div>`:''}</div>`;
      window.KalistarUI?.icons(dialog)??lucide.createIcons({root:dialog});
    }
    function resize(){
      if(!root)return;
      const stage=root.querySelector('.weapons-stage');if(!stage)return;
      const nextColumns=innerWidth>=1200?6:3,gap=18,cardWidth=(stage.clientWidth-gap*(nextColumns-1))/nextColumns;
      if(phone.matches)return;
      const nextRows=Math.max(1,Math.floor((stage.clientHeight-24+gap)/(cardWidth*.68+34+gap))),nextSize=nextColumns*nextRows;
      const nextWidth=Math.floor(Math.min(cardWidth,(stage.clientHeight-24-(nextRows-1)*gap-nextRows*28)/nextRows/.68));
      if(nextSize!==pageSize||nextColumns!==columns||nextRows!==rows||nextWidth!==cardWidthLimit){const first=page*pageSize;pageSize=nextSize;columns=nextColumns;rows=nextRows;cardWidthLimit=nextWidth;page=Math.floor(first/pageSize);refresh();}
      root.style.setProperty('--weapon-card-width',cardWidthLimit+'px');
    }
    function turn(kind,next){
      const count=kind==='collection'?Math.ceil(definitions.filter(matches).length/pageSize):dialog.querySelector('[data-weapon-page=carriers]')?.options.length||1;
      next=Math.max(0,Math.min(next,Math.max(0,count-1)));
      if(kind==='collection'){
        if(next===page)return;const direction=next>page?1:-1;page=next;refresh();
        const surface=root?.querySelector('.weapons-list');animation?.cancel();
        if(surface&&!motion.matches)animation=surface.animate([{opacity:.35,transform:`translateX(${direction*18}px)`},{opacity:1,transform:'translateX(0)'}],{duration:240,easing:'ease-out'});
        root?.querySelector('.weapons-stage')?.focus({preventScroll:true});
      }else{rosterPage=next;detail();dialog.querySelector('[data-weapon-page=carriers]')?.focus({preventScroll:true});}
    }
    function refresh(){
      const searching=document.activeElement?.matches('[data-weapon-search]'),caret=searching?document.activeElement.selectionStart:null;
      if(root){root.innerHTML=list();window.KalistarUI?.icons(root)??lucide.createIcons({root});}
      if(dialog.open){detail();if(searching){const input=dialog.querySelector('[data-weapon-search]');input?.focus({preventScroll:true});if(caret!==null)input?.setSelectionRange(caret,caret);}}
    }
    function bind(){
      if(controller)return;controller=new AbortController();
      dialog.addEventListener('click',click,{signal:controller.signal});
      dialog.addEventListener('close',()=>{confirmation=null;const opener=root?.querySelector(`[data-weapon="${selected}"]`);if(opener&&!opener.closest('[hidden]'))opener.focus({preventScroll:true});},{signal:controller.signal});
      dialog.addEventListener('input',event=>{
        if(!event.target.matches('[data-weapon-search]'))return;
        const caret=event.target.selectionStart;query=event.target.value;rosterPage=0;detail();const input=dialog.querySelector('[data-weapon-search]');input?.focus({preventScroll:true});if(caret!==null)input?.setSelectionRange?.(caret,caret);
      },{signal:controller.signal});
      const changePage=event=>{if(event.target.matches('[data-weapon-page]'))turn(event.target.dataset.weaponPage,Number(event.target.value));};
      dialog.addEventListener('change',changePage,{signal:controller.signal});
      root?.addEventListener('click',click,{signal:controller.signal});
      root?.addEventListener('change',changePage,{signal:controller.signal});
      root?.addEventListener('keydown',event=>{if(phone.matches||!['ArrowLeft','ArrowRight'].includes(event.key)||event.target.closest('input,select'))return;event.preventDefault();turn('collection',page+(event.key==='ArrowRight'?1:-1));},{signal:controller.signal});
      window.addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{refresh();resize();});},{signal:controller.signal});
      root?.addEventListener('change',event=>{
        if(!event.target.matches('.weapon-filter'))return;
        filter=event.target.value;page=0;refresh();root?.querySelector('.weapon-filter')?.focus({preventScroll:true});
      },{signal:controller.signal});
      unsubscribe=db?.equipment.subscribe(refresh);
    }
    async function click(event){
      const categoryButton=event.target.closest('[data-equipment-category]');
      if(categoryButton){category=categoryButton.dataset.equipmentCategory;filter='all';page=0;refresh();root?.querySelector(`[data-equipment-category="${category}"]`)?.focus({preventScroll:true});return;}
      const slot=event.target.closest('[data-weapon-holder]');
      if(slot){if(busy)return;if(selected!==slot.dataset.weaponHolder||!dialog.open)open(slot.dataset.weaponHolder);const target=dialog.querySelector('[data-weapon-search],[data-weapon-action=equip],[data-weapon-action=unequip]');target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});return;}
      const tile=event.target.closest('[data-weapon]');if(tile){open(tile.dataset.weapon);return;}
      const button=event.target.closest('[data-weapon-action]');if(!button||busy)return;
      const action=button.dataset.weaponAction,w=definitions.find(w=>w.id===selected),character=button.dataset.character;
      if(action==='page'){turn(button.dataset.list,Number(button.dataset.page));return;}
      if(action==='reset-filter'){filter='all';page=0;refresh();root?.querySelector('.weapon-filter')?.focus();return;}
      if(action==='close'){dialog.close();confirmation=null;return;}
      if(action==='card'){onCard(button.dataset.id);return;}
      if(action==='cancel'){const character=confirmation?.character;confirmation=null;detail();dialog.querySelector(`[data-character="${character}"]`)?.focus({preventScroll:true});return;}
      if(action==='equip'){
        const row=profile(),old=row.slots.weapon[character]||null,other=carrier(w);
        confirmation={character,expected:old,expectedProfile:row,text:old?'Remplacer '+definitions.find(x=>x.id===old).name+' sur '+name(character)+' ?':'D\u00e9placer '+w.name+' de '+name(other)+' vers '+name(character)+' ?'};
        if(old||other){detail();dialog.querySelector('[data-weapon-action=confirm]')?.focus();return;}
      }
      try{
        busy=true;
        if(action==='unequip')await db.equipment.unequip(userId,character,w.id);
        else if(action==='equip'||action==='confirm')await db.equipment.equip(userId,confirmation.character,w.id,confirmation);
        confirmation=null;rosterPage=0;toast(action==='unequip'?'Équipement retiré.':'Équipement attribué.');
      }catch(e){confirmation=null;toast(e.message);}finally{busy=false;refresh();dialog.querySelector('.is-current [data-weapon-action=unequip],article:not([hidden]) [data-weapon-action=equip]')?.focus({preventScroll:true});}
    }
    function open(id){selected=id;confirmation=null;query='';rosterPage=0;bind();detail();if(!dialog.open)dialog.showModal();}
    function destroy(){root=null;observer?.disconnect();observer=null;cancelAnimationFrame(frame);animation?.cancel();animation=null;controller?.abort();controller=null;unsubscribe?.();unsubscribe=null;if(dialog.open)dialog.close();confirmation=null;}
    function mount(node){destroy();root=node;bind();refresh();resize();observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(resize);});observer.observe(root);}
    return {mount,destroy,open,refresh};
  }
  window.KalistarWeaponsUI={create};
})();
