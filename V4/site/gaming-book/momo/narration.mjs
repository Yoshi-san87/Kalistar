const sentences=typeof Intl.Segmenter==='function'?new Intl.Segmenter('fr',{granularity:'sentence'}):null;
export function formatNarration(message){
  return sentences?[...sentences.segment(message)].map(s=>s.segment.trim()).filter(Boolean).join('\n'):message.replace(/([.!?…])\s+/gu,'$1\n');
}

export function createNarrator(element,{reduced=false}={}){
  const readable=document.createElement('span');readable.className='sr-only';
  const layers=[0,1].map(()=>{const span=document.createElement('span');span.className='narration-layer';span.setAttribute('aria-hidden','true');return span;});
  element.replaceChildren(readable,...layers);
  let current=0,text='',suspended=false,animations=[];
  function cancel(){for(const a of animations)a.cancel();animations=[];}
  function settle(){cancel();layers.forEach((layer,i)=>{layer.style.opacity=i===current?'1':'0';layer.style.filter='none';layer.style.transform='none';});}
  function show(message,{cut=false}={}){
    if(message===text)return;
    cancel();text=message;readable.textContent=message;
    const outgoing=layers[current];current=1-current;const incoming=layers[current];
    if(cut)outgoing.textContent='';
    incoming.textContent=formatNarration(message);incoming.style.opacity='1';outgoing.style.opacity='0';
    if(reduced||!element.animate){settle();return;}
    animations=[
      outgoing.animate([{opacity:1,filter:'blur(0px)',transform:'translateY(0)'},{opacity:0,filter:'blur(4px)',transform:'translateY(-3px)'}],{duration:320,easing:'ease-out'}),
      incoming.animate([{opacity:0,filter:'blur(7px)',transform:'translateY(5px)'},{opacity:1,filter:'blur(0px)',transform:'translateY(0)'}],{duration:760,delay:180,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}),
    ];
    if(suspended)for(const a of animations)a.pause();
  }
  return {
    show,
    suspend(value){suspended=value;for(const a of animations)if(a.playState!=='finished')value?a.pause():a.play();},
    reduce(value){reduced=value;if(value)settle();},
    dispose:cancel,
    snapshot:()=>({text,active:animations.filter(a=>a.playState==='running').length,suspended,reduced}),
  };
}
