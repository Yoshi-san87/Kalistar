import { Application, Container, Sprite, Graphics, Text, Assets, Texture, Rectangle } from '../assets/vendor/pixi-csp-sprites-v8.22.0.mjs';
import { WIDTH, HEIGHT, createProjection, DEFENSE_ZONES } from './projection.mjs';
import { fitViewport, normalizeZoom, zoomAt } from './viewport.mjs';
import { BALLS, getBall, getArena, normalizeAppearance } from './appearance.mjs';
import { SPRITES, SPRITE_CELL, SPRITE_FOOT, frameAt, spriteKey, facing, magicPose } from './sprites.mjs';
import { spriteSizing } from './sprite-sizing.mjs';
import { skillFor, unitEffects } from './core/skills.mjs';
import { goalAssetUrls, layoutGoal } from './goals.mjs';

const colors=[0x68e6cd,0xf08d9f], roleCode={meneur:'MN',scoreur:'SC',middle:'MD',sentry:'ST',pilier:'PI'};
const sprite=unit=>SPRITES[spriteKey(unit)];
const flat=points=>points.flatMap(p=>[p.x,p.y]);
const text=(value,size=13,color=0xfff1ce)=>new Text({text:value,style:{fontFamily:'Segoe UI',fontSize:size,fill:color,fontWeight:'600'}});
const smooth=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

