import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const views = new Map();
const faceValues = [3, 4, 2, 5, 1, 6];
const normals = [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)];
const pips = {1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
function faceTexture(value, side) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=side===0?'#cde3d9':'#e4cbd0';ctx.fillRect(0,0,256,256);
  ctx.strokeStyle=side===0?'#50796b':'#976572';ctx.lineWidth=5;
  ctx.beginPath();ctx.roundRect(26,26,204,204,25);ctx.stroke();
  ctx.fillStyle=side===0?'#153d30':'#5d2839';
  for(const [x,y] of pips[value]){ctx.beginPath();ctx.arc(128+x*55,128+y*55,16,0,Math.PI*2);ctx.fill();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;return texture;
}
class DieView {
  constructor(side){
    this.side=side;this.frame=0;this.finish=null;
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setClearColor(0x000000,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.5;
    this.renderer.domElement.setAttribute('aria-hidden','true');
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(32,1,.1,100);this.camera.position.set(0,0,5.2);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x324136,2.4));
    const key=new THREE.DirectionalLight(0xffeee1,4);key.position.set(-3,4,5);this.scene.add(key);
    const rim=new THREE.DirectionalLight(side===0?0x73f3cd:0xff8dba,2.3);rim.position.set(3,-1,2);this.scene.add(rim);
    this.geometry=new RoundedBoxGeometry(1.45,1.45,1.45,4,.15);
    this.materials=faceValues.map(n=>new THREE.MeshStandardMaterial({map:faceTexture(n,side),roughness:.32,metalness:.12}));
    this.mesh=new THREE.Mesh(this.geometry,this.materials);this.scene.add(this.mesh);
    this.observer=new ResizeObserver(()=>this.resize());
    this.setValue(6);
  }
  orientation(value){
    const front=new THREE.Quaternion().setFromUnitVectors(normals[faceValues.indexOf(value)],new THREE.Vector3(0,0,1));
    const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(.16,this.side===0?.26:-.26,this.side===0?-.07:.07));
    return tilt.multiply(front);
  }
  mount(host){
    this.cancel();this.observer.disconnect();this.host=host;
    host.append(this.renderer.domElement);host.classList.add('webgl-ready');
    this.observer.observe(host);this.resize();this.setValue(Number(host.dataset.value)||6);
  }
  resize(){
    if(!this.host?.isConnected)return;
    const width=this.host.clientWidth,height=this.host.clientHeight;
    if(!width||!height)return;
    this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.render();
  }
  render(){this.renderer.render(this.scene,this.camera);}
  setValue(value){this.mesh.quaternion.copy(this.orientation(value));this.mesh.position.set(0,0,0);this.mesh.scale.setScalar(1);this.render();if(this.host)this.host.dataset.front=String(value);}
  play(value,reduced){
    this.cancel();
    const host=this.host;
    if(reduced){this.setValue(value);return new Promise(resolve=>setTimeout(()=>resolve(true),30));}
    const from=this.mesh.quaternion.clone(),target=this.orientation(value),spin=new THREE.Quaternion(),axis=new THREE.Vector3(1,.8,.45).normalize();
    const start=performance.now(),duration=1120;
    host.classList.add('is-rolling');
    return new Promise(resolve=>{
      this.finish=resolve;
      const tick=now=>{
        const t=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-t,3);
        spin.setFromAxisAngle(axis,Math.PI*8*ease);
        const base=from.clone().slerp(target,Math.min(1,t/.82));
        this.mesh.quaternion.copy(spin.multiply(base));
        const bounce=Math.sin(t*Math.PI)*.42+Math.sin(t*Math.PI*5)*Math.pow(1-t,2)*.16;
        this.mesh.position.set(Math.sin(t*Math.PI*2)*(1-t)*.14,bounce,Math.sin(t*Math.PI)*.15);
        this.mesh.scale.setScalar(1+Math.sin(t*Math.PI)*.06);this.render();
        if(t<1){this.frame=requestAnimationFrame(tick);return;}
        this.frame=0;this.setValue(value);host.classList.remove('is-rolling');host.classList.add('has-landed');
        this.finish=null;resolve(true);
      };
      this.frame=requestAnimationFrame(tick);
    });
  }
  cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;if(this.finish){this.finish(false);this.finish=null;}this.host?.classList.remove('is-rolling');}
  detach(){this.cancel();this.observer.disconnect();this.host=null;}
  dispose(){this.detach();this.geometry.dispose();for(const m of this.materials){m.map.dispose();m.dispose();}this.renderer.dispose();}
}
window.KalistarDice={
  mount(hosts){
    for(const view of views.values())view.detach();
    for(const host of hosts){
      const side=Number(host.dataset.player);
      try{if(!views.has(side))views.set(side,new DieView(side));views.get(side).mount(host);}
      catch{host.classList.remove('webgl-ready');host.dataset.fallback='true';}
    }
  },
  async play(side,value,reduced){
    const view=views.get(side);
    if(view?.host?.isConnected)return view.play(value,reduced);
    const host=document.querySelector(`.dice-stage[data-player="${side}"]`);
    host?.classList.add('is-rolling');await new Promise(r=>setTimeout(r,reduced?30:700));host?.classList.remove('is-rolling');return true;
  }
};
window.addEventListener('pagehide',()=>{for(const view of views.values())view.dispose();views.clear();});
