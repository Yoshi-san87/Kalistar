'use strict';

const COUNT=16,CELL=320,MARGIN=4,ROOT={x:160,y:272};
const fail=message=>{throw Error('Authored placement: '+message);};
function check(ok,message){if(!ok)fail(message);}
function record(value,required,optional,label){
  check(value!==null&&typeof value==='object'&&!Array.isArray(value),label+' must be an object');
  check([Object.prototype,null].includes(Object.getPrototypeOf(value)),label+' must be a plain object');
  const allowed=new Set([...required,...optional]);
  for(const key of Reflect.ownKeys(value)){
    check(allowed.has(key),label+' has unknown field '+String(key));
    check(Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'),label+' must contain data, not accessors');
  }
  for(const key of required)check(Object.hasOwn(value,key),label+' needs '+key);
}
function array(value,length,label){
  check(Array.isArray(value)&&value.length===length,label+' needs '+length+' entries');
  check(Reflect.ownKeys(value).length===length+1,label+' must be a dense array without extra fields');
  for(let i=0;i<length;i++)check(Object.hasOwn(value,i)&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,String(i)),'value'),label+' must contain data at '+i);
}
function integer(value,min,max,label){check(Number.isSafeInteger(value)&&value>=min&&value<=max,label+' must be an integer in '+min+'..'+max);}
function finite(value,min,label){check(Number.isFinite(value)&&value>=min,label+' must be finite and >= '+min);}
function text(value,min,label){check(typeof value==='string'&&value.trim().length>=min,label+' needs descriptive text');}
function permutation(value,label){
  array(value,COUNT,label);
  for(const index of value)integer(index,0,COUNT-1,label);
  check(new Set(value).size===COUNT,label+' must use every source drawing once');
}
function point(value,source,part,boundary,label){
  record(value,['x','y','uncertaintyPx'],[],label);
  integer(value.x,0,source.width-1,label+'.x');integer(value.y,0,source.height-1,label+'.y');
  finite(value.uncertaintyPx,0,label+'.uncertaintyPx');
  const right=part.left+part.width,bottom=part.top+part.height;
  check(value.x>=part.left&&value.y>=part.top&&(boundary?value.x<=right&&value.y<=bottom:value.x<right&&value.y<bottom),label+' is outside its source drawing');
}
function median(values){
  const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
}

/**
 * Validate authored metadata against actual scan/calibration context, or return
 * null for undefined (leave historical automatic/manual placement untouched).
 * Context: {sourceSha256,width,height,page,parts,order,pageScale}.
 * Observations use scanner order; preset frames use output order. The bound
 * source.order must equal calibration.order. No image IO or input mutation.
 * This checks schema/binding; solve additionally checks the resulting geometry.
 */
