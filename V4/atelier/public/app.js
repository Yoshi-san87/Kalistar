'use strict';
const $=id=>document.getElementById(id);
const labels={ELECTRO:'\u00c9lectricit\u00e9',HYDRO:'Eau',AERO:'Air',PYRO:'Feu',CRYO:'Glace',LUXO:'Lumi\u00e8re',MINERO:'Roche',HERBO:'Plantes',GEO:'Terre',HEMATO:'Sang',NECRO:'N\u00e9cro',RAINBOW:'Rainbow',NONE:'Sans cristal'};
const effects={retry:'Tr\u00e8fle',revive:'Reraise',guard:'Bouclier',buff_atk:'ATK physique',buff:'ATK physique',mana:'Potion',death:'Death',dodge:'Esquive',heal:'Soin'};
const state={cards:[],selected:null,selection:0,submitting:false,saving:false,form:null,upload:null,draft:null,saved:'',side:'atk',mode:'references',page:0,size:4,drafts:[],jobs:[],historyPage:0,preview:'reference',lastRender:null,token:'',gate:{passed:false},integrity:{state:'checking'},pending:null};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>structuredClone(v);
const signature=()=>JSON.stringify({key:state.selected?.key,profile:state.form,upload:state.upload});
const dirty=()=>state.form&&signature()!==state.saved;
function icons(){window.lucide?.createIcons({attrs:{'aria-hidden':'true',focusable:'false'}});}
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
async function api(url,body){const options=body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-Atelier-Token':state.token},body:JSON.stringify(body)};const r=await fetch(url,options);const result=await r.json();if(!r.ok)throw Error(result.error||'Erreur de communication.');return result;}
function pane(name){document.querySelector('.app').dataset.pane=name;document.querySelectorAll('.mobile-nav button').forEach(b=>{if(b.dataset.pane===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});requestAnimationFrame(sizeLibrary);}
function markChanged(){
  $('save-state').textContent=dirty()?'Modifications non enregistr\u00e9es':state.draft?'Brouillon enregistr\u00e9':'R\u00e9f\u00e9rence intacte';
  $('editor-name').textContent=state.form.name||'Nouvelle variante';
  $('description-count').textContent=state.form.description.length+' / 380';
  try{localStorage.setItem('kalistar-atelier-working',JSON.stringify({key:state.selected.key,profile:state.form,upload:state.upload,draft:state.draft,saved:state.saved}));}catch{}
  previewCaption();
}
function selectCard(card,draft,force=false){
  if(!force&&dirty()&&!confirm('Quitter les modifications non enregistrees ?'))return;
  state.selection++;state.selected=card;state.form=clone(draft?.profile||card.profile);state.upload=draft?.upload||null;state.draft=draft||null;state.saved=signature();state.lastRender=null;state.preview='reference';state.pending=null;
  fillEditor();renderLibrary();showPreview();markChanged();pane('preview');
}
function fillEditor(){
  for(const key of ['name','title','job','description'])$('field-'+key).value=state.form[key];
  const c=state.selected;
  $('model-facts').innerHTML=[['Cristal',labels[c.element]],['Race',c.race],['Arme',c.weapon],['Faction',c.faction]].map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('');
  $('model-id').textContent='Modele '+c.modelId;
  renderStats();renderPositions();renderArt();
}
function filteredLibrary(){
  const q=$('search').value.trim().toLocaleLowerCase('fr'),el=$('element-filter').value;
  const items=state.mode==='references'?state.cards.map(c=>({card:c,draft:null})):state.drafts.map(d=>({card:state.cards.find(c=>c.key===d.key),draft:d})).filter(i=>i.card);
  return items.filter(i=>(!el||i.card.element===el)&&(!q||(i.draft?.profile.name||i.card.profile.name).toLocaleLowerCase('fr').includes(q)||(i.draft?.profile.title||i.card.profile.title).toLocaleLowerCase('fr').includes(q)));
}
function sizeLibrary(){const h=$('library-list').clientHeight;if(!h)return;const size=Math.max(1,Math.floor(h/(matchMedia('(min-width:1650px)').matches?112:104)));if(size!==state.size){state.size=size;renderLibrary();}}
function renderLibrary(){
  $('reference-count').textContent=state.cards.length;
  const list=filteredLibrary(),pages=Math.max(1,Math.ceil(list.length/state.size));state.page=Math.min(state.page,pages-1);
  const host=$('library-list');host.replaceChildren();
  for(const item of list.slice(state.page*state.size,(state.page+1)*state.size)){
    const c=item.card,f=item.draft?.profile||c.profile,b=document.createElement('button');b.className='library-item';
    const selected=state.selected?.key===c.key&&(state.mode==='references'||state.draft?.id===item.draft?.id);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
    b.innerHTML=`<img src="${c.preview}" width="53" height="88" alt=""><span class="item-text"><strong>${escape(f.name)}</strong><small>${escape(f.title)}</small><span class="element-name">${escape(labels[c.element])}</span></span>`;
    b.addEventListener('click',()=>selectCard(c,item.draft));host.append(b);
  }
  if(!list.length){const p=document.createElement('p');p.className='empty';p.textContent=state.mode==='drafts'?'Aucun brouillon':'Aucune carte';host.append(p);}
  $('library-page').textContent=(state.page+1)+' / '+pages;$('library-prev').disabled=state.page===0;$('library-next').disabled=state.page===pages-1;
}
function renderStats(){
  const side=state.side,mode=side==='atk'?'magic':'barriers';
  $('side-atk').setAttribute('aria-pressed',String(side==='atk'));$('side-def').setAttribute('aria-pressed',String(side==='defense'));
  $('mode-label').textContent=side==='atk'?'Magie':'Barriere';
  const host=$('stat-rows');host.replaceChildren();
  state.form[side].forEach((value,i)=>{
    const die=6-i,row=document.createElement('div');row.className='stat-row';const numeric=typeof value==='number';
    const options=['number',...state.selected.options[side][i]];
    row.innerHTML=`<span class="die-label">D${die}</span><select aria-label="${side==='atk'?'ATK':'DEF'} D${die}, type">${options.map(v=>`<option value="${escape(v)}">${escape(v==='number'?'Valeur':effects[v]||v)}</option>`).join('')}</select><input type="number" min="0" max="999" step="1" inputmode="numeric" aria-label="${side==='atk'?'ATK':'DEF'} D${die}, valeur"><label class="mode-toggle" title="${side==='atk'?'Attaque magique':'Barriere'}"><input type="checkbox" aria-label="D${die}, ${side==='atk'?'attaque magique':'barriere'}"><span><i data-lucide="${side==='atk'?'sparkles':'shield-check'}"></i></span></label>`;
    const select=row.querySelector('select'),number=row.querySelector('input[type=number]'),toggle=row.querySelector('input[type=checkbox]');select.value=numeric?'number':value;number.value=numeric?value:'';number.disabled=!numeric;toggle.checked=state.form[mode].includes(die);toggle.disabled=!numeric||state.selected.element==='NONE';
    select.addEventListener('change',()=>{state.form[side][i]=select.value==='number'?(typeof state.selected.profile[side][i]==='number'?state.selected.profile[side][i]:0):select.value;if(select.value!=='number')state.form[mode]=state.form[mode].filter(n=>n!==die);renderStats();markChanged();});
    number.addEventListener('input',()=>{state.form[side][i]=number.value===''?null:Number(number.value);markChanged();});
    toggle.addEventListener('change',()=>{state.form[mode]=state.form[mode].filter(n=>n!==die);if(toggle.checked)state.form[mode].push(die);state.form[mode].sort((a,b)=>b-a);markChanged();});host.append(row);
  });icons();
}
function renderPositions(){
  const roles=['Tank','DPS physique','Middle','DPS magique','Support'];$('position-board').replaceChildren();
  roles.forEach((role,i)=>{const p=i+1,label=document.createElement('label');label.className='position-option';label.innerHTML=`<b>P${p}</b><span>${role}</span><input type="checkbox" aria-label="Position ${p}, ${role}">`;const input=label.querySelector('input');input.checked=state.form.positions.includes(p);input.addEventListener('change',()=>{state.form.positions=state.form.positions.filter(v=>v!==p);if(input.checked)state.form.positions.push(p);state.form.positions.sort((a,b)=>a-b);updatePositions();markChanged();});$('position-board').append(label);});updatePositions();
}
function updatePositions(){$('board-summary').textContent=state.form.positions.length?state.form.positions.map(p=>'P'+p).join(' / '):'Choisir au moins une position';}
function renderArt(){$('art-thumbnail').src=state.upload?'/media/upload/'+state.upload+'.png':state.selected.preview;$('art-label').textContent=state.upload?'Illustration importee':'Illustration de reference';$('restore-art').disabled=!state.upload;}
function previewCaption(){
  if(!state.selected)return;const draft=state.preview==='draft'&&state.lastRender;
  const profile=draft?state.lastRender.profile:state.selected.profile;
  $('card-name').textContent=profile.name;$('card-name').title=profile.name;$('card-title').textContent=profile.title;$('card-title').title=profile.title;
  const current=state.lastRender&&state.lastRender.signature===signature();
  $('preview-state').textContent=draft?(current?'Brouillon contr\u00f4l\u00e9':'Rendu pr\u00e9c\u00e9dent'):(signature()!==JSON.stringify({key:state.selected.key,profile:state.selected.profile,upload:null})?'Modifications \u00e0 composer':'R\u00e9f\u00e9rence valid\u00e9e');
  $('show-draft').disabled=!state.lastRender;
  $('show-reference').setAttribute('aria-pressed',String(!draft));$('show-draft').setAttribute('aria-pressed',String(!!draft));
  for(const ext of ['png','psd']){const link=$('download-'+ext);link.classList.toggle('disabled',!state.lastRender);if(state.lastRender)link.href='/exports/'+state.lastRender.id+'/card.'+ext;else link.removeAttribute('href');link.setAttribute('aria-disabled',String(!state.lastRender));}
}
function showPreview(){
  if(!state.selected)return;const draft=state.preview==='draft'&&state.lastRender;
  $('card-image').src=draft?'/exports/'+state.lastRender.id+'/card.png':state.selected.preview;$('card-image').alt='Carte '+(draft?state.lastRender.profile.name:state.selected.profile.name);$('image-error').hidden=true;previewCaption();
}
function tab(name){
  document.querySelectorAll('.editor-tabs button').forEach(b=>{const active=b.dataset.tab===name;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$('panel-'+b.dataset.tab).hidden=!active;});
}
async function save(){
  if(state.saving||!state.form)return;
  const selection=state.selection,snapshot=signature();state.saving=true;$('save').disabled=true;
  try{
    const draft=await api('/api/drafts',{id:state.draft?.id,revision:state.draft?.revision,key:state.selected.key,profile:state.form,upload:state.upload});
    if(state.selection===selection&&signature()===snapshot){state.draft=draft;state.form=clone(draft.profile);state.saved=signature();fillEditor();markChanged();}
    state.drafts=await api('/api/drafts');renderLibrary();toast('Brouillon enregistr\u00e9.');
  }catch(e){toast(e.message);}finally{state.saving=false;$('save').disabled=false;}
}
async function compose(){
  if(!state.form||state.submitting)return;
  for(const key of ['name','title','job','description'])state.form[key]=state.form[key].trim().replace(/ +/g,' ');
  fillEditor();markChanged();
  const submitted={selection:state.selection,key:state.selected.key,signature:signature(),profile:clone(state.form),upload:state.upload};state.submitting=true;$('compose').disabled=true;
  try{const result=await api('/api/jobs',{key:submitted.key,profile:submitted.profile,upload:submitted.upload});if(state.selection===submitted.selection)state.pending={id:result.id,...submitted};toast('Composition ajout\u00e9e \u00e0 la file.');}catch(e){toast(e.message);}finally{state.submitting=false;await poll();}
}
async function poll(){
  try{
    const s=await api('/api/status');state.jobs=s.jobs;state.gate=s.gate;state.integrity=s.integrity;
    const busy=s.jobs.find(j=>['checking','rendering','verifying'].includes(j.state))||s.jobs.find(j=>j.state==='queued');
    const pending=state.pending&&s.jobs.find(j=>j.id===state.pending.id);
    if(pending?.state==='verified'){
      if(state.pending.key===state.selected?.key){state.lastRender={...state.pending};state.preview='draft';showPreview();toast('Brouillon compose et controle.');}
      state.pending=null;
    }else if(pending?.state==='failed'){toast(pending.message);state.pending=null;}
    const title=busy?(busy.progress&&busy.state==='rendering'?`${busy.progress.name} · ${busy.progress.index+1}/${busy.progress.total}`:busy.message):s.integrity.state==='changed'?'Reference modifiee':s.gate.passed?'Atelier pret':'Reproduction des references requise';
    $('status-title').textContent=title;
    $('status-detail').textContent=busy?'Photoshop · fichier source preserve':s.integrity.state==='changed'?s.integrity.message:s.gate.passed?`${s.gate.count??state.cards.length} references identiques · aucun original remplace`:'Compositions bloquees avant verification';
    $('status-dot').className='status-dot'+(busy?' busy':s.integrity.state==='changed'?' error':'');
    $('compose').disabled=!state.selected||!s.gate.passed||s.integrity.state!=='intact'||!!state.pending||state.submitting;
    const ok=s.integrity.state==='intact'&&s.gate.passed;
    $('integrity-text').textContent=ok?`${s.gate.count??state.cards.length} / ${state.cards.length} verrouill\u00e9es`:s.integrity.state==='changed'?'Contr\u00f4le requis':busy||s.integrity.state==='checking'?'Contr\u00f4le en cours':'Validation requise';$('integrity').className='integrity'+(ok?'':s.integrity.state==='changed'?' is-error':' is-warning');
    if($('history-dialog').open)renderHistory();if($('integrity-dialog').open)renderIntegrity();
  }catch(e){$('status-title').textContent='Atelier deconnecte';$('status-detail').textContent='Relancer le service local';$('compose').disabled=true;}
}
function renderHistory(){
  const size=matchMedia('(max-height:650px)').matches?3:6,pages=Math.max(1,Math.ceil(state.jobs.length/size));state.historyPage=Math.min(state.historyPage,pages-1);
  $('history-list').replaceChildren();
  for(const job of state.jobs.slice(state.historyPage*size,(state.historyPage+1)*size)){
    const row=document.createElement('div');row.className='history-row';const c=state.cards.find(c=>c.key===job.key),name=job.kind==='regression'?(job.progress?.total?`Reproduction de ${job.progress.total} references`:'Reproduction des references'):c?.profile.name||'Brouillon';
    row.innerHTML=`<div><strong>${escape(name)}</strong><p title="${escape(job.message)}">${escape(job.state==='failed'?'Contr\u00f4le bloqu\u00e9. Export non disponible.':job.message)}</p></div>`;
    if(job.kind==='draft'&&job.state==='verified'){
      const b=document.createElement('button');b.className='command secondary';b.innerHTML='<i data-lucide="scan-eye"></i>Ouvrir';b.addEventListener('click',async()=>{try{if(dirty()&&!confirm('Quitter les modifications non enregistrees ?'))return;const info=await api('/api/jobs/'+job.id),r=info.request[0];selectCard(c,{profile:r.profile,upload:r.upload},true);state.draft=null;state.saved=signature();state.lastRender={id:job.id,profile:r.profile,signature:signature()};state.preview='draft';showPreview();$('history-dialog').close();}catch(e){toast(e.message);}});row.append(b);
    }else {const label=document.createElement('span');label.className='status-text';label.textContent=job.state==='verified'?'Conforme':job.state==='failed'?'Bloque':'En cours';row.append(label);}
    $('history-list').append(row);
  }
  if(!state.jobs.length)$('history-list').innerHTML='<p class="empty">Aucune composition</p>';
  $('history-page').textContent=(state.historyPage+1)+' / '+pages;$('history-prev').disabled=state.historyPage===0;$('history-next').disabled=state.historyPage===pages-1;icons();
}
function renderIntegrity(){
  const s=state.integrity,g=state.gate;
  $('integrity-report').innerHTML=[['Sources',s.state==='intact'?'Intactes':s.state==='changed'?'Modification detectee':'Verification'],['Fichiers proteges',s.count||'...'],['Cartes reproduites',(g.count??0)+' / '+state.cards.length],['Pixels differents',g.passed?'0':'Non valide'],['Moteur','Photoshop'],['Publication','Brouillons uniquement']].map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('');
  $('rerun').disabled=state.jobs.some(j=>['queued','rendering','checking','verifying'].includes(j.state));
}
async function init(){
  icons();
  try{
    const boot=await api('/api/bootstrap');Object.assign(state,{cards:boot.cards,token:boot.token,gate:boot.gate,integrity:boot.integrity});
    for(const [id,label] of Object.entries(labels)){const o=document.createElement('option');o.value=id;o.textContent=label;$('element-filter').append(o);}
    state.drafts=await api('/api/drafts');
    let cached;try{cached=JSON.parse(localStorage.getItem('kalistar-atelier-working')||'null');}catch{}
    const restored=state.cards.find(c=>c.key===cached?.key);
    const shape=restored&&['name','title','job','description'].every(k=>typeof cached.profile?.[k]==='string')&&['positions','atk','defense','magic','barriers'].every(k=>Array.isArray(cached.profile?.[k]));
    selectCard(shape?restored:state.cards[0],null,true);
    if(shape){state.form=cached.profile;state.upload=cached.upload||null;state.draft=cached.draft||null;state.saved=typeof cached.saved==='string'?cached.saved:'';fillEditor();markChanged();}
    sizeLibrary();await poll();setInterval(poll,2500);
  }catch(e){$('status-title').textContent='Atelier indisponible';$('status-detail').textContent=e.message;toast(e.message);}
}
for(const key of ['name','title','job','description'])$('field-'+key).addEventListener('input',e=>{if(state.form){state.form[key]=e.target.value.replace(/[\r\n\t]+/g,' ');markChanged();}});
document.querySelectorAll('.mobile-nav button').forEach(b=>b.addEventListener('click',()=>pane(b.dataset.pane)));
document.querySelectorAll('.editor-tabs button').forEach((b,i,buttons)=>{b.addEventListener('click',()=>tab(b.dataset.tab));b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%buttons.length;if(e.key==='ArrowLeft')n=(i+buttons.length-1)%buttons.length;if(e.key==='Home')n=0;if(e.key==='End')n=buttons.length-1;if(n===undefined)return;e.preventDefault();tab(buttons[n].dataset.tab);buttons[n].focus();});});
$('search').addEventListener('input',()=>{state.page=0;renderLibrary();});$('element-filter').addEventListener('change',()=>{state.page=0;renderLibrary();});
document.querySelectorAll('#library-modes button').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;state.page=0;document.querySelectorAll('#library-modes button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderLibrary();}));
$('library-prev').addEventListener('click',()=>{state.page--;renderLibrary();});$('library-next').addEventListener('click',()=>{state.page++;renderLibrary();});
$('side-atk').addEventListener('click',()=>{state.side='atk';renderStats();});$('side-def').addEventListener('click',()=>{state.side='defense';renderStats();});
$('show-reference').addEventListener('click',()=>{state.preview='reference';showPreview();});$('show-draft').addEventListener('click',()=>{state.preview='draft';showPreview();});
$('reset').addEventListener('click',()=>{if(state.selected&&(!dirty()||confirm('Retablir toutes les donnees de la reference ?')))selectCard(state.selected,null,true);});
$('save').addEventListener('click',save);$('compose').addEventListener('click',compose);
$('restore-art').addEventListener('click',()=>{state.upload=null;renderArt();markChanged();});
$('art-upload').addEventListener('change',async e=>{const file=e.target.files[0],selection=state.selection;if(!file)return;try{if(file.size>8000000)throw Error('Image limitee a 8 Mo.');const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Lecture impossible.'));reader.readAsDataURL(file);});const result=await api('/api/uploads',{base64});if(state.selection===selection){state.upload=result.id;renderArt();markChanged();toast('Illustration import\u00e9e.');}else toast('Import termin\u00e9. La carte s\u00e9lectionn\u00e9e reste inchang\u00e9e.');}catch(error){toast(error.message);}finally{e.target.value='';}});
$('zoom').addEventListener('click',()=>{if(!state.selected)return;$('viewer-image').src=$('card-image').src;$('viewer-name').textContent=$('card-name').textContent;$('viewer').showModal();});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
$('history').addEventListener('click',()=>{renderHistory();$('history-dialog').showModal();});$('history-prev').addEventListener('click',()=>{state.historyPage--;renderHistory();});$('history-next').addEventListener('click',()=>{state.historyPage++;renderHistory();});
$('integrity').addEventListener('click',async()=>{renderIntegrity();$('integrity-dialog').showModal();try{state.integrity=await api('/api/integrity',{});renderIntegrity();}catch(e){toast(e.message);}});
$('rerun').addEventListener('click',async()=>{try{await api('/api/regression',{});$('integrity-dialog').close();toast(`Verification des ${state.cards.length} references lancee.`);await poll();}catch(e){toast(e.message);}});
$('card-image').addEventListener('error',()=>$('image-error').hidden=false);
window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
new ResizeObserver(sizeLibrary).observe($('library-list'));
init();