export class CourtRenderer {
  constructor(host,{onCell,onUnit,onHover,onViewChange,appearance,roster}) {
    this.host=host;this.onHover=onHover;this.inputCounts={cellActivations:0,unitActivations:0};
    this.onCell=(...args)=>{this.inputCounts.cellActivations++;onCell(...args);};
    this.onUnit=(...args)=>{this.inputCounts.unitActivations++;onUnit(...args);};
    this.roster=roster;this.onViewChange=onViewChange;
    this.appearance=normalizeAppearance(appearance);const arena=getArena(this.appearance.arena);this.camera=createProjection(this.appearance.view,this.appearance.height,arena.ground,arena);
    this.zoom=innerWidth<=760?1.7:1;this.pan={x:0,y:0};this.tokens=new Map();this.state=null;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animating=false;this.idleEnabled=false;this.renderCount=0;this.frameChanges=0;this.poseCounts={};
  }
  get reduced(){return this._reduced;}
  set reduced(value){
    this._reduced=!!value;
    if(value){this.stopIdle();for(const t of this.tokens.values()){t.body.y=0;if(t.frames)this.pose(t,'idle',0);}this.render();}
  }
  async init(units) {
    this.app=new Application();
    await this.app.init({resizeTo:this.host,background:0x173d3c,autoStart:false,antialias:true,resolution:Math.min(devicePixelRatio,1.75),autoDensity:true,powerPreference:'low-power',preference:'webgl'});
    this.host.append(this.app.canvas);
    this.app.canvas.tabIndex=0;this.app.canvas.setAttribute('aria-label','Terrain tactique. Utiliser les flèches pour choisir une case, puis Entrée.');
    this.app.canvas.setAttribute('role','application');
    this.scene=new Container();this.app.stage.addChild(this.scene);
    // Keep texture loading compatible with Kalistar's strict production CSP.
    Assets.setPreferences({preferWorkers:false});
    const arena=getArena(this.appearance.arena);
    const textures=await Assets.load([...new Set([arena.isometric,arena.horizontal,...goalAssetUrls(arena),...(arena.flag?[arena.flag]:[]),...BALLS.map(ball=>ball.url),...units.map(unit=>this.character(unit).url)])]);
    this.textures=textures;this.loadedArenas=new Map([[arena.id,arena]]);
    this.backdrop=new Sprite(textures[arena.isometric]);this.backdrop.width=WIDTH;this.backdrop.height=HEIGHT;this.scene.addChild(this.backdrop);
    this.horizontalArt=new Container();this.scene.addChild(this.horizontalArt);
    this.flags=new Container();this.scene.addChild(this.flags);
    this.arenaBands=new Map();
    this.updateArenaArt();
    this.floor=new Graphics();this.floorLabels=new Container();this.scene.addChild(this.floor,this.floorLabels);
    this.goals=new Container();this.goals.eventMode='none';this.scene.addChild(this.goals);
    this.goalSprites=[new Sprite(),new Sprite()];this.goals.addChild(...this.goalSprites);
    this.overlay=new Graphics();this.scene.addChild(this.overlay);
    this.unitLayer=new Container();this.unitLayer.sortableChildren=true;this.scene.addChild(this.unitLayer);
    for(const unit of units)this.makeToken(unit,textures[this.character(unit).url]);
    this.ball=new Container();
    this.ball.addChild(new Graphics().ellipse(0,12,15,6).fill({color:0x081e23,alpha:.4}));
    this.ballGlow=new Graphics();this.ballImage=new Sprite();this.ballImage.anchor.set(.5);
    this.ball.addChild(this.ballGlow,this.ballImage);
    this.scene.addChild(this.ball);this.effects=new Container();this.scene.addChild(this.effects);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.host);
    this.setAppearance(this.appearance);this.bind();this.resize();
  }
  character(unit){return this.roster?.forUnit(unit)||sprite(unit);}
  async prepareAssets(appearance,units=[]){
    const arena=getArena(appearance.arena),urls=[arena.isometric,arena.horizontal,...goalAssetUrls(arena),...(arena.flag?[arena.flag]:[]),...units.map(unit=>this.character(unit).url)];
    // Keep the current and incoming backdrops only; city browsing must stay bounded.
    for(const [id,old] of this.loadedArenas){
      if(id===this.appearance.arena||id===arena.id)continue;
      for(const band of this.arenaBands.get(id)||[]){const texture=band.texture;band.destroy();texture.destroy(false);}
      this.arenaBands.delete(id);this.loadedArenas.delete(id);
      const oldUrls=[...new Set([old.isometric,old.horizontal])];
      for(const url of oldUrls)delete this.textures[url];
      await Assets.unload(oldUrls);
    }
    const missing=[...new Set(urls)].filter(url=>!this.textures[url]);
    if(missing.length)Object.assign(this.textures,await Assets.load(missing));
    this.loadedArenas.set(arena.id,arena);
  }
  updateArenaArt(){
    const arena=getArena(this.appearance.arena);
    this.backdrop.texture=this.textures[arena.isometric];
    this.backdrop.texture.source.scaleMode=arena.pixel?'nearest':'linear';
    for(const child of this.flags.removeChildren())child.destroy();
    if(arena.flag){
      for(const x of [310,WIDTH-310]){
        const banner=new Sprite(this.textures[arena.flag]);banner.anchor.set(.5,1);
        banner.scale.set(92/banner.texture.height);banner.position.set(x,arena.ground[0]-12);
        this.flags.addChild(banner);
      }
    }
    if(arena.pixel){for(const bands of this.arenaBands.values())for(const band of bands)band.visible=false;return;}
    if(!this.arenaBands.has(arena.id)){
      const source=this.textures[arena.horizontal].source;
      const [top,bottom]=arena.ground||[356,812];
      this.arenaBands.set(arena.id,[[0,top],[top,bottom-top],[bottom,HEIGHT-bottom]].map(([y,height])=>{
        const band=new Sprite(new Texture({source,frame:new Rectangle(0,y,WIDTH,height)}));band.y=y;this.horizontalArt.addChild(band);return band;
      }));
    }
    for(const [id,bands] of this.arenaBands)for(const band of bands)band.visible=id===arena.id;
    this.artBands=this.arenaBands.get(arena.id);
  }
  replaceUnits(units){
    this.stopIdle();
    for(const token of this.tokens.values()){
      token.root.destroy({children:true});
      for(const frame of token.frames)frame.destroy(false);
    }
    this.tokens.clear();this.lastActive=null;this.selectedId=null;
    for(const unit of units)this.makeToken(unit,this.textures[this.character(unit).url]);
  }
  setAppearance(value){
    if(this.animating)return false;
    const appearance=normalizeAppearance({...this.appearance,...value}),arena=getArena(appearance.arena);
    if(!this.textures[arena.isometric]||!this.textures[arena.horizontal]||goalAssetUrls(arena).some(url=>!this.textures[url]))return false;
    this.appearance=appearance;this.updateArenaArt();
    this.camera=createProjection(this.appearance.view,this.appearance.height,arena.ground,arena);
    const horizontal=this.camera.mode==='horizontal';
    this.backdrop.visible=!horizontal||arena.pixel;this.horizontalArt.visible=horizontal&&!arena.pixel;
    this.drawFloor();this.setBall(this.appearance.ball);
    this.layout();
    if(this.state){const selected=this.selectedId;this.sync(this.state);if(selected)this.setSelection(selected);}
    this.render();return true;
  }
  setBall(id){
    const ball=getBall(id);this.appearance.ball=ball.id;
    this.ballImage.texture=this.textures[ball.url];this.ballImage.width=36;this.ballImage.height=36;
    this.ballImage.rotation=0;
    this.drawBallAura(!!this.state?.ball.charge);
    this.render();
  }
  drawBallAura(charged){
    const g=this.ballGlow,color=charged?0xffd98b:getBall(this.appearance.ball).color;
    g.clear().circle(0,0,21).fill({color,alpha:charged?.22:.15});
    if(charged){
      g.circle(0,0,23).stroke({color,width:1.5,alpha:.9});
      for(const [x,y] of [[0,-27],[27,0],[0,27],[-27,0]])g.poly([x,y-3,x+2,y,x,y+3,x-2,y]).fill(color);
    }
    this.ballCharged=charged;
  }
  drawFloor(){
    const g=this.floor,arena=getArena(this.appearance.arena);g.clear();
    this.floorScale=this.scale;
    const chalk=width=>Math.max(width,1.1/(this.scale||1));
    for(const child of this.floorLabels.removeChildren())child.destroy();
    // A quiet single-stroke grid; legal movement is a separate stronger layer.
    for(let x=2;x<12;x++){
      const a=this.camera.project(x,0),b=this.camera.project(x,7);
      g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:0xe8f3ed,width:1,alpha:.085});
    }
    for(let y=1;y<7;y++){
      const a=this.camera.project(1,y),b=this.camera.project(12,y);
      g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:0xe8f3ed,width:1,alpha:.085});
    }
    const bounds=[this.camera.project(1,0),this.camera.project(12,0),this.camera.project(12,7),this.camera.project(1,7)];
    g.poly(flat(bounds)).stroke({width:chalk(2.6),color:arena.lines,alpha:.94});
    const a=this.camera.project(6.5,0),b=this.camera.project(6.5,7);
    g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:chalk(2),color:arena.lines,alpha:.8});
    for(const zone of DEFENSE_ZONES){
      const points=[this.camera.project(zone.left,0),this.camera.project(zone.right,0),this.camera.project(zone.right,7),this.camera.project(zone.left,7)];
      g.poly(flat(points)).fill({color:colors[zone.team],alpha:.045}).stroke({width:chalk(2.2),color:arena.whiteLines?0xffffff:colors[zone.team],alpha:.8});
    }
    const circle=Array.from({length:49},(_,i)=>this.camera.project(6.5+Math.cos(i*Math.PI/24)*.65,3.5+Math.sin(i*Math.PI/24)*.65));
    g.poly(flat(circle)).stroke({width:chalk(2),color:arena.lines,alpha:.8});
    this.drawGoals();
  }
  drawGoals(){
    if(!this.goalSprites)return;
    const arena=getArena(this.appearance.arena);
    this.goalAnchors=[];
    for(const team of [0,1]){
      const layout=layoutGoal(this.camera,arena,team),image=this.goalSprites[team];
      image.texture=this.textures[layout.url];image.texture.source.scaleMode='nearest';
      image.pivot.set(layout.pivot.x,layout.pivot.y);
      image.position.set(layout.center.x,layout.center.y);
      image.scale.set(layout.scale*layout.direction,layout.scale);
      this.goalAnchors.push({...layout,rendered:image.texture===this.textures[layout.url]&&image.texture!==Texture.EMPTY,
        imageScale:{x:image.scale.x,y:image.scale.y},kind:'image'});
    }
  }
  makeToken(unit,texture){
    const root=new Container(),body=new Container(),sizing=spriteSizing(this.character(unit)),scale=sizing.scale;
    root.addChild(new Graphics().ellipse(0,4,28,10).fill({color:0x071819,alpha:.5}));
    const base=new Graphics().ellipse(0,1,30,10).fill({color:colors[unit.team],alpha:.14}).stroke({color:colors[unit.team],width:2,alpha:.85});root.addChild(base);
    const ring=new Graphics().ellipse(0,1,36,14).stroke({color:colors[unit.team],width:3}).poly([-5,19,0,24,5,19]).fill(colors[unit.team]);root.addChild(ring);ring.visible=false;
    texture.source.scaleMode='nearest';
    const frames=Array.from({length:16},(_,i)=>new Texture({source:texture.source,frame:new Rectangle(i%4*SPRITE_CELL,Math.floor(i/4)*SPRITE_CELL,SPRITE_CELL,SPRITE_CELL)}));
    const image=new Sprite(frames[0]);image.anchor.set(.5,SPRITE_FOOT/SPRITE_CELL);image.scale.set(scale*(unit.team===0?1:-1),scale);body.addChild(image);
    const label=text(unit.name.toUpperCase(),10);label.anchor.set(.5);label.position.set(0,31);
    label.style.stroke={color:0x102421,width:3};
    const role=text(roleCode[unit.role],9,colors[unit.team]);role.anchor.set(.5);role.position.set(0,44);role.style.stroke={color:0x102421,width:3};
    const number=text('',12,0xfff0b6);number.anchor.set(.5);number.position.set(0,-sizing.maxHeight-10);number.style.stroke={color:0x102421,width:3};
    const status=text('',10);status.anchor.set(.5);status.position.set(0,57);status.style.stroke={color:0x102421,width:3};
    root.addChild(body,label,role,number,status);this.unitLayer.addChild(root);
    this.tokens.set(unit.id,{root,body,image,frames,scale,sizing,ring,label,role,number,status,base,frame:0,pose:'idle',direction:unit.team===0?1:-1});
  }
  pose(token,name,elapsed=0){
    if(!token)return;
    if(token.pose!==name){token.pose=name;this.poseCounts[name]=(this.poseCounts[name]||0)+1;}
    const frame=frameAt(name,elapsed);
    if(token.frame!==frame){token.frame=frame;token.image.texture=token.frames[frame];this.frameChanges++;}
  }
  face(token,from,to){
    token.direction=facing(from,to,token.direction);token.image.scale.x=token.scale*token.direction;
  }
  spriteMetrics(){
    return {count:this.tokens.size,selectedId:this.selectedId,frameChanges:this.frameChanges,poses:{...this.poseCounts},units:[...this.tokens].map(([id,t])=>({id,frame:t.frame,pose:t.pose,direction:t.direction,x:t.root.x,y:t.root.y,scale:t.scale,sizing:t.sizing,foot:t.image.anchor.y*SPRITE_CELL,imageScale:{x:t.image.scale.x,y:t.image.scale.y}}))};
  }
  resize(){
    if(!this.app)return;
    if(!this.host.clientWidth||!this.host.clientHeight)return;
    this.app.renderer.resize(this.host.clientWidth,this.host.clientHeight);
    this.layout();this.render();
  }
  layout(){
    if(!this.scene||!this.host.clientWidth||!this.host.clientHeight)return;
    const spec=this.viewportSpec();
    if(this.horizontalArt.visible){
      // Legacy plane depth can change; architecture keeps its original size.
      const top=this.camera.groundY(this.camera.top),bottom=this.camera.groundY(this.camera.bottom);
      const [sky,ground,front]=this.artBands;
      sky.height=this.camera.top;sky.y=top-sky.height;
      ground.y=top;ground.height=bottom-top;
      front.y=bottom;front.height=HEIGHT-this.camera.bottom;
    }
    this.viewport=fitViewport({...spec,zoom:this.zoom,pan:this.pan});
    this.pan=this.viewport.pan;this.scale=this.viewport.scale;this.viewCenter=this.viewport.center;
    this.scene.scale.set(this.scale);this.scene.position.set(this.viewport.x,this.viewport.y);
    if(this.floor&&this.floorScale!==this.scale)this.drawFloor();
    this.onViewChange?.();
  }
  viewportSpec(){
    const arena=getArena(this.appearance.arena),horizontal=this.camera.mode==='horizontal';
    const top=horizontal?this.camera.groundY(this.camera.top)-this.camera.top:0;
    const bottom=horizontal?this.camera.groundY(this.camera.bottom)+HEIGHT-this.camera.bottom:HEIGHT;
    const corners=[this.camera.project(0,0),this.camera.project(13,0),this.camera.project(13,7),this.camera.project(0,7)];
    const offset=arena.pixel?(this.appearance.height-60)*1.8:0;
    return {width:this.host.clientWidth,height:this.host.clientHeight,
      bounds:{left:0,top:arena.pixel?0:top,right:WIDTH,bottom:arena.pixel?HEIGHT:bottom},
      focusBounds:{left:Math.min(...corners.map(p=>p.x))-22,right:Math.max(...corners.map(p=>p.x))+22,
        top:Math.min(...corners.map(p=>p.y))-194+Math.min(0,offset),bottom:Math.max(...corners.map(p=>p.y))+55+Math.max(0,offset)}};
  }
  zoomBy(amount,point){
    const zoom=normalizeZoom(this.zoom+amount);
    if(this.viewport)this.pan=zoomAt({...this.viewportSpec(),layout:this.viewport,zoom,point}).pan;
    this.zoom=zoom;this.layout();this.render();
  }
  resetView(follow=false){this.zoom=follow&&innerWidth<=760?1.7:1;this.pan={x:0,y:0};this.layout();if(follow)this.focus(this.state?.units.find(u=>u.id===this.state.activeId));this.render();}
  focus(unit){
    if(!unit||this.host.clientWidth>760||this.zoom<=1)return;
    const p=this.state?.phase==='placement'?this.camera.center(unit.team===0?3:9,3):this.camera.center(unit.x,unit.y);
    this.pan.x=(this.viewCenter.x-p.x)*this.scale;this.pan.y=(this.viewCenter.y-p.y)*this.scale;
    this.layout();
  }
  screenCell(x,y){const p=this.camera.center(x,y);return{x:p.x*this.scale+this.scene.x,y:p.y*this.scale+this.scene.y};}
  worldPoint(event){const rect=this.app.canvas.getBoundingClientRect();return{x:(event.clientX-rect.left-this.scene.x)/this.scale,y:(event.clientY-rect.top-this.scene.y)/this.scale};}
  unitAtPoint(p){
    const ordered=[...this.tokens.entries()].sort((a,b)=>b[1].root.y-a[1].root.y);
    return ordered.find(([,t])=>{
      const x=(p.x-t.root.x)*t.direction,s=t.sizing;
      return x>=s.hitLeft&&x<=s.hitRight&&p.y>=t.root.y-s.standingHeight&&p.y<=t.root.y+10;
    })?.[0];
  }
  bind(){
    const canvas=this.app.canvas,pointers=new Map();let press=null,pinch=null,suppressTap=false;
    this.inputMetrics=()=>({...this.inputCounts,activePointers:pointers.size,gesture:pinch?'pinch':press?.drag?'pan':press?'press':suppressTap?'release':'idle'});
    const local=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
    const pair=()=>{const [a,b]=[...pointers.values()];return{distance:Math.hypot(b.x-a.x,b.y-a.y),point:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};};
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0&&e.pointerType==='mouse')return;
      pointers.set(e.pointerId,local(e));canvas.setPointerCapture(e.pointerId);
      if(pointers.size===1){press={x:e.clientX,y:e.clientY,pan:{...this.pan},drag:false,id:e.pointerId};}
      else if(pointers.size===2){pinch=pair();suppressTap=true;press=null;}
    });
    canvas.addEventListener('pointermove',e=>{
      if(pointers.has(e.pointerId))pointers.set(e.pointerId,local(e));
      if(pointers.size>=2&&pinch){
        const next=pair(),ratio=next.distance/Math.max(1,pinch.distance);
        this.zoomBy(this.zoom*(ratio-1),pinch.point);
        this.pan.x+=next.point.x-pinch.point.x;this.pan.y+=next.point.y-pinch.point.y;
        this.layout();this.render();pinch=next;return;
      }
      if(press){const dx=e.clientX-press.x,dy=e.clientY-press.y;if(Math.hypot(dx,dy)>7)press.drag=true;if(press.drag){canvas.style.cursor='grabbing';this.pan={x:press.pan.x+dx,y:press.pan.y+dy};this.layout();this.render();}return;}
      if(suppressTap)return;
      const p=this.worldPoint(e),unitId=this.unitAtPoint(p),cell=this.camera.pick(p.x,p.y);this.onHover(cell,unitId);
    });
    const release=(e,cancel=false)=>{
      const click=!cancel&&!suppressTap&&press?.id===e.pointerId&&!press.drag;
      pointers.delete(e.pointerId);press=null;pinch=null;canvas.style.cursor='';
      if(!pointers.size)suppressTap=false;
      if(click){const p=this.worldPoint(e),id=this.unitAtPoint(p),cell=this.camera.pick(p.x,p.y);if(cell)this.onCell(cell,id);else if(id)this.onUnit(id);}
    };
    canvas.addEventListener('pointerup',e=>release(e));
    canvas.addEventListener('pointercancel',e=>release(e,true));
    canvas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))release(e,true);});
    canvas.addEventListener('pointerleave',()=>{if(!press)this.onHover(null,null);});
    canvas.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.host.clientHeight:1);this.zoomBy(this.zoom*(Math.exp(-Math.max(-250,Math.min(250,delta))*.0018)-1),local(e));},{passive:false});
    this.cursor={x:6,y:3};
    canvas.addEventListener('keydown',e=>{const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(dirs[e.key]){e.preventDefault();const [x,y]=dirs[e.key];this.cursor={x:Math.max(0,Math.min(12,this.cursor.x+x)),y:Math.max(0,Math.min(6,this.cursor.y+y))};this.onHover(this.cursor,null);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onCell(this.cursor);}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopIdle();else{this.idle();this.render();}});
  }
  sync(state){
    this.selectedId=null;
    const changed=this.lastActive!==state.activeId;
    this.lastActive=state.activeId;
    this.state=state;
    for(const unit of state.units){const t=this.tokens.get(unit.id),p=this.camera.center(unit.x,unit.y);t.root.position.set(p.x,p.y);t.root.zIndex=p.y;t.body.y=0;this.pose(t,'idle');t.ring.visible=unit.id===state.activeId;t.body.alpha=unit.acted?.78:1;t.label.alpha=unit.acted?.65:1;t.number.text=unit.penalty||unit.nextPenalty?'-'+(unit.penalty||unit.nextPenalty)+' VIT':'';
      const effects=unitEffects(unit);t.status.text=effects.map(e=>e.short).join(' / ');t.status.style.fill=effects[0]?.color??0xfff1ce;
    }
    this.drawBallAura(!!state.ball.charge);
    this.placeBall(state);if(changed&&state.phase!=='placement')this.focus(state.units.find(u=>u.id===state.activeId));this.idle();this.render();
  }
  setSelection(id){
    if(this.selectedId===id)return;
    this.selectedId=id;
    for(const [key,token] of this.tokens)token.ring.visible=key===id;
    this.focus(this.state?.units.find(unit=>unit.id===id));this.render();
  }
  setIdleEnabled(enabled){
    this.idleEnabled=!!enabled;
    if(!enabled)this.stopIdle();else this.idle();
  }
  idle(){
    if(this.idleTimer||!this.idleEnabled||this.animating||this.reduced||document.hidden)return;
    // One shared 4 Hz clock, no Pixi ticker: only render changed sprite frames.
    let elapsed=0;
    const tick=()=>{
      this.idleTimer=null;
      if(!this.idleEnabled||this.reduced||this.animating||document.hidden)return;
      elapsed+=250;const previous=this.frameChanges;
      let index=0;for(const token of this.tokens.values())this.pose(token,'idle',elapsed+(index++%4)*250);
      if(previous!==this.frameChanges)this.render();
      this.idleTimer=setTimeout(tick,250);
    };this.idleTimer=setTimeout(tick,250);
  }
  stopIdle(){clearTimeout(this.idleTimer);this.idleTimer=null;}
  carriedBall(token){return{x:token.root.x+token.sizing.ballX*token.direction,y:token.root.y+token.body.y+token.sizing.ballY};}
  followBall(token){const p=this.carriedBall(token);this.ball.position.set(p.x,p.y);}
  placeBall(state){const p=this.camera.center(state.ball.x,state.ball.y),holder=this.tokens.get(state.ball.holderId);if(holder)this.followBall(holder);else this.ball.position.set(p.x,p.y-9);this.ball.visible=true;this.ballImage.rotation=0;}
  highlight(moves=[],preview=null,hover=null){
    const g=this.overlay;g.clear();
    this.movementPreview=preview?.kind==='move'&&preview.legal?preview.cells.map(c=>({...c})):[];
    if(this.state?.phase==='placement'){
      const team=this.state.placement.team;
      const points=team===0?[[6,0],[12,0],[12,7],[6,7]]:[[1,0],[7,0],[7,7],[1,7]];
      g.poly(flat(points.map(([x,y])=>this.camera.project(x,y)))).fill({color:0x081a23,alpha:.3});
    }
    const moveColor=colors[this.state?.units.find(u=>u.id===(this.selectedId||this.state.activeId))?.team??0];
    const reachable=new Set(moves.map(c=>c.x+','+c.y));
    for(const cell of moves){
      const corners=this.camera.polygon(cell.x,cell.y);
      g.poly(flat(corners)).fill({color:moveColor,alpha:.27}).stroke({color:0xe4fff5,width:1,alpha:.25});
      const neighbors=[[0,-1],[1,0],[0,1],[-1,0]];
      for(let i=0;i<4;i++)if(!reachable.has((cell.x+neighbors[i][0])+','+(cell.y+neighbors[i][1]))){
        const a=corners[i],b=corners[(i+1)%4];
        g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:moveColor,width:3,alpha:.95});
      }
      if(cell.x===0||cell.x===12){const p=this.camera.center(cell.x,cell.y);g.circle(p.x,p.y,10).stroke({color:0xffffff,width:2,alpha:.9});}
    }
    if(hover)g.poly(flat(this.camera.polygon(hover.x,hover.y))).fill({color:0xffe4a1,alpha:.25}).stroke({color:0xffefc1,width:2,alpha:.9});
    if(preview?.cells?.length){
      const color=preview.blockerId||!preview.legal?0xff718a:0xf8e4a0;
      for(const cell of preview.cells)g.poly(flat(this.camera.polygon(cell.x,cell.y))).fill({color,alpha:.18});
      if(preview.kind==='move'){
        const points=preview.cells.map(c=>this.camera.center(c.x,c.y)),scale=this.scale||1;
        const line=()=>{g.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))g.lineTo(p.x,p.y);};
        line();g.stroke({width:6/scale,color:0x082326,alpha:.85});
        line();g.stroke({width:2.5/scale,color:moveColor,alpha:1});
        for(const p of points.slice(1,-1))g.circle(p.x,p.y,2.5/scale).fill({color:0xffffff,alpha:.9});
        const a=points.at(-2),b=points.at(-1),angle=Math.atan2(b.y-a.y,b.x-a.x),size=8/scale;
        g.poly([b.x+Math.cos(angle)*size,b.y+Math.sin(angle)*size,b.x+Math.cos(angle+2.5)*size,b.y+Math.sin(angle+2.5)*size,b.x+Math.cos(angle-2.5)*size,b.y+Math.sin(angle-2.5)*size]).fill({color:0xffffff});
        g.poly(flat(this.camera.polygon(preview.to.x,preview.to.y))).stroke({color:moveColor,width:2/scale,alpha:1});
      }else{
        const a=this.camera.center(preview.from.x,preview.from.y),b=this.camera.center(preview.to.x,preview.to.y);
        g.moveTo(a.x,a.y-15).lineTo(b.x,b.y-15).stroke({width:4,color,alpha:.9});
        g.circle(b.x,b.y-15,9).stroke({color,width:2});
      }
      if(preview.blockerId){const u=this.state.units.find(u=>u.id===preview.blockerId),p=this.camera.center(u.x,u.y);g.moveTo(p.x-13,p.y-28).lineTo(p.x+13,p.y-2).moveTo(p.x+13,p.y-28).lineTo(p.x-13,p.y-2).stroke({width:4,color:0xff718a});}
    }
    this.render();
  }
  render(){if(this.app && !document.hidden){this.app.render();this.renderCount++;}}
  async tween(duration,update){
    if(this.reduced){update(1);this.render();return;}
    await new Promise(resolve=>{
      let elapsed=0,last=performance.now(),nextFrame=last;
      const tick=now=>{
        if(document.hidden){const resume=()=>{if(document.hidden)return;document.removeEventListener('visibilitychange',resume);last=performance.now();requestAnimationFrame(tick);};document.addEventListener('visibilitychange',resume);return;}
        if(!this.reduced&&now+.5<nextFrame){requestAnimationFrame(tick);return;}
        nextFrame=Math.max(nextFrame+1000/60,now);
        elapsed+=Math.min(40,now-last);last=now;const t=this.reduced?1:Math.min(1,elapsed/duration);
        update(smooth(t),t);this.render();if(t<1)requestAnimationFrame(tick);else resolve();
      };requestAnimationFrame(tick);
    });
  }
  async animate(events,before,after){
    this.animating=true;this.stopIdle();for(const t of this.tokens.values()){t.body.y=0;this.pose(t,'idle');}this.highlight();
    try {
      for(const e of events){
        if(e.type==='skill')await this.castSkill(e);
        if(e.type==='place'){
          const t=this.tokens.get(e.unitId),a=this.camera.center(e.from.x,e.from.y),b=this.camera.center(e.to.x,e.to.y);
          this.face(t,a,b);
          await this.tween(420,(p,raw=p)=>{this.pose(t,'run',raw*420);t.root.position.set(a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p);t.root.zIndex=t.root.y;if(before.ball.holderId===e.unitId)this.followBall(t);});
        }
        if(e.type==='move'){
          const t=this.tokens.get(e.unitId);let from=e.from;
          let elapsed=0;
          for(const cell of e.path){const a=this.camera.center(from.x,from.y),b=this.camera.center(cell.x,cell.y);this.face(t,a,b);await this.tween(300,(p,raw=p)=>{this.pose(t,'run',elapsed+raw*300);t.root.position.set(a.x+(b.x-a.x)*raw,a.y+(b.y-a.y)*raw);t.root.zIndex=t.root.y;t.body.y=-Math.sin(raw*Math.PI)*2;if(before.ball.holderId===e.unitId)this.followBall(t);});from=cell;elapsed+=300;}t.body.y=0;this.pose(t,'idle');
        }
        if(e.type==='pass'||e.type==='shot'){
          this.drawBallAura(!!e.charged);
          const blocker=e.blockerId?before.units.find(u=>u.id===e.blockerId):null,target=blocker||e.to,a=this.camera.center(e.from.x,e.from.y),b=this.camera.center(target.x,target.y);
          const actor=this.tokens.get(e.unitId),receiver=this.tokens.get(e.blockerId||e.targetId);
          this.face(actor,a,b);if(receiver){this.face(receiver,b,a);this.pose(receiver,'guard');}
          await this.tween(e.type==='shot'?340:260,(p,raw=p)=>{this.pose(actor,'throw',raw*240);actor.body.y=-Math.sin(raw*Math.PI)*(e.type==='shot'?5:1);this.ball.position.set(a.x+actor.direction*(actor.sizing.ballX+p*4),a.y+actor.sizing.ballY-p*7);});
          this.pose(actor,'throw',260);actor.body.y=0;
          const trail=new Graphics();this.effects.addChild(trail);
          const start={x:a.x+actor.direction*(actor.sizing.ballX+4),y:a.y+actor.sizing.ballY-7},end={x:b.x+(receiver?receiver.direction*receiver.sizing.ballX:0),y:b.y+(receiver?receiver.sizing.ballY:-25)};
          await this.tween(e.type==='shot'?550:650,(p,raw=p)=>{this.pose(actor,'throw',260+raw*500);const x=start.x+(end.x-start.x)*p,y=start.y+(end.y-start.y)*p-Math.sin(raw*Math.PI)*45;this.ball.position.set(x,y);this.ballImage.rotation=raw*Math.PI*2*actor.direction;trail.clear().moveTo(x-16*(b.x-a.x)/300,y-8*(b.y-a.y)/300).lineTo(x,y).stroke({width:6,color:e.charged?0xffd98b:getBall(this.appearance.ball).color,alpha:.65});});trail.destroy();this.pose(actor,'idle');
        }
        if(e.type==='charge'){
          const t=this.tokens.get(e.unitId),target=this.tokens.get(e.targetId),a=this.camera.center(e.from.x,e.from.y),b=this.camera.center(e.to.x,e.to.y),next=this.camera.center(e.pushTo.x,e.pushTo.y);
          this.face(t,a,b);this.face(target,b,a);this.pose(target,'guard');
          await this.tween(460,(p,raw=p)=>{this.pose(t,'charge',raw*460);if(raw>.32)this.pose(target,e.success?'hit':'guard',(raw-.32)*460);const l=Math.sin(raw*Math.PI)*.65;t.root.position.set(a.x+(b.x-a.x)*l,a.y+(b.y-a.y)*l);t.root.zIndex=t.root.y;if(e.pushed){const push=Math.max(0,(p-.25)/.75);target.root.position.set(b.x+(next.x-b.x)*push,b.y+(next.y-b.y)*push);target.root.zIndex=target.root.y;}});
          t.root.position.set(a.x,a.y);this.pose(t,'idle');await this.burst(b,e.success?'-3 VIT':'RÉSISTE',e.success?0xffb88b:0xd8e7e1);this.pose(target,'idle');
        }
        if(e.type==='intercept'){this.pose(this.tokens.get(e.unitId),'guard');await this.burst(this.camera.center(e.to.x,e.to.y),'INTERCEPTION',0xff9db1);}
        if(e.type==='goal'){
          const winners=after.units.filter(u=>u.team===e.team).map(u=>this.tokens.get(u.id));
          await this.burst(this.camera.center(e.to.x,e.to.y),'+'+e.points,0xffe3a0,(p,raw)=>{for(const t of winners){this.pose(t,'celebrate',raw*650);t.body.y=-Math.sin(raw*Math.PI)*7;}});
          for(const t of winners)t.body.y=0;
          await this.tween(650,(p,raw=p)=>{for(const reset of e.reset){const a=this.camera.center(reset.from.x,reset.from.y),b=this.camera.center(reset.to.x,reset.to.y),t=this.tokens.get(reset.unitId);if(a.x!==b.x||a.y!==b.y){this.face(t,a,b);this.pose(t,'run',raw*650);}t.root.position.set(a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p);t.root.zIndex=t.root.y;}});
        }
      }
    } finally {this.animating=false;this.sync(after);}
  }
  async castSkill(event){
    const skill=skillFor(event.skill),actor=this.tokens.get(event.unitId),target=this.tokens.get(event.targetId);
    if(!skill||!actor||!target)return;
    const from={x:actor.root.x,y:actor.root.y-actor.sizing.standingHeight*.55};
    const to=event.skill==='charged-pass'?this.carriedBall(actor):{x:target.root.x,y:target.root.y-target.sizing.standingHeight*.45};
    this.face(actor,from,to);
    const glyph=new Graphics(),caption=text(skill.label,14,skill.color);caption.anchor.set(.5);
    caption.position.set(to.x,to.y-35);this.effects.addChild(glyph,caption);
    try{
      await this.tween(720,(p,raw=p)=>{
        this.pose(actor,magicPose(actor.frames.length),raw*720);
        const release=Math.max(0,(raw-.4)/.6),x=from.x+(to.x-from.x)*release,y=from.y+(to.y-from.y)*release;
        glyph.clear();caption.alpha=Math.min(1,release*3)*(1-release*.45);
        glyph.circle(from.x,from.y,8+Math.sin(raw*Math.PI)*8).stroke({color:skill.color,width:2,alpha:1-raw});
        if(raw>=.4){
          glyph.moveTo(from.x,from.y).lineTo(x,y).stroke({color:skill.color,width:2,alpha:(1-release)*.7});
          for(let i=0;i<6;i++){
            const angle=i*Math.PI/3+raw*1.6,radius=4+release*20,px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius*.6;
            glyph.rect(px-2,py-2,4,4).fill({color:skill.color,alpha:1-release*.5});
          }
          glyph.ellipse(to.x,to.y,12+release*20,7+release*10).stroke({color:skill.color,width:2,alpha:release*(1-release)*3});
        }
      });
    }finally{glyph.destroy();caption.destroy();this.pose(actor,'idle');}
  }
  async burst(p,label,color,onFrame){
    const g=new Graphics(),caption=text(label,20,color);caption.anchor.set(.5);this.effects.addChild(g,caption);
    await this.tween(650,(t,raw=t)=>{onFrame?.(t,raw);g.clear().ellipse(p.x,p.y,20+t*65,10+t*30).stroke({color,width:3,alpha:1-t});caption.position.set(p.x,p.y-90-t*25);caption.alpha=1-t*.75;});g.destroy();caption.destroy();
  }
}
