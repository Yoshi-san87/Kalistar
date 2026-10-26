const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

// Try four half-circles; keep all 44px targets inside the court, nearest the actor.
export function layoutWheel(point,{width,height,top=64,bottom=64},open=true,count=5){
  top=Math.min(top,Math.max(8,height-180));
  const half=22,pad=8,radius=Math.min(82,Math.max(70,height-top-bottom-44));
  const bounds={left:pad+half,right:width-pad-half,top:Math.min(top+half,height/2),bottom:Math.max(height-bottom-half,height/2)};
  const anchor={x:point.x,y:point.y+24};
  if(!open||!count)return {origin:{x:clamp(anchor.x,bounds.left,bounds.right),y:clamp(anchor.y,bounds.top,bounds.bottom)},items:[],radius,arc:''};
  const span=Math.min(150,(count-1)*50);
  const candidates=[90,0,180,-90].map((direction,index)=>{
    const offsets=Array.from({length:count},(_,i)=>{const a=(direction-span/2+(count===1?0:i*span/(count-1)))*Math.PI/180;return {x:Math.cos(a)*radius,y:Math.sin(a)*radius};});
    const xs=[0,...offsets.map(p=>p.x)],ys=[0,...offsets.map(p=>p.y)];
    if(Math.max(...xs)-Math.min(...xs)>bounds.right-bounds.left||Math.max(...ys)-Math.min(...ys)>bounds.bottom-bounds.top)return null;
    const origin={x:clamp(anchor.x,bounds.left-Math.min(...xs),bounds.right-Math.max(...xs)),y:clamp(anchor.y,bounds.top-Math.min(...ys),bounds.bottom-Math.max(...ys))};
    return {origin,items:offsets.map(p=>({x:origin.x+p.x,y:origin.y+p.y})),score:(origin.x-anchor.x)**2+(origin.y-anchor.y)**2+index*900,radius};
  }).filter(Boolean);
  const best=candidates.sort((a,b)=>a.score-b.score)[0],first=best.items[0],last=best.items.at(-1);
  return {...best,arc:count<2?'':`M ${first.x} ${first.y} A ${radius} ${radius} 0 0 1 ${last.x} ${last.y}`};
}

export class ActionWheel {
  constructor({root,host,point,onToggle,onBack}){
    this.root=root;this.host=host;this.point=point;this.onToggle=onToggle;this.onBack=onBack;
    this.open=true;this.view='actions';this.actor=null;this.visible=false;
    this.toggle=root.querySelector('#action-toggle');
    this.arc=root.querySelector('.wheel-arc');this.link=root.querySelector('.wheel-link');this.tip=root.querySelector('.wheel-tooltip');
    this.toggle.onclick=()=>this.view==='actions'?this.setOpen(!this.open):this.onBack();
    root.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&this.open){e.preventDefault();e.stopPropagation();if(this.view==='actions')this.setOpen(false);else this.onBack();this.toggle.focus();}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)||!this.open)return;
      const available=this.buttons.filter(b=>!b.disabled),index=available.indexOf(document.activeElement);
      if(index<0){if(document.activeElement===this.toggle){e.preventDefault();available[0]?.focus();}return;}
      e.preventDefault();
      const next=e.key==='Home'?0:e.key==='End'?available.length-1:(index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+available.length)%available.length;
      available[next]?.focus();
    });
    root.addEventListener('pointerover',e=>{if(e.pointerType!=='touch'&&matchMedia('(hover:hover)').matches)this.showTip(e.target.closest('button'));});
    root.addEventListener('pointerout',()=>this.tip.hidden=true);
    root.addEventListener('focusin',e=>{if(e.target.matches('button:focus-visible'))this.showTip(e.target);});
    root.addEventListener('focusout',()=>this.tip.hidden=true);
  }
  get buttons(){return [...this.root.querySelectorAll(this.view==='actions'?'#actions .wheel-action,#wait':'#target-options .wheel-action,#confirm-action')].filter(button=>!button.hidden);}
  setOpen(value){
    this.open=value;this.root.dataset.open=String(value);this.toggle.setAttribute('aria-expanded',String(value));
    this.tip.hidden=true;this.onToggle();this.position();
  }
  update({id,color,enabled,reduced}){
    if(this.actor!==id){this.actor=id;this.open=true;this.view='actions';}
    this.visible=enabled;this.root.hidden=!enabled;this.root.dataset.open=String(this.open);
    this.root.classList.toggle('reduced',reduced);this.root.style.setProperty('--team',color);
    this.toggle.setAttribute('aria-expanded',String(this.open));
    if(!enabled)this.tip.hidden=true;
    this.position();
  }
  position(){
    if(!this.visible)return;
    const point=this.point();if(!point)return;
    const width=this.host.clientWidth,height=this.host.clientHeight;
    this.root.hidden=width<240||height<190;if(this.root.hidden)return;
    this.root.dataset.view=this.view;
    const actions=this.view==='actions';
    this.root.querySelector('#actions').hidden=!actions;this.root.querySelector('#wait').hidden=!actions;
    this.root.querySelector('#target-options').hidden=actions;
    this.toggle.setAttribute('aria-label',actions?'Actions du joueur':'Revenir aux actions');
    this.toggle.title=actions?'Actions du joueur':'Revenir aux actions';
    const buttons=this.buttons,layout=layoutWheel(point,{width,height},this.open,buttons.length);
    const place=(button,p)=>{button.style.left=p.x+'px';button.style.top=p.y+'px';};
    const positions=actions?layout.items:[...layout.items].reverse();
    place(this.toggle,layout.origin);positions.forEach((p,i)=>place(buttons[i],p));
    const description=this.root.querySelector('#target-description');
    description.hidden=actions||!this.open;
    description.style.left=clamp(layout.origin.x,100,width-100)+'px';
    const lowest=Math.max(layout.origin.y,...layout.items.map(p=>p.y));
    description.style.top=Math.min(lowest+35,height-8-description.offsetHeight)+'px';
    this.arc.setAttribute('d',layout.arc);
    this.link.setAttribute('d',`M ${point.x} ${point.y} L ${layout.origin.x} ${layout.origin.y}`);
    this.tip.hidden=true;
  }
  showTip(button){
    if(!button||!this.visible)return;
    const host=this.host.getBoundingClientRect(),box=button.getBoundingClientRect();
    this.tip.textContent=button.title||button.getAttribute('aria-label');this.tip.hidden=false;
    this.tip.style.left=clamp(box.x+box.width/2-host.x,90,this.host.clientWidth-90)+'px';
    this.tip.style.top=(box.y-host.y>45?box.y-host.y-38:box.bottom-host.y+9)+'px';
  }
}
