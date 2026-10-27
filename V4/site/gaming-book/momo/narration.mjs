const sentences=typeof Intl.Segmenter==='function'?new Intl.Segmenter('fr',{granularity:'sentence'}):null;
export function formatNarration(message){
  return sentences?[...sentences.segment(message)].map(s=>s.segment.trim()).filter(Boolean).join('\n'):message.replace(/([.!?…])\s+/gu,'$1\n');
}
const graphemes=typeof Intl.Segmenter==='function'?new Intl.Segmenter('fr',{granularity:'grapheme'}):null;
export const narrationGlyphs=message=>graphemes?[...graphemes.segment(formatNarration(message))].map(s=>s.segment):Array.from(formatNarration(message));
export const typingDefaults=Object.freeze({letterMs:28,pauseMs:160,commaMs:70,lineMs:90,leadMs:160});
export function glyphDelay(glyph,settings=typingDefaults){
  if(glyph==='\n')return settings.lineMs;
  if(/[.!?…]/u.test(glyph))return settings.pauseMs;
  if(/[,;:]/u.test(glyph))return settings.commaMs;
  return /\s/u.test(glyph)?10:settings.letterMs;
}

export function createNarrator(element,{reduced=false,settings={},onChange=()=>{}}={}){
  const timing={...typingDefaults,...settings};
  const readable=document.createElement('span');readable.className='sr-only';
  const layers=[0,1].map(()=>{const span=document.createElement('span');span.className='narration-layer';span.setAttribute('aria-hidden','true');return span;});
  element.replaceChildren(readable,...layers);
  let current=0,text='',suspended=false,animations=[];
  let glyphs=[],letters=[],visible=0,typing=false,timer=0,due=0,remaining=0,revision=0,disposed=false;
  function cancelTyping(){clearTimeout(timer);timer=0;revision++;}
  function cancel(){for(const a of animations)a.cancel();animations=[];}
  function settle(){cancel();layers.forEach((layer,i)=>{layer.style.opacity=i===current?'1':'0';layer.style.filter='none';layer.style.transform='none';});}
  function revealAll(){
    cancelTyping();for(let i=visible;i<letters.length;i++)letters[i].classList.add('is-visible');
    visible=letters.length;typing=false;onChange();
  }
  function schedule(){
    if(disposed||suspended||!typing||timer)return;
    const version=revision;due=performance.now()+remaining;
    timer=setTimeout(()=>{
      timer=0;if(disposed||suspended||version!==revision)return;
      letters[visible].classList.add('is-visible');
      const glyph=glyphs[visible++];
      if(visible===letters.length){typing=false;onChange();return;}
      remaining=glyphDelay(glyph,timing);schedule();
    },remaining);
  }
  function show(message,{cut=false}={}){
    if(disposed||message===text)return;
    cancelTyping();cancel();text=message;readable.textContent=message;
    const outgoing=layers[current];current=1-current;const incoming=layers[current];
    if(cut)outgoing.textContent='';
    glyphs=narrationGlyphs(message);visible=0;typing=glyphs.length>0;
    // Hidden glyphs retain the final line layout, so typing never shifts a word.
    letters=glyphs.map(glyph=>{const span=document.createElement('span');span.className='narration-letter';span.textContent=glyph;return span;});
    incoming.replaceChildren(...letters);incoming.style.opacity='1';outgoing.style.opacity='0';
    if(reduced||!typing){revealAll();settle();return;}
    if(element.animate)animations=[
      outgoing.animate([{opacity:1,filter:'blur(0px)'},{opacity:0,filter:'blur(3px)'}],{duration:220,easing:'ease-out'}),
      incoming.animate([{opacity:0,filter:'blur(3px)'},{opacity:1,filter:'blur(0px)'}],{duration:360,delay:80,easing:'ease-out',fill:'backwards'}),
    ];
    if(suspended)for(const a of animations)a.pause();
    remaining=timing.leadMs;schedule();onChange();
  }
  return {
    show,
    isTyping:()=>typing,
    complete(){if(!typing||suspended||disposed)return false;revealAll();settle();return true;},
    suspend(value){
      if(suspended===value)return;
      if(value&&timer){remaining=Math.max(0,due-performance.now());cancelTyping();}
      suspended=value;for(const a of animations)if(a.playState!=='finished')value?a.pause():a.play();
      if(!value)schedule();
    },
    reduce(value){reduced=value;if(value){revealAll();settle();}},
    dispose(){disposed=true;typing=false;cancelTyping();cancel();},
    snapshot:()=>({text,active:animations.filter(a=>a.playState==='running').length,suspended,reduced,typing,visible,total:letters.length,scheduled:!!timer}),
  };
}
