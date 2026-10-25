import { Application, Container, Sprite, Graphics, Text, Assets, Texture, Rectangle } from '../assets/vendor/pixi-csp-sprites-v8.22.0.mjs';
import { WIDTH, HEIGHT, project, center, polygon, pick } from './projection.mjs';
import { SPRITES, SPRITE_CELL, SPRITE_FOOT, frameAt, spriteKey, facing } from './sprites.mjs';

const colors=[0x68e6cd,0xf08d9f], roleCode={meneur:'MN',scoreur:'SC',middle:'MD',sentry:'ST',pilier:'PI'};
const sprite=unit=>SPRITES[spriteKey(unit)];
const flat=points=>points.flatMap(p=>[p.x,p.y]);
const text=(value,size=13,color=0xfff1ce)=>new Text({text:value,style:{fontFamily:'Segoe UI',fontSize:size,fill:color,fontWeight:'600'}});
const smooth=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

export class CourtRenderer {
  constructor(host,{onCell,onUnit,onHover}) {
    this.host=host;this.onCell=onCell;this.onUnit=onUnit;this.onHover=onHover;
    this.zoom=innerWidth<=760?1.7:1;this.pan={x:0,y:0};this.tokens=new Map();this.state=null;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animating=false;this.renderCount=0;this.frameChanges=0;this.poseCounts={};
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
    const textures=await Assets.load(['assets/arena-v1.webp',...units.map(unit=>sprite(unit).url)]);
    const backdrop=new Sprite(textures['assets/arena-v1.webp']);backdrop.width=WIDTH;backdrop.height=HEIGHT;this.scene.addChild(backdrop);
    this.floor=new Graphics();this.scene.addChild(this.floor);this.drawFloor();
    this.overlay=new Graphics();this.scene.addChild(this.overlay);
    this.unitLayer=new Container();this.unitLayer.sortableChildren=true;this.scene.addChild(this.unitLayer);
    for(const unit of units)this.makeToken(unit,textures[sprite(unit).url]);
    this.ball=new Container();
    this.ball.addChild(new Graphics().ellipse(0,12,15,6).fill({color:0x081e23,alpha:.4}));
    this.ball.addChild(new Graphics().circle(0,0,22).fill({color:0xffe3a0,alpha:.2}).circle(0,0,13).fill(0xffe8a8).stroke({color:0xfffcdf,width:2}).poly([0,-11,8,0,0,11,-8,0]).fill(0x7ce5de).stroke({color:0x91693d,width:1}));
    this.scene.addChild(this.ball);this.effects=new Container();this.scene.addChild(this.effects);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.host);
    this.bind();this.resize();
  }
  drawFloor(){
    const g=this.floor;
    for(let y=0;y<7;y++)for(let x=0;x<13;x++){
      if((x===0||x===12)&&![2,3,4].includes(y))continue;
      const goal=x===0||x===12, defense=x<=3||x>=9;
      g.poly(flat(polygon(x,y))).fill({color:goal?colors[x===0?0:1]:defense?(x<6?0x103f3f:0x632b3a):0x183938,alpha:goal?.62:defense?.21:.09}).stroke({color:goal?0xffdc9a:0xd5dfbd,width:goal?2.5:1,alpha:goal?.9:.25});
      if(goal){
        const p=center(x,y),label=text('U'+(y-1),16);label.anchor.set(.5);label.position.set(p.x,p.y+4);this.scene.addChild(label);
        const a=project(x+.1,y+.12),b=project(x+.1,y+.88);
        g.moveTo(a.x,a.y-24).lineTo(a.x,a.y).lineTo(b.x,b.y).lineTo(b.x,b.y-24).stroke({width:4,color:colors[x===0?0:1],alpha:.9});
      }
    }
    const bounds=[project(1,0),project(12,0),project(12,7),project(1,7)];
    g.poly(flat(bounds)).stroke({width:2.5,color:0xe1c79b,alpha:.85});
    const a=project(6.5,0),b=project(6.5,7);
    g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:2,color:0xffe6ac,alpha:.65});
    for(const x of [3.8,9.2]){const a=project(x,0),b=project(x,7);g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:2,color:colors[x<6?0:1],alpha:.6});}
    const p=center(6,3);g.ellipse(p.x,p.y,56,25).stroke({width:2,color:0xffe6ac,alpha:.6});
  }
  makeToken(unit,texture){
    const root=new Container(),body=new Container(),scale=sprite(unit).scale;
    root.addChild(new Graphics().ellipse(0,4,28,10).fill({color:0x071819,alpha:.5}));
    const base=new Graphics().ellipse(0,1,30,10).fill({color:colors[unit.team],alpha:.14}).stroke({color:colors[unit.team],width:2,alpha:.85});root.addChild(base);
    const ring=new Graphics().ellipse(0,1,36,14).stroke({color:colors[unit.team],width:3}).poly([-5,19,0,24,5,19]).fill(colors[unit.team]);root.addChild(ring);ring.visible=false;
    texture.source.scaleMode='nearest';
    const frames=Array.from({length:16},(_,i)=>new Texture({source:texture.source,frame:new Rectangle(i%4*SPRITE_CELL,Math.floor(i/4)*SPRITE_CELL,SPRITE_CELL,SPRITE_CELL)}));
    const image=new Sprite(frames[0]);image.anchor.set(.5,SPRITE_FOOT/SPRITE_CELL);image.scale.set(scale*(unit.team===0?1:-1),scale);body.addChild(image);
    const label=text(unit.name.toUpperCase(),10);label.anchor.set(.5);label.position.set(0,31);
    label.style.stroke={color:0x102421,width:3};
    const role=text(roleCode[unit.role],9,colors[unit.team]);role.anchor.set(.5);role.position.set(0,44);role.style.stroke={color:0x102421,width:3};
    const number=text('',12,0xfff0b6);number.anchor.set(.5);number.position.set(0,-82*scale);number.style.stroke={color:0x102421,width:3};
    root.addChild(body,label,role,number);this.unitLayer.addChild(root);
    this.tokens.set(unit.id,{root,body,image,frames,scale,ring,label,role,number,base,frame:0,pose:'idle',direction:unit.team===0?1:-1});
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
    return {count:this.tokens.size,frameChanges:this.frameChanges,poses:{...this.poseCounts},units:[...this.tokens].map(([id,t])=>({id,frame:t.frame,pose:t.pose,direction:t.direction,x:t.root.x,y:t.root.y,scale:t.scale}))};
  }
  resize(){
    if(!this.app)return;
    this.app.renderer.resize(this.host.clientWidth,this.host.clientHeight);
    this.layout();this.render();
  }
  layout(){
    const w=this.host.clientWidth,h=this.host.clientHeight;
    this.scale=Math.min(w/1510,h/850)*this.zoom;
    this.scene.scale.set(this.scale);this.scene.position.set(w/2-780*this.scale+this.pan.x,h/2-560*this.scale+this.pan.y);
  }
  zoomBy(amount){this.zoom=Math.max(.85,Math.min(2.2,this.zoom+amount));this.layout();this.render();}
  resetView(){this.zoom=1;this.pan={x:0,y:0};this.layout();this.render();}
  focus(unit){
    if(!unit||innerWidth>760||this.zoom<=1)return;
    const p=center(unit.x,unit.y);
    this.pan.x=(780-p.x)*this.scale;this.pan.y=(560-p.y)*this.scale;
    this.layout();
  }
  screenCell(x,y){const p=center(x,y);return{x:p.x*this.scale+this.scene.x,y:p.y*this.scale+this.scene.y};}
  worldPoint(event){const rect=this.app.canvas.getBoundingClientRect();return{x:(event.clientX-rect.left-this.scene.x)/this.scale,y:(event.clientY-rect.top-this.scene.y)/this.scale};}
  unitAtPoint(p){
    const ordered=[...this.tokens.entries()].sort((a,b)=>b[1].root.y-a[1].root.y);
    return ordered.find(([,t])=>Math.abs(p.x-t.root.x)<=28*t.scale && p.y>=t.root.y-80*t.scale && p.y<=t.root.y+10)?.[0];
  }
  bind(){
    const canvas=this.app.canvas;let press=null;
    canvas.addEventListener('pointerdown',e=>{press={x:e.clientX,y:e.clientY,pan:{...this.pan},drag:false,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(press){const dx=e.clientX-press.x,dy=e.clientY-press.y;if(Math.hypot(dx,dy)>7)press.drag=true;if(press.drag){this.pan={x:Math.max(-this.host.clientWidth,Math.min(this.host.clientWidth,press.pan.x+dx)),y:Math.max(-this.host.clientHeight,Math.min(this.host.clientHeight,press.pan.y+dy))};this.layout();this.render();}return;}
      const p=this.worldPoint(e),unitId=this.unitAtPoint(p),cell=pick(p.x,p.y);this.onHover(cell,unitId);
    });
    canvas.addEventListener('pointerup',e=>{if(!press)return;const dragged=press.drag;press=null;if(dragged)return;const p=this.worldPoint(e),id=this.unitAtPoint(p);if(id)this.onUnit(id);else{const cell=pick(p.x,p.y);if(cell)this.onCell(cell);}});
    canvas.addEventListener('pointercancel',()=>press=null);
    canvas.addEventListener('pointerleave',()=>{if(!press)this.onHover(null,null);});
    canvas.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();this.zoomBy(e.deltaY>0?-.1:.1);},{passive:false});
    this.cursor={x:6,y:3};
    canvas.addEventListener('keydown',e=>{const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(dirs[e.key]){e.preventDefault();const [x,y]=dirs[e.key];this.cursor={x:Math.max(0,Math.min(12,this.cursor.x+x)),y:Math.max(0,Math.min(6,this.cursor.y+y))};this.onHover(this.cursor,null);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onCell(this.cursor);}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopIdle();else this.render();});
  }
  sync(state){
    const changed=this.lastActive!==state.activeId;
    this.lastActive=state.activeId;
    this.state=state;
    for(const unit of state.units){const t=this.tokens.get(unit.id),p=center(unit.x,unit.y);t.root.position.set(p.x,p.y);t.root.zIndex=p.y;t.body.y=0;this.pose(t,'idle');t.ring.visible=unit.id===state.activeId;t.body.alpha=unit.acted?.78:1;t.label.alpha=unit.acted?.65:1;t.number.text=unit.penalty||unit.nextPenalty?'-'+(unit.penalty||unit.nextPenalty)+' VIT':'';}
    this.placeBall(state);if(changed){this.focus(state.units.find(u=>u.id===state.activeId));this.idle(state.activeId);}this.render();
  }
  idle(id){
    this.stopIdle();if(!this.tokens.has(id)||this.reduced||document.hidden)return;
    // A short staggered breath when initiative changes, then zero idle redraws.
    let elapsed=0;
    const tick=()=>{
      if(this.reduced||this.animating||document.hidden)return;
      elapsed+=160;
      let index=0;for(const token of this.tokens.values())this.pose(token,'idle',elapsed+(index++%4)*160);
      if(elapsed<1920)this.idleTimer=setTimeout(tick,160);
      else{this.idleTimer=null;for(const token of this.tokens.values())this.pose(token,'idle');}
      this.render();
    };this.idleTimer=setTimeout(tick,160);
  }
  stopIdle(){clearTimeout(this.idleTimer);this.idleTimer=null;}
  placeBall(state){const p=center(state.ball.x,state.ball.y),holder=this.tokens.get(state.ball.holderId);this.ball.position.set(p.x+(holder?28*holder.direction:0),p.y-(holder?51:9));this.ball.visible=true;}
  highlight(moves=[],preview=null,hover=null){
    const g=this.overlay;g.clear();
    for(const cell of moves)g.poly(flat(polygon(cell.x,cell.y))).fill({color:0x8df0d6,alpha:.17}).stroke({color:0xc6ffdf,width:1.3,alpha:.55});
    if(hover)g.poly(flat(polygon(hover.x,hover.y))).fill({color:0xffe4a1,alpha:.25}).stroke({color:0xffefc1,width:2,alpha:.9});
    if(preview?.cells?.length){
      const color=preview.blockerId||!preview.legal?0xff718a:0xf8e4a0;
      for(const cell of preview.cells)g.poly(flat(polygon(cell.x,cell.y))).fill({color,alpha:.18});
      const a=center(preview.from.x,preview.from.y),b=center(preview.to.x,preview.to.y);
      g.moveTo(a.x,a.y-15).lineTo(b.x,b.y-15).stroke({width:4,color,alpha:.9});
      g.circle(b.x,b.y-15,9).stroke({color,width:2});
      if(preview.blockerId){const u=this.state.units.find(u=>u.id===preview.blockerId),p=center(u.x,u.y);g.moveTo(p.x-13,p.y-28).lineTo(p.x+13,p.y-2).moveTo(p.x+13,p.y-28).lineTo(p.x-13,p.y-2).stroke({width:4,color:0xff718a});}
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
        if(e.type==='move'){
          const t=this.tokens.get(e.unitId);let from=e.from;
          let elapsed=0;
          for(const cell of e.path){const a=center(from.x,from.y),b=center(cell.x,cell.y);this.face(t,a,b);await this.tween(300,(p,raw=p)=>{this.pose(t,'run',elapsed+raw*300);t.root.position.set(a.x+(b.x-a.x)*raw,a.y+(b.y-a.y)*raw);t.root.zIndex=t.root.y;t.body.y=-Math.sin(raw*Math.PI)*2;if(before.ball.holderId===e.unitId)this.ball.position.set(t.root.x+28*t.direction,t.root.y-51);});from=cell;elapsed+=300;}t.body.y=0;this.pose(t,'idle');
        }
        if(e.type==='pass'||e.type==='shot'){
          const blocker=e.blockerId?before.units.find(u=>u.id===e.blockerId):null,target=blocker||e.to,a=center(e.from.x,e.from.y),b=center(target.x,target.y);
          const actor=this.tokens.get(e.unitId),receiver=this.tokens.get(e.blockerId||e.targetId);
          this.face(actor,a,b);if(receiver){this.face(receiver,b,a);this.pose(receiver,'guard');}
          await this.tween(e.type==='shot'?340:260,(p,raw=p)=>{this.pose(actor,'throw',raw*240);actor.body.y=-Math.sin(raw*Math.PI)*(e.type==='shot'?5:1);this.ball.position.set(a.x+actor.direction*(20+p*12),a.y-51-p*7);});
          this.pose(actor,'throw',260);actor.body.y=0;
          const trail=new Graphics();this.effects.addChild(trail);
          const start={x:a.x+actor.direction*32,y:a.y-58},end={x:b.x+(receiver?receiver.direction*28:0),y:b.y-(receiver?51:25)};
          await this.tween(e.type==='shot'?550:650,(p,raw=p)=>{this.pose(actor,'throw',260+raw*500);const x=start.x+(end.x-start.x)*p,y=start.y+(end.y-start.y)*p-Math.sin(raw*Math.PI)*45;this.ball.position.set(x,y);trail.clear().moveTo(x-16*(b.x-a.x)/300,y-8*(b.y-a.y)/300).lineTo(x,y).stroke({width:6,color:0xffe1a1,alpha:.65});});trail.destroy();this.pose(actor,'idle');
        }
        if(e.type==='charge'){
          const t=this.tokens.get(e.unitId),target=this.tokens.get(e.targetId),a=center(e.from.x,e.from.y),b=center(e.to.x,e.to.y),next=center(e.pushTo.x,e.pushTo.y);
          this.face(t,a,b);this.face(target,b,a);this.pose(target,'guard');
          await this.tween(460,(p,raw=p)=>{this.pose(t,'charge',raw*460);if(raw>.32)this.pose(target,e.success?'hit':'guard',(raw-.32)*460);const l=Math.sin(raw*Math.PI)*.65;t.root.position.set(a.x+(b.x-a.x)*l,a.y+(b.y-a.y)*l);t.root.zIndex=t.root.y;if(e.pushed){const push=Math.max(0,(p-.25)/.75);target.root.position.set(b.x+(next.x-b.x)*push,b.y+(next.y-b.y)*push);target.root.zIndex=target.root.y;}});
          t.root.position.set(a.x,a.y);this.pose(t,'idle');await this.burst(b,e.success?'-3 VIT':'RÉSISTE',e.success?0xffb88b:0xd8e7e1);this.pose(target,'idle');
        }
        if(e.type==='intercept'){this.pose(this.tokens.get(e.unitId),'guard');await this.burst(center(e.to.x,e.to.y),'INTERCEPTION',0xff9db1);}
        if(e.type==='goal'){
          const winners=after.units.filter(u=>u.team===e.team).map(u=>this.tokens.get(u.id));
          await this.burst(center(e.to.x,e.to.y),'+'+e.points,0xffe3a0,(p,raw)=>{for(const t of winners){this.pose(t,'celebrate',raw*650);t.body.y=-Math.sin(raw*Math.PI)*7;}});
          for(const t of winners)t.body.y=0;
          await this.tween(650,(p,raw=p)=>{for(const reset of e.reset){const a=center(reset.from.x,reset.from.y),b=center(reset.to.x,reset.to.y),t=this.tokens.get(reset.unitId);if(a.x!==b.x||a.y!==b.y){this.face(t,a,b);this.pose(t,'run',raw*650);}t.root.position.set(a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p);t.root.zIndex=t.root.y;}});
        }
      }
    } finally {this.animating=false;this.sync(after);}
  }
  async burst(p,label,color,onFrame){
    const g=new Graphics(),caption=text(label,20,color);caption.anchor.set(.5);this.effects.addChild(g,caption);
    await this.tween(650,(t,raw=t)=>{onFrame?.(t,raw);g.clear().ellipse(p.x,p.y,20+t*65,10+t*30).stroke({color,width:3,alpha:1-t});caption.position.set(p.x,p.y-90-t*25);caption.alpha=1-t*.75;});g.destroy();caption.destroy();
  }
}
