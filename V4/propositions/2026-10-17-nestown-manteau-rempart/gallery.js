(() => {
  'use strict';
  const cards=JSON.parse(document.getElementById('gallery-data').textContent);
  const search=document.getElementById('search'),group=document.getElementById('group');
  const figures=[...document.querySelectorAll('.gallery>figure')],dialog=document.getElementById('viewer');
  const normalise=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const byId=new Map(cards.map(c=>[String(c.number),c]));
  let active=null,opener=null;
  const visible=()=>figures.filter(f=>!f.hidden);
  function filter(){
    const term=normalise(search.value.trim());
    for(const figure of figures)figure.hidden=!(normalise(figure.dataset.search).includes(term)&&(!group.value||figure.dataset.group===group.value));
    const count=visible().length;
    document.getElementById('count').textContent=count+' / '+cards.length+' illustrations';
    document.getElementById('empty').hidden=count>0;
  }
  function show(number){
    active=byId.get(String(number));if(!active)return;
    document.getElementById('full-art').src=active.file;
    document.getElementById('full-art').alt=active.name+' : '+active.title;
    document.getElementById('viewer-title').textContent=active.name;
    document.getElementById('viewer-subtitle').textContent=active.title;
    document.getElementById('viewer-group').textContent=active.group;
    document.getElementById('viewer-scene').textContent=active.scene;
    for(const key of ['costume','weapon','crystal'])document.getElementById('viewer-'+key).textContent=active[key];
    document.getElementById('original').href=active.file;
    document.getElementById('counter').textContent=String(active.number).padStart(2,'0')+' / '+cards.length;
    const list=visible(),index=list.findIndex(f=>Number(f.dataset.number)===active.number);
    document.getElementById('previous').disabled=index<=0;
    document.getElementById('next').disabled=index<0||index>=list.length-1;
  }
  function step(direction){
    const list=visible(),index=list.findIndex(f=>Number(f.dataset.number)===active?.number),next=list[index+direction];
    if(next)show(next.dataset.number);
  }
  document.querySelector('.gallery').addEventListener('click',event=>{
    const link=event.target.closest('.art');
    if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();opener=link;show(link.closest('figure').dataset.number);
    dialog.showModal();document.body.classList.add('has-dialog');document.getElementById('close').focus();
  });
  document.getElementById('close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.classList.remove('has-dialog');opener?.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  });
  document.getElementById('previous').addEventListener('click',()=>step(-1));
  document.getElementById('next').addEventListener('click',()=>step(1));
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();step(1);}
  });
  search.addEventListener('input',filter);group.addEventListener('change',filter);
  document.querySelector('form').addEventListener('submit',event=>event.preventDefault());
  globalThis.lucide?.createIcons();filter();
})();
