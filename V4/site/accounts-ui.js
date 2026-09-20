(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<i data-lucide="${n}"></i>`;
  const date=s=>s?new Date(s).toLocaleString('fr-FR'):'-';
  const labels={pending:'En attente',accepted:'Accepte',cancelled:'Annule',rejected:'Refuse',completed:'Accepte'};
  function create({db,getUserId,onSwitch,onChanged,modal,toast,download}){
    const registry=db.registry,cards=window.KALISTAR_DATA.cards;
    const loadedIds=new Set(cards.map(c=>c.id));let byId=Object.fromEntries(cards.map(c=>[c.id,c]));
    const card=id=>byId[id]||{id,name:'Carte #'+id,title:'Profil a actualiser'};
    const image=c=>c.pngUrl?KalistarCardMedia.image(c):'/jeu/assets/back.webp';
    let tab='transfers',mode='hub',selected=null,recipient=null,review=null,issued=null,busy=false,storage=null;
    const dialog=()=>document.querySelector('#account-dialog'),user=()=>registry.user(getUserId());
    const action=(name,label,symbol,attrs='',cls='')=>`<button type="button" data-registry-action="${name}" class="${cls}" ${attrs}>${icon(symbol)}${label}</button>`;
    const identity=id=>{const u=registry.user(id);return `<span class="registry-avatar">${id===KalistarOwnership.PARIS?'P':'T'}</span><span class="registry-identity"><b>${esc(u?.name||'Non attribue')}</b><small>${esc(u?.email||'')}</small></span>`;};
    const visual=item=>{const c=card(item.cardId);return `<figure class="transfer-card"><img src="${image(c)}" alt="${esc(c.name+' - '+c.title)}" width="797" height="1388"><figcaption><b>${esc(c.name)}</b><span>${esc(c.title)}</span><code>${esc(item.id)}</code></figcaption></figure>`;};
    const head=title=>`<div class="dialog-head"><h2>${esc(title)}</h2>${action('close','','x','aria-label="Fermer" title="Fermer"','icon-button')}</div>`;
    const eventLabels={seeded:'Attribution initiale',issued:'Emission',activated:'Activation',offered:'Transfert propose',accepted:'Transfert accepte',cancelled:'Transfert annule',rejected:'Transfert refuse',bound:'Participation a une partie',released:'Partie abandonnee'};
    function operations(item){
      const events=registry.events(item.id).slice().reverse().slice(0,8);
      return `<details class="registry-history"><summary>${icon('history')}Historique de cet exemplaire</summary><ol>${events.map(e=>`<li><b>${esc(eventLabels[e.type]||e.type||'Operation')}</b><time>${esc(date(e.createdAt||e.at))}</time></li>`).join('')||'<li>Enregistrement initial</li>'}</ol></details>`;
    }
    function transferRow(t){
      const item=registry.get(t.collectibleId),c=item&&card(item.cardId),incoming=t.toUserId===getUserId(),pending=t.status==='pending';
      return `<article class="transfer-row" data-transfer-id="${esc(t.id)}"><img src="${image(c)}" alt="${esc(c?.name)}"><div class="transfer-row-main"><b>${esc(c?.name||'Exemplaire')}</b><small>${incoming?'De':'Vers'} ${esc(registry.user(incoming?t.fromUserId:t.toUserId)?.email)}</small><code>${esc(t.collectibleId)}</code><time>${esc(date(t.createdAt))}</time></div><div class="transfer-row-actions"><span class="transfer-status ${pending?'pending':'settled'}">${icon(pending?'clock-3':t.status==='accepted'||t.status==='completed'?'check':'minus')}${esc(labels[t.status]||t.status)}</span>${pending?(incoming?action('review-receive','Examiner','scan-eye',`data-id="${esc(t.id)}"`,'primary'):action('cancel','Annuler','x',`data-id="${esc(t.id)}"`)):''}</div></article>`;
    }
    function hub(){
      const u=user(),owned=registry.owned(u.id),transfers=registry.transfers(u.id),incoming=transfers.filter(t=>t.toUserId===u.id&&t.status==='pending');
      let body='';
      if(tab==='transfers')body=`<div class="registry-section-title"><div><h3>Passages de main</h3><p>${incoming.length} transfert${incoming.length>1?'s':''} a accepter</p></div>${action('compose','Transferer une carte','arrow-right-left',owned.length?'':'disabled','primary')}</div><div class="registry-transfers">${transfers.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(transferRow).join('')||`<div class="registry-empty">${icon('arrow-right-left')}<h3>Aucun transfert</h3><p>${owned.length?'Tes exemplaires sont dans ta collection.':'Ce profil ne possede encore aucune carte.'}</p></div>`}</div>`;
      if(tab==='collection')body=`<div class="registry-section-title"><div><h3>Exemplaires enregistres</h3><p>${owned.length} carte${owned.length>1?'s':''} · ${new Set(owned.map(i=>i.cardId)).size} versions</p></div>${action('compose','Transferer','arrow-right-left',owned.length?'':'disabled')}</div><div class="registry-owned">${owned.map(i=>{const c=card(i.cardId),pending=transfers.some(t=>t.collectibleId===i.id&&t.status==='pending');return `<article class="registry-owned-row"><img src="${image(c)}" alt="${esc(c.name)}"><div><b>${esc(c.name)}</b><small>${esc(c.title)}</small><code>${esc(i.id)}</code></div>${action('compose','','arrow-up-right',`data-id="${esc(i.id)}" title="Transferer ${esc(c.name)}" aria-label="Transferer ${esc(c.name)}" ${pending?'disabled':''}`,'icon-button')}${pending?'<small class="registry-pending-label">Transfert en attente</small>':''}</article>`;}).join('')||`<div class="registry-empty">${icon('layers-3')}<h3>Collection vide</h3><p>Aucun exemplaire attribue a ce profil.</p></div>`}</div>`;
      if(tab==='activation')body=`<section class="registry-activation"><span class="registry-large-icon">${icon('key-round')}</span><h3>Enregistrer un exemplaire</h3><p>Le code secret est fourni separement a l'achat. Il ne sert qu'une fois.</p><form id="registry-activate-form" class="registry-form"><label>Identifiant de l'exemplaire<input name="collectible" required autocomplete="off" spellcheck="false" maxlength="90" placeholder="KC-..."></label><label>Code secret d'activation<div class="secret-input"><input name="secret" type="password" required autocomplete="off" spellcheck="false" maxlength="160">${action('reveal','','eye','aria-label="Afficher ou masquer le code" title="Afficher ou masquer le code"','icon-button')}</div></label><div class="registry-recipient">${identity(u.id)}</div><button type="submit" class="primary">${icon('key-round')}Activer pour ce profil</button></form><div class="registry-inline-note">${icon('lock-keyhole')}Code a usage unique · essais limites localement</div></section>`;
      if(tab==='issue'&&u.id===KalistarOwnership.PARIS)body=issued?`<section class="registry-voucher"><span class="eyebrow">Exemplaire cree · non attribue</span><h3>${esc(card(issued.collectible.cardId).name)}</h3><p class="registry-warning">Ce code est affiche une seule fois. Conserve le bon d'activation hors des images publiques de la carte.</p><dl><dt>Identifiant public</dt><dd><code>${esc(issued.collectible.id)}</code></dd><dt>Code secret</dt><dd class="activation-secret"><code>${esc(issued.code)}</code></dd></dl><div class="registry-command-row">${action('voucher','Bon d’activation','download','','primary')}${action('new-issue','Nouvel exemplaire','plus')}</div></section>`:`<section class="registry-activation"><span class="registry-large-icon">${icon('stamp')}</span><h3>Atelier d'emission</h3><p>Un nouvel exemplaire non attribue, avec un identifiant aleatoire et un code secret distinct.</p><form id="registry-issue-form" class="registry-form"><label>Version de carte<select name="card">${cards.map(c=>`<option value="${c.id}">${esc(c.name+' · '+c.title)}</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" name="confirm" required>Creer un exemplaire supplementaire, sans l'attribuer.</label><button class="primary" type="submit">${icon('stamp')}Creer l'exemplaire</button></form></section>`;
      if(tab==='storage')body=`<section class="registry-storage"><h3>Stockage de ce navigateur</h3><dl><dt>Utilisation de l'origine</dt><dd>${storage?.usage!=null?bytes(storage.usage):'Indisponible'}</dd><dt>Quota estime</dt><dd>${storage?.quota!=null?bytes(storage.quota):'Indisponible'}</dd><dt>Conservation persistante</dt><dd>${storage?.persistent===true?'Accordee':storage?.persistent===false?'Non accordee':'Indisponible'}</dd></dl><p>Le quota concerne toute l'origine, pas seulement Kalistar. Les images restent dans les fichiers du site. Une suppression des donnees du navigateur efface la base locale.</p><div class="registry-command-row">${action('storage-refresh','Actualiser','refresh-cw')}${action('persist','Demander la conservation','database')}</div></section>`;
      return `<div class="registry-profile-strip"><div class="registry-person">${identity(u.id)}</div><span class="registry-owned-total">${owned.length}<small>exemplaires</small></span><label class="registry-profile-picker">Profil local<select id="registry-profile">${registry.users().map(p=>`<option value="${esc(p.id)}" ${p.id===u.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label></div><div class="registry-local-notice">${icon('monitor')}Prototype local : profils non authentifies, adresses non verifiees. Aucun email envoye.</div><nav class="registry-tabs" aria-label="Registre">${[['transfers','Transferts','arrow-right-left'],['collection','Exemplaires','layers-3'],['activation','Activation','key-round'],...(u.id===KalistarOwnership.PARIS?[['issue','Atelier','stamp']]:[]),['storage','Stockage','database']].map(([id,label,symbol])=>action('tab',label,symbol,`data-tab="${id}" aria-pressed="${tab===id}"`)).join('')}</nav><div class="registry-content">${body}</div>`;
    }
    function transfer(){
      const receiving=mode==='receive',t=receiving?registry.transfers(getUserId()).find(x=>x.id===selected):null;
      const items=registry.owned(getUserId()),item=receiving?registry.get(t?.collectibleId):registry.get(selected)||items[0];
      if(!item){mode='hub';return hub();}selected=receiving?t.id:item.id;
      const from=receiving?t.fromUserId:getUserId(),to=receiving?t.toUserId:recipient||registry.users().find(u=>u.id!==from)?.id;
      const verified=receiving||!!review;
      return `<div class="transfer-heading">${action('back','Retour aux transferts','arrow-left')}<ol class="transfer-steps"><li class="${!verified?'current':''}">1 · Choisir</li><li class="${verified?'current':''}">2 · Verifier</li><li>3 · Accepter</li></ol></div><div class="transfer-compose">${visual(item)}<div class="transfer-form-panel"><span class="eyebrow">${receiving?'Reception d’un exemplaire':verified?'Confirmation de l’offre':'Transfert d’un exemplaire'}</span><h3>${receiving?'Une carte pour ta collection':verified?'Verifier avant d’envoyer':'Choisir le destinataire'}</h3>${!verified?`<form id="registry-transfer-form" class="registry-form"><label>Ton exemplaire<select name="item" id="registry-transfer-item">${items.map(i=>`<option value="${esc(i.id)}" ${i.id===item.id?'selected':''}>${esc(card(i.cardId).name+' · '+i.id)}</option>`).join('')}</select></label><label>Destinataire<select name="recipient">${registry.users().filter(u=>u.id!==from).map(u=>`<option value="${esc(u.id)}" ${u.id===to?'selected':''}>${esc(u.email)}</option>`).join('')}</select></label><button class="primary" type="submit">${icon('scan-eye')}Verifier le transfert</button></form>`:`<div class="transfer-route"><div><small>Proprietaire actuel</small><div class="registry-person">${identity(from)}</div></div><span class="transfer-route-arrow">${icon('arrow-down')}</span><div><small>Destinataire</small><div class="registry-person">${identity(to)}</div></div></div><ul class="transfer-checks"><li>${icon('fingerprint')}Identifiant conserve</li><li>${icon('history')}Historique de l'exemplaire conserve</li><li>${icon('user-check')}Acceptation du destinataire requise</li><li>${icon('key-round')}Ancien code d'activation inutilisable</li></ul><form id="registry-confirm-form" class="registry-form"><label class="check-label"><input type="checkbox" name="confirm" required>${receiving?'Je confirme accepter cet exemplaire sur ce profil.':'Je confirme cet exemplaire et cette adresse destinataire.'}</label><button type="submit" class="primary">${icon(receiving?'check':'send')}${receiving?'Accepter le transfert':'Envoyer la demande'}</button></form>${receiving?action('cancel','Refuser','x',`data-id="${esc(t.id)}"`):''}`}${operations(item)}<p class="registry-transfer-note">La carte physique se remet separement. Le registre ne prouve pas l'authenticite du carton.</p></div></div>`;
    }
    function bytes(n){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n/1024/1024)+' Mio';}
    function render(){
      byId=Object.fromEntries([...cards,...db.inspect('versions')].map(c=>[c.id,c]));
      const pending=db.catalogueChanges?.()||registry.owned(getUserId()).filter(i=>!loadedIds.has(i.cardId)).map(i=>i.cardId);
      const notice=pending.length?`<div class="registry-catalogue-notice" role="status"><span>${new Set(pending).size} nouvelle(s) version(s) disponible(s)</span><button type="button" data-action="catalogue-refresh">${icon('refresh-cw')}Actualiser le catalogue</button></div>`:'';
      modal('account-dialog',head(mode==='hub'?'Registre de Kalistar':'Transfert de carte')+`<div class="registry-shell">${notice}${mode==='hub'?hub():transfer()}<p class="registry-feedback" role="status"></p></div>`);dialog().classList.add('registry-dialog');
      const active=registry.activeGames(getUserId());
      if(mode==='hub'&&tab==='transfers'&&active.length){
        const notice=document.createElement('section');notice.className='registry-active-games';
        notice.innerHTML=`<h3>${icon('swords')}Cartes engagees</h3><p>Termine ou abandonne ces parties avant de transferer leurs cartes.</p>${active.map(m=>`<div><span>${esc(m.state.seed)}<small>${esc(date(m.updatedAt))}</small></span>${action('abandon','Abandonner','flag-off',`data-id="${esc(m.id)}"`)}</div>`).join('')}`;
        dialog().querySelector('.registry-content').prepend(notice);icons();
      }
    }
    function icons(){window.lucide?.createIcons();}
    async function run(fn){
      if(busy)return;busy=true;dialog().setAttribute('aria-busy','true');dialog().querySelectorAll('button,input,select').forEach(n=>n.disabled=true);
      try{await fn();await registry.refresh();await onChanged();render();}
      catch(e){const message=e?.message||'Operation impossible.';render();dialog().querySelector('.registry-feedback').textContent=message;toast(message);}
      finally{busy=false;dialog().removeAttribute('aria-busy');}
    }
    async function measure(){const manager=navigator.storage;try{storage={...(manager?.estimate?await manager.estimate():{}),persistent:manager?.persisted?await manager.persisted():null};}catch{storage=null;}}
    document.addEventListener('click',event=>{
      const b=event.target.closest('[data-registry-action]');if(!b||b.disabled||busy)return;
      const name=b.dataset.registryAction;
      if(name==='close'){dialog().close();issued=null;return;}
      if(name==='tab'){tab=b.dataset.tab;mode='hub';if(tab==='storage')return run(measure);render();return;}
      if(name==='compose'){mode='compose';selected=b.dataset.id||registry.owned(getUserId())[0]?.id;recipient=null;review=null;render();return;}
      if(name==='back'){mode='hub';tab='transfers';review=null;render();return;}
      if(name==='review-receive'){mode='receive';selected=b.dataset.id;render();return;}
      if(name==='cancel')return run(async()=>{await registry.cancel(getUserId(),b.dataset.id);mode='hub';tab='transfers';toast('Demande fermee.');});
      if(name==='abandon'){if(confirm('Abandonner cette partie ? Elle ne pourra plus etre reprise. Les archives sont conservees et ses cartes seront liberees.'))return run(()=>registry.releaseGame(getUserId(),b.dataset.id));return;}
      if(name==='reveal'){const input=dialog().querySelector('[name="secret"]');input.type=input.type==='password'?'text':'password';return;}
      if(name==='new-issue'){issued=null;render();return;}
      if(name==='voucher'&&issued){download('Kalistar-activation-'+issued.collectible.id+'.json',{format:'kalistar-activation-voucher',collectibleId:issued.collectible.id,cardId:issued.collectible.cardId,activationCode:issued.code,notice:'Secret a usage unique. Ne pas publier avec la carte.'});return;}
      if(name==='storage-refresh')return run(measure);
      if(name==='persist')return run(async()=>{if(!navigator.storage?.persist)throw new Error('Conservation persistante indisponible dans ce contexte.');await navigator.storage.persist();await measure();});
    });
    document.addEventListener('change',event=>{
      if(busy)return;
      if(event.target.id==='registry-profile')return run(()=>onSwitch(event.target.value));
      if(event.target.id==='registry-transfer-item'){selected=event.target.value;recipient=dialog().querySelector('[name="recipient"]').value;render();}
    });
    document.addEventListener('submit',event=>{
      if(!event.target.id.startsWith('registry-'))return;event.preventDefault();if(busy)return;
      const values=new FormData(event.target),actor=getUserId();
      if(event.target.id==='registry-transfer-form')return run(async()=>{await registry.refresh();selected=values.get('item');recipient=values.get('recipient');const item=registry.get(selected);if(item?.ownerId!==actor||!registry.user(recipient)||recipient===actor)throw new Error('Proprietaire ou destinataire invalide.');review={id:selected,to:recipient,actor};});
      if(event.target.id==='registry-confirm-form'&&values.get('confirm'))return run(async()=>{if(mode==='receive'){await registry.accept(actor,selected);toast('Exemplaire recu.');}else{if(!review||review.actor!==actor)throw new Error('Confirmation expiree.');await registry.offer(actor,review.id,review.to);toast('Demande envoyee. Le destinataire doit l’accepter.');}mode='hub';tab='transfers';review=null;});
      if(event.target.id==='registry-activate-form')return run(async()=>{await registry.activate(actor,String(values.get('collectible')).trim(),String(values.get('secret')).trim());tab='collection';toast('Exemplaire enregistre.');});
      if(event.target.id==='registry-issue-form'&&values.get('confirm'))return run(async()=>{issued=await registry.issue(actor,values.get('card'));});
    });
    dialog().addEventListener('cancel',event=>{if(busy)event.preventDefault();else issued=null;});
    dialog().addEventListener('close',()=>{issued=null;});
    return {open:async(next='transfers',id=null)=>{await registry.refresh();tab=next;mode=id?'compose':'hub';selected=id;review=null;issued=null;render();},refresh:()=>{if(dialog().open&&!busy)render();}};
  }
  window.KalistarAccountsUI={create};
})();
