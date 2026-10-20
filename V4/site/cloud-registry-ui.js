(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const sections=[
    ['profile','Compte','fingerprint'],['transfers','Transférer une carte','arrow-right-left'],
    ['settings','Paramètres','settings-2'],['billing','Facturation / paiements','receipt-text'],['contact','Contact','mail']
  ];
  const titles=Object.fromEntries([...sections,['activate','Enregistrer une carte'],['lookup','Certificat de carte'],['issue','Émission de cartes']].map(([key,label])=>[key,label]));
  const syncLabels={synced:'Synchronisée',offline:'Hors ligne',busy:'Ouverte sur un autre appareil',conflict:'Choix de sauvegarde nécessaire',unauthorized:'Connexion requise',error:'Synchronisation interrompue',paused:'En pause',destroyed:'En pause'};
  function create({data,onNavigate,onLocal,onChanged,sync,onSync}){
    const config=window.KalistarCloudConfig;
    let api=null,initializing=null,root=null,listeners=null,unsubscribeSync=null,busy=false,disposed=false;
    let tab='profile',note='',error='',issued=null,certificate=null,selectedId='',pendingId=null,viewEpoch=0,authEpoch=0,queuedRefresh=null;
    let recipientHandle='',transferScene=null,transferMotion='';
    const state=()=>api?.snapshot()||{user:null,profile:null,isAdmin:false,cards:[],transfers:[],models:[]};
    const command=(action,label,symbol,attrs='',cls='')=>`<button type="button" data-cloud-action="${action}" ${attrs} class="${cls}">${icon(symbol)}<span>${esc(label)}</span></button>`;
    const link=(section,label,symbol)=>`<a href="#account/${section}" class="account-text-link">${icon(symbol)}<span>${esc(label)}</span>${icon('chevron-right')}</a>`;
    const field=(label,name,value,attrs='')=>`<label>${esc(label)}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;
    const model=id=>data.cards.find(c=>c.id===id);
    const publicLink=item=>{const url=new URL(config.redirectTo);url.searchParams.set('specimen',item.id);return url.href;};
    const image=item=>{const c=model(item.modelId);return c?KalistarCardMedia.image(c):'assets/back-obsidian-v1.webp';};
    const card=item=>`<article class="cloud-specimen"><img src="${esc(image(item))}" alt="${esc(item.name)}" width="797" height="1388" loading="lazy" decoding="async"><div><span class="eyebrow">Exemplaire ${esc(item.barcode||item.serial)}</span><h3>${esc(item.name)}</h3><p>${esc(item.title)}</p><code>${esc(item.id)}</code></div></article>`;
    const transferLabels={empty:'Choisir un exemplaire',preview:'Carte sélectionnée',sending:'Envoi de la demande…',receiving:'Réception en cours…',pending:'Demande envoyée · En attente',received:'Carte reçue',accepted:'Transfert accepté',cancelled:'Demande annulée',rejected:'Demande refusée',error:'Confirmation indisponible'};
    function previewScene(){
      return transferScene||{item:state().cards.find(c=>c.id===selectedId),sender:state().profile?.handle||'',recipient:recipientHandle,phase:selectedId?'preview':'empty'};
    }
    function transferPreview(){
      const scene=previewScene(),item=scene.item;
      return `<div class="transfer-visual" data-account-selection>${item?card(item):'<div class="transfer-placeholder"><img src="assets/back-obsidian-v1.webp" alt="" width="797" height="1388" decoding="async"></div>'}</div>
        <div class="transfer-route"><div class="transfer-endpoint">${icon('fingerprint')}<span>Expéditeur<strong>@${esc(scene.sender)}</strong></span></div>
          <div class="transfer-channel" aria-hidden="true"><span></span><img src="assets/navigation/kalistel-rainbow-v2.webp" alt="" width="32" height="44">${icon('chevron-right')}</div>
          <div class="transfer-endpoint transfer-destination">${icon('user-round')}<span>Destinataire<strong data-transfer-recipient>${scene.recipient?'@'+esc(scene.recipient):'—'}</strong></span></div></div>
        <p class="transfer-status" role="status">${icon(['received','accepted'].includes(scene.phase)?'badge-check':scene.phase==='pending'?'clock-3':'arrow-right-left')}<span>${esc(transferLabels[scene.phase])}</span></p>`;
    }
    function updatePreview(){
      const stage=root?.querySelector('[data-transfer-stage]');if(!stage)return;
      stage.dataset.phase=previewScene().phase;stage.dataset.motion=transferMotion;transferMotion='';
      stage.innerHTML=transferPreview();icons();
    }
    function reconcileTransfer(){
      if(!transferScene)return;
      const current=state().transfers.find(t=>transferScene.id?t.id===transferScene.id:
        transferScene.phase==='error'&&t.status==='pending'&&t.card.id===transferScene.item?.id&&t.recipient===transferScene.recipient&&!t.incoming);
      const phase=current?.status==='accepted'&&current.incoming?'received':current?.status;
      if(current&&phase!=='pending'&&phase!==transferScene.phase){
        transferScene={...transferScene,phase};
        transferMotion=phase==='received'?'receive':phase==='accepted'?'dispatch':'';
      }else if(current?.status==='pending'&&transferScene.phase==='error')transferScene={...transferScene,id:current.id,phase:'pending'};
    }
    function clearTransferFeedback(){
      note='';error='';feedback();
      root?.querySelector('.account-feedback [data-cloud-action=refresh]')?.remove();
    }
    const profileFields=()=>{const p=state().profile;return field('Nom affiché','displayName',p?.displayName||'','maxlength="40" autocomplete="name" required')+field('Pseudo','handle',p?.handle||'','pattern="[a-z0-9_]{3,24}" minlength="3" maxlength="24" autocomplete="nickname" aria-describedby="account-handle-help" required')+'<small id="account-handle-help">3 à 24 caractères : lettres minuscules, chiffres ou tiret bas.</small>';};
    const privacyField=()=>`<label class="account-check"><input name="publish" type="checkbox" ${state().profile?.publishOwner?'checked':''}><span>Afficher mon pseudo sur mes certificats de carte<small>Ton adresse email reste privée.</small></span></label>`;
    const submit=(label,symbol='save')=>`<button class="primary" type="submit">${icon(symbol)}<span>${esc(label)}</span></button>`;
    function profile(){
      const s=state();
      return `<div class="account-section-heading"><h2 id="account-section-title" tabindex="-1">Mon identité</h2><p>Le nom que les autres joueurs voient.</p></div>
        <form data-cloud-form="profile" class="account-form">${profileFields()}${!s.profile?privacyField():''}${submit('Enregistrer')}</form>
        <section class="account-section"><h3>Connexion</h3><dl class="account-facts"><div><dt>Email</dt><dd>${esc(s.user.email)}</dd></div><div><dt>Accès</dt><dd>${s.isAdmin?'Administrateur':'Joueur'}</dd></div></dl>
        ${command('logout','Se déconnecter','log-out','','account-logout')}</section>`;
    }
    function transfers(){
      const s=state(),cards=s.cards.filter(c=>c.status==='owned');
      const pending=s.transfers.filter(t=>t.status==='pending'),past=s.transfers.filter(t=>t.status!=='pending');
      return `<div class="account-section-heading"><h2 id="account-section-title" tabindex="-1">Transférer une carte</h2><p>Choisis un exemplaire et le pseudo de son destinataire. Il devra accepter le transfert.</p></div>
        <form data-cloud-form="offer" class="account-form account-transfer-workspace"><div class="account-transfer-controls">
        ${cards.length?`
          <label><span class="account-step">1</span> Carte à transférer<select name="card" required><option value="">Choisir une carte</option>${cards.map(c=>`<option value="${esc(c.id)}" ${c.id===selectedId?'selected':''}>${esc(c.name+' · '+c.title+' · '+(c.barcode||c.serial))}</option>`).join('')}</select></label>
          <label><span class="account-step">2</span> Pseudo du destinataire<input name="handle" value="${esc(recipientHandle)}" pattern="[a-z0-9_]{3,24}" minlength="3" maxlength="24" placeholder="pseudo" autocapitalize="none" spellcheck="false" required autocomplete="off"></label>
          <label class="account-check"><input name="confirm" type="checkbox" required><span>Je confirme proposer cette carte à ce destinataire.</span></label>
          <p class="account-note">Une seule carte de chaque version par joueur. Une carte engagée dans un combat ne peut pas être transférée.</p>${submit('Proposer le transfert','arrow-right-left')}`:'<p class="account-empty">Aucune carte à transférer pour le moment.</p>'}
        </div><section class="account-transfer-stage" data-transfer-stage data-phase="${esc(previewScene().phase)}" data-motion="${esc(transferMotion)}" aria-label="Aperçu du transfert">${transferPreview()}</section></form>
        <section class="account-section"><div class="account-section-heading account-row"><h3>Transferts en attente <span class="account-count">${pending.length}</span></h3>${command('refresh','Actualiser','refresh-cw')}</div>
          ${pending.map(transfer).join('')||'<p class="account-note">Aucun transfert en attente.</p>'}
          ${past.length?`<details class="account-history"><summary>Historique des transferts <span>${past.length}</span></summary>${past.map(transfer).join('')}</details>`:''}</section>
        <nav class="account-secondary" aria-label="Registre des cartes">${link('activate','Enregistrer une carte','key-round')}${link('lookup','Vérifier un certificat','scan-line')}${s.isAdmin?link('issue','Émission · Administration','stamp'):''}</nav>`;
    }
    function transfer(t){
      return `<article class="cloud-transfer"><div class="account-row"><div><h4>${esc(t.card.name)}</h4><p>${esc(t.card.title)} · ${esc(t.card.barcode||t.card.serial)}</p></div><span class="account-transfer-state">${esc({pending:t.incoming?'À recevoir':'Envoyé',accepted:'Accepté',cancelled:'Annulé',rejected:'Refusé'}[t.status]||t.status)}</span></div>
        <p class="cloud-transfer-meta"><span>@${esc(t.sender)}</span>${icon('arrow-right')}<span>@${esc(t.recipient)}</span></p>
        ${t.status==='pending'?(t.incoming?`<form data-cloud-form="accept" data-id="${esc(t.id)}" class="account-form"><label class="account-check"><input type="checkbox" required><span>Je confirme recevoir cet exemplaire.</span></label><div class="account-actions">${submit('Accepter','check')}${command('settle','Refuser','x',`data-id="${esc(t.id)}" data-state="rejected"`)}</div></form>`:command('settle','Annuler la demande','x',`data-id="${esc(t.id)}" data-state="cancelled"`)):''}</article>`;
    }
    function syncContent(){
      const s=sync?.snapshot();
      if(!s)return '<p class="account-note">La synchronisation est disponible avec une connexion au jeu en ligne.</p>';
      const date=s.updatedAt&&Number.isFinite(Date.parse(s.updatedAt))?new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short'}).format(new Date(s.updatedAt)):null;
      return `<div class="account-sync-state"><span data-state="${esc(s.status)}">${icon(s.status==='synced'?'cloud-check':'cloud')}${esc(syncLabels[s.status]||'Enregistrement en cours')}</span>${date?`<small>Dernière sauvegarde : ${esc(date)}</small>`:''}</div>${command('sync','Gérer la synchronisation','refresh-cw')}`;
    }
    function settings(){
      return `<div class="account-section-heading"><h2 id="account-section-title" tabindex="-1">Paramètres</h2><p>Confidentialité, sauvegarde et sécurité.</p></div>
        <section><h3>Visibilité</h3><form data-cloud-form="privacy" class="account-form">${privacyField()}${submit('Enregistrer')}</form></section>
        <section class="account-section"><h3>Sauvegarde</h3><div data-account-sync>${syncContent()}</div>${command('local','Archives personnelles','archive','','account-text-command')}</section>
        <section class="account-section"><h3>Mot de passe</h3><form data-cloud-form="password" class="account-form">
          <label>Nouveau mot de passe<input name="password" type="password" minlength="8" maxlength="1024" autocomplete="new-password" required></label>
          <label>Confirmer le mot de passe<input name="confirmation" type="password" minlength="8" maxlength="1024" autocomplete="new-password" required></label>
          <small>Au moins 8 caractères. Utilise un mot de passe unique.</small>${submit('Changer le mot de passe','key-round')}</form></section>`;
    }
    function content(){
      const s=state();
      if(!config?.enabled)return '<h2 id="account-section-title" tabindex="-1">Compte en ligne</h2><p>Le registre en ligne est en préparation.</p>';
      if(tab==='contact')return `<div class="account-section-heading"><h2 id="account-section-title" tabindex="-1">Contact</h2><p>Une question sur Kalistar ?</p></div><div class="account-service">${icon('mail')}<h3>contact@Kalistar.com</h3><span class="account-service-status">Bientôt disponible</span><p>Cette adresse n’est pas encore active. Merci de ne pas y envoyer de message pour le moment.</p></div>`;
      if(tab==='billing')return `<div class="account-section-heading"><h2 id="account-section-title" tabindex="-1">Facturation / paiements</h2><p>Ton espace de paiement Kalistar.</p></div><div class="account-service">${icon('receipt-text')}<h3>Les paiements ne sont pas encore ouverts</h3><p>Aucun moyen de paiement ne peut être ajouté ou débité depuis cet espace pour le moment.</p></div>`;
      if(tab==='lookup')return `<h2 id="account-section-title" tabindex="-1">Certificat de carte</h2><form data-cloud-form="lookup" class="account-form"><label>Identifiant public<input name="id" placeholder="00000001 ou KC-…" value="${esc(certificate?.barcode||'')}" maxlength="35" required autocomplete="off" spellcheck="false"></label>${submit('Consulter','scan-line')}</form>${certificate?card(certificate)+`<p>${esc(certificate.status==='unclaimed'?'Non attribuée':certificate.status==='revoked'?'Exemplaire révoqué':certificate.owner?certificate.owner.displayName+' · @'+certificate.owner.handle:'Propriétaire privé')}</p><a class="account-text-link" href="${esc(publicLink(certificate))}">${icon('link')}Lien de cet exemplaire</a>`:''}`;
      if(!s.user)return `<h2 id="account-section-title" tabindex="-1">Connexion</h2><p>Connecte-toi pour gérer ton compte.</p><a class="account-text-link" href="https://kalistar.pages.dev/jeu/login.html">${icon('log-in')}Se connecter</a>`;
      if(!s.profile||tab==='profile')return profile();
      if(tab==='transfers')return transfers();
      if(tab==='settings')return settings();
      if(tab==='activate')return `<h2 id="account-section-title" tabindex="-1">Enregistrer une carte</h2><form data-cloud-form="activate" class="account-form"><label>Identifiant de l’exemplaire<input name="id" placeholder="00000001 ou KC-…" maxlength="35" required autocomplete="off" spellcheck="false"></label><label>Secret d’activation<input name="secret" type="password" maxlength="64" minlength="64" required autocomplete="off" spellcheck="false"></label><p class="account-note">Le secret reste privé. Ne le partage pas avec un autre joueur.</p>${submit('Attribuer à @'+s.profile.handle,'key-round')}</form>`;
      if(tab==='issue'&&s.isAdmin){
        if(issued)return `<h2 id="account-section-title" tabindex="-1">Exemplaire créé</h2>${card(issued.card)}<p>Secret affiché une seule fois. À conserver séparément de l’image publique.</p><code class="cloud-issued-secret">${esc(issued.secret)}</code><div class="account-actions">${command('voucher','Télécharger le bon d’activation','download','','primary')}${command('new-issue','Autre exemplaire','plus')}</div>`;
        return `<h2 id="account-section-title" tabindex="-1">Émission · Administration</h2><form data-cloud-form="issue" class="account-form"><label>Modèle<select name="model">${s.models.map(m=>`<option value="${esc(m.id)}">${esc(m.name+' · '+m.title)}</option>`).join('')}</select></label><label class="account-check"><input type="checkbox" required><span>Créer un nouvel exemplaire de préparation non attribué.</span></label>${submit('Émettre','stamp')}</form>`;
      }
      return '<h2 id="account-section-title" tabindex="-1">Accès réservé</h2><p>Cette rubrique est réservée aux administrateurs.</p>';
    }
    function markup(){
      const s=state(),active=['activate','lookup','issue'].includes(tab)?'transfers':tab;
      return `<section class="account-page" aria-labelledby="account-title"><header class="account-header"><img src="assets/navigation/kalistel-rainbow-v2.webp" alt="" width="48" height="64"><div><span class="eyebrow">Espace personnel</span><h1 id="account-title">Mon compte</h1></div><a href="#home" class="account-home" aria-label="Retour à l’accueil" title="Retour à l’accueil">${icon('arrow-left')}</a></header>
        <div class="account-layout"><aside class="account-sidebar"><div class="account-identity">${icon('fingerprint')}<div><strong>${esc(s.profile?.displayName||'Kalistar')}</strong><small>${s.profile?'@'+esc(s.profile.handle):'Mon espace personnel'}</small></div></div>
          <nav aria-label="Rubriques du compte">${sections.map(([id,label,symbol])=>`<a href="#account/${id}" ${active===id?'aria-current="page"':''}>${icon(symbol)}<span>${esc(label)}</span>${icon('chevron-right')}</a>`).join('')}</nav>
          <span class="account-sidebar-seal">Kalistar <span>·</span> ${s.isAdmin?'Administration':'Espace joueur'}</span></aside>
          <div class="account-content"><div class="account-feedback"><p data-account-status role="status">${esc(note)}</p><p data-account-error role="alert">${esc(error)}</p>${error?command('refresh','Réessayer','refresh-cw'):''}</div>
          ${['activate','lookup','issue'].includes(tab)?'<a href="#account/transfers" class="account-text-link">'+icon('arrow-left')+'Transferts et registre</a>':''}
          <div data-account-content>${content()}</div></div></div></section>`;
    }
    function icons(){if(root)window.KalistarUI?.icons(root);}
    function feedback(){
      if(!root)return;
      root.setAttribute('aria-busy',String(busy));
      root.querySelector('[data-account-status]').textContent=busy?(transferScene&&['sending','receiving'].includes(transferScene.phase)?transferLabels[transferScene.phase]:'Connexion au compte…'):note;
      root.querySelector('[data-account-error]').textContent=error;
      root.querySelectorAll('[data-account-content] button,[data-account-content] input,[data-account-content] select').forEach(n=>n.disabled=busy);
    }
    function render(){if(!root)return;root.innerHTML=markup();transferMotion='';feedback();icons();}
    function clearSensitive(){issued=null;certificate=null;selectedId='';recipientHandle='';transferScene=null;transferMotion='';note='';error='';}
    async function ready(){
      if(api)return api;
      if(!config?.enabled)throw Error('Registre en préparation.');
      initializing??=(async()=>{
        const client=await KalistarCloudSession.getClient();
        if(disposed)throw Error('Compte fermé.');
        api=KalistarCloudRegistry.create({client});
        api.subscribe(s=>{if(!s.user){authEpoch++;clearSensitive();render();}});
        return api;
      })().finally(()=>{initializing=null;});
      return initializing;
    }
    async function run(operation,apply=()=>{},changed=false,scene=null){
      if(busy||disposed)return;
      const epoch=viewEpoch,session=authEpoch;busy=true;error='';note='';feedback();
      try{
        const service=await ready(),result=await operation(service);
        if(changed&&service.snapshot().user)await onChanged?.();
        // Navigation or logout may finish before the request. Never reopen its view or secret.
        if(root&&epoch===viewEpoch&&session===authEpoch){reconcileTransfer();apply(result);}
      }catch(e){
        if(root&&epoch===viewEpoch&&session===authEpoch){
          error=e?.code==='23505'?'Pseudo déjà utilisé ou transfert déjà en attente.':e?.name==='TimeoutError'?'Connexion trop lente. Réessaie.':e?.message||'Compte indisponible.';
          if(scene&&transferScene===scene)transferScene={...scene,phase:'error'};
        }
      }finally{
        busy=false;render();
        if(scene&&root&&epoch===viewEpoch&&session===authEpoch&&['pending','received'].includes(transferScene?.phase)){
          root.querySelector('[data-transfer-stage]')?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
        }
        const next=queuedRefresh;queuedRefresh=null;
        if(root&&next?.epoch===viewEpoch)refreshAccount(next.id);
      }
    }
    function refreshAccount(id=null){
      if(busy){queuedRefresh={id,epoch:viewEpoch};return;}
      const section=tab;
      void run(async a=>{await a.refresh();if(id&&section==='lookup'){const c=await a.certificate(id);if(!c)throw Error('Exemplaire introuvable.');return c;}},value=>{
        if(value)certificate=value;
        if(id&&section==='transfers')selectedId=id;
      });
    }
    function route(section,{focus=true}={}){
      tab=Object.hasOwn(titles,section)?section:'profile';viewEpoch++;clearSensitive();render();
      if(focus)root?.querySelector('#account-section-title')?.focus({preventScroll:true});
    }
    function click(event){
      const button=event.target.closest('[data-cloud-action]');if(!button||busy)return;
      const action=button.dataset.cloudAction;
      if(action==='local')return onLocal?.();
      if(action==='sync')return onSync?.();
      if(action==='refresh')return refreshAccount();
      if(action==='new-issue'){issued=null;render();return;}
      if(action==='logout')return run(async a=>{clearSensitive();if(KalistarCloudSession.required())await KalistarCloudSession.logout();else await a.logout();});
      if(action==='settle')return run(a=>a.settle(button.dataset.id,button.dataset.state),()=>{note='Transfert mis à jour.';},true);
      if(action==='voucher'&&issued){
        const url=URL.createObjectURL(new Blob([JSON.stringify({format:'kalistar-activation-v1',id:issued.card.id,serial:issued.card.serial,barcode:issued.card.barcode,modelId:issued.card.modelId,pilot:true,secret:issued.secret},null,2)],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='Kalistar-activation-'+issued.card.serial+'.json';a.hidden=true;document.body.append(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
    }
    function submitForm(event){
      const form=event.target.closest('[data-cloud-form]');if(!form)return;event.preventDefault();if(busy||!form.reportValidity())return;
      const v=new FormData(form),kind=form.dataset.cloudForm;
      if(kind==='profile')return run(a=>a.profile({handle:v.get('handle'),displayName:v.get('displayName'),publishOwner:state().profile?.publishOwner??(v.get('publish')==='on')}),()=>{note='Profil enregistré.';},true);
      if(kind==='privacy')return run(a=>a.profile({...state().profile,publishOwner:v.get('publish')==='on'}),()=>{note='Visibilité enregistrée.';},true);
      if(kind==='password'){
        const password=v.get('password'),confirmation=v.get('confirmation');v.delete('password');v.delete('confirmation');form.reset();
        return run(async()=>{await(await KalistarCloudSession.get()).password(password,confirmation);},()=>{note='Mot de passe modifié.';});
      }
      if(kind==='lookup')return run(async a=>{const c=await a.certificate(String(v.get('id')).trim());if(!c)throw Error('Exemplaire introuvable.');return c;},c=>{certificate=c;});
      if(kind==='activate'){
        const secret=String(v.get('secret')).trim();v.delete('secret');form.elements.secret.value='';
        return run(a=>a.activate(String(v.get('id')).trim(),secret),()=>{note='Carte attribuée à ton compte.';},true);
      }
      if(kind==='offer'){
        const scene={item:state().cards.find(c=>c.id===v.get('card')),sender:state().profile.handle,recipient:String(v.get('handle')),phase:'sending'};
        transferScene=scene;updatePreview();
        return run(a=>a.offer(v.get('card'),v.get('handle')),id=>{
          selectedId='';recipientHandle='';transferScene={...scene,id,phase:'pending'};transferMotion='dispatch';
          note='Demande envoyée. Le destinataire doit l’accepter.';
        },true,scene);
      }
      if(kind==='accept'){
        const t=state().transfers.find(t=>t.id===form.dataset.id);
        const scene=t?{id:t.id,item:t.card,sender:t.sender,recipient:t.recipient,phase:'receiving'}:null;
        transferScene=scene;updatePreview();
        return run(a=>a.settle(form.dataset.id,'accepted'),()=>{
          transferScene=scene?{...scene,phase:'received'}:null;transferMotion='receive';note='Carte reçue.';
        },true,scene);
      }
      if(kind==='issue')return run(a=>a.issue(v.get('model')),value=>{issued=value;});
    }
    function unmount(){
      viewEpoch++;listeners?.abort();unsubscribeSync?.();unsubscribeSync=null;queuedRefresh=null;root=null;clearSensitive();
    }
    function mount(node,section){
      unmount();root=node;listeners=new AbortController();tab=Object.hasOwn(titles,section)?section:'profile';render();
      root.addEventListener('click',click,{signal:listeners.signal});
      root.addEventListener('submit',submitForm,{signal:listeners.signal});
      root.addEventListener('input',event=>{
        if(event.target.name!=='handle'||!event.target.closest('[data-cloud-form=offer]')||busy)return;
        recipientHandle=event.target.value;root.querySelector('[name=confirm]').checked=false;
        clearTransferFeedback();
        if(transferScene){transferScene=null;updatePreview();}
        else {const recipient=root.querySelector('[data-transfer-recipient]');if(recipient)recipient.textContent=recipientHandle?'@'+recipientHandle:'—';}
      },{signal:listeners.signal});
      root.addEventListener('change',event=>{
        if(event.target.name!=='card'||busy)return;
        selectedId=event.target.value;transferScene=null;transferMotion=selectedId?'reveal':'';updatePreview();
        clearTransferFeedback();
        const confirmation=root.querySelector('[name=confirm]');if(confirmation)confirmation.checked=false;
      },{signal:listeners.signal});
      unsubscribeSync=sync?.subscribe(()=>{
        const node=root?.querySelector('[data-account-sync]');
        if(node){node.innerHTML=syncContent();icons();feedback();}
      });
      const requestId=pendingId;pendingId=null;
      if(config?.enabled)refreshAccount(requestId);
    }
    return {
      mount,unmount,route,
      open:({section='profile',id=null}={})=>{pendingId=id;return onNavigate(id&&section==='profile'?'lookup':section);},
      destroy:()=>{disposed=true;unmount();api?.destroy();}
    };
  }
  window.KalistarCloudRegistryUI={create};
})();
