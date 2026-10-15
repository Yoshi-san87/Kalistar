(() => {
  'use strict';
  const cities=[
    {id:'kalistopolis',name:'Kalistopolis',kind:'Sanctuaire',x:881,y:403,text:'Sur son île centrale, Kalistopolis abrite un sanctuaire consacré aux essences. Son temple se dresse à l’écart des grands continents.'},
    {id:'durane',name:'Durane',kind:'Cité de l’Obélisque de Fer',x:449,y:355,text:'Durane se tient contre le rebord du grand cratère. L’Obélisque de Fer domine sa place, repère monumental de la cité.'},
    {id:'arborium',name:'Arborium',kind:'Cité du dôme',x:391,y:531,text:'Au cœur de la grande forêt occidentale, Arborium se reconnaît à son dôme nervuré, entouré de bois et de cours d’eau.'},
    {id:'velane',name:'Velane',kind:'Village de cabanes',x:292,y:475,text:'Velane est un village accueillant de cabanes nichées dans les arbres, habité principalement par des humains. Il occupe la lisière nord-ouest de la grande forêt.'},
    {id:'woodland',name:'WoodLand',kind:'Terre des Cerelf',x:529,y:490,text:'WoodLand, la terre des Cerelf, se situe à droite d’un lac en forme de cœur dans la forêt côtière occidentale. Sa cité arboricole relie les arbres par des passerelles, une architecture végétale et des cascades.'},
    {id:'vulkar',name:'Vulkar',kind:'Cité du plateau du feu',x:181,y:330,text:'Vulkar se situe au milieu des trois volcans du plateau du feu. Les terres cendrées et les escarpements descendent jusqu’à la lisière de la forêt.'},
    {id:'cryptown',name:'Cryptown',kind:'Royaume des Skullz',x:108,y:627,text:'Cryptown est un royaume des Skullz prenant la forme d’un cimetière géant. Une croix funéraire le représente au cœur du gouffre sombre de son île.'},
    {id:'thalassea',name:'Thalassea',kind:'Cité sous-marine',x:897,y:717,text:'Thalassea est une cité sous-marine abritée dans une bulle au fond de la mer, au centre d’un anneau d’îles et de récifs.'}
  ];
  const symbolSizes={kalistopolis:62,durane:76,arborium:60,velane:60,woodland:44,vulkar:56,cryptown:42,thalassea:50};
  for(const city of cities)city.symbolSize=symbolSizes[city.id];
  function create() {
    let controller,observer,viewport,stage,frame,marker,zoom=1,drag=null,selected=null;
    function destroy(){controller?.abort();observer?.disconnect();controller=observer=viewport=stage=frame=marker=null;drag=null;selected=null;}
    function highlight(){const city=cities.find(city=>city.id===selected);marker.hidden=!city;if(city){marker.style.left=(city.x/1774*100)+'%';marker.style.top=(city.y/887*100)+'%';marker.setAttribute('aria-label',city.name+' sélectionné');}}
    function landmarks(scale){
      const compact=viewport.clientWidth<700;
      frame.dataset.compactLabels=String(compact);
      const items=cities.map(city=>{const node=frame.querySelector('[data-map-landmark="'+city.id+'"]'),img=node.querySelector('img');return {city,node,aspect:img.naturalWidth/Math.max(1,img.naturalHeight)||1};});
      for(const item of items){
        const {city,node,aspect}=item,on=city.id===selected;
        let height=Math.min(90,Math.max(on&&zoom>1?44:compact?24:36,city.symbolSize*scale));
        if(!on||zoom===1)for(const other of items)if(other!==item){
          const dx=Math.abs(city.x-other.city.x)*scale,dy=Math.abs(city.y-other.city.y)*scale;
          height=Math.min(height,Math.max(18,Math.max(2*dx/(aspect+other.aspect),dy)*.88));
        }
        node.style.height=height+'px';node.style.width=(height*aspect)+'px';
        node.classList.toggle('is-selected',on);
        const label=node.querySelector('span');label.style.top=(height+4)+'px';
        const half=label.getBoundingClientRect().width/2+4,x=city.x*scale;
        label.style.left=(Math.max(half,Math.min(frame.clientWidth-half,x))-x+height*aspect/2)+'px';
        if(on){marker.style.width=(height*aspect+12)+'px';marker.style.height=(height+12)+'px';}
      }
    }
    function render(next=zoom){
      if(!viewport)return;
      const cx=(viewport.scrollLeft+viewport.clientWidth/2)/Math.max(1,stage.offsetWidth),cy=(viewport.scrollTop+viewport.clientHeight/2)/Math.max(1,stage.offsetHeight);
      zoom=Math.max(1,Math.min(8,next));const fit=Math.min(viewport.clientWidth/1774,viewport.clientHeight/887);
      const width=Math.round(1774*fit*zoom),height=Math.round(887*fit*zoom);
      frame.style.width=width+'px';frame.style.height=height+'px';stage.style.width=Math.max(width,viewport.clientWidth)+'px';stage.style.height=Math.max(height,viewport.clientHeight)+'px';
      viewport.scrollLeft=cx*stage.offsetWidth-viewport.clientWidth/2;viewport.scrollTop=cy*stage.offsetHeight-viewport.clientHeight/2;viewport.dataset.zoomed=String(zoom>1);
      if(selected&&zoom>1){const city=cities.find(city=>city.id===selected);viewport.scrollLeft=frame.offsetLeft+city.x/1774*frame.offsetWidth-viewport.clientWidth/2;viewport.scrollTop=frame.offsetTop+city.y/887*frame.offsetHeight-viewport.clientHeight/2;}
      const root=viewport.parentElement;root.querySelector('[data-map-action="out"]').disabled=zoom===1;root.querySelector('[data-map-action="in"]').disabled=zoom===8;landmarks(width/1774);highlight();
    }
    function select(id){
      selected=selected===id?null:id;
      const root=viewport.closest('.kalistar-map');
      for(const button of root.querySelectorAll('[data-map-city]')){const on=button.dataset.mapCity===selected;button.setAttribute('aria-expanded',String(on));button.closest('.map-city').classList.toggle('selected',on);root.querySelector('#'+button.getAttribute('aria-controls')).hidden=!on;}
      const fit=Math.min(viewport.clientWidth/1774,viewport.clientHeight/887);
      if(selected&&viewport.clientWidth<700)render(Math.max(zoom,Math.min(8,46/(cities.find(city=>city.id===selected).symbolSize*fit))));
      else render();
    }
    function mount(root){
      destroy();zoom=1;controller=new AbortController();const signal=controller.signal;
      root.innerHTML='<section class="kalistar-map" aria-label="Map de Kalistar"><aside class="map-cities" aria-label="Villes de Kalistar"><h1>Villes de Kalistar</h1>'+cities.map(city=>'<section class="map-city"><h2><button data-map-city="'+city.id+'" aria-expanded="false" aria-controls="map-city-'+city.id+'"><img src="assets/map/'+city.id+'-v1.webp" alt="" width="56" height="56"><span><b>'+city.name+'</b><small>'+city.kind+'</small></span><i data-lucide="chevron-down"></i></button></h2><div id="map-city-'+city.id+'" class="map-city-details" hidden><p>'+city.text+'</p></div></section>').join('')+'</aside><div class="map-canvas"><div class="map-tools" role="toolbar" aria-label="Vue de la carte">'+
        [['out','minus','Dézoomer'],['in','plus','Zoomer'],['fit','scan','Afficher toute la carte']].map(([action,icon,label])=>'<button class="icon-button" data-map-action="'+action+'" title="'+label+'" aria-label="'+label+'"><i data-lucide="'+icon+'"></i></button>').join('')+
        '</div><div class="map-viewport" tabindex="0" role="region" aria-label="Carte navigable"><div class="map-stage"><div class="map-image-frame"><img class="map-atlas" src="assets/ui/kalistar-atlas-1.36.webp" width="1774" height="887" alt="Atlas de Kalistar : Kalistopolis, Durane, Arborium, Velane, WoodLand, Vulkar, Cryptown et Thalassea." draggable="false" decoding="async">'+cities.map(city=>'<span class="map-landmark" data-map-landmark="'+city.id+'" style="left:'+city.x/1774*100+'%;top:'+city.y/887*100+'%" aria-hidden="true"><img src="assets/map/'+city.id+'-v2.webp" alt=""><span>'+city.name+'</span></span>').join('')+'<span class="map-city-marker" role="img" hidden></span></div></div></div></div></section>';
      viewport=root.querySelector('.map-viewport');stage=root.querySelector('.map-stage');frame=root.querySelector('.map-image-frame');marker=root.querySelector('.map-city-marker');
      root.addEventListener('click',event=>{const city=event.target.closest('[data-map-city]');if(city){select(city.dataset.mapCity);return;}const button=event.target.closest('[data-map-action]');if(button)render(button.dataset.mapAction==='fit'?1:zoom*(button.dataset.mapAction==='in'?1.5:1/1.5));},{signal});
      viewport.addEventListener('keydown',event=>{if(['+','=','-','0'].includes(event.key)){event.preventDefault();render(event.key==='0'?1:zoom*(event.key==='-'?1/1.5:1.5));}},{signal});
      viewport.addEventListener('dblclick',()=>render(zoom===1?2:1),{signal});
      viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0||zoom===1)return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);},{signal});
      viewport.addEventListener('pointermove',event=>{if(drag){viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;}},{signal});
      for(const name of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(name,()=>{drag=null;},{signal});
      observer=new ResizeObserver(()=>render());observer.observe(viewport);render();
      for(const img of frame.querySelectorAll('.map-landmark img'))img.addEventListener('load',()=>render(),{signal});
    }
    return {mount,destroy};
  }
  window.KalistarMap={create,cities};
})();