function validate(authored,context){
  if(authored===undefined)return null;
  record(authored,['schemaVersion','status','source','observations','preset'],[],'contract');
  check(authored.schemaVersion===1,'unsupported schemaVersion');
  check(authored.status==='authored-proposal','status must be authored-proposal');
  record(context,['sourceSha256','width','height','page','parts','order','pageScale'],[],'context');
  check(typeof context.sourceSha256==='string'&&/^[a-f0-9]{64}$/.test(context.sourceSha256),'invalid actual source SHA-256');
  integer(context.width,1,Number.MAX_SAFE_INTEGER,'context.width');integer(context.height,1,Number.MAX_SAFE_INTEGER,'context.height');
  integer(context.page,0,3,'context.page');
  finite(context.pageScale,0,'context.pageScale');check(context.pageScale>0,'context.pageScale must be positive');
  permutation(context.order,'context.order');array(context.parts,COUNT,'context.parts');
  for(const [i,p] of context.parts.entries()){
    record(p,['left','top','width','height'],['label','count'],'part '+i);
    integer(p.left,0,context.width-1,'part.left');integer(p.top,0,context.height-1,'part.top');
    integer(p.width,1,context.width,'part.width');integer(p.height,1,context.height,'part.height');
    check(p.left+p.width<=context.width&&p.top+p.height<=context.height,'part '+i+' exceeds source dimensions');
  }
  const {source,observations,preset}=authored;
  record(source,['sha256','width','height','page','order'],[],'source');
  check(source.sha256===context.sourceSha256,'stale source SHA-256');
  check(source.width===context.width&&source.height===context.height&&source.page===context.page,'stale source dimensions/page');
  permutation(source.order,'source.order');
  check(source.order.every((value,i)=>value===context.order[i]),'stale source order');
  record(observations,['method','coordinateSpace','status','note','frames'],[],'observations');
  check(observations.method==='manual'&&observations.coordinateSpace==='source-pixels'&&observations.status==='proposed','observations must be proposed manual source-pixel landmarks');
  text(observations.note,20,'observations.note');array(observations.frames,COUNT,'observations.frames');
  for(const [i,f] of observations.frames.entries()){
    record(f,['sourceLocal','pelvis','contact'],[],'observation '+i);
    check(f.sourceLocal===i,'observations must stay in scanner order');
    point(f.pelvis,source,context.parts[i],false,'pelvis '+i);
    if(f.contact!==null)point(f.contact,source,context.parts[i],true,'contact '+i);
  }
  record(preset,['id','status','note','horizontalPolicy','contactPolicy','frames'],['flight'],'preset');
  check(typeof preset.id==='string'&&/^[a-z0-9][a-z0-9.-]*$/.test(preset.id),'invalid preset id');
  check(preset.status==='authored-proposal','preset status must be authored-proposal');
  text(preset.note,20,'preset.note');
  check(preset.horizontalPolicy==='pelvis-to-root','unsupported horizontalPolicy; no implicit support-root correction');
  check(preset.contactPolicy==='observed-sole-to-ground','unsupported contactPolicy');
  array(preset.frames,COUNT,'preset.frames');
  let hasFlight=false;
  for(const [local,f] of preset.frames.entries()){
    record(f,['phase','mode'],['curve','t'],'phase '+local);
    text(f.phase,1,'phase label');check(f.mode==='contact'||f.mode==='flight','unknown phase mode '+local);
    if(f.mode==='contact'){
      check(!Object.hasOwn(f,'curve')&&!Object.hasOwn(f,'t'),'contact phase cannot carry a trajectory');
      check(observations.frames[context.order[local]].contact!==null,'missing observed contact for output frame '+local);
    }else{
      hasFlight=true;
      check(f.curve==='constant'||f.curve==='parabola','unknown flight curve '+local);
      if(f.curve==='constant')check(!Object.hasOwn(f,'t'),'constant flight cannot carry t');
      else check(Number.isFinite(f.t)&&f.t>=0&&f.t<=1,'parabola t must be in 0..1');
    }
  }
  check(hasFlight===Object.hasOwn(preset,'flight'),'flight settings are required only when a phase uses flight');
  if(hasFlight){
    const flight=preset.flight;
    record(flight,['baselineFrames','constantRisePx','parabolaPeakRisePx','minimumClearancePx'],[],'flight');
    check(Array.isArray(flight.baselineFrames)&&flight.baselineFrames.length>0&&flight.baselineFrames.length<=COUNT,'baselineFrames must be nonempty');
    array(flight.baselineFrames,flight.baselineFrames.length,'baselineFrames');
    check(new Set(flight.baselineFrames).size===flight.baselineFrames.length,'duplicate baseline frame');
    for(const local of flight.baselineFrames){
      integer(local,0,COUNT-1,'baseline frame');
      check(preset.frames[local].mode==='contact','baseline frame must choose contact');
      const observed=observations.frames[context.order[local]];
      check(observed.contact.y>observed.pelvis.y,'baseline contact must be below pelvis');
    }
    finite(flight.constantRisePx,0,'constantRisePx');finite(flight.parabolaPeakRisePx,0,'parabolaPeakRisePx');
    integer(flight.minimumClearancePx,1,CELL-2*MARGIN,'minimumClearancePx');
  }
  return authored;
}

/**
 * Return null for the historical path, otherwise sixteen proposed placements.
 * w/h use only the caller's existing common pageScale; bake can reuse its one
 * nearest-neighbour conversion and consume left/top/w/h in output order.
 * virtualOrigin is NON-SAMPLING affine provenance, never legacy sourceOrigins.
 * Callers must reject simultaneous authored and legacy manual placement modes,
 * retain all manual reviews, and record these author choices without approval.
 */
function solve(authored,context){
  if(validate(authored,context)===null)return null;
  const {source,observations,preset}=authored,{parts,order,pageScale,page}=context;
  const flight=preset.flight;
  const baselineHeightPx=flight?median(flight.baselineFrames.map(local=>{
    const f=observations.frames[order[local]];
    return (f.contact.y-f.pelvis.y)*pageScale;
  })):null;
  if(flight)finite(baselineHeightPx,0,'derived baseline height');
  const frames=preset.frames.map((phase,local)=>{
    const sourceLocal=order[local],p=parts[sourceLocal],observed=observations.frames[sourceLocal];
    const w=Math.round(p.width*pageScale),h=Math.round(p.height*pageScale);
    integer(w,1,CELL-2*MARGIN,'native width '+local);integer(h,1,CELL-2*MARGIN,'native height '+local);
    const hipX=Math.round((observed.pelvis.x-p.left)*pageScale),hipY=Math.round((observed.pelvis.y-p.top)*pageScale);
    const left=ROOT.x-hipX,supportChoice=phase.mode==='contact';
    let top,risePx=null,targetPelvisY=null;
    if(supportChoice)top=ROOT.y-Math.round((observed.contact.y-p.top)*pageScale);
    else{
      risePx=phase.curve==='constant'?flight.constantRisePx:flight.parabolaPeakRisePx*4*phase.t*(1-phase.t);
      finite(risePx,0,'derived rise');
      targetPelvisY=ROOT.y-baselineHeightPx-risePx;
      check(Number.isFinite(targetPelvisY),'derived pelvis target must be finite');
      top=Math.round(targetPelvisY)-hipY;
    }
    check(Number.isSafeInteger(left)&&Number.isSafeInteger(top)&&left>=MARGIN&&top>=MARGIN&&left+w<=CELL-MARGIN&&top+h<=CELL-MARGIN,'native bounds overflow at output frame '+local);
    const clearancePx=ROOT.y-top-h;
    if(!supportChoice)check(clearancePx>=flight.minimumClearancePx,'insufficient flight clearance at output frame '+local);
    // Unlike observed landmarks, an affine origin can lie outside the image.
    const x=p.left+(ROOT.x-left)/pageScale,y=p.top+(ROOT.y-top)/pageScale;
    check(Number.isFinite(x)&&Number.isFinite(y),'virtual affine origin must be finite');
    return {local,index:page*COUNT+local,sourceLocal,status:'authored-proposal',phase:phase.phase,
      left,top,w,h,root:{...ROOT},anchorMode:'authored-proposal',supportChoice,
      supportIsMeasuredFact:false,airborne:!supportChoice,pelvisNative:{x:left+hipX,y:top+hipY},
      contactNative:supportChoice?{x:left+Math.round((observed.contact.x-p.left)*pageScale),y:ROOT.y}:null,
      risePx,targetPelvisY,clearancePx,
      virtualOrigin:{coordinateSpace:'source-affine',sampling:false,x,y,outsideSource:x<0||y<0||x>=source.width||y>=source.height}};
  });
  return {schemaVersion:1,status:'authored-proposal',source:{sha256:source.sha256,width:source.width,height:source.height,page,order:[...order]},
    presetId:preset.id,pageScale,baselineHeightPx,native:{cell:CELL,margin:MARGIN,root:{...ROOT}},frames};
}

module.exports={validate,solve};
